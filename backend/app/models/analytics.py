"""
Analytics Models - Performance and Risk Metrics
"""

from datetime import datetime, date
from decimal import Decimal
from typing import Optional
import uuid

from sqlalchemy import String, Numeric, Date, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class PerformanceMetric(Base):
    """Daily performance metrics for tracking and analytics"""
    
    __tablename__ = "performance_metrics"
    
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
    
    # Date
    metric_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    
    # Portfolio value
    starting_equity: Mapped[Decimal] = mapped_column(Numeric(20, 8), nullable=False)
    ending_equity: Mapped[Decimal] = mapped_column(Numeric(20, 8), nullable=False)
    peak_equity: Mapped[Decimal] = mapped_column(Numeric(20, 8), nullable=False)
    trough_equity: Mapped[Decimal] = mapped_column(Numeric(20, 8), nullable=False)
    
    # P&L
    realized_pnl: Mapped[Decimal] = mapped_column(Numeric(20, 8), default=Decimal("0"))
    unrealized_pnl: Mapped[Decimal] = mapped_column(Numeric(20, 8), default=Decimal("0"))
    total_fees: Mapped[Decimal] = mapped_column(Numeric(20, 8), default=Decimal("0"))
    
    # Trade statistics
    total_trades: Mapped[int] = mapped_column(default=0)
    winning_trades: Mapped[int] = mapped_column(default=0)
    losing_trades: Mapped[int] = mapped_column(default=0)
    
    # Win rate
    win_rate: Mapped[float] = mapped_column(Numeric(5, 4), default=0.0)
    
    # Average trade metrics
    avg_win: Mapped[Decimal] = mapped_column(Numeric(20, 8), default=Decimal("0"))
    avg_loss: Mapped[Decimal] = mapped_column(Numeric(20, 8), default=Decimal("0"))
    largest_win: Mapped[Decimal] = mapped_column(Numeric(20, 8), default=Decimal("0"))
    largest_loss: Mapped[Decimal] = mapped_column(Numeric(20, 8), default=Decimal("0"))
    
    # Risk metrics
    profit_factor: Mapped[float] = mapped_column(Numeric(10, 4), default=0.0)
    expectancy: Mapped[Decimal] = mapped_column(Numeric(20, 8), default=Decimal("0"))
    
    # Drawdown
    max_drawdown_pct: Mapped[float] = mapped_column(Numeric(5, 2), default=0.0)
    max_drawdown_amount: Mapped[Decimal] = mapped_column(Numeric(20, 8), default=Decimal("0"))
    
    # Ratios
    sharpe_ratio: Mapped[Optional[float]] = mapped_column(Numeric(10, 4), nullable=True)
    sortino_ratio: Mapped[Optional[float]] = mapped_column(Numeric(10, 4), nullable=True)
    calmar_ratio: Mapped[Optional[float]] = mapped_column(Numeric(10, 4), nullable=True)
    
    # Market breakdown
    breakdown_by_symbol: Mapped[dict] = mapped_column(JSONB, default=dict)
    breakdown_by_exchange: Mapped[dict] = mapped_column(JSONB, default=dict)
    
    __table_args__ = (
        Index("idx_perf_config_date", "config_id", "metric_date", unique=True),
    )


class RiskMetric(Base):
    """Real-time risk metrics snapshot"""
    
    __tablename__ = "risk_metrics"
    
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
    
    # Timestamp
    snapshot_time: Mapped[datetime] = mapped_column(nullable=False, index=True)
    
    # Portfolio exposure
    total_exposure: Mapped[Decimal] = mapped_column(Numeric(20, 8), default=Decimal("0"))
    net_exposure: Mapped[Decimal] = mapped_column(Numeric(20, 8), default=Decimal("0"))
    gross_exposure_pct: Mapped[float] = mapped_column(Numeric(5, 2), default=0.0)
    
    # Position metrics
    open_positions_count: Mapped[int] = mapped_column(default=0)
    long_positions_count: Mapped[int] = mapped_column(default=0)
    short_positions_count: Mapped[int] = mapped_column(default=0)
    
    # Risk metrics
    var_95: Mapped[Decimal] = mapped_column(Numeric(20, 8), default=Decimal("0"))  # Value at Risk 95%
    var_99: Mapped[Decimal] = mapped_column(Numeric(20, 8), default=Decimal("0"))  # Value at Risk 99%
    cvar_95: Mapped[Decimal] = mapped_column(Numeric(20, 8), default=Decimal("0"))  # Conditional VaR 95%
    
    # Volatility
    portfolio_volatility: Mapped[float] = mapped_column(Numeric(10, 6), default=0.0)
    beta: Mapped[Optional[float]] = mapped_column(Numeric(10, 6), nullable=True)
    
    # Correlation
    correlation_matrix: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    
    # Concentration
    largest_position_pct: Mapped[float] = mapped_column(Numeric(5, 2), default=0.0)
    top_3_concentration_pct: Mapped[float] = mapped_column(Numeric(5, 2), default=0.0)
    
    # Liquidity
    avg_position_liquidity_score: Mapped[float] = mapped_column(Numeric(5, 2), default=0.0)
    
    # By-symbol breakdown
    risk_by_symbol: Mapped[dict] = mapped_column(JSONB, default=dict)
    
    __table_args__ = (
        Index("idx_risk_config_time", "config_id", "snapshot_time"),
    )
