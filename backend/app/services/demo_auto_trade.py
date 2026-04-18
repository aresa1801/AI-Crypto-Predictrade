"""
Demo Auto Trade Service

Server-side auto-trading bot for the Demo Trade page.
Runs as an asyncio background task — keeps working even when the browser is closed.

Algorithm mirrors the TypeScript opportunity-buy engine (opportunity-buy.ts v3):
  1. Fetch top-50 crypto from CoinGecko
  2. Simulate indicators with a seeded LCG (same deterministic approach as the frontend)
  3. Score each asset (Technical 50% · Sentiment 20% · Prediction 30%)
  4. Open demo trades for STRONG_BUY signals (score >= 78)
  5. Persist trades + logs to Supabase
  6. Repeat every 5 minutes
"""

from __future__ import annotations

import asyncio
import logging
import time
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Optional

import httpx

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants (must match opportunity-buy.ts)
# ---------------------------------------------------------------------------

POLL_INTERVAL_SECONDS = 5 * 60          # 5 minutes between scan cycles
STRONG_BUY_THRESHOLD = 78               # Composite score >= 78 → STRONG_BUY
MIN_OPPORTUNITY_SCORE = 62              # Minimum score to analyse

COINGECKO_URL = (
    "https://api.coingecko.com/api/v3/coins/markets"
    "?vs_currency=usd&order=market_cap_desc&per_page=50&page=1"
    "&sparkline=false&price_change_percentage=24h"
)

# ---------------------------------------------------------------------------
# Per-session state
# ---------------------------------------------------------------------------


@dataclass
class SessionConfig:
    session_id: str
    capital: float = 10_000.0
    pct_per_trade: float = 10.0
    max_auto_trades: int = 3
    started_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


# Active sessions: session_id → asyncio.Task
_active_tasks: dict[str, asyncio.Task] = {}
_session_configs: dict[str, SessionConfig] = {}


# ---------------------------------------------------------------------------
# Seeded LCG — identical to the TypeScript implementation
# ---------------------------------------------------------------------------

def _lcg_factory(seed: int):
    """Return a callable that generates the next pseudo-random float [0, 1)."""
    state = [seed & 0xFFFFFFFF]  # uint32

    def _next() -> float:
        s = state[0]
        s = ((1664525 * s + 1013904223) & 0xFFFFFFFF)
        state[0] = s
        return s / 0xFFFFFFFF

    return _next


def _hash_string(s: str) -> int:
    """djb2-style hash matching hashString() in opportunity-buy.ts."""
    h = 0
    for ch in s:
        h = ((h << 5) - h + ord(ch)) & 0xFFFFFFFF
    return h


def _imul_32(a: int, b: int) -> int:
    """32-bit signed integer multiplication (mirrors JavaScript Math.imul)."""
    return ((a * b) & 0xFFFFFFFF)


def _make_seed(asset_id: str, time_seed: int) -> int:
    ah = _hash_string(asset_id)
    raw = _imul_32(ah, time_seed + 1) ^ ah
    return raw & 0xFFFFFFFF


# ---------------------------------------------------------------------------
# Indicator simulation (mirrors simulateIndicators in opportunity-buy.ts)
# ---------------------------------------------------------------------------

def _simulate_indicators(price: float, change_24h: float, asset_id: str, time_seed: int) -> dict:
    seed = _make_seed(asset_id, time_seed)
    rand = _lcg_factory(seed)

    tf_factor = 1.0  # 4h timeframe

    base_rsi = 50 - change_24h * (2.5 * tf_factor) + (rand() - 0.5) * (15 * tf_factor)
    rsi14 = max(10.0, min(90.0, base_rsi))

    ema20 = price * (1 + (rand() - 0.55) * 0.04)
    ema50 = price * (1 + (rand() - 0.55) * 0.08)

    macd = (ema20 - ema50) * 0.12 + (rand() - 0.5) * price * 0.002
    macd_signal = macd * 0.85 + (rand() - 0.5) * price * 0.001
    macd_histogram = macd - macd_signal

    std_dev = price * (0.02 + rand() * 0.03)
    bb_middle = price * (1 + (rand() - 0.5) * 0.02)
    bb_upper = bb_middle + 2 * std_dev
    bb_lower = bb_middle - 2 * std_dev

    volatility_factor = abs(change_24h) / 100 + 0.01
    atr14 = price * (volatility_factor + rand() * 0.02) / tf_factor

    adx14 = 20 + rand() * 50
    stoch_k = max(5.0, min(95.0, 50 - change_24h * 3 + rand() * 30))
    stoch_d = stoch_k * 0.9 + rand() * 10
    volume_ratio = max(0.3, 1 + (rand() - 0.4) * 0.8)

    return {
        "rsi14": rsi14, "macd": macd, "macd_signal": macd_signal,
        "macd_histogram": macd_histogram, "ema20": ema20, "ema50": ema50,
        "bb_upper": bb_upper, "bb_middle": bb_middle, "bb_lower": bb_lower,
        "atr14": atr14, "adx14": adx14, "stoch_k": stoch_k, "stoch_d": stoch_d,
        "volume_ratio": volume_ratio,
    }


# ---------------------------------------------------------------------------
# Scoring (mirrors the TypeScript scoring functions)
# ---------------------------------------------------------------------------

def _score_technical(price: float, ind: dict) -> float:
    rsi = ind["rsi14"]
    if rsi < 20:    rsi_score = 95.0
    elif rsi < 30:  rsi_score = 80 + (30 - rsi) * 1.5
    elif rsi < 40:  rsi_score = 55 + (40 - rsi) * 2.5
    elif rsi < 50:  rsi_score = 35 + (50 - rsi) * 2.0
    elif rsi < 60:  rsi_score = 20.0
    else:           rsi_score = max(0.0, 20 - (rsi - 60) * 0.5)

    eps = 0.001
    mh = ind["macd_histogram"]
    m  = ind["macd"]
    ms = ind["macd_signal"]
    if mh > 0 and m > ms:
        strength = abs(mh) / (abs(m) + eps)
        macd_score = 60 + min(40.0, strength * 100)
    elif mh < 0 and abs(mh) < abs(m) * 0.1:
        macd_score = 45.0
    else:
        macd_score = max(10.0, 40 - abs(mh / (m + eps)) * 30)

    bb_pos = (price - ind["bb_lower"]) / max(ind["bb_upper"] - ind["bb_lower"], eps)
    if bb_pos < 0:       bb_score = 95.0
    elif bb_pos < 0.15:  bb_score = 85.0
    elif bb_pos < 0.3:   bb_score = 65.0
    elif bb_pos < 0.5:   bb_score = 45.0
    elif bb_pos < 0.7:   bb_score = 30.0
    else:                bb_score = max(5.0, 30 - (bb_pos - 0.7) * 50)

    if ind["ema20"] > ind["ema50"]:
        cs = (ind["ema20"] - ind["ema50"]) / ind["ema50"]
        ema_score = 55 + min(40.0, cs * 500)
    else:
        cs = (ind["ema50"] - ind["ema20"]) / ind["ema50"]
        ema_score = max(5.0, 45 - cs * 300)

    vr = ind["volume_ratio"]
    if vr > 2.0:    vol_score = 90.0
    elif vr > 1.5:  vol_score = 75.0
    elif vr > 1.2:  vol_score = 60.0
    elif vr > 0.8:  vol_score = 40.0
    else:           vol_score = 20.0

    adx = ind["adx14"]
    if adx > 40:    adx_score = 80.0
    elif adx > 25:  adx_score = 60 + (adx - 25) * 1.3
    else:           adx_score = max(20.0, adx * 1.5)

    return (rsi_score * 0.30 + macd_score * 0.25 + bb_score * 0.20
            + ema_score * 0.15 + vol_score * 0.05 + adx_score * 0.05)


def _score_sentiment(price: float, change_24h: float, market_cap: float, ind: dict) -> float:
    fear_greed = max(10.0, min(90.0, 100 - ind["stoch_k"]))

    c = change_24h
    if c < -15:       mom_score = 85.0
    elif c < -10:     mom_score = 75.0
    elif c < -5:      mom_score = 65.0
    elif c < -2:      mom_score = 55.0
    elif c < 0:       mom_score = 45.0
    elif c < 3:       mom_score = 40.0
    elif c < 8:       mom_score = 55.0
    else:             mom_score = 30.0

    if market_cap > 100e9:    mc_score = 90.0
    elif market_cap > 10e9:   mc_score = 75.0
    elif market_cap > 1e9:    mc_score = 60.0
    elif market_cap > 100e6:  mc_score = 45.0
    else:                     mc_score = 25.0

    return fear_greed * 0.35 + mom_score * 0.40 + mc_score * 0.25


def _score_prediction(price: float, tech: float, sent: float, ind: dict) -> float:
    ema50 = ind["ema50"]
    div = (ema50 - price) / ema50 if ema50 > 0 else 0

    if div > 0.15:       mr = 90.0
    elif div > 0.08:     mr = 75.0
    elif div > 0.04:     mr = 60.0
    elif div > 0:        mr = 45.0
    else:                mr = max(20.0, 40 - (-div) * 200)

    trend = min(90.0, 50 + ind["adx14"] * 0.8) if ind["ema20"] > ind["ema50"] else max(20.0, 50 - ind["adx14"] * 0.5)

    features = [
        (100 - ind["rsi14"]) / 100,
        min(1.0, ind["volume_ratio"] / 2),
        max(0.0, div * 5),
        (100 - ind["stoch_k"]) / 100,
        min(1.0, ind["adx14"] / 50),
    ]
    ml = max(10.0, min(95.0, (sum(features) / len(features)) * 100))

    return mr * 0.35 + trend * 0.25 + ml * 0.40


def _composite_score(price: float, change_24h: float, market_cap: float,
                     asset_id: str, time_seed: int) -> float:
    ind = _simulate_indicators(price, change_24h, asset_id, time_seed)
    tech = _score_technical(price, ind)
    sent = _score_sentiment(price, change_24h, market_cap, ind)
    pred = _score_prediction(price, tech, sent, ind)
    return round(tech * 0.50 + sent * 0.20 + pred * 0.30)


# ---------------------------------------------------------------------------
# Entry / Exit Range Calculation (mirrors calculateEntryExit in TS)
# ---------------------------------------------------------------------------

def _calculate_entry_exit(price: float, asset_id: str, time_seed: int) -> dict:
    ind = _simulate_indicators(price, 0, asset_id, time_seed)
    atr = ind["atr14"]
    entry_low = max(0.0, price - atr * 0.5)
    entry_high = price + atr * 0.25
    entry_mid = (entry_low + entry_high) / 2
    stop_loss = max(0.0, entry_low - atr * 1.5)
    risk = entry_mid - stop_loss
    target1 = entry_mid + risk * 1.5
    return {
        "entry_low": entry_low,
        "entry_high": entry_high,
        "entry_mid": entry_mid,
        "stop_loss": stop_loss,
        "target1": target1,
    }


# ---------------------------------------------------------------------------
# CoinGecko fetch
# ---------------------------------------------------------------------------

async def _fetch_market_data() -> list[dict]:
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(COINGECKO_URL)
            resp.raise_for_status()
            return resp.json()
    except Exception as exc:
        logger.warning("CoinGecko fetch failed: %s", exc)
        return []


# ---------------------------------------------------------------------------
# Supabase helpers (plain REST via httpx — no extra SDK dependency at runtime)
# ---------------------------------------------------------------------------

def _supabase_headers(service_key: str) -> dict:
    return {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    }


async def _supabase_upsert(url: str, key: str, table: str, rows: list[dict]) -> None:
    if not url or not key:
        return
    endpoint = f"{url}/rest/v1/{table}"
    headers = {**_supabase_headers(key), "Prefer": "resolution=merge-duplicates,return=minimal"}
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            await client.post(endpoint, json=rows, headers=headers)
    except Exception as exc:
        logger.warning("Supabase upsert(%s) failed: %s", table, exc)


async def _supabase_insert(url: str, key: str, table: str, row: dict) -> None:
    if not url or not key:
        return
    endpoint = f"{url}/rest/v1/{table}"
    headers = {**_supabase_headers(key), "Prefer": "return=minimal"}
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            await client.post(endpoint, json=row, headers=headers)
    except Exception as exc:
        logger.warning("Supabase insert(%s) failed: %s", table, exc)


async def _supabase_select(url: str, key: str, table: str, params: dict) -> list[dict]:
    if not url or not key:
        return []
    endpoint = f"{url}/rest/v1/{table}"
    headers = _supabase_headers(key)
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(endpoint, params=params, headers=headers)
            resp.raise_for_status()
            return resp.json()
    except Exception as exc:
        logger.warning("Supabase select(%s) failed: %s", table, exc)
        return []


# ---------------------------------------------------------------------------
# Auto-trade cycle
# ---------------------------------------------------------------------------

async def _run_cycle(cfg: SessionConfig, supabase_url: str, supabase_key: str) -> None:
    """Execute one scan-and-trade cycle for a session."""
    session_id = cfg.session_id
    now_ts = int(time.time() * 1000)
    time_seed = now_ts // (POLL_INTERVAL_SECONDS * 1000)

    async def _log(message: str, log_type: str) -> None:
        entry = {
            "id": str(uuid.uuid4()),
            "session_id": session_id,
            "message": message,
            "log_type": log_type,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        logger.info("[demo-auto %s] %s", session_id[:8], message)
        await _supabase_insert(supabase_url, supabase_key, "demo_auto_logs", entry)

    await _log("🤖 [Server] Scanning for STRONG_BUY signals…", "info")

    coins = await _fetch_market_data()
    if not coins:
        await _log("Failed to fetch market data — will retry next cycle.", "error")
        return

    await _log(f"Fetched {len(coins)} assets from CoinGecko.", "info")

    # Score every coin
    strong_buys: list[dict] = []
    for coin in coins:
        price = float(coin.get("current_price") or 0)
        change = float(coin.get("price_change_percentage_24h") or 0)
        market_cap = float(coin.get("market_cap") or 0)
        if price <= 0:
            continue
        score = _composite_score(price, change, market_cap, coin["id"], time_seed)
        if score >= STRONG_BUY_THRESHOLD:
            ee = _calculate_entry_exit(price, coin["id"], time_seed)
            strong_buys.append({"coin": coin, "score": score, "ee": ee})

    strong_buys.sort(key=lambda x: -x["score"])

    if not strong_buys:
        await _log("No STRONG_BUY signals found — waiting for next cycle.", "skip")
        return

    # Load open trades from Supabase to avoid duplicates
    open_rows = await _supabase_select(
        supabase_url, supabase_key, "demo_trades",
        {"session_id": f"eq.{session_id}", "status": "eq.open", "select": "symbol"},
    )
    open_symbols: set[str] = {r["symbol"] for r in open_rows}

    # Filter out already-open positions
    candidates = [sb for sb in strong_buys if sb["coin"]["symbol"].upper() not in open_symbols]
    candidates = candidates[: cfg.max_auto_trades]

    if not candidates:
        await _log(
            f"{len(strong_buys)} STRONG_BUY signal(s) found but already holding positions — skipping.",
            "skip",
        )
        return

    # Load account settings (capital + pct_per_trade may have been updated in UI)
    acct_rows = await _supabase_select(
        supabase_url, supabase_key, "demo_accounts",
        {"session_id": f"eq.{session_id}", "select": "capital,pct_per_trade"},
    )
    if acct_rows:
        cfg.capital = float(acct_rows[0].get("capital") or cfg.capital)
        cfg.pct_per_trade = float(acct_rows[0].get("pct_per_trade") or cfg.pct_per_trade)

    capital_per_trade = cfg.capital * (cfg.pct_per_trade / 100)

    # Calculate available capital (capital + closed PnL − locked in open trades)
    all_trade_rows = await _supabase_select(
        supabase_url, supabase_key, "demo_trades",
        {"session_id": f"eq.{session_id}", "select": "status,pnl,capital_used"},
    )
    closed_pnl = sum(float(r.get("pnl") or 0) for r in all_trade_rows if r.get("status") != "open")
    locked = sum(float(r.get("capital_used") or 0) for r in all_trade_rows if r.get("status") == "open")
    available = cfg.capital + closed_pnl - locked

    new_trades: list[dict] = []
    for sb in candidates:
        if available < capital_per_trade:
            await _log(
                f"Skipped {sb['coin']['symbol'].upper()}: insufficient capital "
                f"(${available:.2f} < ${capital_per_trade:.2f}).",
                "skip",
            )
            continue

        coin = sb["coin"]
        ee = sb["ee"]
        entry = ee["entry_mid"]
        qty = capital_per_trade / entry if entry > 0 else 0

        trade = {
            "id": f"auto-server-{uuid.uuid4()}",
            "session_id": session_id,
            "asset": coin.get("name", ""),
            "symbol": coin["symbol"].upper(),
            "entry_price": entry,
            "exit_price": ee["target1"],
            "capital_used": capital_per_trade,
            "quantity": qty,
            "pnl": 0.0,
            "pnl_pct": 0.0,
            "status": "open",
            "trade_mode": "auto",
            "target_exit": ee["target1"],
            "stop_loss": ee["stop_loss"],
            "signal": "STRONG_BUY",
            "opened_at": datetime.now(timezone.utc).isoformat(),
            "closed_at": None,
        }
        new_trades.append(trade)
        available -= capital_per_trade

        await _log(
            f"✅ [Server] Auto-bought {coin['symbol'].upper()} @ ${entry:.4f} "
            f"| T1: ${ee['target1']:.4f} | SL: ${ee['stop_loss']:.4f} "
            f"| Capital: ${capital_per_trade:.2f}",
            "success",
        )

    if new_trades:
        # Ensure parent demo_account row exists
        await _supabase_upsert(
            supabase_url, supabase_key, "demo_accounts",
            [{"session_id": session_id}],
        )
        await _supabase_upsert(supabase_url, supabase_key, "demo_trades", new_trades)
        await _log(f"{len(new_trades)} trade(s) opened automatically by server bot.", "info")


# ---------------------------------------------------------------------------
# Background task loop
# ---------------------------------------------------------------------------

async def _bot_loop(cfg: SessionConfig, supabase_url: str, supabase_key: str) -> None:
    logger.info("Demo auto-trade bot STARTED for session %s", cfg.session_id[:8])
    try:
        # Immediate first cycle
        await _run_cycle(cfg, supabase_url, supabase_key)
        while True:
            await asyncio.sleep(POLL_INTERVAL_SECONDS)
            await _run_cycle(cfg, supabase_url, supabase_key)
    except asyncio.CancelledError:
        logger.info("Demo auto-trade bot STOPPED for session %s", cfg.session_id[:8])
    except Exception as exc:
        logger.error("Demo auto-trade bot CRASHED for session %s: %s", cfg.session_id[:8], exc, exc_info=True)


# ---------------------------------------------------------------------------
# Public API used by the route layer
# ---------------------------------------------------------------------------

def start_session(
    session_id: str,
    capital: float,
    pct_per_trade: float,
    max_auto_trades: int,
    supabase_url: str,
    supabase_key: str,
) -> bool:
    """Start the auto-trade bot for a session. Returns True if newly started."""
    if session_id in _active_tasks and not _active_tasks[session_id].done():
        return False  # already running

    cfg = SessionConfig(
        session_id=session_id,
        capital=capital,
        pct_per_trade=pct_per_trade,
        max_auto_trades=max_auto_trades,
    )
    _session_configs[session_id] = cfg
    task = asyncio.create_task(_bot_loop(cfg, supabase_url, supabase_key))
    _active_tasks[session_id] = task
    return True


def stop_session(session_id: str) -> bool:
    """Stop the auto-trade bot for a session. Returns True if it was running."""
    task = _active_tasks.get(session_id)
    if task and not task.done():
        task.cancel()
        _active_tasks.pop(session_id, None)
        _session_configs.pop(session_id, None)
        return True
    return False


def is_running(session_id: str) -> bool:
    task = _active_tasks.get(session_id)
    return bool(task and not task.done())


def get_status(session_id: str) -> dict:
    cfg = _session_configs.get(session_id)
    running = is_running(session_id)
    return {
        "session_id": session_id,
        "is_running": running,
        "started_at": cfg.started_at.isoformat() if cfg and running else None,
        "capital": cfg.capital if cfg else None,
        "pct_per_trade": cfg.pct_per_trade if cfg else None,
        "max_auto_trades": cfg.max_auto_trades if cfg else None,
    }


async def resume_active_sessions(supabase_url: str, supabase_key: str) -> None:
    """Called on backend startup — re-launch bots for sessions that had auto-trade enabled."""
    if not supabase_url or not supabase_key:
        return
    rows = await _supabase_select(
        supabase_url, supabase_key, "demo_accounts",
        {
            "auto_trade_enabled": "eq.true",
            "select": "session_id,capital,pct_per_trade,max_auto_trades",
        },
    )
    for row in rows:
        sid = row.get("session_id")
        if not sid:
            continue
        start_session(
            session_id=sid,
            capital=float(row.get("capital") or 10_000),
            pct_per_trade=float(row.get("pct_per_trade") or 10),
            max_auto_trades=int(row.get("max_auto_trades") or 3),
            supabase_url=supabase_url,
            supabase_key=supabase_key,
        )
        logger.info("Resumed auto-trade bot for session %s", sid[:8])
