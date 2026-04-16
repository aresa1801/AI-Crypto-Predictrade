"""
Data Aggregator Agent

Collects and aggregates data from multiple sources:
- CEX market data (prices, order books, trades)
- Polymarket prediction markets
- News and sentiment
- Technical indicators
"""

from dataclasses import dataclass, field
from datetime import datetime, timezone, timedelta
from decimal import Decimal
from typing import Any, Optional
import logging
import asyncio

import numpy as np
import pandas as pd

from app.core.config import settings

logger = logging.getLogger(__name__)


@dataclass
class MarketDataPoint:
    """Single market data point"""
    symbol: str
    exchange: str
    timestamp: datetime
    open: Decimal
    high: Decimal
    low: Decimal
    close: Decimal
    volume: Decimal
    
    def to_dict(self) -> dict:
        return {
            "symbol": self.symbol,
            "exchange": self.exchange,
            "timestamp": self.timestamp.isoformat(),
            "open": float(self.open),
            "high": float(self.high),
            "low": float(self.low),
            "close": float(self.close),
            "volume": float(self.volume)
        }


@dataclass
class TechnicalIndicators:
    """Technical analysis indicators"""
    symbol: str
    timestamp: datetime
    
    # Trend indicators
    sma_20: Optional[float] = None
    sma_50: Optional[float] = None
    sma_200: Optional[float] = None
    ema_12: Optional[float] = None
    ema_26: Optional[float] = None
    
    # Momentum indicators
    rsi_14: Optional[float] = None
    macd: Optional[float] = None
    macd_signal: Optional[float] = None
    macd_histogram: Optional[float] = None
    
    # Volatility indicators
    bollinger_upper: Optional[float] = None
    bollinger_middle: Optional[float] = None
    bollinger_lower: Optional[float] = None
    atr_14: Optional[float] = None
    
    # Volume indicators
    obv: Optional[float] = None
    volume_sma_20: Optional[float] = None
    
    def to_dict(self) -> dict:
        return {k: v for k, v in self.__dict__.items() if v is not None}


@dataclass
class SentimentData:
    """Sentiment analysis data"""
    source: str
    timestamp: datetime
    overall_sentiment: float  # -1 to 1
    bullish_count: int = 0
    bearish_count: int = 0
    neutral_count: int = 0
    top_topics: list[str] = field(default_factory=list)
    news_headlines: list[dict] = field(default_factory=list)


@dataclass
class AggregatedMarketData:
    """Complete aggregated market data for analysis"""
    symbol: str
    timestamp: datetime
    
    # Price data
    current_price: Decimal
    price_change_24h: float
    price_change_7d: float
    
    # Volume
    volume_24h: Decimal
    volume_change_24h: float
    
    # Order book
    bid_price: Decimal
    ask_price: Decimal
    spread_pct: float
    
    # Technical indicators
    indicators: TechnicalIndicators
    
    # Sentiment
    sentiment: Optional[SentimentData] = None
    
    # Market context
    btc_correlation: Optional[float] = None
    market_dominance: Optional[float] = None
    
    # Volatility
    volatility_24h: Optional[float] = None
    volatility_7d: Optional[float] = None


class DataAggregatorAgent:
    """
    Data Aggregator Agent for the trading bot.
    Collects, processes, and aggregates market data from multiple sources.
    """
    
    def __init__(self):
        self._price_cache: dict[str, list[MarketDataPoint]] = {}
        self._indicator_cache: dict[str, TechnicalIndicators] = {}
        self._sentiment_cache: dict[str, SentimentData] = {}
        self._last_update: dict[str, datetime] = {}
        
    async def aggregate_market_data(
        self,
        symbol: str,
        exchange: str = "binance"
    ) -> AggregatedMarketData:
        """
        Aggregate all available market data for a symbol.
        
        Args:
            symbol: Trading pair symbol (e.g., "BTC/USDT")
            exchange: Exchange name
            
        Returns:
            AggregatedMarketData with all collected information
        """
        logger.info(f"Aggregating market data for {symbol}")
        
        # Collect data concurrently
        price_data, indicators, sentiment = await asyncio.gather(
            self._fetch_price_data(symbol, exchange),
            self._calculate_indicators(symbol, exchange),
            self._fetch_sentiment(symbol),
            return_exceptions=True
        )
        
        # Handle any errors
        if isinstance(price_data, Exception):
            logger.error(f"Error fetching price data: {price_data}")
            price_data = self._get_mock_price_data(symbol, exchange)
        
        if isinstance(indicators, Exception):
            logger.error(f"Error calculating indicators: {indicators}")
            indicators = TechnicalIndicators(symbol=symbol, timestamp=datetime.now(timezone.utc))
        
        if isinstance(sentiment, Exception):
            logger.warning(f"Error fetching sentiment: {sentiment}")
            sentiment = None
        
        # Build aggregated data
        return AggregatedMarketData(
            symbol=symbol,
            timestamp=datetime.now(timezone.utc),
            current_price=price_data["current_price"],
            price_change_24h=price_data["price_change_24h"],
            price_change_7d=price_data.get("price_change_7d", 0.0),
            volume_24h=price_data["volume_24h"],
            volume_change_24h=price_data.get("volume_change_24h", 0.0),
            bid_price=price_data["bid"],
            ask_price=price_data["ask"],
            spread_pct=price_data["spread_pct"],
            indicators=indicators,
            sentiment=sentiment,
            volatility_24h=price_data.get("volatility_24h"),
            volatility_7d=price_data.get("volatility_7d")
        )
    
    async def _fetch_price_data(
        self,
        symbol: str,
        exchange: str
    ) -> dict[str, Any]:
        """Fetch current price data from exchange"""
        # In production, this would use the CEX connector
        # For now, return mock data structure
        return self._get_mock_price_data(symbol, exchange)
    
    def _get_mock_price_data(
        self,
        symbol: str,
        exchange: str
    ) -> dict[str, Any]:
        """Generate mock price data for testing"""
        base_prices = {
            "BTC/USDT": 45000,
            "ETH/USDT": 2500,
            "SOL/USDT": 100,
        }
        
        base = base_prices.get(symbol, 100)
        spread = base * 0.0002  # 0.02% spread
        
        return {
            "current_price": Decimal(str(base)),
            "price_change_24h": np.random.uniform(-5, 5),
            "price_change_7d": np.random.uniform(-10, 10),
            "volume_24h": Decimal(str(base * np.random.uniform(10000, 100000))),
            "volume_change_24h": np.random.uniform(-20, 20),
            "bid": Decimal(str(base - spread/2)),
            "ask": Decimal(str(base + spread/2)),
            "spread_pct": 0.02,
            "volatility_24h": np.random.uniform(1, 5),
            "volatility_7d": np.random.uniform(2, 8)
        }
    
    async def _calculate_indicators(
        self,
        symbol: str,
        exchange: str
    ) -> TechnicalIndicators:
        """Calculate technical indicators from price history"""
        # Check cache
        cache_key = f"{exchange}:{symbol}"
        if cache_key in self._indicator_cache:
            last_update = self._last_update.get(cache_key)
            if last_update and (datetime.now(timezone.utc) - last_update).seconds < 60:
                return self._indicator_cache[cache_key]
        
        # Generate mock OHLCV data for indicator calculation
        # In production, this would use historical data from the exchange
        df = self._generate_mock_ohlcv(symbol, periods=200)
        
        indicators = TechnicalIndicators(
            symbol=symbol,
            timestamp=datetime.now(timezone.utc)
        )
        
        # Calculate indicators
        try:
            # Simple Moving Averages
            indicators.sma_20 = float(df['close'].rolling(window=20).mean().iloc[-1])
            indicators.sma_50 = float(df['close'].rolling(window=50).mean().iloc[-1])
            indicators.sma_200 = float(df['close'].rolling(window=200).mean().iloc[-1])
            
            # Exponential Moving Averages
            indicators.ema_12 = float(df['close'].ewm(span=12).mean().iloc[-1])
            indicators.ema_26 = float(df['close'].ewm(span=26).mean().iloc[-1])
            
            # RSI
            delta = df['close'].diff()
            gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
            loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
            rs = gain / loss
            indicators.rsi_14 = float(100 - (100 / (1 + rs.iloc[-1])))
            
            # MACD
            indicators.macd = indicators.ema_12 - indicators.ema_26
            indicators.macd_signal = float(
                pd.Series([indicators.macd]).ewm(span=9).mean().iloc[-1]
            )
            indicators.macd_histogram = indicators.macd - indicators.macd_signal
            
            # Bollinger Bands
            rolling_mean = df['close'].rolling(window=20).mean()
            rolling_std = df['close'].rolling(window=20).std()
            indicators.bollinger_middle = float(rolling_mean.iloc[-1])
            indicators.bollinger_upper = float(rolling_mean.iloc[-1] + (rolling_std.iloc[-1] * 2))
            indicators.bollinger_lower = float(rolling_mean.iloc[-1] - (rolling_std.iloc[-1] * 2))
            
            # ATR
            high_low = df['high'] - df['low']
            high_close = abs(df['high'] - df['close'].shift())
            low_close = abs(df['low'] - df['close'].shift())
            tr = pd.concat([high_low, high_close, low_close], axis=1).max(axis=1)
            indicators.atr_14 = float(tr.rolling(window=14).mean().iloc[-1])
            
            # OBV
            obv = (np.sign(df['close'].diff()) * df['volume']).cumsum()
            indicators.obv = float(obv.iloc[-1])
            
            # Volume SMA
            indicators.volume_sma_20 = float(df['volume'].rolling(window=20).mean().iloc[-1])
            
        except Exception as e:
            logger.error(f"Error calculating indicators: {e}")
        
        # Cache results
        self._indicator_cache[cache_key] = indicators
        self._last_update[cache_key] = datetime.now(timezone.utc)
        
        return indicators
    
    def _generate_mock_ohlcv(
        self,
        symbol: str,
        periods: int = 200
    ) -> pd.DataFrame:
        """Generate mock OHLCV data for testing"""
        base_prices = {
            "BTC/USDT": 45000,
            "ETH/USDT": 2500,
            "SOL/USDT": 100,
        }
        
        base = base_prices.get(symbol, 100)
        
        # Generate random walk
        returns = np.random.normal(0.0002, 0.02, periods)
        prices = base * np.exp(np.cumsum(returns))
        
        # Generate OHLCV
        data = {
            'timestamp': pd.date_range(
                end=datetime.now(timezone.utc),
                periods=periods,
                freq='1h'
            ),
            'open': prices * (1 + np.random.uniform(-0.005, 0.005, periods)),
            'high': prices * (1 + np.random.uniform(0, 0.01, periods)),
            'low': prices * (1 - np.random.uniform(0, 0.01, periods)),
            'close': prices,
            'volume': np.random.uniform(1000, 10000, periods) * base
        }
        
        return pd.DataFrame(data)
    
    async def _fetch_sentiment(self, symbol: str) -> Optional[SentimentData]:
        """Fetch sentiment data from news/social sources"""
        # In production, this would call external APIs
        # (e.g., CryptoPanic, LunarCrush, or custom news aggregation)
        
        # Return mock sentiment data
        base_symbol = symbol.split("/")[0]
        
        return SentimentData(
            source="aggregated",
            timestamp=datetime.now(timezone.utc),
            overall_sentiment=np.random.uniform(-0.5, 0.5),
            bullish_count=np.random.randint(10, 100),
            bearish_count=np.random.randint(10, 100),
            neutral_count=np.random.randint(20, 200),
            top_topics=[f"{base_symbol} price", "crypto market", "trading"],
            news_headlines=[
                {
                    "title": f"Sample headline about {base_symbol}",
                    "sentiment": np.random.uniform(-1, 1),
                    "source": "CryptoNews"
                }
            ]
        )
    
    async def get_correlation_matrix(
        self,
        symbols: list[str],
        period_days: int = 30
    ) -> dict[str, dict[str, float]]:
        """Calculate correlation matrix between symbols"""
        # Generate mock price data for each symbol
        price_data = {}
        for symbol in symbols:
            df = self._generate_mock_ohlcv(symbol, periods=period_days * 24)
            price_data[symbol] = df['close'].pct_change().dropna()
        
        # Calculate correlations
        df = pd.DataFrame(price_data)
        corr = df.corr()
        
        return corr.to_dict()
    
    async def get_market_overview(self) -> dict[str, Any]:
        """Get overall market overview"""
        # Aggregate market data for major pairs
        symbols = ["BTC/USDT", "ETH/USDT", "SOL/USDT"]
        
        market_data = await asyncio.gather(*[
            self.aggregate_market_data(s) for s in symbols
        ])
        
        # Calculate market metrics
        btc_data = market_data[0]
        
        return {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "btc_price": float(btc_data.current_price),
            "btc_change_24h": btc_data.price_change_24h,
            "market_sentiment": sum(
                d.sentiment.overall_sentiment if d.sentiment else 0 
                for d in market_data
            ) / len(market_data),
            "avg_volatility": sum(
                d.volatility_24h or 0 for d in market_data
            ) / len(market_data),
            "symbols": {
                d.symbol: {
                    "price": float(d.current_price),
                    "change_24h": d.price_change_24h,
                    "rsi": d.indicators.rsi_14
                }
                for d in market_data
            }
        }
