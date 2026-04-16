"""
Bot Models - Bot configuration, state, and logs
"""

from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import Optional
import uuid

from sqlalchemy import String, Numeric, Text, Boolean, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class BotStatus(str, Enum):
    """Bot status enum"""
    STOPPED = "stopped"
    RUNNING = "running"
    PAUSED = "paused"
    ERROR = "error"
    MAINTENANCE = "maintenance"


class LogLevel(str, Enum):
    """Log level enum"""
    DEBUG = "debug"
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


class BotConfig(Base):
    """Bot configuration model"""
    
    __tablename__ = "bot_configs"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    
    name: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    
    # Trading settings
    enabled_exchanges: Mapped[list] = mapped_column(JSONB, default=list)
    enabled_symbols: Mapped[list] = mapped_column(JSONB, default=list)
    
    # Risk parameters
    max_position_size_pct: Mapped[float] = mapped_column(Numeric(5, 2), default=2.0)
    daily_loss_limit_pct: Mapped[float] = mapped_column(Numeric(5, 2), default=5.0)
    max_drawdown_pct: Mapped[float] = mapped_column(Numeric(5, 2), default=15.0)
    min_risk_reward: Mapped[float] = mapped_column(Numeric(5, 2), default=1.5)
    
    # AI settings
    ai_model: Mapped[str] = mapped_column(String(100), default="openai/gpt-4-turbo-preview")
    ai_temperature: Mapped[float] = mapped_column(Numeric(3, 2), default=0.7)
    confidence_threshold: Mapped[float] = mapped_column(Numeric(3, 2), default=0.7)
    
    # Timing
    analysis_interval_seconds: Mapped[int] = mapped_column(default=60)
    cooldown_minutes: Mapped[int] = mapped_column(default=5)
    
    # Full configuration JSON
    config: Mapped[dict] = mapped_column(JSONB, default=dict)


class BotState(Base):
    """Bot runtime state model"""
    
    __tablename__ = "bot_states"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    
    config_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        nullable=False,
        index=True
    )
    
    # Status
    status: Mapped[str] = mapped_column(
        String(20),
        default=BotStatus.STOPPED.value,
        index=True
    )
    last_heartbeat: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    
    # Performance metrics
    total_trades: Mapped[int] = mapped_column(default=0)
    winning_trades: Mapped[int] = mapped_column(default=0)
    losing_trades: Mapped[int] = mapped_column(default=0)
    
    # P&L
    total_pnl: Mapped[Decimal] = mapped_column(Numeric(20, 8), default=Decimal("0"))
    daily_pnl: Mapped[Decimal] = mapped_column(Numeric(20, 8), default=Decimal("0"))
    unrealized_pnl: Mapped[Decimal] = mapped_column(Numeric(20, 8), default=Decimal("0"))
    
    # Risk state
    current_drawdown_pct: Mapped[float] = mapped_column(Numeric(5, 2), default=0.0)
    peak_equity: Mapped[Decimal] = mapped_column(Numeric(20, 8), default=Decimal("0"))
    daily_loss_pct: Mapped[float] = mapped_column(Numeric(5, 2), default=0.0)
    
    # Kill switch
    kill_switch_active: Mapped[bool] = mapped_column(Boolean, default=False)
    kill_switch_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    kill_switch_activated_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    
    # Active positions/orders count
    open_positions: Mapped[int] = mapped_column(default=0)
    pending_orders: Mapped[int] = mapped_column(default=0)
    
    # Connection status
    exchange_connections: Mapped[dict] = mapped_column(JSONB, default=dict)
    
    # Runtime state
    state_data: Mapped[dict] = mapped_column(JSONB, default=dict)


class BotLog(Base):
    """Bot activity log model"""
    
    __tablename__ = "bot_logs"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    
    config_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        nullable=True,
        index=True
    )
    
    # Log info
    level: Mapped[str] = mapped_column(String(10), default=LogLevel.INFO.value, index=True)
    component: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    
    # Context
    context: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    
    # Error details
    error_type: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    error_traceback: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Related entities
    trade_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    order_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    position_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    
    __table_args__ = (
        Index("idx_bot_logs_level_created", "level", "created_at"),
        Index("idx_bot_logs_component_created", "component", "created_at"),
    )
