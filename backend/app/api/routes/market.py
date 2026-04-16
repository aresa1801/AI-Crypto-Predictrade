"""
Market Data API Routes

Endpoints for market data:
- Price data
- Order books
- Market overview
"""

from datetime import datetime, timezone
from typing import Any, Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

router = APIRouter(prefix="/market", tags=["Market Data"])


class MarketDataResponse(BaseModel):
    """Market data response"""
    symbol: str
    exchange: str
    price: float
    bid: float
    ask: float
    spread_pct: float
    change_24h: float
    volume_24h: float
    high_24h: float
    low_24h: float
    timestamp: str


class OrderBookResponse(BaseModel):
    """Order book response"""
    symbol: str
    exchange: str
    bids: list[list[float]]  # [price, quantity]
    asks: list[list[float]]
    timestamp: str


class TechnicalIndicatorsResponse(BaseModel):
    """Technical indicators response"""
    symbol: str
    timestamp: str
    sma_20: Optional[float] = None
    sma_50: Optional[float] = None
    sma_200: Optional[float] = None
    ema_12: Optional[float] = None
    ema_26: Optional[float] = None
    rsi_14: Optional[float] = None
    macd: Optional[float] = None
    macd_signal: Optional[float] = None
    bollinger_upper: Optional[float] = None
    bollinger_middle: Optional[float] = None
    bollinger_lower: Optional[float] = None
    atr_14: Optional[float] = None


class PredictionMarketResponse(BaseModel):
    """Polymarket prediction market response"""
    market_id: str
    question: str
    category: str
    yes_price: float
    no_price: float
    liquidity: float
    volume_24h: float
    end_date: str
    status: str


# Mock data functions
def get_mock_price(symbol: str) -> float:
    prices = {
        "BTC/USDT": 45230.50,
        "ETH/USDT": 2456.80,
        "SOL/USDT": 98.45,
    }
    return prices.get(symbol, 100.0)


@router.get("/price/{symbol}", response_model=MarketDataResponse)
async def get_market_price(
    symbol: str,
    exchange: str = Query(default="binance")
) -> MarketDataResponse:
    """Get current market price for a symbol"""
    price = get_mock_price(symbol)
    spread = price * 0.0002
    
    return MarketDataResponse(
        symbol=symbol,
        exchange=exchange,
        price=price,
        bid=price - spread / 2,
        ask=price + spread / 2,
        spread_pct=0.02,
        change_24h=2.34,
        volume_24h=28500000000,
        high_24h=price * 1.02,
        low_24h=price * 0.98,
        timestamp=datetime.now(timezone.utc).isoformat()
    )


@router.get("/prices")
async def get_multiple_prices(
    symbols: str = Query(..., description="Comma-separated symbols"),
    exchange: str = Query(default="binance")
) -> dict[str, Any]:
    """Get prices for multiple symbols"""
    symbol_list = [s.strip() for s in symbols.split(",")]
    
    prices = {}
    for symbol in symbol_list:
        price = get_mock_price(symbol)
        prices[symbol] = {
            "price": price,
            "change_24h": 2.34,
            "volume_24h": 1000000000
        }
    
    return {
        "exchange": exchange,
        "prices": prices,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


@router.get("/orderbook/{symbol}", response_model=OrderBookResponse)
async def get_order_book(
    symbol: str,
    exchange: str = Query(default="binance"),
    depth: int = Query(default=20, le=100)
) -> OrderBookResponse:
    """Get order book for a symbol"""
    price = get_mock_price(symbol)
    
    # Generate mock order book
    bids = [[price - i * 0.1, 1.0 + i * 0.5] for i in range(depth)]
    asks = [[price + i * 0.1, 1.0 + i * 0.5] for i in range(depth)]
    
    return OrderBookResponse(
        symbol=symbol,
        exchange=exchange,
        bids=bids,
        asks=asks,
        timestamp=datetime.now(timezone.utc).isoformat()
    )


@router.get("/indicators/{symbol}", response_model=TechnicalIndicatorsResponse)
async def get_technical_indicators(
    symbol: str,
    exchange: str = Query(default="binance")
) -> TechnicalIndicatorsResponse:
    """Get technical indicators for a symbol"""
    price = get_mock_price(symbol)
    
    return TechnicalIndicatorsResponse(
        symbol=symbol,
        timestamp=datetime.now(timezone.utc).isoformat(),
        sma_20=price * 0.98,
        sma_50=price * 0.95,
        sma_200=price * 0.90,
        ema_12=price * 0.99,
        ema_26=price * 0.97,
        rsi_14=55.0,
        macd=50.0,
        macd_signal=45.0,
        bollinger_upper=price * 1.02,
        bollinger_middle=price,
        bollinger_lower=price * 0.98,
        atr_14=price * 0.015
    )


@router.get("/overview")
async def get_market_overview() -> dict[str, Any]:
    """Get overall market overview"""
    return {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "btc_price": 45230.50,
        "eth_price": 2456.80,
        "total_market_cap": 1850000000000,
        "btc_dominance": 48.2,
        "fear_greed_index": 65,
        "trending": [
            {"symbol": "BTC/USDT", "change_24h": 2.34},
            {"symbol": "ETH/USDT", "change_24h": 1.87},
            {"symbol": "SOL/USDT", "change_24h": 3.21}
        ],
        "top_gainers": [],
        "top_losers": []
    }


@router.get("/polymarket/markets")
async def get_polymarket_markets(
    category: Optional[str] = None,
    status: str = Query(default="active"),
    limit: int = Query(default=50, le=100)
) -> dict[str, Any]:
    """Get Polymarket prediction markets"""
    # Would fetch from Polymarket connector
    return {
        "markets": [],
        "total": 0,
        "category": category,
        "status": status
    }


@router.get("/polymarket/market/{market_id}", response_model=PredictionMarketResponse)
async def get_polymarket_market(market_id: str) -> PredictionMarketResponse:
    """Get specific Polymarket market"""
    # Mock data
    return PredictionMarketResponse(
        market_id=market_id,
        question="Will Bitcoin reach $100k in 2024?",
        category="Crypto",
        yes_price=0.35,
        no_price=0.65,
        liquidity=500000,
        volume_24h=25000,
        end_date="2024-12-31T23:59:59Z",
        status="active"
    )


@router.get("/correlations")
async def get_correlations(
    symbols: str = Query(default="BTC/USDT,ETH/USDT,SOL/USDT"),
    period_days: int = Query(default=30, le=365)
) -> dict[str, Any]:
    """Get correlation matrix between symbols"""
    symbol_list = [s.strip() for s in symbols.split(",")]
    
    # Would calculate actual correlations
    correlations = {}
    for s1 in symbol_list:
        correlations[s1] = {}
        for s2 in symbol_list:
            correlations[s1][s2] = 1.0 if s1 == s2 else 0.8
    
    return {
        "symbols": symbol_list,
        "period_days": period_days,
        "correlations": correlations,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
