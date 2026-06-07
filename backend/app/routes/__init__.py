from app.routes.auth import router as auth_router
from app.routes.users import router as users_router
from app.routes.workflows import router as workflows_router
from app.routes.nodes import router as nodes_router
from app.routes.applications import router as applications_router
from app.routes.approvals import router as approvals_router

__all__ = [
    "auth_router",
    "users_router",
    "workflows_router",
    "nodes_router",
    "applications_router",
    "approvals_router",
]
