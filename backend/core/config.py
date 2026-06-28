"""
Application configuration – loaded from environment variables.
"""

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # AI - NVIDIA
    NVIDIA_API_KEY: str = ""
    MODEL_NAME: str = ""
    NVIDIA_BASE_URL: str = ""

    # AI - OpenRouter (kept for backward compatibility)
    OPENROUTER_API_KEY: str = ""
    OPENROUTER_MODEL: str = "openai/gpt-5.5"
    OPENROUTER_BASE_URL: str = "https://openrouter.ai/api/v1"

    # Kubernetes
    KUBECONFIG_PATH: str = "~/.kube/config"

    # InsForge
    INSFORGE_API_KEY: str = ""
    INSFORGE_BASE_URL: str = ""

    # App
    APP_ENV: str = "development"
    LOG_LEVEL: str = "INFO"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()