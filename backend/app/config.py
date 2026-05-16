"""AutoMCP configuration"""
from pydantic_settings import BaseSettings
from typing import List, Optional


class Settings(BaseSettings):
    # App
    app_name: str = "AutoMCP"
    debug: bool = True
    log_level: str = "INFO"

    # AI Providers
    watsonx_api_key: Optional[str] = None
    watsonx_project_id: Optional[str] = None
    watsonx_url: str = "https://us-south.ml.cloud.ibm.com"
    watsonx_model: str = "ibm/granite-13b-chat-v2"

    openai_api_key: Optional[str] = None
    anthropic_api_key: Optional[str] = None
    google_api_key: Optional[str] = None
    openrouter_api_key: Optional[str] = None

    # CORS
    allowed_origins: List[str] = ["http://localhost:3000", "http://localhost:3001"]

    class Config:
        env_file = ".env"
        case_sensitive = False
        extra = "ignore"


settings = Settings()
