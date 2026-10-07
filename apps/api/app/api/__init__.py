from fastapi import FastAPI

from app.api.admin import audit_router, commerce_router, settings_router
from app.api.auth import router as auth_router
from app.api.catalog import router as catalog_router
from app.api.dashboard import router as dashboard_router
from app.api.files import router as files_router
from app.api.inventory import router as inventory_router
from app.api.orders import router as orders_router
from app.api.packs import router as packs_router
from app.api.promotions import router as promotions_router
from app.api.public import router as public_router
from app.api.reports import router as reports_router
from app.api.users import router as users_router
from app.api.zones import currencies_router, router as zones_router

API_PREFIX = "/api/v1"


def register_routes(app: FastAPI) -> None:
    app.include_router(auth_router, prefix=API_PREFIX)
    app.include_router(zones_router, prefix=API_PREFIX)
    app.include_router(currencies_router, prefix=API_PREFIX)
    app.include_router(users_router, prefix=API_PREFIX)
    app.include_router(catalog_router, prefix=API_PREFIX)
    app.include_router(public_router, prefix=API_PREFIX)
    app.include_router(inventory_router, prefix=API_PREFIX)
    app.include_router(reports_router, prefix=API_PREFIX)
    app.include_router(audit_router, prefix=API_PREFIX)
    app.include_router(settings_router, prefix=API_PREFIX)
    app.include_router(commerce_router, prefix=API_PREFIX)
    app.include_router(files_router, prefix=API_PREFIX)
    app.include_router(orders_router, prefix=API_PREFIX)
    app.include_router(packs_router, prefix=API_PREFIX)
    app.include_router(promotions_router, prefix=API_PREFIX)
    app.include_router(dashboard_router, prefix=API_PREFIX)
