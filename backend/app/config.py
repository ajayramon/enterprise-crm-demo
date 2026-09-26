from functools import lru_cache
from typing import List

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = 'Bissa Esse Enterprises CRM API'
    api_prefix: str = '/api'
    storage_mode: str = Field(default='mongo', alias='CRM_STORAGE_MODE')
    mongo_url: str = Field(default='mongodb://localhost:27017', alias='MONGO_URL')
    crm_database: str = Field(default='bissa_esse_crm', alias='CRM_DATABASE')
    jwt_secret: str = Field(default='change-this-secret', alias='JWT_SECRET')
    jwt_algorithm: str = 'HS256'
    access_token_expire_minutes: int = Field(default=720, alias='ACCESS_TOKEN_EXPIRE_MINUTES')
    auto_seed_demo: bool = Field(default=True, alias='AUTO_SEED_DEMO')
    cors_origins: List[str] = Field(default_factory=lambda: [
        'http://localhost:4200',
        'http://127.0.0.1:4200',
    ], alias='CORS_ORIGINS')

    model_config = SettingsConfigDict(
        env_file='.env',
        env_file_encoding='utf-8',
        case_sensitive=False,
        extra='ignore',
        populate_by_name=True,
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
