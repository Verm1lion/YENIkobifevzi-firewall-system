# run_server.py - GÜNCELLENMIŞ FULL KOD
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
    from fastapi import FastAPI, HTTPException, status
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
        allow_origins=[
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:3001",
            "http://127.0.0.1:3001"
        ],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


    # Models
    class LoginRequest(BaseModel):
        username: str
        password: str
        remember_me: bool = False
        rememberMe: bool = False


    class UserResponse(BaseModel):
        id: str
        username: str
        email: str
        role: str
        is_active: bool = True


    class TokenResponse(BaseModel):
        success: bool = True
        access_token: str
        token_type: str = "bearer"
        expires_in: int = 28800
        user: UserResponse


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


    # AUTH ENDPOINTS
    @app.post("/api/auth/login", response_model=TokenResponse)
    def login_user(credentials: LoginRequest):
        print(f"🔐 Login attempt: {credentials.username}")
        remember_me = credentials.remember_me or credentials.rememberMe

        if credentials.username == "admin" and credentials.password == "admin123":
            user_data = UserResponse(
                id="admin-user-id",
                username="admin",
                email="admin@localhost",
                role="admin",
                is_active=True
            )
            result = TokenResponse(
                success=True,
                access_token="test-token-admin-123456789",
                token_type="bearer",
                expires_in=28800,
                user=user_data
            )
            print(f"✅ Login successful for: {credentials.username}")
            return result
        else:
            print(f"❌ Login failed for: {credentials.username}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid username or password"
            )


    @app.post("/api/v1/auth/login", response_model=TokenResponse)
    def login_user_v1(credentials: LoginRequest):
        return login_user(credentials)


    @app.get("/api/auth/me")
    def get_current_user():
        return {
            "success": True,
            "id": "admin-user-id",
            "username": "admin",
            "email": "admin@localhost",
            "role": "admin",
            "is_active": True,
            "created_at": datetime.utcnow().isoformat(),
            "last_login": datetime.utcnow().isoformat()
        }


    @app.get("/api/v1/auth/me")
    def get_current_user_v1():
        return get_current_user()


    @app.get("/api/auth/verify")
    def verify_token():
        return {
            "success": True,
            "user": {
                "id": "admin-user-id",
                "username": "admin",
                "email": "admin@localhost",
                "role": "admin",
                "is_active": True
            }
        }


    @app.get("/api/v1/auth/verify")
    def verify_token_v1():
        return verify_token()


    @app.post("/api/auth/logout")
    def logout():
        return {"success": True, "message": "Logged out successfully"}


    @app.post("/api/v1/auth/logout")
    def logout_v1():
        return logout()


    # DASHBOARD ENDPOINTS
    @app.get("/api/dashboard/stats")
    def get_dashboard_stats():
        return {
            "success": True,
            "data": {
                "status": "Aktif",
                "connectedDevices": 5,
                "activeRules": 12,
                "totalConnections": 1250,
                "blocked": 125,
                "threats": 15,
                "lastUpdate": datetime.utcnow().isoformat(),
                "securityLevel": 87.5,
                "monthlyGrowth": 12.5,
                "uptime": 86400,
                "systemHealth": {
                    "cpu": {"percentage": 45.2},
                    "memory": {"percentage": 67.8, "total": 8192, "used": 5543},
                    "dataCollection": {"isCollecting": True}
                },
                "totalActivities": 5420,
                "oldestActivity": "2024-01-01T00:00:00Z",
                "newestActivity": datetime.utcnow().isoformat()
            }
        }


    @app.get("/api/v1/dashboard/stats")
    def get_dashboard_stats_v1():
        return get_dashboard_stats()


    @app.get("/api/dashboard/chart-data")
    def get_chart_data(period: str = "24h"):
        import random
        data = []
        if period == "24h":
            for i in range(24):
                hour = f"{i:02d}:00"
                total = random.randint(50, 200)
                blocked = random.randint(5, 25)
                data.append({
                    "time": hour,
                    "totalConnections": total,
                    "blockedConnections": blocked,
                    "allowedConnections": total - blocked,
                    "threats": random.randint(0, 5)
                })
        return {
            "success": True,
            "data": data,
            "meta": {
                "period": period,
                "dataPoints": len(data),
                "dataSource": "simulation"
            }
        }


    @app.get("/api/v1/dashboard/chart-data")
    def get_chart_data_v1(period: str = "24h"):
        return get_chart_data(period)


    @app.get("/api/dashboard/recent-activity")
    def get_recent_activity(limit: int = 10):
        import random
        activities = []
        for i in range(limit):
            activity_type = random.choice(["blocked", "allowed", "warning"])
            domain = random.choice([
                "google.com", "facebook.com", "malicious-site.com",
                "github.com", "suspicious-domain.net"
            ])
            activities.append({
                "id": f"activity_{i}",
                "type": activity_type,
                "domain": domain,
                "ip": f"192.168.1.{random.randint(10, 50)}",
                "port": random.choice([80, 443, 22, 3389]),
                "timestamp": datetime.utcnow().isoformat(),
                "threat": {
                    "detected": activity_type == "blocked",
                    "type": "malware" if activity_type == "blocked" else "none",
                    "severity": "high" if activity_type == "blocked" else "low"
                }
            })
        return {
            "success": True,
            "data": activities,
            "meta": {
                "total": 1000,
                "dataSource": "simulation"
            }
        }


    @app.get("/api/v1/dashboard/recent-activity")
    def get_recent_activity_v1(limit: int = 10):
        return get_recent_activity(limit)


    @app.get("/api/dashboard/connected-devices")
    def get_connected_devices():
        devices = [
            {"ip": "192.168.1.10", "mac": "00:11:22:33:44:55", "hostname": "admin-laptop", "status": "active"},
            {"ip": "192.168.1.15", "mac": "00:11:22:33:44:56", "hostname": "server-001", "status": "active"},
            {"ip": "192.168.1.20", "mac": "00:11:22:33:44:57", "hostname": "workstation-02", "status": "active"},
            {"ip": "192.168.1.25", "mac": "00:11:22:33:44:58", "hostname": "mobile-device", "status": "active"},
            {"ip": "10.0.0.5", "mac": "00:11:22:33:44:59", "hostname": "printer-hp", "status": "active"}
        ]
        return {
            "success": True,
            "data": devices
        }


    @app.get("/api/v1/dashboard/connected-devices")
    def get_connected_devices_v1():
        return get_connected_devices()


    @app.get("/api/dashboard/data-status")
    def get_data_status():
        return {
            "success": True,
            "data": {
                "persistence": {
                    "enabled": True,
                    "dataCollection": True,
                    "totalActivities": 5420,
                    "systemUptime": 86400
                }
            }
        }


    @app.get("/api/v1/dashboard/data-status")
    def get_data_status_v1():
        return get_data_status()


    @app.post("/api/dashboard/simulate-activity")
    def simulate_activity():
        return {
            "success": True,
            "message": "Demo aktivite oluşturuldu"
        }


    @app.post("/api/v1/dashboard/simulate-activity")
    def simulate_activity_v1():
        return simulate_activity()


    # SYSTEM/UPDATES ENDPOINTS - YENİ EKLENEN
    @app.get("/api/v1/system/updates")
    def get_system_updates():
        return {
            "success": True,
            "data": {
                "currentVersion": "2.1.0",
                "latestVersion": "2.1.2",
                "status": "Güncel",
                "lastCheck": datetime.utcnow().strftime("%Y-%m-%d %H:%M"),
                "checkMethod": "Otomatik",
                "pendingUpdates": 2,
                "updateStatus": "Yükleme bekleniyor",
                "availableUpdates": [
                    {
                        "id": "update_1",
                        "_id": "update_1",
                        "name": "NetGate Firewall 2.1.2 Patch",
                        "version": "2.1.2",
                        "priority": "Yüksek Öncelikli",
                        "update_type": "Kritik Güvenlik Güncellemesi",
                        "release_date": datetime.utcnow().isoformat(),
                        "date": "2025-06-19",
                        "size": "45 MB",
                        "location": "/system/updates",
                        "status": "Bekliyor",
                        "changes": [
                            "Yeni nesil güvenlik açığı kapatıldı",
                            "Firewall kuralları işleme hızı artırıldı",
                            "Şüpheli kullanıcı algoritması geliştirildi"
                        ]
                    },
                    {
                        "id": "update_2",
                        "_id": "update_2",
                        "name": "NetGate Firewall 2.1.1",
                        "version": "2.1.1",
                        "priority": "Orta Öncelikli",
                        "update_type": "Hata düzeltmeleri ve iyileştirmeler",
                        "release_date": datetime.utcnow().isoformat(),
                        "date": "2025-06-12",
                        "size": "23 MB",
                        "location": "/system/updates",
                        "status": "Bekliyor",
                        "changes": [
                            "VPN bağlantılarında karşı sorun düzeltildi",
                            "Log görüntüleme performansı iyileştirildi",
                            "Küçük arayüz hataları giderildi"
                        ]
                    }
                ],
                "updateHistory": [
                    {
                        "version": "NetGate Firewall 2.1.0",
                        "update_type": "Ana sürüm",
                        "install_date": "2025-06-10",
                        "date": "2025-06-10",
                        "status": "Başarılı"
                    },
                    {
                        "version": "NetGate Firewall 2.0.8",
                        "update_type": "Güvenlik güncellemesi",
                        "install_date": "2025-05-28",
                        "date": "2025-05-28",
                        "status": "Başarılı"
                    },
                    {
                        "version": "NetGate Firewall 2.0.7",
                        "update_type": "Hata düzeltmesi",
                        "install_date": "2025-05-15",
                        "date": "2025-05-15",
                        "status": "Başarılı"
                    }
                ],
                "updateSettings": {
                    "autoUpdate": True,
                    "checkFrequency": "daily",
                    "autoInstallTime": "02:00"
                },
                "systemInfo": {
                    "product": "NetGate Firewall",
                    "currentVersion": "2.1.0",
                    "latestVersion": "2.1.2",
                    "buildDate": "2025.06.19",
                    "license": "Pro"
                }
            }
        }


    @app.post("/api/v1/system/updates/check")
    def check_updates():
        return {
            "success": True,
            "message": "Güncelleme kontrolü tamamlandı",
            "details": {"checked_at": datetime.utcnow().isoformat()}
        }


    @app.post("/api/v1/system/updates/{update_id}/install")
    def install_update(update_id: str):
        return {
            "success": True,
            "message": "Güncelleme yüklemesi başlatıldı",
            "details": {"update_id": update_id}
        }


    @app.patch("/api/v1/system/updates/settings")
    def update_settings(settings: dict):
        return {
            "success": True,
            "message": "Güncelleme ayarları kaydedildi",
            "details": settings
        }


    @app.get("/api/v1/system/updates/history")
    def get_update_history(limit: int = 20):
        return {
            "success": True,
            "data": [
                {
                    "id": "history_1",
                    "version": "NetGate Firewall 2.1.0",
                    "update_type": "System Update",
                    "install_date": "2025-06-10",
                    "status": "Başarılı"
                }
            ],
            "meta": {"total": 1, "limit": limit}
        }


    # FIREWALL ENDPOINTS
    @app.get("/api/firewall/rules/stats")
    def get_firewall_stats():
        return {
            "success": True,
            "data": {
                "total_rules": 12,
                "enabled_rules": 8,
                "allow_rules": 5,
                "deny_rules": 7,
                "total_hits": 1250
            }
        }


    @app.get("/api/v1/firewall/rules/stats")
    def get_firewall_stats_v1():
        return get_firewall_stats()


    @app.post("/api/firewall/initialize-rules")
    def initialize_rules():
        return {
            "success": True,
            "message": "Firewall kuralları başlatıldı"
        }


    @app.post("/api/v1/firewall/initialize-rules")
    def initialize_rules_v1():
        return initialize_rules()


    print("2. Starting server...")
    print("🚀 Server starting on http://127.0.0.1:8000")
    print("📋 API docs: http://127.0.0.1:8000/docs")
    print("❤️ Health check: http://127.0.0.1:8000/health")
    print("🔐 Test login: admin / admin123")
    print("🔄 Updates endpoint: http://127.0.0.1:8000/api/v1/system/updates")
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