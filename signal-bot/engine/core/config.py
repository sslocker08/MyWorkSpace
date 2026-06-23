from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List, Optional


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Database
    database_url: str = "postgresql+asyncpg://signalbot:signalbot@localhost:5432/signalbot"

    @field_validator("database_url", mode="before")
    @classmethod
    def normalize_database_url(cls, v: str) -> str:
        # Railway injects DATABASE_URL as postgres:// or postgresql:// (no +asyncpg).
        if isinstance(v, str):
            if v.startswith("postgres://"):
                return v.replace("postgres://", "postgresql+asyncpg://", 1)
            if v.startswith("postgresql://") and "+asyncpg" not in v:
                return v.replace("postgresql://", "postgresql+asyncpg://", 1)
        return v

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # API Keys
    polygon_api_key: str = ""
    fred_api_key: str = ""
    fmp_api_key: str = ""
    anthropic_api_key: str = ""

    # Telegram
    telegram_bot_token: str = ""
    telegram_chat_id: str = ""

    # JP APIs
    jquants_api_key: str = ""
    kabu_api_key: str = ""
    kabu_api_secret: str = ""

    # Reddit (optional — for social sentiment)
    reddit_client_id: Optional[str] = None
    reddit_client_secret: Optional[str] = None
    reddit_user_agent: Optional[str] = None

    # Broker (optional — "manual" = paper trading, "sbi" = kabu.com API)
    broker_type: Optional[str] = "manual"

    # App
    secret_key: str = "change-me-in-production"
    environment: str = "development"
    log_level: str = "INFO"
    cors_origins: List[str] = ["http://localhost:3000"]

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, v) -> List[str]:
        # Allow comma-separated string from CORS_ORIGINS env var:
        #   CORS_ORIGINS=https://signal-bot.pages.dev,http://localhost:3000
        if isinstance(v, str):
            return [o.strip() for o in v.split(",") if o.strip()]
        return v

    # Scanner config
    scan_interval_minutes: int = 15
    signal_score_threshold: float = 60.0
    max_signals_per_scan: int = 50

    # Risk
    portfolio_risk_pct: float = 0.01  # 1% per trade
    atr_sl_multiplier: float = 1.5
    atr_tp1_multiplier: float = 1.5
    atr_tp2_multiplier: float = 3.0   # RR (tp2/sl) = 3.0 / 1.5 = 2.0, clears min_risk_reward gate
    atr_tp3_multiplier: float = 4.5
    min_risk_reward: float = 1.5      # reject setups below this RR (uses tp2 distance)


settings = Settings()
