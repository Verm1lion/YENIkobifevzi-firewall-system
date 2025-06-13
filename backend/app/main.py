import asyncio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.middleware import log_requests

# Router importları
from app.routers.auth import auth_router
from app.routers.logs import logs_router
from app.routers.status import status_router
from app.routers.network import network_router
from app.routers.nat import nat_router
from app.routers.firewall import firewall_router
from app.routers.backup import backup_router
from app.routers.routes import route_router
from app.routers.firewall_groups import firewall_groups_router
from app.routers.dns import dns_router

from app.log_watchers import iptables_log_watcher

app = FastAPI(title=settings.PROJECT_NAME)

origins = ["http://localhost:3000", "http://127.0.0.1:3000"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def custom_logging_middleware(request, call_next):
    return await log_requests(request, call_next)

# Tüm router'ları ekle
app.include_router(auth_router)
app.include_router(logs_router)
app.include_router(status_router)
app.include_router(network_router)
app.include_router(nat_router)
app.include_router(firewall_router)
app.include_router(backup_router)
app.include_router(route_router)
app.include_router(firewall_groups_router)
app.include_router(dns_router)

@app.get("/")
def read_root():
    return {"message": "KOBI Firewall API running..."}

@app.on_event("startup")
async def start_log_watchers():
    asyncio.create_task(iptables_log_watcher())
