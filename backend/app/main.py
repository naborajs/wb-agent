"""
WB-Agent: FastAPI Application Entrypoint (Section 58).
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.middleware import CorrelationIdMiddleware, SecurityHeadersMiddleware
from app.api.routes import (
    agent,
    analytics,
    auth,
    conversations,
    handoffs,
    health,
    knowledge,
    leads,
    orders,
    products,
    proposals,
    settings as settings_router,
    webhooks,
    ws,
)
from app.config import settings
from app.utils.logging import logger

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="0.1.0",
    description="Autonomous AI Sales Agent Operating System for WhatsApp B2B conversion.",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
)

# 1. Custom Security and Tracing Middleware
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(CorrelationIdMiddleware)

# 2. CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3. Mount Versioned API Routes under /api/v1
api_v1 = settings.API_V1_STR
app.include_router(health.router, prefix=api_v1)
app.include_router(auth.router, prefix=api_v1)
app.include_router(leads.router, prefix=api_v1)
app.include_router(orders.router, prefix=api_v1)
app.include_router(conversations.router, prefix=api_v1)
app.include_router(products.router, prefix=api_v1)
app.include_router(proposals.router, prefix=api_v1)
app.include_router(agent.router, prefix=api_v1)
app.include_router(knowledge.router, prefix=api_v1)
app.include_router(handoffs.router, prefix=api_v1)
app.include_router(analytics.router, prefix=api_v1)
app.include_router(webhooks.router, prefix=api_v1)
app.include_router(settings_router.router, prefix=api_v1)
app.include_router(ws.router, prefix=api_v1)


@app.get("/")
async def root():
    return {
        "platform": settings.PROJECT_NAME,
        "status": "online",
        "documentation": f"{settings.API_V1_STR}/docs",
    }
