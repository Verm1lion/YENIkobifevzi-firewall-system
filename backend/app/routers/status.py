import psutil
import time
from fastapi import APIRouter, Depends
from ..dependencies import get_current_user

status_router = APIRouter(prefix="/status", tags=["status"])

@status_router.get("/dashboard")
async def dashboard_info(user=Depends(get_current_user)):
    cpu_percent = psutil.cpu_percent(interval=0.1)
    mem = psutil.virtual_memory()
    uptime = time.time() - psutil.boot_time()
    return {
        "cpu_percent": cpu_percent,
        "memory_percent": mem.percent,
        "uptime_seconds": int(uptime)
    }
