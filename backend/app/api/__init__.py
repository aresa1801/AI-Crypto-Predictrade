"""
API Routes Package
"""

from app.api.routes.bot import router as bot_router
from app.api.routes.trading import router as trading_router
from app.api.routes.market import router as market_router
from app.api.routes.risk import router as risk_router
from app.api.routes.websocket import router as websocket_router
from app.api.routes.demo_auto_trade import router as demo_auto_trade_router

__all__ = [
    "bot_router",
    "trading_router",
    "market_router",
    "risk_router",
    "websocket_router",
    "demo_auto_trade_router",
]
