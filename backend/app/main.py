import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.middleware import CorrelationIdMiddleware, SecurityHeadersMiddleware
from app.api.routes import (
    agent,
    analytics,
    audio,
    auth,
    conversations,
    handoffs,
    health,
    invoices,
    knowledge,
    leads,
    orders,
    products,
    prompts,
    proposals,
    quotes,
    settings as settings_router,
    watchdog,
    webhooks,
    whatsapp,
    ws,
)
from app.config import settings
from app.jobs.worker import Worker
from app.utils.logging import logger


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    FastAPI Lifespan: Automatically starts the background Worker daemon
    to continuously process inbound WhatsApp messages, follow-ups, and sales jobs,
    as well as the autonomous Watchdog AI Supervisor for continuous telemetry.
    """
    worker = Worker("fastapi_lifespan_worker")
    worker_task = asyncio.create_task(worker.start(poll_interval=0.5))
    logger.info("FastAPI Lifespan: Autonomous Worker daemon started.")

    async def _periodic_watchdog():
        await asyncio.sleep(15)
        while True:
            try:
                from app.database.session import get_db_context
                from app.watchdog.service import WatchdogService
                async with get_db_context() as session:
                    service = WatchdogService(session, org_id="org_default_tea")
                    await service.run_full_diagnostic_audit()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.warning(f"Watchdog periodic supervisor audit notice: {e}")
            await asyncio.sleep(180)

    watchdog_task = asyncio.create_task(_periodic_watchdog())
    logger.info("FastAPI Lifespan: Autonomous Watchdog supervisor daemon scheduled.")

    try:
        yield
    finally:
        worker.stop()
        worker_task.cancel()
        watchdog_task.cancel()
        try:
            await asyncio.gather(worker_task, watchdog_task, return_exceptions=True)
        except Exception:
            pass
        logger.info("FastAPI Lifespan: Daemons stopped gracefully.")


app = FastAPI(
    title=settings.PROJECT_NAME,
    version="0.1.0",
    description="Autonomous AI Sales Agent Operating System for WhatsApp B2B conversion.",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
    lifespan=lifespan,
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
app.include_router(quotes.router, prefix=api_v1)
app.include_router(invoices.router, prefix=api_v1)
app.include_router(audio.router, prefix=api_v1)
app.include_router(conversations.router, prefix=api_v1)
app.include_router(products.router, prefix=api_v1)
app.include_router(prompts.router, prefix=api_v1)
app.include_router(proposals.router, prefix=api_v1)
app.include_router(agent.router, prefix=api_v1)
app.include_router(knowledge.router, prefix=api_v1)
app.include_router(handoffs.router, prefix=api_v1)
app.include_router(analytics.router, prefix=api_v1)
app.include_router(webhooks.router, prefix=api_v1)
app.include_router(whatsapp.router, prefix=api_v1)
app.include_router(settings_router.router, prefix=api_v1)
app.include_router(watchdog.router, prefix=api_v1)
app.include_router(ws.router, prefix=api_v1)


@app.get("/")
async def root():
    return {
        "platform": settings.PROJECT_NAME,
        "status": "online",
        "documentation": f"{settings.API_V1_STR}/docs",
    }
