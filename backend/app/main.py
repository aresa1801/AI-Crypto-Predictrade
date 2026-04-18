"""
AI-Crypto-Predictrade Backend

FastAPI application entry point.
"""

from contextlib import asynccontextmanager
from datetime import datetime, timezone
import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.api.routes import (
    bot_router,
    trading_router,
    market_router,
    risk_router,
    websocket_router,
    demo_auto_trade_router,
)

# Configure logging
logging.basicConfig(
    level=logging.DEBUG if settings.debug else logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    # Startup
    logger.info("Starting AI-Crypto-Predictrade Backend...")
    logger.info(f"Environment: {settings.environment}")
    logger.info(f"Debug mode: {settings.debug}")
    
    # Initialize database
    # from app.models.base import init_db
    # await init_db()
    
    # Initialize Redis
    # from app.services.cache import init_redis
    # await init_redis()

    # Resume any demo auto-trade sessions that were active before a restart
    from app.services.demo_auto_trade import resume_active_sessions
    await resume_active_sessions(
        settings.supabase_url,
        settings.supabase_service_key.get_secret_value(),
    )
    
    yield
    
    # Shutdown
    logger.info("Shutting down AI-Crypto-Predictrade Backend...")
    
    # Close database connections
    # from app.models.base import close_db
    # await close_db()


# Create FastAPI application
app = FastAPI(
    title=settings.app_name,
    description="""
    AI-Powered Crypto & Prediction Market Trading Bot API
    
    ## Features
    
    - **Bot Control**: Start, stop, and configure the trading bot
    - **Trading**: Place orders, manage positions, view history
    - **Market Data**: Real-time prices, order books, indicators
    - **Risk Management**: Monitor risk metrics, control safeguards
    - **WebSocket**: Real-time streaming for prices and signals
    
    ## Architecture
    
    This API serves as the backend for the AI trading bot, featuring:
    - Multi-agent AI system (CrewAI) for analysis and decisions
    - CEX integration (Binance, Bybit) via CCXT
    - Polymarket prediction market integration
    - Comprehensive risk management with kill switch
    """,
    version=settings.api_version,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal server error",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    )


# Include routers
app.include_router(bot_router, prefix=f"/api/{settings.api_version}")
app.include_router(trading_router, prefix=f"/api/{settings.api_version}")
app.include_router(market_router, prefix=f"/api/{settings.api_version}")
app.include_router(risk_router, prefix=f"/api/{settings.api_version}")
app.include_router(websocket_router, prefix=f"/api/{settings.api_version}")
app.include_router(demo_auto_trade_router, prefix=f"/api/{settings.api_version}")


# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "version": settings.api_version,
        "environment": settings.environment
    }


# Root endpoint
@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "name": settings.app_name,
        "version": settings.api_version,
        "docs": "/docs",
        "health": "/health",
        "api_prefix": f"/api/{settings.api_version}"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug
    )
