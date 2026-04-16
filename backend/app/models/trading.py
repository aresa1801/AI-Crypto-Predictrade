"""
Trading Models - Trades, Positions, and Orders
"""

from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import Optional
import uuid

from sqlalchemy import String, Numeric, Integer, ForeignKey, Text, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class OrderSide(str, Enum):
    """Order side enum"""
    BUY = "buy"
    SELL = "sell"


class OrderType(str, Enum):
    """Order type enum"""
    MARKET = "market"
    LIMIT = "limit"
    STOP_LOSS = "stop_loss"
    TAKE_PROFIT = "take_profit"
    STOP_LIMIT = "stop_limit"


class OrderStatus(str, Enum):
    """Order status enum"""
    PENDING = "pending"
    OPEN = "open"
    FILLED = "filled"
    PARTIALLY_FILLED = "partially_filled"
    CANCELLED = "cancelled"
    REJECTED = "rejected"
    EXPIRED = "expired"


class PositionStatus(str, Enum):
    """Position status enum"""
    OPEN = "open"
    CLOSED = "closed"
    LIQUIDATED = "liquidated"


class MarketType(str, Enum):
    """Market type enum"""
    CEX = "cex"  # Centralized exchange (Binance, Bybit)
    POLYMARKET = "polymarket"  # Prediction market


class Order(Base):
    """Order model - represents a trading order"""
    
    __tablename__ = "orders"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    
    # Exchange info
    exchange: Mapped[str] = mapped_column(String(50), nullable=False)
    exchange_order_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    market_type: Mapped[str] = mapped_column(String(20), default=MarketType.CEX.value)
    
    # Order details
    symbol: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    side: Mapped[str] = mapped_column(String(10), nullable=False)
    order_type: Mapped[str] = mapped_column(String(20), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default=OrderStatus.PENDING.value, index=True)
    
    # Pricing
    quantity: Mapped[Decimal] = mapped_column(Numeric(20, 8), nullable=False)
    price: Mapped[Optional[Decimal]] = mapped_column(Numeric(20, 8), nullable=True)
    stop_price: Mapped[Optional[Decimal]] = mapped_column(Numeric(20, 8), nullable=True)
    filled_quantity: Mapped[Decimal] = mapped_column(Numeric(20, 8), default=Decimal("0"))
    average_fill_price: Mapped[Optional[Decimal]] = mapped_column(Numeric(20, 8), nullable=True)
    
    # Fees
    fee: Mapped[Decimal] = mapped_column(Numeric(20, 8), default=Decimal("0"))
    fee_currency: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    
    # Risk management
    stop_loss: Mapped[Optional[Decimal]] = mapped_column(Numeric(20, 8), nullable=True)
    take_profit: Mapped[Optional[Decimal]] = mapped_column(Numeric(20, 8), nullable=True)
    
    # AI/Strategy info
    strategy_id: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    signal_confidence: Mapped[Optional[float]] = mapped_column(Numeric(5, 4), nullable=True)
    ai_reasoning: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Metadata
    metadata: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    
    # Relationships
    position_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("positions.id"),
        nullable=True
    )
    
    __table_args__ = (
        Index("idx_orders_symbol_status", "symbol", "status"),
        Index("idx_orders_exchange_created", "exchange", "created_at"),
    )


class Position(Base):
    """Position model - represents an open or closed trading position"""
    
    __tablename__ = "positions"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    
    # Exchange info
    exchange: Mapped[str] = mapped_column(String(50), nullable=False)
    market_type: Mapped[str] = mapped_column(String(20), default=MarketType.CEX.value)
    
    # Position details
    symbol: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    side: Mapped[str] = mapped_column(String(10), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default=PositionStatus.OPEN.value, index=True)
    
    # Size and pricing
    quantity: Mapped[Decimal] = mapped_column(Numeric(20, 8), nullable=False)
    entry_price: Mapped[Decimal] = mapped_column(Numeric(20, 8), nullable=False)
    current_price: Mapped[Optional[Decimal]] = mapped_column(Numeric(20, 8), nullable=True)
    exit_price: Mapped[Optional[Decimal]] = mapped_column(Numeric(20, 8), nullable=True)
    
    # Risk management
    stop_loss: Mapped[Optional[Decimal]] = mapped_column(Numeric(20, 8), nullable=True)
    take_profit: Mapped[Optional[Decimal]] = mapped_column(Numeric(20, 8), nullable=True)
    trailing_stop_pct: Mapped[Optional[float]] = mapped_column(Numeric(5, 2), nullable=True)
    
    # P&L
    realized_pnl: Mapped[Decimal] = mapped_column(Numeric(20, 8), default=Decimal("0"))
    unrealized_pnl: Mapped[Decimal] = mapped_column(Numeric(20, 8), default=Decimal("0"))
    total_fees: Mapped[Decimal] = mapped_column(Numeric(20, 8), default=Decimal("0"))
    
    # Risk metrics
    risk_amount: Mapped[Optional[Decimal]] = mapped_column(Numeric(20, 8), nullable=True)
    risk_reward_ratio: Mapped[Optional[float]] = mapped_column(Numeric(5, 2), nullable=True)
    
    # Timestamps
    closed_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    
    # Metadata
    metadata: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    
    # Relationships
    orders: Mapped[list["Order"]] = relationship("Order", backref="position", lazy="selectin")
    
    __table_args__ = (
        Index("idx_positions_symbol_status", "symbol", "status"),
        Index("idx_positions_exchange_created", "exchange", "created_at"),
    )


class Trade(Base):
    """Trade model - represents a completed trade (for historical records)"""
    
    __tablename__ = "trades"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    
    # Exchange info
    exchange: Mapped[str] = mapped_column(String(50), nullable=False)
    market_type: Mapped[str] = mapped_column(String(20), default=MarketType.CEX.value)
    
    # Trade details
    symbol: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    side: Mapped[str] = mapped_column(String(10), nullable=False)
    
    # Entry
    entry_price: Mapped[Decimal] = mapped_column(Numeric(20, 8), nullable=False)
    entry_quantity: Mapped[Decimal] = mapped_column(Numeric(20, 8), nullable=False)
    entry_time: Mapped[datetime] = mapped_column(nullable=False)
    
    # Exit
    exit_price: Mapped[Decimal] = mapped_column(Numeric(20, 8), nullable=False)
    exit_quantity: Mapped[Decimal] = mapped_column(Numeric(20, 8), nullable=False)
    exit_time: Mapped[datetime] = mapped_column(nullable=False)
    
    # P&L
    pnl: Mapped[Decimal] = mapped_column(Numeric(20, 8), nullable=False)
    pnl_percentage: Mapped[float] = mapped_column(Numeric(10, 4), nullable=False)
    total_fees: Mapped[Decimal] = mapped_column(Numeric(20, 8), default=Decimal("0"))
    
    # Risk metrics
    risk_amount: Mapped[Optional[Decimal]] = mapped_column(Numeric(20, 8), nullable=True)
    risk_reward_achieved: Mapped[Optional[float]] = mapped_column(Numeric(5, 2), nullable=True)
    
    # Strategy info
    strategy_id: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    signal_confidence: Mapped[Optional[float]] = mapped_column(Numeric(5, 4), nullable=True)
    
    # Linked position
    position_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        nullable=True
    )
    
    # Metadata
    metadata: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    
    __table_args__ = (
        Index("idx_trades_symbol_entry", "symbol", "entry_time"),
        Index("idx_trades_exchange_entry", "exchange", "entry_time"),
    )
