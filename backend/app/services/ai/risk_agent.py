"""
Risk Management Agent

Evaluates trading signals, enforces risk rules, and manages portfolio risk.
Key responsibilities:
- Signal validation against risk parameters
- Position sizing using Kelly Criterion
- VaR/CVaR calculations
- Portfolio risk monitoring
- Kill switch management
"""

from dataclasses import dataclass
from datetime import datetime, timezone, timedelta
from decimal import Decimal
from enum import Enum
from typing import Any, Optional
import logging
import math

import numpy as np

from app.core.config import settings
from app.services.ai.strategy_agent import TradingSignal, SignalType

logger = logging.getLogger(__name__)


class RiskDecision(str, Enum):
    """Risk evaluation decision"""
    APPROVED = "approved"
    REJECTED = "rejected"
    MODIFIED = "modified"
    PENDING_REVIEW = "pending_review"


class RiskLevel(str, Enum):
    """Current risk level"""
    LOW = "low"
    MODERATE = "moderate"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass
class PositionSizeResult:
    """Result of position sizing calculation"""
    recommended_size: Decimal
    size_pct: float
    method: str
    kelly_fraction: Optional[float] = None
    volatility_adjusted: bool = False
    reasoning: str = ""


@dataclass
class RiskMetrics:
    """Current portfolio risk metrics"""
    timestamp: datetime
    
    # Value at Risk
    var_95: Decimal
    var_99: Decimal
    cvar_95: Decimal
    
    # Portfolio metrics
    total_exposure: Decimal
    net_exposure: Decimal
    gross_exposure_pct: float
    
    # Drawdown
    current_drawdown_pct: float
    max_drawdown_pct: float
    
    # Performance
    sharpe_ratio: Optional[float] = None
    sortino_ratio: Optional[float] = None
    
    # Concentration
    largest_position_pct: float = 0.0
    
    # Risk level
    overall_risk_level: RiskLevel = RiskLevel.MODERATE


@dataclass
class RiskEvaluation:
    """Result of signal risk evaluation"""
    signal_id: str
    timestamp: datetime
    
    # Decision
    decision: RiskDecision
    original_signal: TradingSignal
    modified_signal: Optional[TradingSignal] = None
    
    # Position sizing
    approved_position_size: Optional[Decimal] = None
    position_size_pct: Optional[float] = None
    
    # Risk metrics
    risk_amount: Decimal = Decimal("0")
    portfolio_risk_impact: float = 0.0
    
    # Validation details
    validation_passed: list[str] = None
    validation_failed: list[str] = None
    warnings: list[str] = None
    
    # Reasoning
    reasoning: str = ""
    
    def __post_init__(self):
        if self.validation_passed is None:
            self.validation_passed = []
        if self.validation_failed is None:
            self.validation_failed = []
        if self.warnings is None:
            self.warnings = []


class RiskManagementAgent:
    """
    Risk Management Agent for the trading bot.
    Enforces all risk rules and manages portfolio risk.
    """
    
    def __init__(self):
        self.settings = settings.risk
        self._portfolio_state: dict[str, Any] = {
            "total_equity": Decimal("10000"),
            "peak_equity": Decimal("10000"),
            "daily_pnl": Decimal("0"),
            "daily_trades": 0,
            "open_positions": [],
            "position_history": []
        }
        self._kill_switch_active = False
        self._kill_switch_reason: Optional[str] = None
        
    async def evaluate_signal(
        self,
        signal: TradingSignal,
        current_portfolio: dict[str, Any]
    ) -> RiskEvaluation:
        """
        Evaluate a trading signal against risk rules.
        
        Args:
            signal: Trading signal to evaluate
            current_portfolio: Current portfolio state
            
        Returns:
            RiskEvaluation with decision and modifications
        """
        logger.info(f"Evaluating signal {signal.signal_id} for {signal.symbol}")
        
        # Update portfolio state
        self._portfolio_state.update(current_portfolio)
        
        validation_passed = []
        validation_failed = []
        warnings = []
        
        # Check 1: Kill switch
        if self._kill_switch_active:
            return RiskEvaluation(
                signal_id=signal.signal_id,
                timestamp=datetime.now(timezone.utc),
                decision=RiskDecision.REJECTED,
                original_signal=signal,
                validation_failed=["Kill switch is active"],
                reasoning=f"Kill switch active: {self._kill_switch_reason}"
            )
        
        # Check 2: Daily loss limit
        daily_pnl_pct = self._calculate_daily_pnl_pct()
        if daily_pnl_pct <= -self.settings.daily_loss_limit_pct:
            validation_failed.append(f"Daily loss limit exceeded: {daily_pnl_pct:.2f}%")
            self._activate_kill_switch("Daily loss limit exceeded")
            return RiskEvaluation(
                signal_id=signal.signal_id,
                timestamp=datetime.now(timezone.utc),
                decision=RiskDecision.REJECTED,
                original_signal=signal,
                validation_failed=validation_failed,
                reasoning="Daily loss limit reached, kill switch activated"
            )
        else:
            validation_passed.append("Daily loss limit check passed")
        
        # Check 3: Max drawdown
        drawdown_pct = self._calculate_drawdown_pct()
        if drawdown_pct >= self.settings.max_drawdown_pct:
            validation_failed.append(f"Max drawdown exceeded: {drawdown_pct:.2f}%")
            self._activate_kill_switch("Max drawdown exceeded")
            return RiskEvaluation(
                signal_id=signal.signal_id,
                timestamp=datetime.now(timezone.utc),
                decision=RiskDecision.REJECTED,
                original_signal=signal,
                validation_failed=validation_failed,
                reasoning="Max drawdown reached, kill switch activated"
            )
        else:
            validation_passed.append("Max drawdown check passed")
        
        # Check 4: Open positions limit
        open_positions = len(self._portfolio_state.get("open_positions", []))
        if open_positions >= self.settings.max_open_positions:
            validation_failed.append(f"Max open positions reached: {open_positions}")
            return RiskEvaluation(
                signal_id=signal.signal_id,
                timestamp=datetime.now(timezone.utc),
                decision=RiskDecision.REJECTED,
                original_signal=signal,
                validation_passed=validation_passed,
                validation_failed=validation_failed,
                reasoning="Maximum open positions limit reached"
            )
        else:
            validation_passed.append("Open positions limit check passed")
        
        # Check 5: Risk/reward ratio
        if signal.risk_reward_ratio < self.settings.min_risk_reward_ratio:
            validation_failed.append(
                f"Risk/reward too low: {signal.risk_reward_ratio} < {self.settings.min_risk_reward_ratio}"
            )
        else:
            validation_passed.append("Risk/reward ratio check passed")
        
        # Check 6: Signal confidence
        min_confidence = 0.6
        if signal.confidence < min_confidence:
            warnings.append(f"Low signal confidence: {signal.confidence:.2f}")
        else:
            validation_passed.append("Signal confidence check passed")
        
        # Check 7: Cooldown period for same symbol
        if self._check_cooldown(signal.symbol):
            validation_failed.append(
                f"Cooldown period not elapsed for {signal.symbol}"
            )
        else:
            validation_passed.append("Cooldown period check passed")
        
        # Calculate position size
        position_result = self.calculate_position_size(
            signal=signal,
            portfolio_value=self._portfolio_state.get("total_equity", Decimal("10000")),
            current_price=float(signal.entry_price)
        )
        
        # Check if position size is within limits
        if position_result.size_pct > self.settings.max_position_size_pct:
            # Modify to max allowed
            position_result = PositionSizeResult(
                recommended_size=position_result.recommended_size * Decimal(
                    str(self.settings.max_position_size_pct / position_result.size_pct)
                ),
                size_pct=self.settings.max_position_size_pct,
                method=position_result.method,
                kelly_fraction=position_result.kelly_fraction,
                volatility_adjusted=position_result.volatility_adjusted,
                reasoning=f"Position size capped at {self.settings.max_position_size_pct}%"
            )
            warnings.append(f"Position size reduced to max {self.settings.max_position_size_pct}%")
        
        # Calculate risk amount
        risk_per_unit = abs(float(signal.entry_price) - float(signal.stop_loss))
        risk_amount = Decimal(str(float(position_result.recommended_size) * risk_per_unit))
        
        # Make decision
        if validation_failed:
            decision = RiskDecision.REJECTED
            reasoning = f"Validation failed: {', '.join(validation_failed)}"
        elif warnings:
            decision = RiskDecision.MODIFIED
            reasoning = f"Signal approved with modifications: {', '.join(warnings)}"
        else:
            decision = RiskDecision.APPROVED
            reasoning = "Signal passed all risk checks"
        
        return RiskEvaluation(
            signal_id=signal.signal_id,
            timestamp=datetime.now(timezone.utc),
            decision=decision,
            original_signal=signal,
            approved_position_size=position_result.recommended_size if decision != RiskDecision.REJECTED else None,
            position_size_pct=position_result.size_pct if decision != RiskDecision.REJECTED else None,
            risk_amount=risk_amount,
            portfolio_risk_impact=float(risk_amount / self._portfolio_state.get("total_equity", Decimal("10000"))) * 100,
            validation_passed=validation_passed,
            validation_failed=validation_failed,
            warnings=warnings,
            reasoning=reasoning
        )
    
    def calculate_position_size(
        self,
        signal: TradingSignal,
        portfolio_value: Decimal,
        current_price: float,
        use_kelly: bool = True
    ) -> PositionSizeResult:
        """
        Calculate optimal position size using Kelly Criterion or volatility-based method.
        
        Args:
            signal: Trading signal
            portfolio_value: Total portfolio value
            current_price: Current asset price
            use_kelly: Whether to use Kelly Criterion
            
        Returns:
            PositionSizeResult with recommended size
        """
        # Calculate risk per trade
        max_risk_amount = float(portfolio_value) * (self.settings.max_position_size_pct / 100)
        
        # Calculate stop distance
        stop_distance = abs(float(signal.entry_price) - float(signal.stop_loss))
        stop_distance_pct = (stop_distance / current_price) * 100
        
        if use_kelly and signal.confidence > 0:
            # Kelly Criterion: f* = (bp - q) / b
            # where b = win/loss ratio, p = win probability, q = 1-p
            
            # Estimate win probability from confidence
            win_prob = signal.confidence
            
            # Win/loss ratio from risk/reward
            win_loss_ratio = signal.risk_reward_ratio
            
            # Kelly fraction
            kelly = (win_prob * win_loss_ratio - (1 - win_prob)) / win_loss_ratio
            
            # Use fractional Kelly (half Kelly for safety)
            kelly_fraction = max(0, min(kelly * 0.5, 0.25))
            
            # Position size from Kelly
            kelly_position_value = float(portfolio_value) * kelly_fraction
            
            # Units to buy
            if stop_distance > 0:
                position_size = kelly_position_value / stop_distance
            else:
                position_size = 0
            
            # Convert to position size percentage
            position_value = position_size * current_price
            size_pct = (position_value / float(portfolio_value)) * 100
            
            return PositionSizeResult(
                recommended_size=Decimal(str(round(position_size, 8))),
                size_pct=min(size_pct, self.settings.max_position_size_pct),
                method="kelly_criterion",
                kelly_fraction=kelly_fraction,
                volatility_adjusted=False,
                reasoning=f"Kelly fraction: {kelly_fraction:.4f}, Win prob: {win_prob:.2f}"
            )
        
        else:
            # Fixed percentage risk method
            risk_pct = 1.0  # Risk 1% of portfolio per trade
            risk_amount = float(portfolio_value) * (risk_pct / 100)
            
            # Position size based on stop distance
            if stop_distance > 0:
                position_size = risk_amount / stop_distance
            else:
                position_size = 0
            
            position_value = position_size * current_price
            size_pct = (position_value / float(portfolio_value)) * 100
            
            return PositionSizeResult(
                recommended_size=Decimal(str(round(position_size, 8))),
                size_pct=min(size_pct, self.settings.max_position_size_pct),
                method="fixed_percentage",
                reasoning=f"Fixed {risk_pct}% risk per trade"
            )
    
    def calculate_var(
        self,
        returns: list[float],
        confidence_level: float = 0.95,
        portfolio_value: float = 10000
    ) -> tuple[float, float]:
        """
        Calculate Value at Risk (VaR) and Conditional VaR (CVaR).
        
        Args:
            returns: Historical returns
            confidence_level: Confidence level (e.g., 0.95 for 95%)
            portfolio_value: Current portfolio value
            
        Returns:
            Tuple of (VaR, CVaR) in dollar amounts
        """
        if not returns or len(returns) < 2:
            return 0.0, 0.0
        
        returns_array = np.array(returns)
        
        # VaR using historical method
        var_pct = np.percentile(returns_array, (1 - confidence_level) * 100)
        var_amount = abs(var_pct * portfolio_value)
        
        # CVaR (Expected Shortfall)
        cvar_returns = returns_array[returns_array <= var_pct]
        if len(cvar_returns) > 0:
            cvar_pct = cvar_returns.mean()
            cvar_amount = abs(cvar_pct * portfolio_value)
        else:
            cvar_amount = var_amount
        
        return var_amount, cvar_amount
    
    def calculate_risk_metrics(
        self,
        positions: list[dict],
        historical_returns: list[float],
        portfolio_value: Decimal
    ) -> RiskMetrics:
        """Calculate comprehensive risk metrics for portfolio"""
        var_95, cvar_95 = self.calculate_var(
            historical_returns, 0.95, float(portfolio_value)
        )
        var_99, _ = self.calculate_var(
            historical_returns, 0.99, float(portfolio_value)
        )
        
        # Calculate exposure
        total_exposure = sum(
            abs(Decimal(str(p.get("value", 0)))) for p in positions
        )
        
        long_exposure = sum(
            Decimal(str(p.get("value", 0))) for p in positions
            if p.get("side") == "long"
        )
        short_exposure = sum(
            abs(Decimal(str(p.get("value", 0)))) for p in positions
            if p.get("side") == "short"
        )
        net_exposure = long_exposure - short_exposure
        
        gross_exposure_pct = float(total_exposure / portfolio_value) * 100 if portfolio_value > 0 else 0
        
        # Calculate drawdown
        current_drawdown = self._calculate_drawdown_pct()
        max_drawdown = self._get_max_drawdown()
        
        # Largest position
        if positions:
            largest_position = max(abs(float(p.get("value", 0))) for p in positions)
            largest_position_pct = (largest_position / float(portfolio_value)) * 100
        else:
            largest_position_pct = 0
        
        # Determine risk level
        if current_drawdown >= self.settings.max_drawdown_pct * 0.8:
            risk_level = RiskLevel.CRITICAL
        elif gross_exposure_pct > 80 or current_drawdown >= self.settings.max_drawdown_pct * 0.5:
            risk_level = RiskLevel.HIGH
        elif gross_exposure_pct > 50 or current_drawdown >= self.settings.max_drawdown_pct * 0.3:
            risk_level = RiskLevel.MODERATE
        else:
            risk_level = RiskLevel.LOW
        
        # Calculate Sharpe ratio (if enough data)
        sharpe = None
        if len(historical_returns) >= 30:
            returns_array = np.array(historical_returns)
            if returns_array.std() > 0:
                sharpe = (returns_array.mean() * 252) / (returns_array.std() * np.sqrt(252))
        
        return RiskMetrics(
            timestamp=datetime.now(timezone.utc),
            var_95=Decimal(str(round(var_95, 2))),
            var_99=Decimal(str(round(var_99, 2))),
            cvar_95=Decimal(str(round(cvar_95, 2))),
            total_exposure=total_exposure,
            net_exposure=net_exposure,
            gross_exposure_pct=gross_exposure_pct,
            current_drawdown_pct=current_drawdown,
            max_drawdown_pct=max_drawdown,
            sharpe_ratio=sharpe,
            largest_position_pct=largest_position_pct,
            overall_risk_level=risk_level
        )
    
    def _calculate_daily_pnl_pct(self) -> float:
        """Calculate current daily P&L percentage"""
        daily_pnl = self._portfolio_state.get("daily_pnl", Decimal("0"))
        total_equity = self._portfolio_state.get("total_equity", Decimal("10000"))
        
        if total_equity > 0:
            return float(daily_pnl / total_equity) * 100
        return 0.0
    
    def _calculate_drawdown_pct(self) -> float:
        """Calculate current drawdown percentage"""
        total_equity = self._portfolio_state.get("total_equity", Decimal("10000"))
        peak_equity = self._portfolio_state.get("peak_equity", total_equity)
        
        if peak_equity > 0:
            drawdown = (peak_equity - total_equity) / peak_equity * 100
            return float(max(0, drawdown))
        return 0.0
    
    def _get_max_drawdown(self) -> float:
        """Get maximum historical drawdown"""
        history = self._portfolio_state.get("position_history", [])
        if not history:
            return 0.0
        
        # Track peak and calculate max drawdown
        peak = 0
        max_dd = 0
        
        for entry in history:
            value = float(entry.get("equity", 0))
            if value > peak:
                peak = value
            if peak > 0:
                dd = (peak - value) / peak * 100
                max_dd = max(max_dd, dd)
        
        return max_dd
    
    def _check_cooldown(self, symbol: str) -> bool:
        """Check if cooldown period has elapsed for symbol"""
        positions = self._portfolio_state.get("open_positions", [])
        
        for pos in positions:
            if pos.get("symbol") == symbol:
                last_trade = pos.get("last_trade_time")
                if last_trade:
                    if isinstance(last_trade, str):
                        last_trade = datetime.fromisoformat(last_trade)
                    elapsed = (datetime.now(timezone.utc) - last_trade).total_seconds() / 60
                    if elapsed < self.settings.cooldown_minutes:
                        return True
        
        return False
    
    def _activate_kill_switch(self, reason: str) -> None:
        """Activate the kill switch"""
        self._kill_switch_active = True
        self._kill_switch_reason = reason
        logger.critical(f"KILL SWITCH ACTIVATED: {reason}")
    
    def reset_kill_switch(self) -> bool:
        """Reset the kill switch (manual override)"""
        if self._kill_switch_active:
            logger.warning("Kill switch reset manually")
            self._kill_switch_active = False
            self._kill_switch_reason = None
            return True
        return False
    
    def get_kill_switch_status(self) -> dict[str, Any]:
        """Get current kill switch status"""
        return {
            "active": self._kill_switch_active,
            "reason": self._kill_switch_reason,
            "daily_pnl_pct": self._calculate_daily_pnl_pct(),
            "drawdown_pct": self._calculate_drawdown_pct()
        }
    
    def update_portfolio_state(
        self,
        total_equity: Optional[Decimal] = None,
        daily_pnl: Optional[Decimal] = None,
        open_positions: Optional[list] = None
    ) -> None:
        """Update portfolio state for risk calculations"""
        if total_equity is not None:
            self._portfolio_state["total_equity"] = total_equity
            # Update peak
            if total_equity > self._portfolio_state.get("peak_equity", Decimal("0")):
                self._portfolio_state["peak_equity"] = total_equity
        
        if daily_pnl is not None:
            self._portfolio_state["daily_pnl"] = daily_pnl
        
        if open_positions is not None:
            self._portfolio_state["open_positions"] = open_positions
