"""
Main FastAPI application with comprehensive debugging
"""
import asyncio
import traceback
import logging
import sys
import os
from datetime import datetime
from contextlib import asynccontextmanager
from typing import Dict, Any

from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

# Fix for Windows encoding
if os.name == 'nt':  # Windows
    os.environ['PYTHONIOENCODING'] = 'utf-8'

# Enhanced logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('debug.log', encoding='utf-8')
    ]
)
logger = logging.getLogger(__name__)

# Settings with fallback
try:
    from .settings import get_settings
    settings = get_settings()
    logger.info(f"[OK] Settings loaded: {settings.project_name}")
except Exception as e:
    logger.error(f"[ERROR] Failed to import settings: {e}")
    class FallbackSettings:
        project_name = "KOBI Firewall"
        description = "Enterprise Security Solution"
        version = "2.0.0"
        is_development = True
        cors_origins = ["http://localhost:3001", "http://localhost:3000", "http://127.0.0.1:3001", "http://127.0.0.1:3000"]
        mongodb_url = "mongodb://localhost:27017"
        database_name = "kobi_firewall_db"
        jwt_secret = "fallback-secret-key"
        access_token_expire_minutes = 480
    settings = FallbackSettings()

# Database lifespan
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("[PROC] Starting KOBI Firewall...")
    try:
        # Try to import and setup database
        from .database import db_manager
        await db_manager.connect()
        logger.info("[OK] Database connected")
    except Exception as e:
        logger.error(f"[ERROR] Database connection failed: {e}")
        logger.info("[WARN] Starting without database connection")

    yield

    logger.info("[PROC] Shutting down KOBI Firewall...")
    try:
        from .database import db_manager
        await db_manager.disconnect()
    except Exception as e:
        logger.error(f"[ERROR] Database disconnect error: {e}")

# Create FastAPI app
app = FastAPI(
    title=settings.project_name,
    description=getattr(settings, 'description', 'Enterprise Security Solution'),
    version=getattr(settings, 'version', '2.0.0'),
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
    debug=True
)

# CORS configuration
try:
    cors_origins = getattr(settings, 'cors_origins', [
        "http://localhost:3001",
        "http://localhost:3000",
        "http://127.0.0.1:3001",
        "http://127.0.0.1:3000"
    ])

    app.add_middleware(
        CORSMiddleware,
        allow_origins=cors_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
        allow_headers=["*"],
        expose_headers=["X-Total-Count", "X-Page-Count"]
    )
    logger.info(f"[OK] CORS configured with origins: {cors_origins}")
except Exception as e:
    logger.error(f"[ERROR] Failed to configure CORS: {e}")

# Import routers with fallback
auth_router = None
try:
    from .routers.auth import auth_router
    logger.info("[OK] Auth router imported")
except Exception as e:
    logger.error(f"[ERROR] Auth router import failed: {e}")
    from fastapi import APIRouter
    auth_router = APIRouter()

    @auth_router.post("/login")
    async def dummy_login():
        return {"error": "Auth router failed to load"}

# Other routers
firewall_router = None
try:
    from .routers.firewall import firewall_router
    logger.info("[OK] Firewall router imported")
except Exception as e:
    logger.error(f"[ERROR] Firewall router import failed: {e}")
    from fastapi import APIRouter
    firewall_router = APIRouter()

logs_router = None
try:
    from .routers.logs import logs_router
    logger.info("[OK] Logs router imported")
except Exception as e:
    logger.error(f"[ERROR] Logs router import failed: {e}")
    from fastapi import APIRouter
    logs_router = APIRouter()

system_router = None
try:
    from .routers.system import system_router
    logger.info("[OK] System router imported")
except Exception as e:
    logger.error(f"[ERROR] System router import failed: {e}")
    from fastapi import APIRouter
    system_router = APIRouter()

# Exception handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    logger.error(f"HTTP Exception: {exc.status_code} - {exc.detail}")
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "message": exc.detail,
            "error_code": f"HTTP_{exc.status_code}",
            "timestamp": datetime.utcnow().isoformat()
        }
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.error(f"Validation Error: {exc}")
    return JSONResponse(
        status_code=422,
        content={
            "success": False,
            "message": "Validation error",
            "errors": [{"field": " -> ".join(str(x) for x in error["loc"]),
                       "message": error["msg"]} for error in exc.errors()],
            "timestamp": datetime.utcnow().isoformat()
        }
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}")
    logger.error(traceback.format_exc())
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "message": "Internal server error",
            "error_type": type(exc).__name__,
            "timestamp": datetime.utcnow().isoformat()
        }
    )

# Request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = datetime.utcnow()
    logger.info(f"[REQUEST] {request.method} {request.url}")

    try:
        response = await call_next(request)
        process_time = (datetime.utcnow() - start_time).total_seconds()
        logger.info(f"[RESPONSE] {response.status_code} - {process_time:.4f}s")
        return response
    except Exception as e:
        process_time = (datetime.utcnow() - start_time).total_seconds()
        logger.error(f"[ERROR] Request failed: {str(e)} - {process_time:.4f}s")
        raise

# Include routers
API_V1_PREFIX = "/api/v1"

try:
    if auth_router:
        app.include_router(auth_router, prefix=f"{API_V1_PREFIX}/auth", tags=["Authentication"])
        logger.info("[OK] Auth router included")
except Exception as e:
    logger.error(f"[ERROR] Failed to include auth router: {e}")

try:
    if firewall_router:
        app.include_router(firewall_router, prefix=f"{API_V1_PREFIX}/firewall", tags=["Firewall"])
        logger.info("[OK] Firewall router included")
except Exception as e:
    logger.error(f"[ERROR] Failed to include firewall router: {e}")

try:
    if logs_router:
        app.include_router(logs_router, prefix=f"{API_V1_PREFIX}/logs", tags=["Logs"])
        logger.info("[OK] Logs router included")
except Exception as e:
    logger.error(f"[ERROR] Failed to include logs router: {e}")

try:
    if system_router:
        app.include_router(system_router, prefix=f"{API_V1_PREFIX}/system", tags=["System"])
        logger.info("[OK] System router included")
except Exception as e:
    logger.error(f"[ERROR] Failed to include system router: {e}")

# Health check endpoints
@app.get("/health")
async def health_check():
    """Simple health check endpoint"""
    try:
        health_info = {
            "status": "healthy",
            "service": settings.project_name,
            "version": getattr(settings, 'version', '2.0.0'),
            "timestamp": datetime.utcnow().isoformat(),
            "message": "KOBI Firewall is running"
        }
        logger.info(f"Health check successful: {health_info}")
        return health_info
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {
            "status": "unhealthy",
            "service": "KOBI Firewall",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": settings.project_name,
        "version": getattr(settings, 'version', '2.0.0'),
        "description": getattr(settings, 'description', 'Enterprise Security Solution'),
        "timestamp": datetime.utcnow().isoformat(),
        "docs_url": "/docs",
        "health_url": "/health",
        "api_version": "v1"
    }

# Startup/shutdown events
@app.on_event("startup")
async def startup_event():
    logger.info("🚀 KOBI Firewall Application Started")
    logger.info(f"Service: {settings.project_name}")
    logger.info(f"Version: {getattr(settings, 'version', '2.0.0')}")
    logger.info("Endpoints available:")
    logger.info("  - Health: http://127.0.0.1:8000/health")
    logger.info("  - Docs: http://127.0.0.1:8000/docs")
    logger.info("  - API: http://127.0.0.1:8000/api/v1")

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("🛑 KOBI Firewall Application Stopped")

if __name__ == "__main__":
    import uvicorn
    logger.info("Starting uvicorn server...")
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="debug",
        access_log=True
    )