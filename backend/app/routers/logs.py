from fastapi import APIRouter, Depends
from ..dependencies import require_admin
from ..database import db

logs_router = APIRouter(prefix="/logs", tags=["logs"])

@logs_router.get("/")
async def list_logs(level: str = None, ip: str = None, admin=Depends(require_admin)):
    query = {}
    if level:
        query["level"] = level
    if ip:
        query["source_ip"] = ip

    cursor = db["logs"].find(query)
    logs = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        logs.append(doc)
    return logs

@logs_router.get("/blocked")
async def list_blocked_packets(admin=Depends(require_admin)):
    cursor = db["blocked_packets"].find({}).sort("timestamp", -1)
    packets = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        packets.append(doc)
    return packets

@logs_router.get("/alerts")
async def list_alerts(admin=Depends(require_admin)):
    cursor = db["alerts"].find({}).sort("timestamp", -1)
    alerts = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        alerts.append(doc)
    return alerts
