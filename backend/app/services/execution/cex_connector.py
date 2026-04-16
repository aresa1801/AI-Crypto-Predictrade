"""
CEX Connector Module

Handles connections to centralized exchanges (Binance, Bybit) using CCXT.
Provides WebSocket for real-time market data and REST API for order execution.
"""

import asyncio
from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime, timezone
from decimal import Decimal
from enum import Enum
from typing import Any, Callable, Optional
import logging

import ccxt.async_support as ccxt
from ccxt.base.errors import (
    NetworkError,
    ExchangeError,
    InsufficientFunds,
    InvalidOrder,
    OrderNotFound,
    RateLimitExceeded
)

from app.core.config import settings
from app.models.trading import OrderSide, OrderType, OrderStatus

logger = logging.getLogger(__name__)


class ExchangeType(str, Enum):
    """Supported exchanges"""
    BINANCE = "binance"
    BYBIT = "bybit"


@dataclass
class MarketData:
    """Market data snapshot"""
    symbol: str
    exchange: str
    bid: Decimal
    ask: Decimal
    last: Decimal
    volume_24h: Decimal
    high_24h: Decimal
    low_24h: Decimal
    timestamp: datetime
    
    @property
    def mid_price(self) -> Decimal:
        return (self.bid + self.ask) / 2
    
    @property
    def spread(self) -> Decimal:
        return self.ask - self.bid
    
    @property
    def spread_pct(self) -> float:
        if self.mid_price == 0:
            return 0.0
        return float((self.spread / self.mid_price) * 100)


@dataclass
class OrderBook:
    """Order book snapshot"""
    symbol: str
    exchange: str
    bids: list[tuple[Decimal, Decimal]]  # (price, quantity)
    asks: list[tuple[Decimal, Decimal]]
    timestamp: datetime
    
    @property
    def best_bid(self) -> Optional[Decimal]:
        return self.bids[0][0] if self.bids else None
    
    @property
    def best_ask(self) -> Optional[Decimal]:
        return self.asks[0][0] if self.asks else None


@dataclass
class OrderResult:
    """Order execution result"""
    success: bool
    order_id: Optional[str]
    exchange_order_id: Optional[str]
    filled_quantity: Decimal
    average_price: Optional[Decimal]
    status: OrderStatus
    fee: Decimal
    fee_currency: Optional[str]
    error_message: Optional[str] = None
    raw_response: Optional[dict] = None


class BaseCEXConnector(ABC):
    """Abstract base class for CEX connectors"""
    
    @abstractmethod
    async def connect(self) -> bool:
        """Establish connection to exchange"""
        pass
    
    @abstractmethod
    async def disconnect(self) -> None:
        """Close connection"""
        pass
    
    @abstractmethod
    async def get_market_data(self, symbol: str) -> MarketData:
        """Get current market data for symbol"""
        pass
    
    @abstractmethod
    async def get_order_book(self, symbol: str, depth: int = 20) -> OrderBook:
        """Get order book for symbol"""
        pass
    
    @abstractmethod
    async def place_order(
        self,
        symbol: str,
        side: OrderSide,
        order_type: OrderType,
        quantity: Decimal,
        price: Optional[Decimal] = None,
        stop_price: Optional[Decimal] = None
    ) -> OrderResult:
        """Place an order"""
        pass
    
    @abstractmethod
    async def cancel_order(self, symbol: str, order_id: str) -> bool:
        """Cancel an order"""
        pass
    
    @abstractmethod
    async def get_order_status(self, symbol: str, order_id: str) -> OrderResult:
        """Get order status"""
        pass
    
    @abstractmethod
    async def get_balance(self, currency: Optional[str] = None) -> dict[str, Decimal]:
        """Get account balance"""
        pass


class CEXConnector(BaseCEXConnector):
    """
    Unified CEX connector using CCXT library.
    Supports Binance and Bybit with configurable testnet mode.
    """
    
    def __init__(self, exchange_type: ExchangeType):
        self.exchange_type = exchange_type
        self.exchange: Optional[ccxt.Exchange] = None
        self._connected = False
        self._ws_callbacks: dict[str, list[Callable]] = {}
        self._ws_task: Optional[asyncio.Task] = None
        
    async def connect(self) -> bool:
        """Initialize exchange connection"""
        try:
            exchange_config = self._get_exchange_config()
            
            if self.exchange_type == ExchangeType.BINANCE:
                self.exchange = ccxt.binance(exchange_config)
            elif self.exchange_type == ExchangeType.BYBIT:
                self.exchange = ccxt.bybit(exchange_config)
            else:
                raise ValueError(f"Unsupported exchange: {self.exchange_type}")
            
            # Load markets
            await self.exchange.load_markets()
            
            self._connected = True
            logger.info(f"Connected to {self.exchange_type.value}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to connect to {self.exchange_type.value}: {e}")
            self._connected = False
            return False
    
    def _get_exchange_config(self) -> dict:
        """Get exchange configuration from settings"""
        config = {
            "enableRateLimit": True,
            "options": {
                "defaultType": "spot",
                "adjustForTimeDifference": True
            }
        }
        
        if self.exchange_type == ExchangeType.BINANCE:
            config["apiKey"] = settings.exchange.binance_api_key.get_secret_value()
            config["secret"] = settings.exchange.binance_api_secret.get_secret_value()
            if settings.exchange.binance_testnet:
                config["sandbox"] = True
                
        elif self.exchange_type == ExchangeType.BYBIT:
            config["apiKey"] = settings.exchange.bybit_api_key.get_secret_value()
            config["secret"] = settings.exchange.bybit_api_secret.get_secret_value()
            if settings.exchange.bybit_testnet:
                config["sandbox"] = True
        
        return config
    
    async def disconnect(self) -> None:
        """Close exchange connection"""
        if self._ws_task:
            self._ws_task.cancel()
            try:
                await self._ws_task
            except asyncio.CancelledError:
                pass
        
        if self.exchange:
            await self.exchange.close()
            self.exchange = None
        
        self._connected = False
        logger.info(f"Disconnected from {self.exchange_type.value}")
    
    async def get_market_data(self, symbol: str) -> MarketData:
        """Get current market data for symbol"""
        if not self._connected or not self.exchange:
            raise ConnectionError("Not connected to exchange")
        
        try:
            ticker = await self.exchange.fetch_ticker(symbol)
            
            return MarketData(
                symbol=symbol,
                exchange=self.exchange_type.value,
                bid=Decimal(str(ticker.get("bid", 0) or 0)),
                ask=Decimal(str(ticker.get("ask", 0) or 0)),
                last=Decimal(str(ticker.get("last", 0) or 0)),
                volume_24h=Decimal(str(ticker.get("baseVolume", 0) or 0)),
                high_24h=Decimal(str(ticker.get("high", 0) or 0)),
                low_24h=Decimal(str(ticker.get("low", 0) or 0)),
                timestamp=datetime.now(timezone.utc)
            )
            
        except Exception as e:
            logger.error(f"Error fetching market data for {symbol}: {e}")
            raise
    
    async def get_order_book(self, symbol: str, depth: int = 20) -> OrderBook:
        """Get order book for symbol"""
        if not self._connected or not self.exchange:
            raise ConnectionError("Not connected to exchange")
        
        try:
            order_book = await self.exchange.fetch_order_book(symbol, limit=depth)
            
            return OrderBook(
                symbol=symbol,
                exchange=self.exchange_type.value,
                bids=[(Decimal(str(p)), Decimal(str(q))) for p, q in order_book["bids"]],
                asks=[(Decimal(str(p)), Decimal(str(q))) for p, q in order_book["asks"]],
                timestamp=datetime.now(timezone.utc)
            )
            
        except Exception as e:
            logger.error(f"Error fetching order book for {symbol}: {e}")
            raise
    
    async def place_order(
        self,
        symbol: str,
        side: OrderSide,
        order_type: OrderType,
        quantity: Decimal,
        price: Optional[Decimal] = None,
        stop_price: Optional[Decimal] = None
    ) -> OrderResult:
        """Place an order on the exchange"""
        if not self._connected or not self.exchange:
            raise ConnectionError("Not connected to exchange")
        
        try:
            # Map order type
            ccxt_type = self._map_order_type(order_type)
            params = {}
            
            # Handle stop orders
            if stop_price:
                params["stopPrice"] = float(stop_price)
            
            # Execute order
            if price:
                order = await self.exchange.create_order(
                    symbol=symbol,
                    type=ccxt_type,
                    side=side.value,
                    amount=float(quantity),
                    price=float(price),
                    params=params
                )
            else:
                order = await self.exchange.create_order(
                    symbol=symbol,
                    type=ccxt_type,
                    side=side.value,
                    amount=float(quantity),
                    params=params
                )
            
            return OrderResult(
                success=True,
                order_id=order.get("id"),
                exchange_order_id=order.get("id"),
                filled_quantity=Decimal(str(order.get("filled", 0) or 0)),
                average_price=Decimal(str(order.get("average", 0) or 0)) if order.get("average") else None,
                status=self._map_order_status(order.get("status", "open")),
                fee=Decimal(str(order.get("fee", {}).get("cost", 0) or 0)),
                fee_currency=order.get("fee", {}).get("currency"),
                raw_response=order
            )
            
        except InsufficientFunds as e:
            logger.error(f"Insufficient funds for order: {e}")
            return OrderResult(
                success=False,
                order_id=None,
                exchange_order_id=None,
                filled_quantity=Decimal("0"),
                average_price=None,
                status=OrderStatus.REJECTED,
                fee=Decimal("0"),
                fee_currency=None,
                error_message=f"Insufficient funds: {str(e)}"
            )
            
        except InvalidOrder as e:
            logger.error(f"Invalid order: {e}")
            return OrderResult(
                success=False,
                order_id=None,
                exchange_order_id=None,
                filled_quantity=Decimal("0"),
                average_price=None,
                status=OrderStatus.REJECTED,
                fee=Decimal("0"),
                fee_currency=None,
                error_message=f"Invalid order: {str(e)}"
            )
            
        except Exception as e:
            logger.error(f"Error placing order: {e}")
            return OrderResult(
                success=False,
                order_id=None,
                exchange_order_id=None,
                filled_quantity=Decimal("0"),
                average_price=None,
                status=OrderStatus.REJECTED,
                fee=Decimal("0"),
                fee_currency=None,
                error_message=str(e)
            )
    
    async def cancel_order(self, symbol: str, order_id: str) -> bool:
        """Cancel an open order"""
        if not self._connected or not self.exchange:
            raise ConnectionError("Not connected to exchange")
        
        try:
            await self.exchange.cancel_order(order_id, symbol)
            logger.info(f"Cancelled order {order_id}")
            return True
            
        except OrderNotFound:
            logger.warning(f"Order {order_id} not found")
            return False
            
        except Exception as e:
            logger.error(f"Error cancelling order {order_id}: {e}")
            return False
    
    async def get_order_status(self, symbol: str, order_id: str) -> OrderResult:
        """Get current status of an order"""
        if not self._connected or not self.exchange:
            raise ConnectionError("Not connected to exchange")
        
        try:
            order = await self.exchange.fetch_order(order_id, symbol)
            
            return OrderResult(
                success=True,
                order_id=order.get("id"),
                exchange_order_id=order.get("id"),
                filled_quantity=Decimal(str(order.get("filled", 0) or 0)),
                average_price=Decimal(str(order.get("average", 0) or 0)) if order.get("average") else None,
                status=self._map_order_status(order.get("status", "open")),
                fee=Decimal(str(order.get("fee", {}).get("cost", 0) or 0)),
                fee_currency=order.get("fee", {}).get("currency"),
                raw_response=order
            )
            
        except OrderNotFound:
            return OrderResult(
                success=False,
                order_id=order_id,
                exchange_order_id=order_id,
                filled_quantity=Decimal("0"),
                average_price=None,
                status=OrderStatus.CANCELLED,
                fee=Decimal("0"),
                fee_currency=None,
                error_message="Order not found"
            )
            
        except Exception as e:
            logger.error(f"Error fetching order status: {e}")
            raise
    
    async def get_balance(self, currency: Optional[str] = None) -> dict[str, Decimal]:
        """Get account balance"""
        if not self._connected or not self.exchange:
            raise ConnectionError("Not connected to exchange")
        
        try:
            balance = await self.exchange.fetch_balance()
            
            result = {}
            for curr, data in balance.get("total", {}).items():
                if data and float(data) > 0:
                    result[curr] = Decimal(str(data))
            
            if currency:
                return {currency: result.get(currency, Decimal("0"))}
            
            return result
            
        except Exception as e:
            logger.error(f"Error fetching balance: {e}")
            raise
    
    async def get_positions(self, symbol: Optional[str] = None) -> list[dict]:
        """Get open positions (for futures/margin)"""
        if not self._connected or not self.exchange:
            raise ConnectionError("Not connected to exchange")
        
        try:
            if hasattr(self.exchange, 'fetch_positions'):
                positions = await self.exchange.fetch_positions([symbol] if symbol else None)
                return [p for p in positions if float(p.get("contracts", 0)) != 0]
            return []
            
        except Exception as e:
            logger.error(f"Error fetching positions: {e}")
            return []
    
    def _map_order_type(self, order_type: OrderType) -> str:
        """Map internal order type to CCXT order type"""
        mapping = {
            OrderType.MARKET: "market",
            OrderType.LIMIT: "limit",
            OrderType.STOP_LOSS: "stop_loss",
            OrderType.TAKE_PROFIT: "take_profit",
            OrderType.STOP_LIMIT: "stop_loss_limit"
        }
        return mapping.get(order_type, "market")
    
    def _map_order_status(self, status: str) -> OrderStatus:
        """Map CCXT order status to internal status"""
        mapping = {
            "open": OrderStatus.OPEN,
            "closed": OrderStatus.FILLED,
            "canceled": OrderStatus.CANCELLED,
            "cancelled": OrderStatus.CANCELLED,
            "expired": OrderStatus.EXPIRED,
            "rejected": OrderStatus.REJECTED
        }
        return mapping.get(status.lower(), OrderStatus.PENDING)
    
    @property
    def is_connected(self) -> bool:
        """Check if connected to exchange"""
        return self._connected


# Factory function
def create_cex_connector(exchange: str) -> CEXConnector:
    """Create a CEX connector for the specified exchange"""
    exchange_type = ExchangeType(exchange.lower())
    return CEXConnector(exchange_type)
