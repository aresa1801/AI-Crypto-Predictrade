"""
Live Auto Trade API Routes

Endpoints for the server-side Live Trade bot:
  POST   /live/start            — start auto-trade bot for a session
  POST   /live/stop             — stop  auto-trade bot for a session
  GET    /live/status/{id}      — get bot status for a session
  PUT    /live/settings/{id}    — persist auto_trade_enabled flag + settings to Supabase
"""

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.core.config import settings
from app.services import live_auto_trade as svc

router = APIRouter(prefix="/live", tags=["Live Auto Trade"])


# ---------------------------------------------------------------------------
# Request / Response Models
# ---------------------------------------------------------------------------

class LiveStartRequest(BaseModel):
    session_id: str = Field(..., description="Browser session UUID from localStorage")
    capital: float = Field(default=1_000.0, gt=0)
    pct_per_trade: float = Field(default=5.0, gt=0, le=100)
    max_auto_trades: int = Field(default=3, ge=1, le=20)
    exchange: str = Field(default="binance")
    min_signal: str = Field(default="STRONG_BUY", pattern="^(STRONG_BUY|BUY)$")
    scan_interval_seconds: int = Field(default=60, ge=10, le=3600)


class LiveStopRequest(BaseModel):
    session_id: str


class LiveSettingsRequest(BaseModel):
    session_id: str
    auto_trade_enabled: bool
    capital: Optional[float] = None
    pct_per_trade: Optional[float] = None
    max_open_trades: Optional[int] = None
    exchange: Optional[str] = None
    min_signal_filter: Optional[str] = None
    scan_interval_seconds: Optional[int] = None


class ActionResponse(BaseModel):
    success: bool
    message: str
    timestamp: str


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _supabase_configured() -> bool:
    return bool(settings.supabase_url and settings.supabase_service_key.get_secret_value())


async def _persist_settings(session_id: str, enabled: bool, extra: dict | None = None) -> None:
    """Upsert live_trading_settings row with enable_auto_trade flag."""
    if not _supabase_configured():
        return
    import httpx
    url = settings.supabase_url
    key = settings.supabase_service_key.get_secret_value()
    payload: dict = {"session_id": session_id, "enable_auto_trade": enabled}
    if extra:
        payload.update(extra)
    endpoint = f"{url}/rest/v1/live_trading_settings"
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates,return=minimal",
    }
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            await client.post(endpoint, json=payload, headers=headers)
    except Exception:
        pass  # Non-fatal — bot still runs in memory


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/start", response_model=ActionResponse)
async def start_live_bot(req: LiveStartRequest) -> ActionResponse:
    """Start the server-side auto-trade bot for a live trading session."""
    supabase_url = settings.supabase_url
    supabase_key = settings.supabase_service_key.get_secret_value()

    started = svc.start_session(
        session_id=req.session_id,
        capital=req.capital,
        pct_per_trade=req.pct_per_trade,
        max_auto_trades=req.max_auto_trades,
        exchange=req.exchange,
        min_signal=req.min_signal,
        scan_interval_seconds=req.scan_interval_seconds,
        supabase_url=supabase_url,
        supabase_key=supabase_key,
    )

    # Persist flag so the bot is resumed after server restart
    await _persist_settings(
        req.session_id,
        True,
        {
            "capital": req.capital,
            "pct_per_trade": req.pct_per_trade,
            "max_open_trades": req.max_auto_trades,
            "default_exchange": req.exchange,
            "min_signal_filter": req.min_signal,
            "scan_interval_seconds": req.scan_interval_seconds,
        },
    )

    return ActionResponse(
        success=True,
        message="Bot already running" if not started else "Server-side live auto-trade bot started",
        timestamp=datetime.now(timezone.utc).isoformat(),
    )


@router.post("/stop", response_model=ActionResponse)
async def stop_live_bot(req: LiveStopRequest) -> ActionResponse:
    """Stop the server-side auto-trade bot for a live trading session."""
    stopped = svc.stop_session(req.session_id)
    await _persist_settings(req.session_id, False)

    return ActionResponse(
        success=True,
        message="Bot stopped" if stopped else "Bot was not running",
        timestamp=datetime.now(timezone.utc).isoformat(),
    )


@router.get("/status/{session_id}")
async def get_live_bot_status(session_id: str) -> dict:
    """Get the running status of the server-side live auto-trade bot."""
    return svc.get_status(session_id)


@router.put("/settings/{session_id}", response_model=ActionResponse)
async def update_live_settings(session_id: str, req: LiveSettingsRequest) -> ActionResponse:
    """Update live trading settings and persist auto_trade_enabled flag."""
    extra: dict = {}
    if req.capital is not None:
        extra["capital"] = req.capital
    if req.pct_per_trade is not None:
        extra["pct_per_trade"] = req.pct_per_trade
    if req.max_open_trades is not None:
        extra["max_open_trades"] = req.max_open_trades
    if req.exchange is not None:
        extra["default_exchange"] = req.exchange
    if req.min_signal_filter is not None:
        extra["min_signal_filter"] = req.min_signal_filter
    if req.scan_interval_seconds is not None:
        extra["scan_interval_seconds"] = req.scan_interval_seconds

    await _persist_settings(session_id, req.auto_trade_enabled, extra or None)

    return ActionResponse(
        success=True,
        message="Settings updated",
        timestamp=datetime.now(timezone.utc).isoformat(),
    )
