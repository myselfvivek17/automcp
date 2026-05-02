"""
Application Configuration
Loads and validates environment variables using Pydantic Settings
"""

import json
from typing import List, Optional, Any, Type

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, DotEnvSettingsSource

class FlexibleEnvSource(DotEnvSettingsSource):
    def prepare_field_value(self, field_name: str, field, value: Any, value_is_complex: bool) -> Any:
        # String aliases always produce value_is_complex=False in pydantic-settings 2.x,
        # so check _field_is_complex directly to catch List/Set/Dict fields with aliases.
        is_complex, _ = self._field_is_complex(field)
        if isinstance(value, str) and (value_is_complex or is_complex):
            value = value.strip()
            if not value:
                return None
            if value.startswith("["):
                return json.loads(value)
            items = [i.strip() for i in value.split(",") if i.strip()]
            return items
        return super().prepare_field_value(field_name, field, value, value_is_complex)


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""

    # Application
    environment: str = Field(default="development", alias="ENVIRONMENT")
    debug: bool = Field(default=False, alias="DEBUG")
    app_name: str = Field(default="AutoMCP", alias="APP_NAME")
    app_version: str = Field(default="1.0.0", alias="APP_VERSION")
    api_host: str = Field(default="0.0.0.0", alias="API_HOST")
    api_port: int = Field(default=8000, alias="API_PORT")

    # Security
    jwt_secret: str = Field(..., alias="JWT_SECRET")
    jwt_algorithm: str = Field(default="HS256", alias="JWT_ALGORITHM")
    jwt_expiration_hours: int = Field(default=24, alias="JWT_EXPIRATION_HOURS")
    encryption_key: str = Field(..., alias="ENCRYPTION_KEY")
    allowed_origins: List[str] = Field(default=["http://localhost:3000"], alias="ALLOWED_ORIGINS")

    # Database - IBM Cloudant
    cloudant_url: str = Field(..., alias="CLOUDANT_URL")
    cloudant_username: str = Field(..., alias="CLOUDANT_USERNAME")
    cloudant_password: str = Field(..., alias="CLOUDANT_PASSWORD")
    cloudant_database: str = Field(default="automcp", alias="CLOUDANT_DATABASE")

    # Redis
    redis_host: str = Field(default="localhost", alias="REDIS_HOST")
    redis_port: int = Field(default=6379, alias="REDIS_PORT")
    redis_password: Optional[str] = Field(default=None, alias="REDIS_PASSWORD")
    redis_db: int = Field(default=0, alias="REDIS_DB")

    # IBM watsonx.ai
    watsonx_api_key: str = Field(..., alias="WATSONX_API_KEY")
    watsonx_project_id: str = Field(..., alias="WATSONX_PROJECT_ID")
    watsonx_url: str = Field(default="https://us-south.ml.cloud.ibm.com", alias="WATSONX_URL")
    watsonx_model: str = Field(default="ibm/granite-13b-chat-v2", alias="WATSONX_MODEL")

    # OpenAI (optional)
    openai_api_key: Optional[str] = Field(default=None, alias="OPENAI_API_KEY")
    openai_model: str = Field(default="gpt-4-turbo-preview", alias="OPENAI_MODEL")
    openai_org_id: Optional[str] = Field(default=None, alias="OPENAI_ORG_ID")

    # Anthropic (optional)
    anthropic_api_key: Optional[str] = Field(default=None, alias="ANTHROPIC_API_KEY")
    anthropic_model: str = Field(default="claude-3-opus-20240229", alias="ANTHROPIC_MODEL")

    # Google Gemini (optional)
    google_api_key: Optional[str] = Field(default=None, alias="GOOGLE_API_KEY")
    google_model: str = Field(default="gemini-pro", alias="GOOGLE_MODEL")

    # Rate Limiting
    rate_limit_per_minute: int = Field(default=60, alias="RATE_LIMIT_PER_MINUTE")
    rate_limit_per_hour: int = Field(default=1000, alias="RATE_LIMIT_PER_HOUR")

    # Logging
    log_level: str = Field(default="INFO", alias="LOG_LEVEL")
    log_format: str = Field(default="json", alias="LOG_FORMAT")

    # CORS
    cors_allow_credentials: bool = Field(default=True, alias="CORS_ALLOW_CREDENTIALS")
    cors_max_age: int = Field(default=3600, alias="CORS_MAX_AGE")

    # File Upload
    max_upload_size_mb: int = Field(default=10, alias="MAX_UPLOAD_SIZE_MB")
    allowed_file_types: List[str] = Field(default=[".json", ".yaml", ".yml", ".txt"], alias="ALLOWED_FILE_TYPES")

    # Agent System
    max_concurrent_agents: int = Field(default=5, alias="MAX_CONCURRENT_AGENTS")
    agent_timeout_seconds: int = Field(default=300, alias="AGENT_TIMEOUT_SECONDS")
    agent_retry_attempts: int = Field(default=3, alias="AGENT_RETRY_ATTEMPTS")

    # Code Generation
    output_languages: List[str] = Field(default=["python", "typescript"], alias="OUTPUT_LANGUAGES")
    default_output_language: str = Field(default="python", alias="DEFAULT_OUTPUT_LANGUAGE")
    template_directory: str = Field(default="./templates", alias="TEMPLATE_DIRECTORY")

    # WebSocket
    ws_heartbeat_interval: int = Field(default=30, alias="WS_HEARTBEAT_INTERVAL")
    ws_max_connections: int = Field(default=100, alias="WS_MAX_CONNECTIONS")

    # Monitoring (optional)
    sentry_dsn: Optional[str] = Field(default=None, alias="SENTRY_DSN")
    datadog_api_key: Optional[str] = Field(default=None, alias="DATADOG_API_KEY")

    # IBM Cloud (for deployment)
    ibm_cloud_api_key: Optional[str] = Field(default=None, alias="IBM_CLOUD_API_KEY")
    ibm_cloud_region: str = Field(default="us-south", alias="IBM_CLOUD_REGION")
    code_engine_project: str = Field(default="automcp", alias="CODE_ENGINE_PROJECT")

    @field_validator("encryption_key")
    @classmethod
    def validate_encryption_key(cls, v):
        if len(v) < 32:
            raise ValueError("Encryption key must be at least 32 characters")
        return v

    @property
    def is_production(self) -> bool:
        return self.environment.lower() == "production"

    @property
    def is_development(self) -> bool:
        return self.environment.lower() == "development"

    @property
    def redis_url(self) -> str:
        if self.redis_password:
            return f"redis://:{self.redis_password}@{self.redis_host}:{self.redis_port}/{self.redis_db}"
        return f"redis://{self.redis_host}:{self.redis_port}/{self.redis_db}"

    @classmethod
    def settings_customise_sources(
        cls,
        settings_cls: Type[BaseSettings],
        **kwargs,
    ):
        return (
            FlexibleEnvSource(settings_cls, env_file=".env", env_file_encoding="utf-8"),
        )

# Global settings instance
settings = Settings()