from fastapi import APIRouter, Depends, Query, HTTPException
from typing import Optional
from datetime import datetime, timedelta
from bson import ObjectId
from ..dependencies import require_admin, get_current_user
from ..database import get_database
from ..schemas import PaginatedResponse, SystemLogResponse, SecurityAlertResponse, ResponseModel

logs_router = APIRouter()


@logs_router.get("/", response_model=PaginatedResponse)
async def list_logs(
        page: int = Query(1, ge=1),
        per_page: int = Query(50, ge=1, le=100),
        level: Optional[str] = Query(None),
        source: Optional[str] = Query(None),
        search: Optional[str] = Query(None),
        admin=Depends(require_admin),
        db=Depends(get_database)
):
    """Get system logs with pagination and filtering"""
    query = {}

    if level:
        query["level"] = level.upper()
    if source:
        query["source"] = source
    if search:
        query["$or"] = [
            {"message": {"$regex": search, "$options": "i"}},
            {"source": {"$regex": search, "$options": "i"}}
        ]

    # Count total documents
    total = await db.system_logs.count_documents(query)

    # Calculate pagination
    pages = (total + per_page - 1) // per_page
    skip = (page - 1) * per_page

    # Get paginated results
    cursor = db.system_logs.find(query).sort("timestamp", -1).skip(skip).limit(per_page)
    logs = []
    async for doc in cursor:
        doc["id"] = str(doc["_id"])
        logs.append(SystemLogResponse(**doc))

    return PaginatedResponse(
        data=logs,
        total=total,
        page=page,
        per_page=per_page,
        pages=pages,
        has_next=page < pages,
        has_prev=page > 1
    )


@logs_router.get("/blocked", response_model=PaginatedResponse)
async def list_blocked_packets(
        page: int = Query(1, ge=1),
        per_page: int = Query(50, ge=1, le=100),
        source_ip: Optional[str] = Query(None),
        admin=Depends(require_admin),
        db=Depends(get_database)
):
    """Get blocked packets with pagination"""
    query = {}

    if source_ip:
        query["source_ip"] = source_ip

    # Count total documents
    total = await db.blocked_packets.count_documents(query)

    # Calculate pagination
    pages = (total + per_page - 1) // per_page
    skip = (page - 1) * per_page

    # Get paginated results
    cursor = db.blocked_packets.find(query).sort("timestamp", -1).skip(skip).limit(per_page)
    packets = []
    async for doc in cursor:
        doc["id"] = str(doc["_id"])
        packets.append(doc)

    return PaginatedResponse(
        data=packets,
        total=total,
        page=page,
        per_page=per_page,
        pages=pages,
        has_next=page < pages,
        has_prev=page > 1
    )


@logs_router.get("/alerts", response_model=PaginatedResponse)
async def list_alerts(
        page: int = Query(1, ge=1),
        per_page: int = Query(50, ge=1, le=100),
        severity: Optional[str] = Query(None),
        acknowledged: Optional[bool] = Query(None),
        resolved: Optional[bool] = Query(None),
        admin=Depends(require_admin),
        db=Depends(get_database)
):
    """Get security alerts with pagination and filtering"""
    query = {}

    if severity:
        query["severity"] = severity.upper()
    if acknowledged is not None:
        query["acknowledged"] = acknowledged
    if resolved is not None:
        query["resolved"] = resolved

    # Count total documents
    total = await db.security_alerts.count_documents(query)

    # Calculate pagination
    pages = (total + per_page - 1) // per_page
    skip = (page - 1) * per_page

    # Get paginated results
    cursor = db.security_alerts.find(query).sort("timestamp", -1).skip(skip).limit(per_page)
    alerts = []
    async for doc in cursor:
        doc["id"] = str(doc["_id"])
        alerts.append(SecurityAlertResponse(**doc))

    return PaginatedResponse(
        data=alerts,
        total=total,
        page=page,
        per_page=per_page,
        pages=pages,
        has_next=page < pages,
        has_prev=page > 1
    )


@logs_router.patch("/alerts/{alert_id}/acknowledge", response_model=ResponseModel)
async def acknowledge_alert(
        alert_id: str,
        current_user=Depends(require_admin),
        db=Depends(get_database)
):
    """Acknowledge a security alert"""
    try:
        obj_id = ObjectId(alert_id)
    except Exception:
        raise HTTPException(400, "Invalid alert ID")

    result = await db.security_alerts.update_one(
        {"_id": obj_id},
        {
            "$set": {
                "acknowledged": True,
                "acknowledged_by": str(current_user["_id"]),
                "acknowledged_at": datetime.utcnow()
            }
        }
    )

    if result.modified_count == 0:
        raise HTTPException(404, "Alert not found")

    return ResponseModel(message="Alert acknowledged successfully")


@logs_router.patch("/alerts/{alert_id}/resolve", response_model=ResponseModel)
async def resolve_alert(
        alert_id: str,
        current_user=Depends(require_admin),
        db=Depends(get_database)
):
    """Resolve a security alert"""
    try:
        obj_id = ObjectId(alert_id)
    except Exception:
        raise HTTPException(400, "Invalid alert ID")

    result = await db.security_alerts.update_one(
        {"_id": obj_id},
        {
            "$set": {
                "resolved": True,
                "resolved_at": datetime.utcnow(),
                "acknowledged": True,
                "acknowledged_by": str(current_user["_id"]),
                "acknowledged_at": datetime.utcnow()
            }
        }
    )

    if result.modified_count == 0:
        raise HTTPException(404, "Alert not found")

    return ResponseModel(message="Alert resolved successfully")


@logs_router.get("/stats")
async def get_log_stats(
        admin=Depends(require_admin),
        db=Depends(get_database)
):
    """Get log statistics"""
    now = datetime.utcnow()
    last_24h = now - timedelta(hours=24)
    last_7d = now - timedelta(days=7)

    # System logs stats
    total_logs = await db.system_logs.count_documents({})
    logs_24h = await db.system_logs.count_documents({"timestamp": {"$gte": last_24h}})
    error_logs_24h = await db.system_logs.count_documents({
        "timestamp": {"$gte": last_24h},
        "level": "ERROR"
    })

    # Blocked packets stats
    total_blocked = await db.blocked_packets.count_documents({})
    blocked_24h = await db.blocked_packets.count_documents({"timestamp": {"$gte": last_24h}})

    # Security alerts stats
    total_alerts = await db.security_alerts.count_documents({})
    alerts_24h = await db.security_alerts.count_documents({"timestamp": {"$gte": last_24h}})
    unresolved_alerts = await db.security_alerts.count_documents({"resolved": False})

    return {
        "system_logs": {
            "total": total_logs,
            "last_24h": logs_24h,
            "errors_24h": error_logs_24h
        },
        "blocked_packets": {
            "total": total_blocked,
            "last_24h": blocked_24h
        },
        "security_alerts": {
            "total": total_alerts,
            "last_24h": alerts_24h,
            "unresolved": unresolved_alerts
        },
        "timestamp": now
    }