from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import register_routes
from app.core.config import get_settings
from app.core.storage import ensure_bucket

settings = get_settings()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    ensure_bucket()
    yield


app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    description=(
        "API propriétaire d'O'Naturelle. Une seule enseigne, pas de multi-tenant. "
        "Zones commerciales configurables, prix et stocks par zone, aucune conversion automatique."
    ),
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "brand": "O'Naturelle"}


register_routes(app)
