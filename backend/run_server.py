# run_server.py
import sys
import os
import traceback
import uvicorn
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

print("=== KOBI Firewall Backend Startup ===")

try:
    print("1. Creating FastAPI app...")

    from fastapi import FastAPI
    from fastapi.middleware.cors import CORSMiddleware
    from pydantic import BaseModel
    from datetime import datetime

    app = FastAPI(
        title="KOBI Firewall",
        description="Enterprise Security Solution",
        version="2.0.0"
    )

    # CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:3001", "http://127.0.0.1:3001", "http://localhost:3000"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


    # Models
    class LoginRequest(BaseModel):
        username: str
        password: str
        remember_me: bool = False


    # Basic endpoints
    @app.get("/")
    def read_root():
        return {
            "service": "KOBI Firewall",
            "status": "running",
            "version": "2.0.0",
            "timestamp": datetime.utcnow().isoformat(),
            "docs_url": "/docs",
            "health_url": "/health"
        }


    @app.get("/health")
    def health_check():
        return {
            "status": "healthy",
            "service": "KOBI Firewall",
            "message": "Backend is running successfully on port 8000",
            "timestamp": datetime.utcnow().isoformat()
        }


    # Auth endpoints
    @app.post("/api/v1/auth/login")
    def test_login(credentials: LoginRequest):
        print(f"🔐 Login attempt: {credentials.username}")

        if credentials.username == "admin" and credentials.password == "admin123":
            user_data = {
                "id": "admin-user-id",
                "username": "admin",
                "email": "admin@localhost",
                "role": "admin",
                "is_active": True,
                "created_at": datetime.utcnow().isoformat(),
                "last_login": datetime.utcnow().isoformat()
            }

            result = {
                "access_token": "test-token-admin-123456789",
                "token_type": "bearer",
                "expires_in": 28800,  # 8 hours
                "user": user_data
            }

            print(f"✅ Login successful for: {credentials.username}")
            return result
        else:
            print(f"❌ Login failed for: {credentials.username}")
            from fastapi import HTTPException
            raise HTTPException(
                status_code=401,
                detail="Invalid username or password"
            )


    @app.get("/api/v1/auth/me")
    def get_current_user():
        return {
            "id": "admin-user-id",
            "username": "admin",
            "email": "admin@localhost",
            "role": "admin",
            "is_active": True,
            "created_at": datetime.utcnow().isoformat(),
            "last_login": datetime.utcnow().isoformat()
        }


    @app.post("/api/v1/auth/logout")
    def logout():
        return {"message": "Logged out successfully"}


    # System endpoints
    @app.get("/api/v1/status/dashboard")
    def get_dashboard_stats():
        return {
            "cpu_percent": 45.2,
            "memory_percent": 67.8,
            "uptime_seconds": 86400,
            "blocked_requests_24h": 150,
            "active_connections": 23,
            "new_connections_rate": 5
        }


    # Firewall endpoints
    @app.get("/api/v1/firewall/rules/stats")
    def get_firewall_stats():
        return {
            "total_rules": 5,
            "enabled_rules": 3,
            "allow_rules": 2,
            "deny_rules": 3,
            "total_hits": 125
        }


    @app.get("/api/v1/firewall/rules")
    def get_firewall_rules():
        return {
            "data": [
                {
                    "id": "rule-1",
                    "rule_name": "Allow HTTP",
                    "description": "Allow HTTP traffic",
                    "source_ips": ["0.0.0.0/0"],
                    "destination_ips": [],
                    "source_ports": [],
                    "destination_ports": ["80"],
                    "protocol": "TCP",
                    "action": "ALLOW",
                    "direction": "IN",
                    "enabled": True,
                    "priority": 100,
                    "created_at": datetime.utcnow().isoformat()
                }
            ],
            "total": 1,
            "page": 1,
            "pages": 1,
            "has_next": False,
            "has_prev": False
        }


    # Logs endpoints
    @app.get("/api/v1/logs/alerts")
    def get_security_alerts():
        return {
            "data": []
        }


    print("2. Starting server...")
    print("🚀 Server starting on http://127.0.0.1:8000")
    print("📋 API docs: http://127.0.0.1:8000/docs")
    print("❤️ Health check: http://127.0.0.1:8000/health")
    print("🔐 Test login: admin / admin123")
    print("")
    print("Ready to accept connections!")

    # Start server
    uvicorn.run(
        app,
        host="127.0.0.1",
        port=8000,
        log_level="info",
        access_log=True
    )

except Exception as e:
    print(f"\n❌ FATAL ERROR: {e}")
    print(f"Error type: {type(e).__name__}")
    traceback.print_exc()