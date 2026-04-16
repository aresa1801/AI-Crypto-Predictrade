"""
Circuit Breaker

System-level circuit breaker for protecting against catastrophic failures.
Monitors system health, connection status, and implements read-only fallback.
"""

from dataclasses import dataclass, field
from datetime import datetime, timezone, timedelta
from enum import Enum
from typing import Any, Callable, Optional
import logging
import asyncio

logger = logging.getLogger(__name__)


class CircuitBreakerState(str, Enum):
    """Circuit breaker states"""
    CLOSED = "closed"      # Normal operation
    OPEN = "open"          # Triggered, blocking operations
    HALF_OPEN = "half_open"  # Testing if issue resolved


class TriggerReason(str, Enum):
    """Reasons for circuit breaker trigger"""
    CONNECTION_FAILURE = "connection_failure"
    EXCESSIVE_ERRORS = "excessive_errors"
    DRAWDOWN_LIMIT = "drawdown_limit"
    DAILY_LOSS_LIMIT = "daily_loss_limit"
    MANUAL_TRIGGER = "manual_trigger"
    RATE_LIMIT = "rate_limit"
    SYSTEM_ERROR = "system_error"


@dataclass
class CircuitBreakerConfig:
    """Circuit breaker configuration"""
    # Failure thresholds
    failure_threshold: int = 5  # Failures before opening
    success_threshold: int = 3  # Successes before closing
    
    # Timing
    recovery_timeout_seconds: int = 60  # Time before trying to close
    half_open_max_calls: int = 3  # Max calls in half-open state
    
    # Connection monitoring
    max_connection_failures: int = 3
    connection_check_interval_seconds: int = 10
    
    # Rate limiting
    max_errors_per_minute: int = 10


@dataclass
class CircuitBreakerMetrics:
    """Metrics tracked by circuit breaker"""
    total_calls: int = 0
    successful_calls: int = 0
    failed_calls: int = 0
    rejected_calls: int = 0
    
    consecutive_failures: int = 0
    consecutive_successes: int = 0
    
    last_failure_time: Optional[datetime] = None
    last_success_time: Optional[datetime] = None
    last_state_change: Optional[datetime] = None
    
    errors_last_minute: list[datetime] = field(default_factory=list)


class CircuitBreaker:
    """
    Circuit Breaker implementation for system protection.
    
    States:
    - CLOSED: Normal operation, monitoring for failures
    - OPEN: Blocking operations, system in read-only mode
    - HALF_OPEN: Testing if issue is resolved
    """
    
    def __init__(
        self,
        name: str = "main",
        config: Optional[CircuitBreakerConfig] = None
    ):
        self.name = name
        self.config = config or CircuitBreakerConfig()
        
        self._state = CircuitBreakerState.CLOSED
        self._metrics = CircuitBreakerMetrics()
        self._trigger_reason: Optional[TriggerReason] = None
        self._trigger_message: Optional[str] = None
        
        self._state_listeners: list[Callable] = []
        self._check_task: Optional[asyncio.Task] = None
        self._connection_status: dict[str, bool] = {}
        
    @property
    def state(self) -> CircuitBreakerState:
        """Get current state"""
        return self._state
    
    @property
    def is_open(self) -> bool:
        """Check if circuit is open (blocking)"""
        return self._state == CircuitBreakerState.OPEN
    
    @property
    def is_closed(self) -> bool:
        """Check if circuit is closed (normal)"""
        return self._state == CircuitBreakerState.CLOSED
    
    @property
    def allows_operations(self) -> bool:
        """Check if operations are allowed"""
        return self._state != CircuitBreakerState.OPEN
    
    async def call(
        self,
        func: Callable,
        *args,
        fallback: Optional[Callable] = None,
        **kwargs
    ) -> Any:
        """
        Execute a function through the circuit breaker.
        
        Args:
            func: Function to execute
            fallback: Optional fallback function if circuit is open
            *args, **kwargs: Arguments for the function
            
        Returns:
            Function result or fallback result
            
        Raises:
            CircuitBreakerOpenError: If circuit is open and no fallback
        """
        self._metrics.total_calls += 1
        
        # Check if should transition to half-open
        if self._state == CircuitBreakerState.OPEN:
            if self._should_try_reset():
                self._transition_to(CircuitBreakerState.HALF_OPEN)
            else:
                self._metrics.rejected_calls += 1
                if fallback:
                    return await self._execute_fallback(fallback, *args, **kwargs)
                raise CircuitBreakerOpenError(
                    f"Circuit breaker '{self.name}' is open: {self._trigger_message}"
                )
        
        # Execute the call
        try:
            if asyncio.iscoroutinefunction(func):
                result = await func(*args, **kwargs)
            else:
                result = func(*args, **kwargs)
            
            self._record_success()
            return result
            
        except Exception as e:
            self._record_failure(str(e))
            raise
    
    def record_external_success(self) -> None:
        """Record a success from external source"""
        self._record_success()
    
    def record_external_failure(self, error: str = "") -> None:
        """Record a failure from external source"""
        self._record_failure(error)
    
    def _record_success(self) -> None:
        """Record successful call"""
        self._metrics.successful_calls += 1
        self._metrics.consecutive_successes += 1
        self._metrics.consecutive_failures = 0
        self._metrics.last_success_time = datetime.now(timezone.utc)
        
        # Check if should close circuit
        if self._state == CircuitBreakerState.HALF_OPEN:
            if self._metrics.consecutive_successes >= self.config.success_threshold:
                self._transition_to(CircuitBreakerState.CLOSED)
                logger.info(f"Circuit breaker '{self.name}' closed after recovery")
    
    def _record_failure(self, error: str = "") -> None:
        """Record failed call"""
        now = datetime.now(timezone.utc)
        
        self._metrics.failed_calls += 1
        self._metrics.consecutive_failures += 1
        self._metrics.consecutive_successes = 0
        self._metrics.last_failure_time = now
        
        # Track errors per minute
        self._metrics.errors_last_minute.append(now)
        self._metrics.errors_last_minute = [
            t for t in self._metrics.errors_last_minute
            if (now - t).total_seconds() < 60
        ]
        
        # Check if should open circuit
        should_open = False
        reason = TriggerReason.EXCESSIVE_ERRORS
        
        if self._metrics.consecutive_failures >= self.config.failure_threshold:
            should_open = True
            reason = TriggerReason.EXCESSIVE_ERRORS
            
        if len(self._metrics.errors_last_minute) >= self.config.max_errors_per_minute:
            should_open = True
            reason = TriggerReason.RATE_LIMIT
        
        if should_open and self._state != CircuitBreakerState.OPEN:
            self._trigger(reason, error or "Too many failures")
    
    def _should_try_reset(self) -> bool:
        """Check if should attempt to reset circuit"""
        if not self._metrics.last_state_change:
            return True
        
        elapsed = (datetime.now(timezone.utc) - self._metrics.last_state_change).total_seconds()
        return elapsed >= self.config.recovery_timeout_seconds
    
    def _transition_to(self, new_state: CircuitBreakerState) -> None:
        """Transition to a new state"""
        old_state = self._state
        self._state = new_state
        self._metrics.last_state_change = datetime.now(timezone.utc)
        
        if new_state == CircuitBreakerState.CLOSED:
            self._trigger_reason = None
            self._trigger_message = None
        
        logger.info(f"Circuit breaker '{self.name}' state: {old_state.value} -> {new_state.value}")
        
        # Notify listeners
        for listener in self._state_listeners:
            try:
                listener(old_state, new_state)
            except Exception as e:
                logger.error(f"Error in state listener: {e}")
    
    def trigger(
        self,
        reason: TriggerReason,
        message: str = ""
    ) -> None:
        """Manually trigger the circuit breaker"""
        self._trigger(reason, message)
    
    def _trigger(
        self,
        reason: TriggerReason,
        message: str = ""
    ) -> None:
        """Open the circuit breaker"""
        self._trigger_reason = reason
        self._trigger_message = message
        self._transition_to(CircuitBreakerState.OPEN)
        logger.warning(f"Circuit breaker '{self.name}' triggered: {reason.value} - {message}")
    
    def reset(self) -> bool:
        """Manually reset the circuit breaker"""
        if self._state != CircuitBreakerState.CLOSED:
            logger.info(f"Circuit breaker '{self.name}' manually reset")
            self._transition_to(CircuitBreakerState.CLOSED)
            self._metrics.consecutive_failures = 0
            return True
        return False
    
    def update_connection_status(self, connection_name: str, is_connected: bool) -> None:
        """Update connection status for monitoring"""
        was_connected = self._connection_status.get(connection_name, True)
        self._connection_status[connection_name] = is_connected
        
        if was_connected and not is_connected:
            logger.warning(f"Connection lost: {connection_name}")
            
            # Count connection failures
            disconnected = sum(1 for v in self._connection_status.values() if not v)
            if disconnected >= self.config.max_connection_failures:
                self._trigger(
                    TriggerReason.CONNECTION_FAILURE,
                    f"Too many connection failures: {disconnected}"
                )
    
    async def _execute_fallback(
        self,
        fallback: Callable,
        *args,
        **kwargs
    ) -> Any:
        """Execute fallback function"""
        if asyncio.iscoroutinefunction(fallback):
            return await fallback(*args, **kwargs)
        return fallback(*args, **kwargs)
    
    def add_state_listener(self, listener: Callable) -> None:
        """Add a listener for state changes"""
        self._state_listeners.append(listener)
    
    def remove_state_listener(self, listener: Callable) -> None:
        """Remove a state listener"""
        if listener in self._state_listeners:
            self._state_listeners.remove(listener)
    
    def get_status(self) -> dict[str, Any]:
        """Get current circuit breaker status"""
        return {
            "name": self.name,
            "state": self._state.value,
            "trigger_reason": self._trigger_reason.value if self._trigger_reason else None,
            "trigger_message": self._trigger_message,
            "metrics": {
                "total_calls": self._metrics.total_calls,
                "successful_calls": self._metrics.successful_calls,
                "failed_calls": self._metrics.failed_calls,
                "rejected_calls": self._metrics.rejected_calls,
                "consecutive_failures": self._metrics.consecutive_failures,
                "consecutive_successes": self._metrics.consecutive_successes,
                "errors_last_minute": len(self._metrics.errors_last_minute)
            },
            "connections": self._connection_status,
            "last_failure": self._metrics.last_failure_time.isoformat() if self._metrics.last_failure_time else None,
            "last_success": self._metrics.last_success_time.isoformat() if self._metrics.last_success_time else None,
            "last_state_change": self._metrics.last_state_change.isoformat() if self._metrics.last_state_change else None
        }


class CircuitBreakerOpenError(Exception):
    """Exception raised when circuit breaker is open"""
    pass


# Global circuit breaker instance
_global_circuit_breaker: Optional[CircuitBreaker] = None


def get_circuit_breaker() -> CircuitBreaker:
    """Get the global circuit breaker instance"""
    global _global_circuit_breaker
    if _global_circuit_breaker is None:
        _global_circuit_breaker = CircuitBreaker(name="global")
    return _global_circuit_breaker
