from pathlib import Path
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict

_API_ROOT = Path(__file__).resolve().parents[2]
_REPO_ROOT = Path(__file__).resolve().parents[3]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(str(_API_ROOT / ".env"), str(_REPO_ROOT / ".env")),
        extra="ignore",
    )

    app_name: str = "O'Naturelle API"
    database_url: str = "postgresql+psycopg://onaturelle:onaturelle@localhost:5435/onaturelle"

    jwt_secret: str = "change-me-to-a-long-random-string"
    jwt_algorithm: str = "HS256"
    jwt_access_minutes: int = 30
    jwt_refresh_days: int = 14

    minio_endpoint: str = "localhost:9000"
    minio_public_endpoint: str = "localhost:9000"
    minio_access_key: str = "onaturelle"
    minio_secret_key: str = "onaturelle_minio"
    minio_bucket: str = "onaturelle-media"
    minio_use_ssl: bool = False

    owner_email: str = "owner@onaturelle.local"
    owner_password: str = "change-me-owner"
    owner_name: str = "O'Naturelle"

    seller_email: str = "vendeuse@onaturelle.local"
    seller_password: str = "change-me-seller"
    seller_name: str = "Vendeuse Cameroun"

    api_cors_origins: str = "http://localhost:3000"

    @property
    def cors_origin_list(self) -> list[str]:
        return [item.strip() for item in self.api_cors_origins.split(",") if item.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
