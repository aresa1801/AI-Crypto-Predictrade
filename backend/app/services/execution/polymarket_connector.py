"""
Polymarket Connector Module

Handles connections to Polymarket prediction markets.
Provides CLOB data fetching and prediction market execution.
"""

import asyncio
from dataclasses import dataclass
from datetime import datetime, timezone
from decimal import Decimal
from enum import Enum
from typing import Any, Optional
import logging

import httpx
from eth_account import Account
from eth_account.signers.local import LocalAccount

from app.core.config import settings

logger = logging.getLogger(__name__)


class MarketOutcome(str, Enum):
    """Market outcome type"""
    YES = "yes"
    NO = "no"


class MarketStatus(str, Enum):
    """Market status"""
    ACTIVE = "active"
    RESOLVED = "resolved"
    CLOSED = "closed"


@dataclass
class PredictionMarket:
    """Polymarket prediction market data"""
    market_id: str
    question: str
    description: str
    category: str
    end_date: datetime
    status: MarketStatus
    
    # Pricing
    yes_price: Decimal  # 0-1, probability
    no_price: Decimal
    
    # Liquidity
    liquidity: Decimal
    volume_24h: Decimal
    total_volume: Decimal
    
    # Resolution
    resolved_outcome: Optional[MarketOutcome] = None
    resolved_at: Optional[datetime] = None
    
    @property
    def implied_probability_yes(self) -> float:
        """Implied probability of YES outcome"""
        return float(self.yes_price)
    
    @property
    def implied_probability_no(self) -> float:
        """Implied probability of NO outcome"""
        return float(self.no_price)


@dataclass
class OrderBookEntry:
    """CLOB order book entry"""
    price: Decimal
    size: Decimal
    side: str  # 'bid' or 'ask'


@dataclass
class PolymarketOrderBook:
    """Polymarket CLOB order book"""
    market_id: str
    outcome: MarketOutcome
    bids: list[OrderBookEntry]
    asks: list[OrderBookEntry]
    timestamp: datetime
    
    @property
    def best_bid(self) -> Optional[Decimal]:
        return self.bids[0].price if self.bids else None
    
    @property
    def best_ask(self) -> Optional[Decimal]:
        return self.asks[0].price if self.asks else None
    
    @property
    def spread(self) -> Optional[Decimal]:
        if self.best_bid and self.best_ask:
            return self.best_ask - self.best_bid
        return None


@dataclass
class PolymarketPosition:
    """User position in a Polymarket market"""
    market_id: str
    outcome: MarketOutcome
    shares: Decimal
    avg_entry_price: Decimal
    current_price: Decimal
    
    @property
    def unrealized_pnl(self) -> Decimal:
        return (self.current_price - self.avg_entry_price) * self.shares
    
    @property
    def unrealized_pnl_pct(self) -> float:
        if self.avg_entry_price == 0:
            return 0.0
        return float((self.current_price - self.avg_entry_price) / self.avg_entry_price * 100)


@dataclass
class TradeResult:
    """Polymarket trade execution result"""
    success: bool
    trade_id: Optional[str]
    market_id: str
    outcome: MarketOutcome
    side: str
    shares: Decimal
    price: Decimal
    fee: Decimal
    error_message: Optional[str] = None


class PolymarketConnector:
    """
    Connector for Polymarket prediction markets.
    Handles market data fetching and order execution via CLOB.
    """
    
    # API endpoints
    GAMMA_API = "https://gamma-api.polymarket.com"
    CLOB_API = "https://clob.polymarket.com"
    
    def __init__(self):
        self._client: Optional[httpx.AsyncClient] = None
        self._wallet: Optional[LocalAccount] = None
        self._connected = False
        self._api_key: Optional[str] = None
        self._api_secret: Optional[str] = None
    
    async def connect(self) -> bool:
        """Initialize Polymarket connection"""
        try:
            # Get credentials from settings
            api_key = settings.polymarket.api_key.get_secret_value()
            api_secret = settings.polymarket.api_secret.get_secret_value()
            private_key = settings.polymarket.private_key.get_secret_value()
            
            # Initialize HTTP client
            self._client = httpx.AsyncClient(
                timeout=30.0,
                headers={
                    "Accept": "application/json",
                    "Content-Type": "application/json"
                }
            )
            
            # Initialize wallet if private key provided
            if private_key:
                self._wallet = Account.from_key(private_key)
                logger.info(f"Wallet connected: {self._wallet.address}")
            
            # Store API credentials
            if api_key and api_secret:
                self._api_key = api_key
                self._api_secret = api_secret
            
            # Test connection
            await self._test_connection()
            
            self._connected = True
            logger.info("Connected to Polymarket")
            return True
            
        except Exception as e:
            logger.error(f"Failed to connect to Polymarket: {e}")
            self._connected = False
            return False
    
    async def disconnect(self) -> None:
        """Close Polymarket connection"""
        if self._client:
            await self._client.aclose()
            self._client = None
        
        self._wallet = None
        self._connected = False
        logger.info("Disconnected from Polymarket")
    
    async def _test_connection(self) -> None:
        """Test API connection"""
        if not self._client:
            raise ConnectionError("HTTP client not initialized")
        
        # Simple health check
        response = await self._client.get(f"{self.GAMMA_API}/markets?limit=1")
        response.raise_for_status()
    
    async def get_markets(
        self,
        category: Optional[str] = None,
        status: Optional[MarketStatus] = None,
        limit: int = 50,
        offset: int = 0
    ) -> list[PredictionMarket]:
        """Fetch available prediction markets"""
        if not self._connected or not self._client:
            raise ConnectionError("Not connected to Polymarket")
        
        try:
            params: dict[str, Any] = {
                "limit": limit,
                "offset": offset
            }
            
            if category:
                params["category"] = category
            if status:
                params["status"] = status.value
            
            response = await self._client.get(
                f"{self.GAMMA_API}/markets",
                params=params
            )
            response.raise_for_status()
            
            markets_data = response.json()
            
            return [self._parse_market(m) for m in markets_data]
            
        except Exception as e:
            logger.error(f"Error fetching markets: {e}")
            raise
    
    async def get_market(self, market_id: str) -> PredictionMarket:
        """Fetch specific market by ID"""
        if not self._connected or not self._client:
            raise ConnectionError("Not connected to Polymarket")
        
        try:
            response = await self._client.get(
                f"{self.GAMMA_API}/markets/{market_id}"
            )
            response.raise_for_status()
            
            return self._parse_market(response.json())
            
        except Exception as e:
            logger.error(f"Error fetching market {market_id}: {e}")
            raise
    
    async def get_order_book(
        self,
        market_id: str,
        outcome: MarketOutcome,
        depth: int = 20
    ) -> PolymarketOrderBook:
        """Fetch CLOB order book for market outcome"""
        if not self._connected or not self._client:
            raise ConnectionError("Not connected to Polymarket")
        
        try:
            # Get token ID for the outcome
            token_id = await self._get_token_id(market_id, outcome)
            
            response = await self._client.get(
                f"{self.CLOB_API}/book",
                params={"token_id": token_id}
            )
            response.raise_for_status()
            
            data = response.json()
            
            bids = [
                OrderBookEntry(
                    price=Decimal(str(b["price"])),
                    size=Decimal(str(b["size"])),
                    side="bid"
                )
                for b in data.get("bids", [])[:depth]
            ]
            
            asks = [
                OrderBookEntry(
                    price=Decimal(str(a["price"])),
                    size=Decimal(str(a["size"])),
                    side="ask"
                )
                for a in data.get("asks", [])[:depth]
            ]
            
            return PolymarketOrderBook(
                market_id=market_id,
                outcome=outcome,
                bids=bids,
                asks=asks,
                timestamp=datetime.now(timezone.utc)
            )
            
        except Exception as e:
            logger.error(f"Error fetching order book for {market_id}: {e}")
            raise
    
    async def place_order(
        self,
        market_id: str,
        outcome: MarketOutcome,
        side: str,  # 'buy' or 'sell'
        shares: Decimal,
        price: Decimal
    ) -> TradeResult:
        """Place a limit order on the CLOB"""
        if not self._connected:
            raise ConnectionError("Not connected to Polymarket")
        
        if not self._wallet:
            return TradeResult(
                success=False,
                trade_id=None,
                market_id=market_id,
                outcome=outcome,
                side=side,
                shares=shares,
                price=price,
                fee=Decimal("0"),
                error_message="Wallet not configured"
            )
        
        try:
            # Get token ID
            token_id = await self._get_token_id(market_id, outcome)
            
            # Build order
            order = {
                "token_id": token_id,
                "side": side.upper(),
                "size": str(shares),
                "price": str(price),
                "maker_address": self._wallet.address
            }
            
            # Sign order
            signed_order = await self._sign_order(order)
            
            # Submit to CLOB
            response = await self._client.post(
                f"{self.CLOB_API}/order",
                json=signed_order,
                headers=self._get_auth_headers()
            )
            
            if response.status_code == 200:
                result = response.json()
                return TradeResult(
                    success=True,
                    trade_id=result.get("order_id"),
                    market_id=market_id,
                    outcome=outcome,
                    side=side,
                    shares=shares,
                    price=price,
                    fee=Decimal(str(result.get("fee", "0")))
                )
            else:
                error_data = response.json()
                return TradeResult(
                    success=False,
                    trade_id=None,
                    market_id=market_id,
                    outcome=outcome,
                    side=side,
                    shares=shares,
                    price=price,
                    fee=Decimal("0"),
                    error_message=error_data.get("message", "Order failed")
                )
                
        except Exception as e:
            logger.error(f"Error placing order: {e}")
            return TradeResult(
                success=False,
                trade_id=None,
                market_id=market_id,
                outcome=outcome,
                side=side,
                shares=shares,
                price=price,
                fee=Decimal("0"),
                error_message=str(e)
            )
    
    async def cancel_order(self, order_id: str) -> bool:
        """Cancel an open order"""
        if not self._connected or not self._client:
            raise ConnectionError("Not connected to Polymarket")
        
        try:
            response = await self._client.delete(
                f"{self.CLOB_API}/order/{order_id}",
                headers=self._get_auth_headers()
            )
            
            return response.status_code == 200
            
        except Exception as e:
            logger.error(f"Error cancelling order {order_id}: {e}")
            return False
    
    async def get_positions(self) -> list[PolymarketPosition]:
        """Get user's open positions"""
        if not self._connected or not self._wallet:
            return []
        
        try:
            response = await self._client.get(
                f"{self.CLOB_API}/positions",
                params={"address": self._wallet.address},
                headers=self._get_auth_headers()
            )
            response.raise_for_status()
            
            positions_data = response.json()
            
            positions = []
            for p in positions_data:
                positions.append(PolymarketPosition(
                    market_id=p["market_id"],
                    outcome=MarketOutcome(p["outcome"].lower()),
                    shares=Decimal(str(p["shares"])),
                    avg_entry_price=Decimal(str(p["avg_price"])),
                    current_price=Decimal(str(p["current_price"]))
                ))
            
            return positions
            
        except Exception as e:
            logger.error(f"Error fetching positions: {e}")
            return []
    
    async def _get_token_id(self, market_id: str, outcome: MarketOutcome) -> str:
        """Get token ID for market outcome"""
        market = await self.get_market(market_id)
        # Token ID would typically be stored in market metadata
        # This is a placeholder implementation
        return f"{market_id}_{outcome.value}"
    
    async def _sign_order(self, order: dict) -> dict:
        """Sign order with wallet"""
        if not self._wallet:
            raise ValueError("Wallet not configured")
        
        # Implement EIP-712 signing for CLOB orders
        # This is a simplified implementation
        message = str(order)
        signature = self._wallet.sign_message(
            signable_message=message.encode()
        )
        
        order["signature"] = signature.signature.hex()
        return order
    
    def _get_auth_headers(self) -> dict:
        """Get authentication headers"""
        headers = {}
        if self._api_key:
            headers["Authorization"] = f"Bearer {self._api_key}"
        return headers
    
    def _parse_market(self, data: dict) -> PredictionMarket:
        """Parse market data from API response"""
        return PredictionMarket(
            market_id=data.get("id", ""),
            question=data.get("question", ""),
            description=data.get("description", ""),
            category=data.get("category", ""),
            end_date=datetime.fromisoformat(
                data.get("end_date_iso", datetime.now(timezone.utc).isoformat())
            ),
            status=MarketStatus(data.get("status", "active").lower()),
            yes_price=Decimal(str(data.get("yes_price", 0.5))),
            no_price=Decimal(str(data.get("no_price", 0.5))),
            liquidity=Decimal(str(data.get("liquidity", 0))),
            volume_24h=Decimal(str(data.get("volume_24h", 0))),
            total_volume=Decimal(str(data.get("total_volume", 0))),
            resolved_outcome=MarketOutcome(data["resolved_outcome"].lower()) if data.get("resolved_outcome") else None,
            resolved_at=datetime.fromisoformat(data["resolved_at"]) if data.get("resolved_at") else None
        )
    
    @property
    def is_connected(self) -> bool:
        """Check if connected"""
        return self._connected
    
    @property
    def wallet_address(self) -> Optional[str]:
        """Get connected wallet address"""
        return self._wallet.address if self._wallet else None
