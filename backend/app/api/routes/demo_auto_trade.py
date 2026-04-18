"""
Demo Auto Trade API Routes

Endpoints for the server-side Demo Trade bot:
  POST   /demo/start          — start auto-trade bot for a session
  POST   /demo/stop           — stop  auto-trade bot for a session
  GET    /demo/status/{id}    — get bot status for a session
  PUT    /demo/settings/{id}  — persist auto_trade_enabled flag to Supabase
"""

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.core.config import settings
from app.services import demo_auto_trade as svc

router = APIRouter(prefix="/demo", tags=["Demo Auto Trade"])


# ---------------------------------------------------------------------------
# Request / Response Models
# ---------------------------------------------------------------------------

class StartRequest(BaseModel):
    session_id: str = Field(..., description="Browser session UUID from localStorage")
    capital: float = Field(default=10_000.0, gt=0)
    pct_per_trade: float = Field(default=10.0, gt=0, le=100)
    max_auto_trades: int = Field(default=3, ge=1, le=10)


class StopRequest(BaseModel):
    session_id: str


class SettingsRequest(BaseModel):
    session_id: str
    auto_trade_enabled: bool
    capital: Optional[float] = None
    pct_per_trade: Optional[float] = None
    max_auto_trades: Optional[int] = None


class ActionResponse(BaseModel):
    success: bool
    message: str
    timestamp: str


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _supabase_configured() -> bool:
    return bool(settings.supabase_url and settings.supabase_service_key.get_secret_value())


async def _persist_auto_trade_flag(session_id: str, enabled: bool, extra: dict | None = None) -> None:
    """Upsert demo_accounts row with auto_trade_enabled flag."""
    if not _supabase_configured():
        return
    import httpx
    url = settings.supabase_url
    key = settings.supabase_service_key.get_secret_value()
    payload: dict = {"session_id": session_id, "auto_trade_enabled": enabled}
    if extra:
        payload.update(extra)
    endpoint = f"{url}/rest/v1/demo_accounts"
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
async def start_demo_bot(req: StartRequest) -> ActionResponse:
    """Start the server-side auto-trade bot for a demo session."""
    supabase_url = settings.supabase_url
    supabase_key = settings.supabase_service_key.get_secret_value()

    started = svc.start_session(
        session_id=req.session_id,
        capital=req.capital,
        pct_per_trade=req.pct_per_trade,
        max_auto_trades=req.max_auto_trades,
        supabase_url=supabase_url,
        supabase_key=supabase_key,
    )

    # Persist flag so the bot is resumed after server restart
    await _persist_auto_trade_flag(
        req.session_id,
        True,
        {
            "capital": req.capital,
            "pct_per_trade": req.pct_per_trade,
            "max_auto_trades": req.max_auto_trades,
        },
    )

    return ActionResponse(
        success=True,
        message="Bot already running" if not started else "Server-side auto-trade bot started",
        timestamp=datetime.now(timezone.utc).isoformat(),
    )


@router.post("/stop", response_model=ActionResponse)
async def stop_demo_bot(req: StopRequest) -> ActionResponse:
    """Stop the server-side auto-trade bot for a demo session."""
    stopped = svc.stop_session(req.session_id)
    await _persist_auto_trade_flag(req.session_id, False)

    return ActionResponse(
        success=True,
        message="Bot stopped" if stopped else "Bot was not running",
        timestamp=datetime.now(timezone.utc).isoformat(),
    )


@router.get("/status/{session_id}")
async def get_demo_bot_status(session_id: str) -> dict:
    """Get the running status of the server-side auto-trade bot."""
    return svc.get_status(session_id)
