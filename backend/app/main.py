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
    brain,
    campaigns,
    conversations,
    edith_activity,
    friday_actions,
    handoffs,
    health,
    invoices,
    knowledge,
    leads,
    notifications,
    orders,
    products,
    prompts,
    proposals,
    quotes,
    settings as settings_router,
    system,
    voice,
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
    FastAPI Lifespan: Ensures database schema is created, starts the background Worker daemon
    to continuously process inbound WhatsApp messages, follow-ups, and sales jobs,
    as well as the autonomous Watchdog AI Supervisor for continuous telemetry.
    """
    try:
        from app.database.session import get_engine
        from app.database.base import Base
        engine = get_engine()
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("FastAPI Lifespan: Database schema verified and all tables created.")

        # Ensure dynamic prompt sections and version linkages are migrated & seeded
        from app.database.session import get_db_context
        from app.database.migrations.migrate_to_dynamic_prompt_sections import run_prompt_sections_migration
        async with get_db_context() as session:
            await run_prompt_sections_migration(session, org_id=settings.DEFAULT_ORG_ID)
        logger.info("FastAPI Lifespan: Dynamic modular prompt sections verified and seeded.")
    except Exception as e:
        logger.warning(f"FastAPI Lifespan: Database schema init notice: {e}")

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
                    service = WatchdogService(session, org_id=settings.DEFAULT_ORG_ID)
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
    description=(
        "Autonomous AI Sales Agent Operating System for WhatsApp B2B conversion.\n\n"
        f"- **Official Website**: [{settings.CREATOR_WEBSITE_URL}]({settings.CREATOR_WEBSITE_URL})\n"
        f"- **Live Documentation Hub**: [{settings.OFFICIAL_DOCS_URL}]({settings.OFFICIAL_DOCS_URL})\n"
        f"- **Origin Story & Philosophy**: [{settings.OFFICIAL_BLOG_URL}]({settings.OFFICIAL_BLOG_URL})\n"
        f"- **Portfolio Showcase**: [{settings.OFFICIAL_PORTFOLIO_URL}]({settings.OFFICIAL_PORTFOLIO_URL})\n\n"
        "Explore all 12 chapters at [naborajs.me/docs/whatsapp-ai-agent](https://naborajs.me/projects/whatsapp-ai-agent-dual-brain/docs)."
    ),
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
app.include_router(campaigns.router, prefix=api_v1)
app.include_router(orders.router, prefix=api_v1)
app.include_router(quotes.router, prefix=api_v1)
app.include_router(invoices.router, prefix=api_v1)
app.include_router(audio.router, prefix=api_v1)
app.include_router(conversations.router, prefix=api_v1)
app.include_router(edith_activity.router, prefix=api_v1)
app.include_router(friday_actions.router, prefix=api_v1)
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
app.include_router(voice.router, prefix=api_v1)
app.include_router(brain.router, prefix=api_v1)
app.include_router(notifications.router, prefix=api_v1)
app.include_router(watchdog.router, prefix=api_v1)
app.include_router(system.router, prefix=api_v1)
app.include_router(ws.router, prefix=api_v1)


@app.post("/api/voice-session-token")
async def voice_session_token_alias():
    """Alias for /api/v1/voice/session-token"""
    from app.api.routes.voice import mint_voice_session_token
    return await mint_voice_session_token()


@app.get("/")
async def root():
    return {
        "platform": settings.PROJECT_NAME,
        "status": "online",
        "version": app.version,
        "environment": settings.APP_ENV,
        "creator": settings.CREATOR_NAME,
        "website": settings.CREATOR_WEBSITE_URL,
        "documentation_hub": settings.OFFICIAL_DOCS_URL,
        "project_page": settings.OFFICIAL_PROJECT_URL,
        "story_blog": settings.OFFICIAL_BLOG_URL,
        "portfolio": settings.OFFICIAL_PORTFOLIO_URL,
        "swagger_docs": f"{settings.API_V1_STR}/docs",
        "redoc": f"{settings.API_V1_STR}/redoc",
        "documentation_chapters": {
            "ch-1-dual-brain": "https://naborajs.me/docs/whatsapp-ai-agent/ch-1-dual-brain",
            "ch-2-friteos-gateway": "https://naborajs.me/docs/whatsapp-ai-agent/ch-2-friteos-gateway",
            "ch-3-intent-routing": "https://naborajs.me/docs/whatsapp-ai-agent/ch-3-intent-routing",
            "ch-4-catalog-pricing": "https://naborajs.me/docs/whatsapp-ai-agent/ch-4-catalog-pricing",
            "ch-5-session-memory": "https://naborajs.me/docs/whatsapp-ai-agent/ch-5-session-memory",
            "ch-6-lead-scoring": "https://naborajs.me/docs/whatsapp-ai-agent/ch-6-lead-scoring",
            "ch-7-anti-ban-safety": "https://naborajs.me/docs/whatsapp-ai-agent/ch-7-anti-ban-safety",
            "ch-8-human-takeover": "https://naborajs.me/docs/whatsapp-ai-agent/ch-8-human-takeover",
            "ch-9-multimodal-audio": "https://naborajs.me/docs/whatsapp-ai-agent/ch-9-multimodal-audio",
            "ch-10-deployment-ops": "https://naborajs.me/docs/whatsapp-ai-agent/ch-10-deployment-ops",
            "ch-11-interactive-lab": "https://naborajs.me/docs/whatsapp-ai-agent/ch-11-interactive-lab",
            "ch-12-code-breakdown": "https://naborajs.me/docs/whatsapp-ai-agent/ch-12-code-breakdown",
        },
    }
