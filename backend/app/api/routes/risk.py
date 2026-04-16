"""
Risk Management API Routes

Endpoints for risk management:
- Risk metrics
- Safeguard status
- Kill switch control
"""

from datetime import datetime, timezone
from typing import Any, Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

router = APIRouter(prefix="/risk", tags=["Risk Management"])


class RiskMetricsResponse(BaseModel):
    """Risk metrics response"""
    timestamp: str
    
    # Value at Risk
    var_95: float
    var_99: float
    cvar_95: float
    
    # Portfolio metrics
    total_exposure: float
    net_exposure: float
    gross_exposure_pct: float
    
    # Drawdown
    current_drawdown_pct: float
    max_drawdown_pct: float
    
    # Performance ratios
    sharpe_ratio: Optional[float] = None
    sortino_ratio: Optional[float] = None
    
    # Risk level
    overall_risk_level: str


class SafeguardStatusResponse(BaseModel):
    """Safeguard status response"""
    kill_switch: dict
    safeguards: dict
    portfolio: dict
    daily_stats: Optional[dict] = None


class KillSwitchRequest(BaseModel):
    """Kill switch control request"""
    action: str = Field(..., description="Action: activate, reset")
    reason: Optional[str] = Field(None, description="Reason for activation")
    force: bool = Field(default=False, description="Force reset")


class PositionSizeRequest(BaseModel):
    """Position size calculation request"""
    portfolio_value: float
    entry_price: float
    stop_loss: float
    risk_pct: float = Field(default=1.0, ge=0.1, le=5.0)


class PositionSizeResponse(BaseModel):
    """Position size calculation response"""
    position_size: float
    position_size_pct: float
    risk_amount: float
    potential_loss: float


# Mock state
_risk_state = {
    "kill_switch_active": False,
    "kill_switch_reason": None,
    "current_drawdown": 0.0,
    "daily_loss": 0.0
}


@router.get("/metrics", response_model=RiskMetricsResponse)
async def get_risk_metrics() -> RiskMetricsResponse:
    """Get current risk metrics"""
    return RiskMetricsResponse(
        timestamp=datetime.now(timezone.utc).isoformat(),
        var_95=1500.0,
        var_99=2500.0,
        cvar_95=2000.0,
        total_exposure=5000.0,
        net_exposure=3000.0,
        gross_exposure_pct=50.0,
        current_drawdown_pct=_risk_state["current_drawdown"],
        max_drawdown_pct=5.0,
        sharpe_ratio=1.5,
        sortino_ratio=2.0,
        overall_risk_level="moderate"
    )


@router.get("/safeguards", response_model=SafeguardStatusResponse)
async def get_safeguard_status() -> SafeguardStatusResponse:
    """Get safeguard status"""
    return SafeguardStatusResponse(
        kill_switch={
            "active": _risk_state["kill_switch_active"],
            "reason": _risk_state["kill_switch_reason"],
            "triggered_at": None
        },
        safeguards={
            "daily_loss_limit": {
                "status": "active",
                "current_value": _risk_state["daily_loss"],
                "threshold": 5.0,
                "utilization_pct": _risk_state["daily_loss"] / 5.0 * 100
            },
            "max_drawdown": {
                "status": "active",
                "current_value": _risk_state["current_drawdown"],
                "threshold": 15.0,
                "utilization_pct": _risk_state["current_drawdown"] / 15.0 * 100
            },
            "max_positions": {
                "status": "active",
                "current_value": 3,
                "threshold": 10,
                "utilization_pct": 30.0
            }
        },
        portfolio={
            "current_equity": 10500.0,
            "peak_equity": 11000.0,
            "drawdown_pct": 4.5
        },
        daily_stats={
            "date": datetime.now(timezone.utc).date().isoformat(),
            "pnl_pct": 2.5,
            "total_trades": 5,
            "win_rate": 60.0
        }
    )


@router.post("/kill-switch")
async def control_kill_switch(request: KillSwitchRequest) -> dict[str, Any]:
    """Control the kill switch"""
    if request.action == "activate":
        _risk_state["kill_switch_active"] = True
        _risk_state["kill_switch_reason"] = request.reason or "Manual activation"
        return {
            "success": True,
            "message": "Kill switch activated",
            "reason": _risk_state["kill_switch_reason"]
        }
    
    elif request.action == "reset":
        if not _risk_state["kill_switch_active"]:
            return {
                "success": False,
                "message": "Kill switch is not active"
            }
        
        # Check conditions for reset (unless forced)
        if not request.force:
            if _risk_state["daily_loss"] >= 5.0:
                raise HTTPException(
                    status_code=400,
                    detail="Cannot reset: Daily loss limit still breached. Use force=true to override."
                )
        
        _risk_state["kill_switch_active"] = False
        _risk_state["kill_switch_reason"] = None
        return {
            "success": True,
            "message": "Kill switch reset",
            "forced": request.force
        }
    
    else:
        raise HTTPException(status_code=400, detail="Invalid action. Use 'activate' or 'reset'")


@router.get("/kill-switch/status")
async def get_kill_switch_status() -> dict[str, Any]:
    """Get kill switch status"""
    return {
        "active": _risk_state["kill_switch_active"],
        "reason": _risk_state["kill_switch_reason"],
        "daily_pnl_pct": -_risk_state["daily_loss"],
        "drawdown_pct": _risk_state["current_drawdown"]
    }


@router.post("/position-size", response_model=PositionSizeResponse)
async def calculate_position_size(request: PositionSizeRequest) -> PositionSizeResponse:
    """Calculate optimal position size"""
    # Calculate risk amount
    risk_amount = request.portfolio_value * (request.risk_pct / 100)
    
    # Calculate stop distance
    stop_distance = abs(request.entry_price - request.stop_loss)
    
    if stop_distance == 0:
        raise HTTPException(status_code=400, detail="Stop loss cannot equal entry price")
    
    # Position size
    position_size = risk_amount / stop_distance
    
    # Position value and percentage
    position_value = position_size * request.entry_price
    position_size_pct = (position_value / request.portfolio_value) * 100
    
    # Cap at max (2%)
    max_position_pct = 2.0
    if position_size_pct > max_position_pct:
        position_size = position_size * (max_position_pct / position_size_pct)
        position_size_pct = max_position_pct
    
    return PositionSizeResponse(
        position_size=round(position_size, 8),
        position_size_pct=round(position_size_pct, 2),
        risk_amount=round(risk_amount, 2),
        potential_loss=round(position_size * stop_distance, 2)
    )


@router.get("/var/calculate")
async def calculate_var(
    confidence_level: float = Query(default=0.95, ge=0.9, le=0.99),
    portfolio_value: float = Query(default=10000),
    period_days: int = Query(default=1, ge=1, le=30)
) -> dict[str, Any]:
    """Calculate Value at Risk"""
    # Mock calculation
    daily_volatility = 0.02  # 2% daily volatility
    
    import math
    # Simple parametric VaR
    z_score = {0.95: 1.645, 0.99: 2.326}.get(confidence_level, 1.645)
    var = portfolio_value * daily_volatility * z_score * math.sqrt(period_days)
    
    return {
        "confidence_level": confidence_level,
        "period_days": period_days,
        "portfolio_value": portfolio_value,
        "var": round(var, 2),
        "var_pct": round((var / portfolio_value) * 100, 2),
        "method": "parametric"
    }


@router.get("/exposure")
async def get_exposure_analysis() -> dict[str, Any]:
    """Get portfolio exposure analysis"""
    return {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "total_exposure": 5000.0,
        "long_exposure": 4000.0,
        "short_exposure": 1000.0,
        "net_exposure": 3000.0,
        "exposure_by_asset": {
            "BTC/USDT": {"value": 3000.0, "pct": 30.0},
            "ETH/USDT": {"value": 2000.0, "pct": 20.0}
        },
        "exposure_by_exchange": {
            "binance": {"value": 4000.0, "pct": 40.0},
            "polymarket": {"value": 1000.0, "pct": 10.0}
        }
    }


@router.post("/simulate")
async def run_risk_simulation(
    portfolio_value: float = 10000,
    num_trades: int = 100,
    win_rate: float = 0.6,
    avg_win_pct: float = 2.0,
    avg_loss_pct: float = 1.0,
    num_simulations: int = 1000
) -> dict[str, Any]:
    """Run Monte Carlo risk simulation"""
    import numpy as np
    
    results = []
    for _ in range(num_simulations):
        equity = portfolio_value
        for _ in range(num_trades):
            if np.random.random() < win_rate:
                equity *= (1 + avg_win_pct / 100)
            else:
                equity *= (1 - avg_loss_pct / 100)
        results.append(equity)
    
    results = np.array(results)
    
    return {
        "parameters": {
            "portfolio_value": portfolio_value,
            "num_trades": num_trades,
            "win_rate": win_rate,
            "avg_win_pct": avg_win_pct,
            "avg_loss_pct": avg_loss_pct,
            "num_simulations": num_simulations
        },
        "results": {
            "mean_final_equity": round(float(results.mean()), 2),
            "median_final_equity": round(float(np.median(results)), 2),
            "std_dev": round(float(results.std()), 2),
            "min_equity": round(float(results.min()), 2),
            "max_equity": round(float(results.max()), 2),
            "percentile_5": round(float(np.percentile(results, 5)), 2),
            "percentile_95": round(float(np.percentile(results, 95)), 2),
            "prob_profit": round(float((results > portfolio_value).mean()) * 100, 1),
            "prob_loss_50pct": round(float((results < portfolio_value * 0.5).mean()) * 100, 1)
        }
    }
