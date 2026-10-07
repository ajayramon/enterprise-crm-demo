from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import activities, analytics, auth, customers, deals, users
from app.config import get_settings
from app.database import get_repository

settings = get_settings()


@asynccontextmanager
async def lifespan(_: FastAPI):
    repo = get_repository()
    if settings.auto_seed_demo:
        repo.seed_demo_data()
    yield


app = FastAPI(
    title=settings.app_name,
    version='1.0.0',
    summary='Enterprise CRM prototype for Bissa Esse Enterprises',
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)


@app.get('/health')
def health() -> dict:
    return {
        'status': 'ok',
        'app': settings.app_name,
        'storage_mode': settings.storage_mode,
        'company': 'Bissa Esse Enterprises',
    }


@app.get('/')
def root() -> dict:
    return {
        'message': 'Welcome to the Bissa Esse Enterprises CRM API',
        'docs': '/docs',
        'health': '/health',
    }


for router in [auth.router, users.router, customers.router, deals.router, activities.router, analytics.router]:
    app.include_router(router, prefix=settings.api_prefix)
