from functools import lru_cache

from pymongo import MongoClient
from pymongo.database import Database

from app.config import get_settings
from app.repository import InMemoryCRMRepository, MongoCRMRepository


@lru_cache
def get_mongo_client() -> MongoClient:
    settings = get_settings()
    return MongoClient(settings.mongo_url, serverSelectionTimeoutMS=5000)


def get_database() -> Database:
    settings = get_settings()
    return get_mongo_client()[settings.crm_database]


@lru_cache
def get_memory_repository() -> InMemoryCRMRepository:
    return InMemoryCRMRepository()


def get_repository():
    settings = get_settings()
    if settings.storage_mode.lower() == 'memory':
        return get_memory_repository()
    return MongoCRMRepository(get_database())
