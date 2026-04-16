"""
Order Manager Module

Centralized order management with validation, execution, and tracking.
Enforces risk management rules before order execution.
"""

import asyncio
from dataclasses import dataclass
from datetime import datetime, timezone
from decimal import Decimal
from enum import Enum
from typing import Optional
import logging
import uuid

from app.core.config import settings
from app.models.trading import Order, OrderSide, OrderType, OrderStatus
from app.services.execution.cex_connector import CEXConnector, OrderResult, ExchangeType
from app.services.execution.polymarket_connector import PolymarketConnector, TradeResult

logger = logging.getLogger(__name__)


class ExecutionVenue(str, Enum):
    """Execution venue type"""
    BINANCE = "binance"
    BYBIT = "bybit"
    POLYMARKET = "polymarket"


@dataclass
class OrderRequest:
    """Order request with all parameters"""
    venue: ExecutionVenue
    symbol: str
    side: OrderSide
    order_type: OrderType
    quantity: Decimal
    price: Optional[Decimal] = None
    stop_price: Optional[Decimal] = None
    stop_loss: Optional[Decimal] = None
    take_profit: Optional[Decimal] = None
    
    # AI/Strategy metadata
    strategy_id: Optional[str] = None
    signal_confidence: Optional[float] = None
    ai_reasoning: Optional[str] = None
    
    # Risk validation
    risk_amount: Optional[Decimal] = None
    position_size_pct: Optional[float] = None


@dataclass
class OrderResponse:
    """Order execution response"""
    success: bool
    order_id: str
    venue: ExecutionVenue
    symbol: str
    side: OrderSide
    status: OrderStatus
    filled_quantity: Decimal
    average_price: Optional[Decimal]
    fee: Decimal
    error_message: Optional[str] = None
    validation_errors: list[str] = None
    
    def __post_init__(self):
        if self.validation_errors is None:
            self.validation_errors = []


class OrderValidator:
    """Validates orders against risk management rules"""
    
    def __init__(self):
        self.risk_settings = settings.risk
    
    def validate(
        self,
        request: OrderRequest,
        current_balance: Decimal,
        open_positions: int,
        daily_pnl_pct: float,
        current_drawdown_pct: float
    ) -> tuple[bool, list[str]]:
        """
        Validate order against risk rules
        
        Returns:
            Tuple of (is_valid, list of validation errors)
        """
        errors = []
        
        # Check kill switch conditions
        if abs(daily_pnl_pct) >= self.risk_settings.daily_loss_limit_pct:
            errors.append(
                f"Daily loss limit reached ({daily_pnl_pct:.2f}% >= {self.risk_settings.daily_loss_limit_pct}%)"
            )
        
        if current_drawdown_pct >= self.risk_settings.max_drawdown_pct:
            errors.append(
                f"Max drawdown reached ({current_drawdown_pct:.2f}% >= {self.risk_settings.max_drawdown_pct}%)"
            )
        
        # Check position limits
        if open_positions >= self.risk_settings.max_open_positions:
            errors.append(
                f"Max open positions reached ({open_positions} >= {self.risk_settings.max_open_positions})"
            )
        
        # Check position size
        if request.position_size_pct:
            if request.position_size_pct > self.risk_settings.max_position_size_pct:
                errors.append(
                    f"Position size too large ({request.position_size_pct:.2f}% > {self.risk_settings.max_position_size_pct}%)"
                )
        
        # Validate order has stop-loss for market orders
        if request.order_type == OrderType.MARKET:
            if not request.stop_loss:
                errors.append("Market orders must have a stop-loss defined")
        
        # Check risk/reward ratio
        if request.stop_loss and request.take_profit and request.price:
            risk = abs(request.price - request.stop_loss)
            reward = abs(request.take_profit - request.price)
            
            if risk > 0:
                rr_ratio = float(reward / risk)
                if rr_ratio < self.risk_settings.min_risk_reward_ratio:
                    errors.append(
                        f"Risk/reward ratio too low ({rr_ratio:.2f} < {self.risk_settings.min_risk_reward_ratio})"
                    )
        
        # Check signal confidence
        if request.signal_confidence:
            min_confidence = 0.6  # Minimum 60% confidence
            if request.signal_confidence < min_confidence:
                errors.append(
                    f"Signal confidence too low ({request.signal_confidence:.2f} < {min_confidence})"
                )
        
        return len(errors) == 0, errors


class OrderManager:
    """
    Centralized order management system.
    Handles validation, execution, and tracking across all venues.
    """
    
    def __init__(self):
        self._cex_connectors: dict[str, CEXConnector] = {}
        self._polymarket: Optional[PolymarketConnector] = None
        self._validator = OrderValidator()
        self._pending_orders: dict[str, OrderRequest] = {}
        self._order_history: list[OrderResponse] = []
        
    async def initialize(self, venues: list[ExecutionVenue]) -> None:
        """Initialize connections to execution venues"""
        for venue in venues:
            if venue == ExecutionVenue.BINANCE:
                connector = CEXConnector(ExchangeType.BINANCE)
                if await connector.connect():
                    self._cex_connectors["binance"] = connector
                    logger.info("Binance connector initialized")
                    
            elif venue == ExecutionVenue.BYBIT:
                connector = CEXConnector(ExchangeType.BYBIT)
                if await connector.connect():
                    self._cex_connectors["bybit"] = connector
                    logger.info("Bybit connector initialized")
                    
            elif venue == ExecutionVenue.POLYMARKET:
                self._polymarket = PolymarketConnector()
                if await self._polymarket.connect():
                    logger.info("Polymarket connector initialized")
    
    async def shutdown(self) -> None:
        """Close all connections"""
        for connector in self._cex_connectors.values():
            await connector.disconnect()
        
        if self._polymarket:
            await self._polymarket.disconnect()
        
        self._cex_connectors.clear()
        self._polymarket = None
        logger.info("Order manager shutdown complete")
    
    async def submit_order(
        self,
        request: OrderRequest,
        current_balance: Decimal,
        open_positions: int,
        daily_pnl_pct: float,
        current_drawdown_pct: float,
        skip_validation: bool = False
    ) -> OrderResponse:
        """
        Submit and execute an order
        
        Args:
            request: Order request details
            current_balance: Current account balance
            open_positions: Number of open positions
            daily_pnl_pct: Current daily P&L percentage
            current_drawdown_pct: Current drawdown percentage
            skip_validation: Skip risk validation (for emergency orders)
            
        Returns:
            OrderResponse with execution results
        """
        order_id = str(uuid.uuid4())
        
        # Validate order
        if not skip_validation:
            is_valid, errors = self._validator.validate(
                request,
                current_balance,
                open_positions,
                daily_pnl_pct,
                current_drawdown_pct
            )
            
            if not is_valid:
                logger.warning(f"Order validation failed: {errors}")
                return OrderResponse(
                    success=False,
                    order_id=order_id,
                    venue=request.venue,
                    symbol=request.symbol,
                    side=request.side,
                    status=OrderStatus.REJECTED,
                    filled_quantity=Decimal("0"),
                    average_price=None,
                    fee=Decimal("0"),
                    error_message="Validation failed",
                    validation_errors=errors
                )
        
        # Execute order based on venue
        try:
            if request.venue in [ExecutionVenue.BINANCE, ExecutionVenue.BYBIT]:
                return await self._execute_cex_order(order_id, request)
            elif request.venue == ExecutionVenue.POLYMARKET:
                return await self._execute_polymarket_order(order_id, request)
            else:
                return OrderResponse(
                    success=False,
                    order_id=order_id,
                    venue=request.venue,
                    symbol=request.symbol,
                    side=request.side,
                    status=OrderStatus.REJECTED,
                    filled_quantity=Decimal("0"),
                    average_price=None,
                    fee=Decimal("0"),
                    error_message=f"Unsupported venue: {request.venue}"
                )
                
        except Exception as e:
            logger.error(f"Order execution error: {e}")
            return OrderResponse(
                success=False,
                order_id=order_id,
                venue=request.venue,
                symbol=request.symbol,
                side=request.side,
                status=OrderStatus.REJECTED,
                filled_quantity=Decimal("0"),
                average_price=None,
                fee=Decimal("0"),
                error_message=str(e)
            )
    
    async def _execute_cex_order(
        self,
        order_id: str,
        request: OrderRequest
    ) -> OrderResponse:
        """Execute order on CEX"""
        connector = self._cex_connectors.get(request.venue.value)
        
        if not connector or not connector.is_connected:
            return OrderResponse(
                success=False,
                order_id=order_id,
                venue=request.venue,
                symbol=request.symbol,
                side=request.side,
                status=OrderStatus.REJECTED,
                filled_quantity=Decimal("0"),
                average_price=None,
                fee=Decimal("0"),
                error_message=f"Not connected to {request.venue.value}"
            )
        
        # Place main order
        result = await connector.place_order(
            symbol=request.symbol,
            side=request.side,
            order_type=request.order_type,
            quantity=request.quantity,
            price=request.price,
            stop_price=request.stop_price
        )
        
        # If successful and stop-loss defined, place stop-loss order
        if result.success and request.stop_loss:
            await connector.place_order(
                symbol=request.symbol,
                side=OrderSide.SELL if request.side == OrderSide.BUY else OrderSide.BUY,
                order_type=OrderType.STOP_LOSS,
                quantity=request.quantity,
                stop_price=request.stop_loss
            )
        
        # If successful and take-profit defined, place take-profit order
        if result.success and request.take_profit:
            await connector.place_order(
                symbol=request.symbol,
                side=OrderSide.SELL if request.side == OrderSide.BUY else OrderSide.BUY,
                order_type=OrderType.TAKE_PROFIT,
                quantity=request.quantity,
                price=request.take_profit
            )
        
        return OrderResponse(
            success=result.success,
            order_id=order_id,
            venue=request.venue,
            symbol=request.symbol,
            side=request.side,
            status=result.status,
            filled_quantity=result.filled_quantity,
            average_price=result.average_price,
            fee=result.fee,
            error_message=result.error_message
        )
    
    async def _execute_polymarket_order(
        self,
        order_id: str,
        request: OrderRequest
    ) -> OrderResponse:
        """Execute order on Polymarket"""
        if not self._polymarket or not self._polymarket.is_connected:
            return OrderResponse(
                success=False,
                order_id=order_id,
                venue=request.venue,
                symbol=request.symbol,
                side=request.side,
                status=OrderStatus.REJECTED,
                filled_quantity=Decimal("0"),
                average_price=None,
                fee=Decimal("0"),
                error_message="Not connected to Polymarket"
            )
        
        # Parse symbol to get market_id and outcome
        # Expected format: "{market_id}_{YES/NO}"
        parts = request.symbol.split("_")
        if len(parts) < 2:
            return OrderResponse(
                success=False,
                order_id=order_id,
                venue=request.venue,
                symbol=request.symbol,
                side=request.side,
                status=OrderStatus.REJECTED,
                filled_quantity=Decimal("0"),
                average_price=None,
                fee=Decimal("0"),
                error_message="Invalid Polymarket symbol format"
            )
        
        from app.services.execution.polymarket_connector import MarketOutcome
        
        market_id = "_".join(parts[:-1])
        outcome = MarketOutcome(parts[-1].lower())
        
        result = await self._polymarket.place_order(
            market_id=market_id,
            outcome=outcome,
            side=request.side.value,
            shares=request.quantity,
            price=request.price or Decimal("0.5")
        )
        
        return OrderResponse(
            success=result.success,
            order_id=order_id,
            venue=request.venue,
            symbol=request.symbol,
            side=request.side,
            status=OrderStatus.FILLED if result.success else OrderStatus.REJECTED,
            filled_quantity=result.shares if result.success else Decimal("0"),
            average_price=result.price if result.success else None,
            fee=result.fee,
            error_message=result.error_message
        )
    
    async def cancel_order(
        self,
        venue: ExecutionVenue,
        symbol: str,
        order_id: str
    ) -> bool:
        """Cancel an open order"""
        if venue in [ExecutionVenue.BINANCE, ExecutionVenue.BYBIT]:
            connector = self._cex_connectors.get(venue.value)
            if connector:
                return await connector.cancel_order(symbol, order_id)
                
        elif venue == ExecutionVenue.POLYMARKET:
            if self._polymarket:
                return await self._polymarket.cancel_order(order_id)
        
        return False
    
    async def get_open_orders(
        self,
        venue: Optional[ExecutionVenue] = None
    ) -> list[dict]:
        """Get all open orders"""
        orders = []
        
        # Get from CEX connectors
        for name, connector in self._cex_connectors.items():
            if venue and venue.value != name:
                continue
            if connector.is_connected:
                # Would need to implement fetch_open_orders in connector
                pass
        
        return orders
    
    def get_connection_status(self) -> dict[str, bool]:
        """Get connection status for all venues"""
        status = {}
        
        for name, connector in self._cex_connectors.items():
            status[name] = connector.is_connected
        
        if self._polymarket:
            status["polymarket"] = self._polymarket.is_connected
        
        return status
