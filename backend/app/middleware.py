"""
Custom middleware for security, logging, and monitoring
"""
import time
import json
import uuid
from datetime import datetime
from typing import Dict, Any, Optional
from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp
from .database import db_manager
from .settings import get_settings

settings = get_settings()

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add security headers to all responses"""

    def __init__(self, app: ASGIApp):
        super().__init__(app)

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)

        # Security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"

        # Only add HSTS in production with HTTPS
        if settings.is_production and request.url.scheme == "https":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"

        # Content Security Policy
        csp_policy = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: https:; "
            "font-src 'self' data:; "
            "connect-src 'self' ws: wss:; "
            "frame-ancestors 'none';"
        )
        response.headers["Content-Security-Policy"] = csp_policy

        # API-specific headers
        response.headers["X-API-Version"] = settings.version
        response.headers["X-Service-Name"] = settings.project_name

        return response

class LoggingMiddleware(BaseHTTPMiddleware):
    """Enhanced logging middleware with structured logging"""

    def __init__(self, app: ASGIApp):
        super().__init__(app)

    async def dispatch(self, request: Request, call_next):
        # Generate request ID
        request_id = str(uuid.uuid4())

        # Add request ID to headers
        request.state.request_id = request_id

        # Start timing
        start_time = time.time()

        # Get request details
        client_ip = self.get_client_ip(request)
        user_agent = request.headers.get("user-agent", "")

        # Log request
        request_log = {
            "request_id": request_id,
            "method": request.method,
            "path": request.url.path,
            "query_params": dict(request.query_params),
            "client_ip": client_ip,
            "user_agent": user_agent,
            "timestamp": datetime.utcnow().isoformat(),
            "event": "request_start"
        }

        # Process request
        try:
            response = await call_next(request)

            # Calculate processing time
            process_time = time.time() - start_time

            # Log response
            response_log = {
                "request_id": request_id,
                "status_code": response.status_code,
                "process_time_ms": round(process_time * 1000, 2),
                "response_size": response.headers.get("content-length", "unknown"),
                "timestamp": datetime.utcnow().isoformat(),
                "event": "request_complete"
            }

            # Add to database if not health check
            if not request.url.path.startswith("/health"):
                try:
                    await self.log_to_database(request_log, response_log)
                except Exception as log_error:
                    print(f"Failed to log to database: {log_error}")

            # Add timing header
            response.headers["X-Process-Time"] = str(process_time)
            response.headers["X-Request-ID"] = request_id

            return response

        except Exception as e:
            # Log error
            error_log = {
                "request_id": request_id,
                "error": str(e),
                "error_type": type(e).__name__,
                "process_time_ms": round((time.time() - start_time) * 1000, 2),
                "timestamp": datetime.utcnow().isoformat(),
                "event": "request_error"
            }
            try:
                await self.log_to_database(request_log, error_log)
            except Exception as log_error:
                print(f"Failed to log error to database: {log_error}")
            raise

    def get_client_ip(self, request: Request) -> str:
        """Get client IP address with proxy support"""
        # Check for forwarded headers (reverse proxy)
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()

        real_ip = request.headers.get("x-real-ip")
        if real_ip:
            return real_ip

        return request.client.host if request.client else "unknown"

    async def log_to_database(self, request_log: Dict[str, Any], response_log: Dict[str, Any]):
        """Store request/response logs in database"""
        # Check if database manager and database are available
        if db_manager is None or db_manager.database is None:
            return

        log_entry = {
            **request_log,
            **response_log,
            "timestamp": datetime.utcnow(),
            "level": "INFO",
            "source": "http_middleware",
            "message": f"{request_log['method']} {request_log['path']} - {response_log.get('status_code', 'ERROR')}"
        }

        await db_manager.database.system_logs.insert_one(log_entry)

class ErrorHandlerMiddleware(BaseHTTPMiddleware):
    """Global error handling middleware"""

    def __init__(self, app: ASGIApp):
        super().__init__(app)

    async def dispatch(self, request: Request, call_next):
        try:
            return await call_next(request)
        except Exception as e:
            return await self.handle_error(request, e)

    async def handle_error(self, request: Request, error: Exception) -> JSONResponse:
        """Handle unexpected errors with proper logging"""
        request_id = getattr(request.state, 'request_id', 'unknown')

        error_data = {
            "request_id": request_id,
            "error_type": type(error).__name__,
            "error_message": str(error),
            "path": request.url.path,
            "method": request.method,
            "timestamp": datetime.utcnow().isoformat()
        }

        # Log to database
        try:
            if db_manager and db_manager.database:
                await db_manager.database.system_logs.insert_one({
                    **error_data,
                    "level": "ERROR",
                    "source": "error_middleware",
                    "message": f"Unhandled error in {request.method} {request.url.path}: {str(error)}"
                })
        except Exception:
            pass  # Don't fail if logging fails

        # Return error response
        if settings.is_development:
            import traceback
            error_data["traceback"] = traceback.format_exc()

        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "message": "Internal server error",
                "error_code": "INTERNAL_ERROR",
                "request_id": request_id,
                "details": error_data if settings.is_development else None
            }
        )