"""
Trading Safeguards

Implements trading safeguards including:
- Daily loss limit with kill switch
- Dynamic stop-loss/take-profit
- Position sizing limits
- Drawdown monitoring
"""

from dataclasses import dataclass, field
from datetime import datetime, timezone, date, timedelta
from decimal import Decimal
from enum import Enum
from typing import Any, Optional
import logging

from app.core.config import settings

logger = logging.getLogger(__name__)


class SafeguardStatus(str, Enum):
    """Safeguard status"""
    ACTIVE = "active"
    TRIGGERED = "triggered"
    DISABLED = "disabled"
    WARNING = "warning"


class SafeguardType(str, Enum):
    """Types of safeguards"""
    DAILY_LOSS_LIMIT = "daily_loss_limit"
    MAX_DRAWDOWN = "max_drawdown"
    POSITION_SIZE = "position_size"
    MAX_POSITIONS = "max_positions"
    COOLDOWN = "cooldown"
    VOLATILITY = "volatility"


@dataclass
class SafeguardState:
    """State of a single safeguard"""
    safeguard_type: SafeguardType
    status: SafeguardStatus
    current_value: float
    threshold: float
    triggered_at: Optional[datetime] = None
    message: str = ""
    
    @property
    def utilization_pct(self) -> float:
        """How close to threshold (0-100%)"""
        if self.threshold == 0:
            return 0.0
        return (abs(self.current_value) / self.threshold) * 100


@dataclass
class DailyTradingStats:
    """Daily trading statistics"""
    date: date
    starting_equity: Decimal
    current_equity: Decimal
    realized_pnl: Decimal
    unrealized_pnl: Decimal
    total_trades: int
    winning_trades: int
    losing_trades: int
    fees_paid: Decimal
    
    @property
    def net_pnl(self) -> Decimal:
        return self.realized_pnl + self.unrealized_pnl
    
    @property
    def pnl_pct(self) -> float:
        if self.starting_equity > 0:
            return float(self.net_pnl / self.starting_equity) * 100
        return 0.0
    
    @property
    def win_rate(self) -> float:
        if self.total_trades > 0:
            return (self.winning_trades / self.total_trades) * 100
        return 0.0


class TradingSafeguards:
    """
    Trading safeguards manager.
    Monitors and enforces all trading safety rules.
    """
    
    def __init__(self):
        self._settings = settings.risk
        self._daily_stats: Optional[DailyTradingStats] = None
        self._safeguard_states: dict[SafeguardType, SafeguardState] = {}
        self._kill_switch_active = False
        self._kill_switch_reason: Optional[str] = None
        self._kill_switch_time: Optional[datetime] = None
        
        # Track trade cooldowns
        self._last_trade_time: dict[str, datetime] = {}
        
        # Portfolio tracking
        self._peak_equity = Decimal("0")
        self._current_equity = Decimal("0")
        
        # Initialize safeguards
        self._initialize_safeguards()
    
    def _initialize_safeguards(self) -> None:
        """Initialize all safeguard states"""
        safeguards = [
            (SafeguardType.DAILY_LOSS_LIMIT, self._settings.daily_loss_limit_pct),
            (SafeguardType.MAX_DRAWDOWN, self._settings.max_drawdown_pct),
            (SafeguardType.POSITION_SIZE, self._settings.max_position_size_pct),
            (SafeguardType.MAX_POSITIONS, float(self._settings.max_open_positions)),
            (SafeguardType.COOLDOWN, float(self._settings.cooldown_minutes))
        ]
        
        for sg_type, threshold in safeguards:
            self._safeguard_states[sg_type] = SafeguardState(
                safeguard_type=sg_type,
                status=SafeguardStatus.ACTIVE,
                current_value=0.0,
                threshold=threshold
            )
    
    def update_portfolio_state(
        self,
        current_equity: Decimal,
        daily_pnl: Decimal,
        open_positions: int = 0
    ) -> None:
        """
        Update portfolio state and check safeguards.
        
        Args:
            current_equity: Current portfolio equity
            daily_pnl: Day's P&L
            open_positions: Number of open positions
        """
        self._current_equity = current_equity
        
        # Update peak equity
        if current_equity > self._peak_equity:
            self._peak_equity = current_equity
        
        # Check daily loss limit
        starting_equity = current_equity - daily_pnl
        if starting_equity > 0:
            daily_loss_pct = float(-daily_pnl / starting_equity) * 100 if daily_pnl < 0 else 0
            self._update_safeguard(
                SafeguardType.DAILY_LOSS_LIMIT,
                daily_loss_pct
            )
        
        # Check max drawdown
        if self._peak_equity > 0:
            drawdown_pct = float((self._peak_equity - current_equity) / self._peak_equity) * 100
            self._update_safeguard(SafeguardType.MAX_DRAWDOWN, drawdown_pct)
        
        # Check max positions
        self._update_safeguard(SafeguardType.MAX_POSITIONS, float(open_positions))
    
    def _update_safeguard(
        self,
        safeguard_type: SafeguardType,
        current_value: float
    ) -> None:
        """Update safeguard state and check for trigger"""
        state = self._safeguard_states.get(safeguard_type)
        if not state:
            return
        
        state.current_value = current_value
        
        # Check thresholds
        if current_value >= state.threshold:
            if state.status != SafeguardStatus.TRIGGERED:
                state.status = SafeguardStatus.TRIGGERED
                state.triggered_at = datetime.now(timezone.utc)
                state.message = f"{safeguard_type.value} threshold breached: {current_value:.2f} >= {state.threshold:.2f}"
                
                logger.warning(f"Safeguard triggered: {state.message}")
                
                # Activate kill switch for critical safeguards
                if safeguard_type in [SafeguardType.DAILY_LOSS_LIMIT, SafeguardType.MAX_DRAWDOWN]:
                    self._activate_kill_switch(state.message)
                    
        elif current_value >= state.threshold * 0.8:
            # Warning level
            state.status = SafeguardStatus.WARNING
            state.message = f"{safeguard_type.value} approaching threshold"
            
        else:
            state.status = SafeguardStatus.ACTIVE
            state.message = ""
    
    def check_trade_allowed(
        self,
        symbol: str,
        position_size_pct: float,
        current_positions: int
    ) -> tuple[bool, list[str]]:
        """
        Check if a trade is allowed by all safeguards.
        
        Args:
            symbol: Trading symbol
            position_size_pct: Position size as % of portfolio
            current_positions: Number of current open positions
            
        Returns:
            Tuple of (is_allowed, list of rejection reasons)
        """
        rejections = []
        
        # Check kill switch
        if self._kill_switch_active:
            rejections.append(f"Kill switch active: {self._kill_switch_reason}")
            return False, rejections
        
        # Check daily loss limit
        daily_loss = self._safeguard_states.get(SafeguardType.DAILY_LOSS_LIMIT)
        if daily_loss and daily_loss.status == SafeguardStatus.TRIGGERED:
            rejections.append("Daily loss limit reached")
        
        # Check max drawdown
        drawdown = self._safeguard_states.get(SafeguardType.MAX_DRAWDOWN)
        if drawdown and drawdown.status == SafeguardStatus.TRIGGERED:
            rejections.append("Maximum drawdown reached")
        
        # Check position size
        if position_size_pct > self._settings.max_position_size_pct:
            rejections.append(
                f"Position size too large: {position_size_pct:.2f}% > {self._settings.max_position_size_pct}%"
            )
        
        # Check max positions
        if current_positions >= self._settings.max_open_positions:
            rejections.append(
                f"Max positions reached: {current_positions} >= {self._settings.max_open_positions}"
            )
        
        # Check cooldown
        if symbol in self._last_trade_time:
            last_trade = self._last_trade_time[symbol]
            elapsed = (datetime.now(timezone.utc) - last_trade).total_seconds() / 60
            if elapsed < self._settings.cooldown_minutes:
                remaining = self._settings.cooldown_minutes - elapsed
                rejections.append(f"Cooldown active for {symbol}: {remaining:.1f} minutes remaining")
        
        return len(rejections) == 0, rejections
    
    def record_trade(self, symbol: str) -> None:
        """Record a trade for cooldown tracking"""
        self._last_trade_time[symbol] = datetime.now(timezone.utc)
    
    def calculate_dynamic_stop_loss(
        self,
        entry_price: Decimal,
        side: str,
        atr: float,
        volatility_multiplier: float = 1.5
    ) -> Decimal:
        """
        Calculate dynamic stop-loss based on volatility (ATR).
        
        Args:
            entry_price: Entry price
            side: 'buy' or 'sell'
            atr: Average True Range
            volatility_multiplier: Multiplier for ATR
            
        Returns:
            Stop-loss price
        """
        stop_distance = Decimal(str(atr * volatility_multiplier))
        
        if side.lower() == "buy":
            return entry_price - stop_distance
        else:
            return entry_price + stop_distance
    
    def calculate_dynamic_take_profit(
        self,
        entry_price: Decimal,
        stop_loss: Decimal,
        side: str,
        risk_reward_ratio: float = 2.0
    ) -> Decimal:
        """
        Calculate take-profit based on risk/reward ratio.
        
        Args:
            entry_price: Entry price
            stop_loss: Stop-loss price
            side: 'buy' or 'sell'
            risk_reward_ratio: Target risk/reward ratio
            
        Returns:
            Take-profit price
        """
        risk = abs(entry_price - stop_loss)
        reward = risk * Decimal(str(risk_reward_ratio))
        
        if side.lower() == "buy":
            return entry_price + reward
        else:
            return entry_price - reward
    
    def calculate_position_size(
        self,
        portfolio_value: Decimal,
        entry_price: Decimal,
        stop_loss: Decimal,
        risk_pct: float = 1.0
    ) -> tuple[Decimal, float]:
        """
        Calculate position size based on risk per trade.
        
        Args:
            portfolio_value: Total portfolio value
            entry_price: Entry price
            stop_loss: Stop-loss price
            risk_pct: Risk per trade as % of portfolio
            
        Returns:
            Tuple of (position_size_units, position_size_pct)
        """
        # Cap risk at max allowed
        risk_pct = min(risk_pct, self._settings.max_position_size_pct / 2)
        
        # Calculate risk amount
        risk_amount = portfolio_value * Decimal(str(risk_pct / 100))
        
        # Calculate stop distance
        stop_distance = abs(entry_price - stop_loss)
        
        if stop_distance == 0:
            return Decimal("0"), 0.0
        
        # Position size in units
        position_size = risk_amount / stop_distance
        
        # Position value
        position_value = position_size * entry_price
        
        # Position size as percentage
        size_pct = float(position_value / portfolio_value) * 100
        
        # Cap at max position size
        if size_pct > self._settings.max_position_size_pct:
            scale_factor = self._settings.max_position_size_pct / size_pct
            position_size = position_size * Decimal(str(scale_factor))
            size_pct = self._settings.max_position_size_pct
        
        return position_size, size_pct
    
    def _activate_kill_switch(self, reason: str) -> None:
        """Activate the kill switch"""
        self._kill_switch_active = True
        self._kill_switch_reason = reason
        self._kill_switch_time = datetime.now(timezone.utc)
        logger.critical(f"KILL SWITCH ACTIVATED: {reason}")
    
    def reset_kill_switch(self, force: bool = False) -> bool:
        """
        Reset the kill switch.
        
        Args:
            force: Force reset even if conditions not met
            
        Returns:
            True if reset successful
        """
        if not self._kill_switch_active:
            return False
        
        if not force:
            # Check if conditions are safe to reset
            daily_loss = self._safeguard_states.get(SafeguardType.DAILY_LOSS_LIMIT)
            drawdown = self._safeguard_states.get(SafeguardType.MAX_DRAWDOWN)
            
            if daily_loss and daily_loss.status == SafeguardStatus.TRIGGERED:
                logger.warning("Cannot reset: Daily loss limit still triggered")
                return False
            
            if drawdown and drawdown.status == SafeguardStatus.TRIGGERED:
                logger.warning("Cannot reset: Max drawdown still triggered")
                return False
        
        self._kill_switch_active = False
        self._kill_switch_reason = None
        self._kill_switch_time = None
        logger.info("Kill switch reset")
        return True
    
    def reset_daily_stats(self, starting_equity: Decimal) -> None:
        """Reset daily statistics (called at start of trading day)"""
        self._daily_stats = DailyTradingStats(
            date=date.today(),
            starting_equity=starting_equity,
            current_equity=starting_equity,
            realized_pnl=Decimal("0"),
            unrealized_pnl=Decimal("0"),
            total_trades=0,
            winning_trades=0,
            losing_trades=0,
            fees_paid=Decimal("0")
        )
        
        # Reset daily loss safeguard
        daily_loss = self._safeguard_states.get(SafeguardType.DAILY_LOSS_LIMIT)
        if daily_loss:
            daily_loss.current_value = 0.0
            daily_loss.status = SafeguardStatus.ACTIVE
            daily_loss.triggered_at = None
            daily_loss.message = ""
        
        logger.info(f"Daily stats reset. Starting equity: ${starting_equity}")
    
    def get_status(self) -> dict[str, Any]:
        """Get comprehensive safeguard status"""
        return {
            "kill_switch": {
                "active": self._kill_switch_active,
                "reason": self._kill_switch_reason,
                "triggered_at": self._kill_switch_time.isoformat() if self._kill_switch_time else None
            },
            "safeguards": {
                sg_type.value: {
                    "status": state.status.value,
                    "current_value": state.current_value,
                    "threshold": state.threshold,
                    "utilization_pct": state.utilization_pct,
                    "message": state.message,
                    "triggered_at": state.triggered_at.isoformat() if state.triggered_at else None
                }
                for sg_type, state in self._safeguard_states.items()
            },
            "portfolio": {
                "current_equity": float(self._current_equity),
                "peak_equity": float(self._peak_equity),
                "drawdown_pct": float((self._peak_equity - self._current_equity) / self._peak_equity * 100) if self._peak_equity > 0 else 0
            },
            "daily_stats": {
                "date": self._daily_stats.date.isoformat() if self._daily_stats else None,
                "pnl_pct": self._daily_stats.pnl_pct if self._daily_stats else 0,
                "total_trades": self._daily_stats.total_trades if self._daily_stats else 0,
                "win_rate": self._daily_stats.win_rate if self._daily_stats else 0
            } if self._daily_stats else None
        }


# Global safeguards instance
_global_safeguards: Optional[TradingSafeguards] = None


def get_safeguards() -> TradingSafeguards:
    """Get the global safeguards instance"""
    global _global_safeguards
    if _global_safeguards is None:
        _global_safeguards = TradingSafeguards()
    return _global_safeguards
