"""
Application configuration management using Pydantic Settings.

Validates environment variables, parses JSON lists, ensures strictly normalized
E.164 phone representation for business escalation channels, and provides
safe defaults for development and production modes.
"""

import json
from typing import List, Union
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from app.utils.phone import normalize_phone_number


class Settings(BaseSettings):
    """
    Central application settings loaded from environment variables or .env file.
    """
    # Environment & Application Metadata
    APP_ENV: str = "development"
    LOG_LEVEL: str = "INFO"
    SECRET_KEY: str = "default-dev-insecure-secret-key-replace-in-production"
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "WB-Agent Platform"

    # Primary Database (PostgreSQL + pgvector)
    # Allows fallback to SQLite for lightweight test environments
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/wb_agent"
    DATABASE_URL_SYNC: str = "postgresql://postgres:postgres@localhost:5432/wb_agent"
    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 20
    DB_POOL_TIMEOUT: int = 30

    # Business / Multi-Tenant Context
    DEFAULT_ORG_ID: str = "org_default_tea"
    DEFAULT_ORG_NAME: str = "North Bengal Tea Co."

    # Owner Escalation & Notifications (Normalized to E.164)
    OWNER_WHATSAPP_NUMBER: str = "+918900653250"
    OWNER_NOTIFICATION_ENABLED: bool = True
    OWNER_VERBOSE_MODE: bool = False

    # AI & LLM Provider Configuration
    # Production: NVIDIA Nemotron; Development/Test: Provider abstraction with fallback
    NVIDIA_API_KEY: str = "nvapi-mock-key-for-local-dev"
    NVIDIA_FALLBACK_API_KEY: str = ""
    NVIDIA_BASE_URL: str = "https://integrate.api.nvidia.com/v1"
    NVIDIA_MODEL: str = "nvidia/nemotron-3-ultra-550b-a55b"
    NVIDIA_FALLBACK_MODELS: str = "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning,nvidia/nemotron-3-super-120b-a12b,google/gemma-4-31b-it"
    NVIDIA_EMBEDDING_MODEL: str = "nvidia/nv-embedqa-e5-v5"
    LLM_PROVIDER: str = "simulator"  # Options: 'nvidia', 'simulator', 'fallback'
    LLM_FALLBACK_PROVIDER: str = "simulator"
    LLM_TEMPERATURE: float = 0.2
    LLM_MAX_TOKENS: int = 1024
    LLM_REQUEST_TIMEOUT: int = 90
    GEMINI_API_KEY: str = ""

    # WhatsApp Channel Configuration
    # Options: 'simulator', 'development', 'meta_cloud'
    WHATSAPP_PROVIDER: str = "simulator"
    WHATSAPP_PHONE_NUMBER_ID: str = "mock_phone_number_id"
    WHATSAPP_BUSINESS_ACCOUNT_ID: str = "mock_waba_id"
    WHATSAPP_ACCESS_TOKEN: str = "mock_access_token"
    WHATSAPP_VERIFY_TOKEN: str = "wb_agent_verify_token"
    WHATSAPP_API_VERSION: str = "v20.0"
    WHATSAPP_WEBHOOK_SECRET: str = "mock_webhook_secret"

    # Lead Sources & External Scrapers
    APIFY_TOKEN: str = ""
    APIFY_DEFAULT_ACTOR_ID: str = ""
    APIFY_DATASET_RETRIEVAL_TIMEOUT: int = 60

    # Concurrency, Job Queue & Worker Tuning
    WORKER_COUNT: int = 2
    MAX_AGENT_CONCURRENCY: int = 10
    CONVERSATION_LOCK_TIMEOUT_SECONDS: int = 60
    MESSAGE_DEBOUNCE_WINDOW_SECONDS: float = 2.5
    JOB_POLL_INTERVAL_SECONDS: float = 1.0

    # Follow-up Engine Cadence
    FOLLOWUP_ENGINE_ENABLED: bool = True
    FOLLOWUP_CHECK_INTERVAL_SECONDS: int = 60
    FOLLOWUP_DEFAULT_MAX_ATTEMPTS: int = 3
    FOLLOWUP_DAY_0_MINUTES: int = 120
    FOLLOWUP_DAY_1_HOURS: int = 24
    FOLLOWUP_DAY_3_HOURS: int = 72

    # Global Operations & Autonomous Safeguards
    GLOBAL_AUTONOMOUS_ENABLED: bool = True
    DRY_RUN_MODE: bool = False
    SANDBOX_MODE: bool = True

    # Networking & Security
    API_URL: str = "http://localhost:8000"
    DASHBOARD_URL: str = "http://localhost:3000"
    WHATSAPP_BRIDGE_URL: str = "http://localhost:3001"
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ]

    # Storage Paths
    STORAGE_BASE_PATH: str = "./storage"
    UPLOAD_MAX_BYTES: int = 10485760  # 10 MB

    @field_validator("OWNER_WHATSAPP_NUMBER")
    @classmethod
    def validate_owner_number(cls, v: str) -> str:
        """
        Guarantees that the owner phone is strictly normalized to E.164.
        Never allows unformatted numbers like '+91 89006 53250' to slip into logic.
        """
        try:
            return normalize_phone_number(v, default_country_code="+91")
        except Exception as e:
            raise ValueError(f"Invalid OWNER_WHATSAPP_NUMBER '{v}': {e}")

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        """
        Supports CORS origins supplied either as a JSON list or comma-separated string.
        """
        if isinstance(v, str):
            v_trimmed = v.strip()
            if v_trimmed.startswith("[") and v_trimmed.endswith("]"):
                try:
                    return json.loads(v_trimmed)
                except Exception:
                    pass
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=True,
    )


# Singleton instance cached across the application
settings = Settings()
