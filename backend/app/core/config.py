"""
Core Configuration Module

Handles all environment variables and application settings with
secure defaults and validation using Pydantic Settings.
"""

from functools import lru_cache
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field, SecretStr


class DatabaseSettings(BaseSettings):
    """Database connection settings"""
    
    model_config = SettingsConfigDict(env_prefix="DB_")
    
    host: str = Field(default="localhost", description="Database host")
    port: int = Field(default=5432, description="Database port")
    name: str = Field(default="predictrade", description="Database name")
    user: str = Field(default="postgres", description="Database user")
    password: SecretStr = Field(default=SecretStr(""), description="Database password")
    
    @property
    def url(self) -> str:
        """Construct database URL"""
        password = self.password.get_secret_value()
        return f"postgresql+asyncpg://{self.user}:{password}@{self.host}:{self.port}/{self.name}"
    
    @property
    def sync_url(self) -> str:
        """Construct synchronous database URL for migrations"""
        password = self.password.get_secret_value()
        return f"postgresql://{self.user}:{password}@{self.host}:{self.port}/{self.name}"


class RedisSettings(BaseSettings):
    """Redis connection settings"""
    
    model_config = SettingsConfigDict(env_prefix="REDIS_")
    
    host: str = Field(default="localhost", description="Redis host")
    port: int = Field(default=6379, description="Redis port")
    password: SecretStr = Field(default=SecretStr(""), description="Redis password")
    db: int = Field(default=0, description="Redis database number")
    
    @property
    def url(self) -> str:
        """Construct Redis URL"""
        password = self.password.get_secret_value()
        if password:
            return f"redis://:{password}@{self.host}:{self.port}/{self.db}"
        return f"redis://{self.host}:{self.port}/{self.db}"


class ExchangeSettings(BaseSettings):
    """CEX Exchange API settings"""
    
    model_config = SettingsConfigDict(env_prefix="EXCHANGE_")
    
    # Binance
    binance_api_key: SecretStr = Field(default=SecretStr(""), description="Binance API Key")
    binance_api_secret: SecretStr = Field(default=SecretStr(""), description="Binance API Secret")
    binance_testnet: bool = Field(default=True, description="Use Binance testnet")
    
    # Bybit
    bybit_api_key: SecretStr = Field(default=SecretStr(""), description="Bybit API Key")
    bybit_api_secret: SecretStr = Field(default=SecretStr(""), description="Bybit API Secret")
    bybit_testnet: bool = Field(default=True, description="Use Bybit testnet")


class PolymarketSettings(BaseSettings):
    """Polymarket API settings"""
    
    model_config = SettingsConfigDict(env_prefix="POLYMARKET_")
    
    api_key: SecretStr = Field(default=SecretStr(""), description="Polymarket API Key")
    api_secret: SecretStr = Field(default=SecretStr(""), description="Polymarket API Secret")
    private_key: SecretStr = Field(default=SecretStr(""), description="Wallet private key")
    rpc_url: str = Field(
        default="https://polygon-mainnet.g.alchemy.com/v2/",
        description="Polygon RPC URL"
    )


class AISettings(BaseSettings):
    """AI and LLM settings"""
    
    model_config = SettingsConfigDict(env_prefix="AI_")
    
    openrouter_api_key: SecretStr = Field(default=SecretStr(""), description="OpenRouter API Key")
    openai_api_key: SecretStr = Field(default=SecretStr(""), description="OpenAI API Key (fallback)")
    model: str = Field(default="openai/gpt-4-turbo-preview", description="Default LLM model")
    temperature: float = Field(default=0.7, ge=0, le=2, description="LLM temperature")
    max_tokens: int = Field(default=4096, description="Max tokens per response")


class RiskSettings(BaseSettings):
    """Risk management settings"""
    
    model_config = SettingsConfigDict(env_prefix="RISK_")
    
    # Position sizing
    max_position_size_pct: float = Field(default=2.0, description="Max position size as % of portfolio")
    max_portfolio_risk_pct: float = Field(default=10.0, description="Max total portfolio risk %")
    
    # Loss limits
    daily_loss_limit_pct: float = Field(default=5.0, description="Daily loss limit as % of portfolio")
    max_drawdown_pct: float = Field(default=15.0, description="Max drawdown before kill switch")
    
    # Risk metrics
    min_risk_reward_ratio: float = Field(default=1.5, description="Minimum risk/reward ratio")
    var_confidence_level: float = Field(default=0.95, description="VaR confidence level")
    
    # Trading limits
    max_open_positions: int = Field(default=10, description="Maximum open positions")
    cooldown_minutes: int = Field(default=5, description="Minutes between trades same asset")


class AppSettings(BaseSettings):
    """Main application settings"""
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )
    
    # Application
    app_name: str = Field(default="AI-Crypto-Predictrade", description="Application name")
    debug: bool = Field(default=False, description="Debug mode")
    environment: str = Field(default="development", description="Environment name")
    api_version: str = Field(default="v1", description="API version")
    
    # Server
    host: str = Field(default="0.0.0.0", description="Server host")
    port: int = Field(default=8000, description="Server port")
    
    # Security
    secret_key: SecretStr = Field(
        default=SecretStr("change-this-in-production-use-32-char-min"),
        description="JWT secret key"
    )
    access_token_expire_minutes: int = Field(default=30, description="Access token expiration")
    
    # CORS
    allowed_origins: list[str] = Field(
        default=["http://localhost:3000", "https://*.vercel.app"],
        description="Allowed CORS origins"
    )
    
    # Supabase
    supabase_url: str = Field(default="", description="Supabase project URL")
    supabase_service_key: SecretStr = Field(default=SecretStr(""), description="Supabase service role key")
    
    # Sub-settings
    database: DatabaseSettings = Field(default_factory=DatabaseSettings)
    redis: RedisSettings = Field(default_factory=RedisSettings)
    exchange: ExchangeSettings = Field(default_factory=ExchangeSettings)
    polymarket: PolymarketSettings = Field(default_factory=PolymarketSettings)
    ai: AISettings = Field(default_factory=AISettings)
    risk: RiskSettings = Field(default_factory=RiskSettings)


@lru_cache()
def get_settings() -> AppSettings:
    """Get cached application settings"""
    return AppSettings()


# Convenience export
settings = get_settings()
