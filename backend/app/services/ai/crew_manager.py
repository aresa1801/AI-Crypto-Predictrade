"""
Crew Manager

Orchestrates the multi-agent system using CrewAI pattern.
Coordinates Data Aggregator, Strategy, and Risk Management agents.
"""

from dataclasses import dataclass
from datetime import datetime, timezone
from decimal import Decimal
from enum import Enum
from typing import Any, Optional
import logging
import asyncio

from app.core.config import settings
from app.services.ai.data_aggregator import DataAggregatorAgent, AggregatedMarketData
from app.services.ai.strategy_agent import StrategyAgent, TradingSignal, MarketType
from app.services.ai.risk_agent import RiskManagementAgent, RiskEvaluation, RiskDecision, RiskMetrics
from app.services.execution.order_manager import OrderManager, OrderRequest, OrderResponse, ExecutionVenue
from app.models.trading import OrderSide, OrderType

logger = logging.getLogger(__name__)


class CrewStatus(str, Enum):
    """Trading crew status"""
    IDLE = "idle"
    ANALYZING = "analyzing"
    TRADING = "trading"
    PAUSED = "paused"
    ERROR = "error"


@dataclass
class TradingDecision:
    """Final trading decision from the crew"""
    timestamp: datetime
    symbol: str
    
    # Decision details
    should_trade: bool
    signal: Optional[TradingSignal]
    risk_evaluation: Optional[RiskEvaluation]
    
    # Execution details
    order_request: Optional[OrderRequest] = None
    execution_result: Optional[OrderResponse] = None
    
    # Context
    market_data: Optional[AggregatedMarketData] = None
    reasoning: str = ""


class TradingCrew:
    """
    Multi-agent trading crew that coordinates:
    - Data Aggregator Agent: Collects market data
    - Strategy Agent: Generates trading signals
    - Risk Management Agent: Validates and sizes positions
    
    Uses a coordinated workflow for making trading decisions.
    """
    
    def __init__(self):
        self.data_agent = DataAggregatorAgent()
        self.strategy_agent = StrategyAgent()
        self.risk_agent = RiskManagementAgent()
        self.order_manager: Optional[OrderManager] = None
        
        self._status = CrewStatus.IDLE
        self._running = False
        self._analysis_task: Optional[asyncio.Task] = None
        self._analyzed_symbols: set[str] = set()
        self._decision_history: list[TradingDecision] = []
        
    async def initialize(
        self,
        venues: Optional[list[ExecutionVenue]] = None
    ) -> bool:
        """
        Initialize the trading crew and all agents.
        
        Args:
            venues: List of execution venues to connect to
            
        Returns:
            True if initialization successful
        """
        try:
            logger.info("Initializing Trading Crew...")
            
            # Initialize strategy agent (LLM connection)
            await self.strategy_agent.initialize()
            
            # Initialize order manager if venues provided
            if venues:
                self.order_manager = OrderManager()
                await self.order_manager.initialize(venues)
            
            logger.info("Trading Crew initialized successfully")
            return True
            
        except Exception as e:
            logger.error(f"Failed to initialize Trading Crew: {e}")
            self._status = CrewStatus.ERROR
            return False
    
    async def shutdown(self) -> None:
        """Shutdown the trading crew"""
        logger.info("Shutting down Trading Crew...")
        
        self._running = False
        
        if self._analysis_task:
            self._analysis_task.cancel()
            try:
                await self._analysis_task
            except asyncio.CancelledError:
                pass
        
        if self.order_manager:
            await self.order_manager.shutdown()
        
        self._status = CrewStatus.IDLE
        logger.info("Trading Crew shutdown complete")
    
    async def analyze_and_trade(
        self,
        symbol: str,
        market_type: MarketType = MarketType.CEX_SPOT,
        portfolio_state: Optional[dict] = None,
        execute: bool = False
    ) -> TradingDecision:
        """
        Run the full analysis and trading workflow for a symbol.
        
        Workflow:
        1. Data Aggregator collects market data
        2. Strategy Agent analyzes and generates signals
        3. Risk Agent evaluates and sizes the position
        4. If approved and execute=True, place the order
        
        Args:
            symbol: Trading symbol (e.g., "BTC/USDT")
            market_type: Type of market
            portfolio_state: Current portfolio state
            execute: Whether to execute approved trades
            
        Returns:
            TradingDecision with all analysis results
        """
        self._status = CrewStatus.ANALYZING
        
        try:
            # Step 1: Aggregate market data
            logger.info(f"Step 1: Aggregating data for {symbol}")
            market_data = await self.data_agent.aggregate_market_data(
                symbol=symbol,
                exchange="binance"
            )
            
            # Step 2: Generate trading signal
            logger.info(f"Step 2: Analyzing market for signals")
            signal = await self.strategy_agent.analyze_market(
                market_data=market_data,
                market_type=market_type
            )
            
            if not signal:
                return TradingDecision(
                    timestamp=datetime.now(timezone.utc),
                    symbol=symbol,
                    should_trade=False,
                    signal=None,
                    risk_evaluation=None,
                    market_data=market_data,
                    reasoning="No trading signal generated"
                )
            
            # Step 3: Risk evaluation
            logger.info(f"Step 3: Evaluating risk for signal {signal.signal_id}")
            
            portfolio = portfolio_state or {
                "total_equity": Decimal("10000"),
                "peak_equity": Decimal("10000"),
                "daily_pnl": Decimal("0"),
                "open_positions": []
            }
            
            risk_eval = await self.risk_agent.evaluate_signal(
                signal=signal,
                current_portfolio=portfolio
            )
            
            # Check if approved
            if risk_eval.decision == RiskDecision.REJECTED:
                return TradingDecision(
                    timestamp=datetime.now(timezone.utc),
                    symbol=symbol,
                    should_trade=False,
                    signal=signal,
                    risk_evaluation=risk_eval,
                    market_data=market_data,
                    reasoning=f"Signal rejected by risk agent: {risk_eval.reasoning}"
                )
            
            # Step 4: Build order request
            order_request = self._build_order_request(
                signal=signal,
                risk_eval=risk_eval,
                market_type=market_type
            )
            
            # Step 5: Execute if requested
            execution_result = None
            if execute and self.order_manager:
                self._status = CrewStatus.TRADING
                logger.info(f"Step 5: Executing order for {symbol}")
                
                execution_result = await self.order_manager.submit_order(
                    request=order_request,
                    current_balance=portfolio.get("total_equity", Decimal("10000")),
                    open_positions=len(portfolio.get("open_positions", [])),
                    daily_pnl_pct=float(portfolio.get("daily_pnl", 0)) / float(portfolio.get("total_equity", 10000)) * 100,
                    current_drawdown_pct=0.0  # Would calculate from portfolio
                )
            
            decision = TradingDecision(
                timestamp=datetime.now(timezone.utc),
                symbol=symbol,
                should_trade=risk_eval.decision in [RiskDecision.APPROVED, RiskDecision.MODIFIED],
                signal=signal,
                risk_evaluation=risk_eval,
                order_request=order_request,
                execution_result=execution_result,
                market_data=market_data,
                reasoning=f"Signal approved: {signal.signal_type.value} {symbol}"
            )
            
            self._decision_history.append(decision)
            self._status = CrewStatus.IDLE
            
            return decision
            
        except Exception as e:
            logger.error(f"Error in analyze_and_trade: {e}")
            self._status = CrewStatus.ERROR
            
            return TradingDecision(
                timestamp=datetime.now(timezone.utc),
                symbol=symbol,
                should_trade=False,
                signal=None,
                risk_evaluation=None,
                reasoning=f"Error: {str(e)}"
            )
    
    async def run_analysis_loop(
        self,
        symbols: list[str],
        interval_seconds: int = 60,
        execute_trades: bool = False
    ) -> None:
        """
        Run continuous analysis loop for multiple symbols.
        
        Args:
            symbols: List of symbols to monitor
            interval_seconds: Seconds between analysis cycles
            execute_trades: Whether to execute approved trades
        """
        self._running = True
        logger.info(f"Starting analysis loop for {len(symbols)} symbols")
        
        while self._running:
            try:
                for symbol in symbols:
                    if not self._running:
                        break
                    
                    # Run analysis
                    decision = await self.analyze_and_trade(
                        symbol=symbol,
                        execute=execute_trades
                    )
                    
                    if decision.should_trade:
                        logger.info(
                            f"Trading opportunity: {decision.signal.signal_type.value} "
                            f"{symbol} @ {decision.signal.entry_price}"
                        )
                    
                    # Small delay between symbols
                    await asyncio.sleep(1)
                
                # Wait for next cycle
                await asyncio.sleep(interval_seconds)
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in analysis loop: {e}")
                await asyncio.sleep(10)  # Back off on error
        
        logger.info("Analysis loop stopped")
    
    def _build_order_request(
        self,
        signal: TradingSignal,
        risk_eval: RiskEvaluation,
        market_type: MarketType
    ) -> OrderRequest:
        """Build order request from signal and risk evaluation"""
        # Determine venue
        if market_type == MarketType.POLYMARKET:
            venue = ExecutionVenue.POLYMARKET
        else:
            venue = ExecutionVenue.BINANCE
        
        # Determine order side
        if signal.signal_type in [SignalType.LONG]:
            side = OrderSide.BUY
        else:
            side = OrderSide.SELL
        
        return OrderRequest(
            venue=venue,
            symbol=signal.symbol,
            side=side,
            order_type=OrderType.LIMIT,
            quantity=risk_eval.approved_position_size or Decimal("0"),
            price=signal.entry_price,
            stop_loss=signal.stop_loss,
            take_profit=signal.take_profit,
            strategy_id=f"crew_{signal.signal_id[:8]}",
            signal_confidence=signal.confidence,
            ai_reasoning=signal.reasoning,
            risk_amount=risk_eval.risk_amount,
            position_size_pct=risk_eval.position_size_pct
        )
    
    async def get_market_overview(self) -> dict[str, Any]:
        """Get overview of all monitored markets"""
        return await self.data_agent.get_market_overview()
    
    def get_risk_status(self) -> dict[str, Any]:
        """Get current risk status"""
        return {
            "kill_switch": self.risk_agent.get_kill_switch_status(),
            "status": self._status.value,
            "active_signals": len(self.strategy_agent.get_active_signals()),
            "decisions_today": len([
                d for d in self._decision_history
                if d.timestamp.date() == datetime.now(timezone.utc).date()
            ])
        }
    
    def get_active_signals(self) -> list[TradingSignal]:
        """Get all active trading signals"""
        return self.strategy_agent.get_active_signals()
    
    def get_recent_decisions(self, limit: int = 10) -> list[TradingDecision]:
        """Get recent trading decisions"""
        return self._decision_history[-limit:]
    
    def reset_kill_switch(self) -> bool:
        """Reset the kill switch"""
        return self.risk_agent.reset_kill_switch()
    
    @property
    def status(self) -> CrewStatus:
        """Get current crew status"""
        return self._status
    
    @property
    def is_running(self) -> bool:
        """Check if analysis loop is running"""
        return self._running
