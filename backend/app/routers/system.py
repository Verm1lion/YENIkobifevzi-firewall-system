"""
System management and monitoring endpoints
"""
import psutil
import platform
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, Query, HTTPException
from ..database import get_database
from ..dependencies import get_current_user, require_admin
from ..schemas import SystemStatsResponse, ResponseModel

system_router = APIRouter()

@system_router.get("/stats", response_model=SystemStatsResponse)
async def get_system_stats(
    current_user=Depends(get_current_user),
    db=Depends(get_database)
):
    """Get comprehensive system statistics"""
    try:
        # System metrics
        cpu_percent = psutil.cpu_percent(interval=0.1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')

        # Network interfaces
        network_interfaces = []
        for interface, addrs in psutil.net_if_addrs().items():
            interface_info = {
                "name": interface,
                "addresses": []
            }
            for addr in addrs:
                interface_info["addresses"].append({
                    "family": str(addr.family),
                    "address": addr.address,
                    "netmask": addr.netmask,
                    "broadcast": addr.broadcast
                })
            network_interfaces.append(interface_info)

        # Uptime
        boot_time = psutil.boot_time()
        uptime_seconds = int(datetime.utcnow().timestamp() - boot_time)

        # Database statistics
        firewall_rules_count = await db.firewall_rules.count_documents({})
        active_rules_count = await db.firewall_rules.count_documents({"enabled": True})
        blocked_domains_count = await db.blocked_domains.count_documents({})

        # Log statistics (last 24 hours)
        cutoff_24h = datetime.utcnow() - timedelta(hours=24)
        logs_count_24h = await db.system_logs.count_documents({"timestamp": {"$gte": cutoff_24h}})
        alerts_count_24h = await db.security_alerts.count_documents({"timestamp": {"$gte": cutoff_24h}})
        blocked_requests_24h = await db.blocked_packets.count_documents({"timestamp": {"$gte": cutoff_24h}})

        return SystemStatsResponse(
            cpu_usage=cpu_percent,
            memory_usage=memory.percent,
            disk_usage=(disk.used / disk.total) * 100,
            network_interfaces=network_interfaces,
            uptime_seconds=uptime_seconds,
            firewall_rules_count=firewall_rules_count,
            active_rules_count=active_rules_count,
            blocked_domains_count=blocked_domains_count,
            logs_count_24h=logs_count_24h,
            alerts_count_24h=alerts_count_24h,
            blocked_requests_24h=blocked_requests_24h,
            timestamp=datetime.utcnow()
        )

    except Exception as e:
        raise HTTPException(500, f"Failed to get system stats: {str(e)}")

@system_router.get("/info")
async def get_system_info(current_user=Depends(get_current_user)):
    """Get system information"""
    return {
        "platform": platform.platform(),
        "system": platform.system(),
        "release": platform.release(),
        "version": platform.version(),
        "machine": platform.machine(),
        "processor": platform.processor(),
        "python_version": platform.python_version(),
        "hostname": platform.node()
    }

@system_router.get("/processes")
async def get_system_processes(
    current_user=Depends(require_admin),
    limit: int = Query(10, ge=1, le=100)
):
    """Get system processes (admin only)"""
    try:
        processes = []
        for proc in psutil.process_iter(['pid', 'name', 'cpu_percent', 'memory_percent', 'status']):
            try:
                proc_info = proc.info
                processes.append(proc_info)
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue

        # Sort by CPU usage
        processes.sort(key=lambda x: x.get('cpu_percent', 0), reverse=True)

        return processes[:limit]

    except Exception as e:
        raise HTTPException(500, f"Failed to get processes: {str(e)}")

@system_router.post("/restart", response_model=ResponseModel)
async def restart_system(
    current_user=Depends(require_admin)
):
    """Restart the system (admin only)"""
    # This is a placeholder - implement system restart logic
    return ResponseModel(
        message="System restart initiated (placeholder - implement actual restart logic)"
    )

@system_router.post("/shutdown", response_model=ResponseModel)
async def shutdown_system(
    current_user=Depends(require_admin)
):
    """Shutdown the system (admin only)"""
    # This is a placeholder - implement system shutdown logic
    return ResponseModel(
        message="System shutdown initiated (placeholder - implement actual shutdown logic)"
    )