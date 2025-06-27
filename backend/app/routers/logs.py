"""
Enhanced Logs Router - Comprehensive log management API endpoints
PC-to-PC Internet Sharing traffic monitoring and analysis
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query, Body
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
import logging
from bson import ObjectId

# Import dependencies and services
from ..dependencies import get_current_user, require_admin, get_database
from ..services.log_service import log_service
from ..schemas import (
    ResponseModel, PaginatedResponse, ErrorResponse,
    SystemLogResponse, SecurityAlertResponse
)

# Configure logging
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/api/v1/logs", tags=["Logs"])


@router.get("/", response_model=PaginatedResponse)
async def get_logs(
        page: int = Query(1, ge=1, description="Sayfa numarası"),
        per_page: int = Query(50, ge=1, le=500, description="Sayfa başına kayıt sayısı"),
        level: Optional[str] = Query(None, description="Log seviyesi filtresi (ALLOW, BLOCK, WARNING, etc.)"),
        source: Optional[str] = Query(None, description="Log kaynağı filtresi"),
        source_ip: Optional[str] = Query(None, description="Kaynak IP filtresi"),
        search: Optional[str] = Query(None, description="Arama terimi"),
        start_date: Optional[str] = Query(None, description="Başlangıç tarihi (ISO format)"),
        end_date: Optional[str] = Query(None, description="Bitiş tarihi (ISO format)"),
        current_user=Depends(get_current_user)
):
    """
    Get filtered and paginated system logs
    Supports comprehensive filtering and search capabilities
    """
    try:
        username = current_user.get('username', 'unknown')
        logger.info(f"📋 Logs requested by user: {username} (page={page}, per_page={per_page})")

        # Parse date parameters
        start_datetime = None
        end_datetime = None

        if start_date:
            try:
                start_datetime = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid start_date format. Use ISO format (YYYY-MM-DDTHH:MM:SS)"
                )

        if end_date:
            try:
                end_datetime = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid end_date format. Use ISO format (YYYY-MM-DDTHH:MM:SS)"
                )

        # Validate date range
        if start_datetime and end_datetime and start_datetime > end_datetime:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="start_date cannot be later than end_date"
            )

        # Get logs from service
        result = await log_service.get_logs(
            page=page,
            per_page=per_page,
            level=level,
            source=source,
            start_date=start_datetime,
            end_date=end_datetime,
            search=search,
            source_ip=source_ip
        )

        if not result["success"]:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to retrieve logs: {result.get('error', 'Unknown error')}"
            )

        # Format response for PaginatedResponse
        pagination = result["pagination"]

        return PaginatedResponse(
            success=True,
            data=result["data"],
            total=pagination["total_count"],
            page=pagination["current_page"],
            per_page=pagination["per_page"],
            pages=pagination["total_pages"],
            has_next=pagination["has_next"],
            has_prev=pagination["has_prev"],
            message=f"Retrieved {len(result['data'])} logs successfully",
            details={
                "filters_applied": result.get("filters_applied", {}),
                "query_time": datetime.utcnow().isoformat()
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to get logs: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error while retrieving logs: {str(e)}"
        )


@router.get("/statistics", response_model=ResponseModel)
async def get_log_statistics(
        time_range: str = Query("24h", description="Zaman aralığı (1h, 24h, 7d, 30d)"),
        current_user=Depends(get_current_user)
):
    """
    Get comprehensive log statistics for dashboard
    Returns traffic analysis and security metrics
    """
    try:
        username = current_user.get('username', 'unknown')
        logger.info(f"📊 Log statistics requested by user: {username} (range={time_range})")

        # Validate time range
        valid_ranges = ["1h", "24h", "7d", "30d"]
        if time_range not in valid_ranges:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid time_range. Must be one of: {', '.join(valid_ranges)}"
            )

        # Get statistics from service
        result = await log_service.get_log_statistics(time_range=time_range)

        if not result["success"]:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to get statistics: {result.get('error', 'Unknown error')}"
            )

        return ResponseModel(
            success=True,
            message="Log statistics retrieved successfully",
            details=result["data"]
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to get log statistics: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve log statistics: {str(e)}"
        )


@router.get("/real-time-stats", response_model=ResponseModel)
async def get_real_time_stats(current_user=Depends(get_current_user)):
    """
    Get real-time statistics for live dashboard updates
    Returns current system activity and metrics
    """
    try:
        # Get real-time stats from service
        result = await log_service.get_real_time_stats()

        if not result["success"]:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to get real-time stats: {result.get('error', 'Unknown error')}"
            )

        return ResponseModel(
            success=True,
            message="Real-time statistics retrieved successfully",
            details=result["data"]
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to get real-time stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve real-time statistics: {str(e)}"
        )


@router.get("/search", response_model=ResponseModel)
async def search_logs(
        q: str = Query(..., description="Arama terimi"),
        search_type: str = Query("message", description="Arama türü (message, ip, source, all)"),
        limit: int = Query(100, ge=1, le=1000, description="Maksimum sonuç sayısı"),
        current_user=Depends(get_current_user)
):
    """
    Advanced log search functionality
    Supports searching across various log fields
    """
    try:
        username = current_user.get('username', 'unknown')
        logger.info(f"🔍 Log search by user: {username} (query='{q}', type={search_type})")

        # Validate search type
        valid_types = ["message", "ip", "source", "all"]
        if search_type not in valid_types:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid search_type. Must be one of: {', '.join(valid_types)}"
            )

        # Validate search term
        if len(q.strip()) < 2:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Search term must be at least 2 characters long"
            )

        # Perform search
        result = await log_service.search_logs(
            search_term=q.strip(),
            search_type=search_type,
            limit=limit
        )

        if not result["success"]:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Search failed: {result.get('error', 'Unknown error')}"
            )

        return ResponseModel(
            success=True,
            message=f"Search completed. Found {result['count']} results.",
            details=result
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to search logs: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Search operation failed: {str(e)}"
        )


@router.get("/security-alerts", response_model=ResponseModel)
async def get_security_alerts(
        limit: int = Query(50, ge=1, le=200, description="Maksimum uyarı sayısı"),
        current_user=Depends(get_current_user)
):
    """
    Get recent security alerts and warnings
    Returns detected anomalies and security events
    """
    try:
        username = current_user.get('username', 'unknown')
        logger.info(f"🚨 Security alerts requested by user: {username}")

        # Get alerts from service
        result = await log_service.get_security_alerts(limit=limit)

        if not result["success"]:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to get security alerts: {result.get('error', 'Unknown error')}"
            )

        return ResponseModel(
            success=True,
            message=f"Retrieved {result['count']} security alerts",
            details=result
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to get security alerts: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve security alerts: {str(e)}"
        )


@router.post("/export", response_model=ResponseModel)
async def export_logs(
        export_config: Dict[str, Any] = Body(...),
        current_user=Depends(require_admin)
):
    """
    Export logs in various formats (JSON, CSV)
    Admin-only endpoint for data export
    """
    try:
        username = current_user.get('username', 'admin')
        logger.info(f"📤 Log export requested by user: {username}")

        # Extract export parameters
        format_type = export_config.get("format", "json")
        start_date_str = export_config.get("start_date")
        end_date_str = export_config.get("end_date")
        level_filter = export_config.get("level")

        # Parse dates if provided
        start_date = None
        end_date = None

        if start_date_str:
            try:
                start_date = datetime.fromisoformat(start_date_str.replace('Z', '+00:00'))
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid start_date format"
                )

        if end_date_str:
            try:
                end_date = datetime.fromisoformat(end_date_str.replace('Z', '+00:00'))
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid end_date format"
                )

        # Validate format
        if format_type not in ["json", "csv"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Format must be 'json' or 'csv'"
            )

        # Export logs
        result = await log_service.export_logs(
            format_type=format_type,
            start_date=start_date,
            end_date=end_date,
            level_filter=level_filter
        )

        if not result["success"]:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Export failed: {result.get('error', 'Unknown error')}"
            )

        return ResponseModel(
            success=True,
            message=f"Exported {result['count']} logs in {result['format']} format",
            details=result
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to export logs: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Export operation failed: {str(e)}"
        )


@router.post("/manual", response_model=ResponseModel)
async def create_manual_log(
        log_data: Dict[str, Any] = Body(...),
        current_user=Depends(require_admin)
):
    """
    Create a manual log entry
    Admin-only endpoint for adding custom log entries
    """
    try:
        username = current_user.get('username', 'admin')
        user_id = str(current_user.get('_id', current_user.get('userId', 'unknown')))

        # Extract log parameters
        level = log_data.get("level", "INFO").upper()
        message = log_data.get("message")
        source = log_data.get("source", "manual")
        details = log_data.get("details")

        # Validate required fields
        if not message:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Message is required for manual log entry"
            )

        # Validate level
        valid_levels = ["INFO", "WARNING", "ERROR", "CRITICAL", "DEBUG", "ALLOW", "BLOCK", "DENY"]
        if level not in valid_levels:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid level. Must be one of: {', '.join(valid_levels)}"
            )

        logger.info(f"📝 Manual log creation by user: {username} (level={level})")

        # Create manual log
        result = await log_service.create_manual_log(
            level=level,
            message=message,
            source=source,
            details=details,
            user_id=user_id
        )

        if not result["success"]:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create manual log: {result.get('error', 'Unknown error')}"
            )

        return ResponseModel(
            success=True,
            message="Manual log entry created successfully",
            details={
                "log_id": result["log_id"],
                "created_by": username,
                "level": level,
                "message": message
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to create manual log: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create manual log entry: {str(e)}"
        )


@router.delete("/clear", response_model=ResponseModel)
async def clear_old_logs(
        days_to_keep: int = Query(30, ge=1, le=365, description="Saklanacak gün sayısı"),
        current_user=Depends(require_admin)
):
    """
    Clear old logs to manage database size
    Admin-only endpoint for log maintenance
    """
    try:
        username = current_user.get('username', 'admin')
        logger.info(f"🗑️ Log cleanup requested by user: {username} (keep_days={days_to_keep})")

        # Clear old logs
        result = await log_service.clear_old_logs(days_to_keep=days_to_keep)

        if not result["success"]:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to clear old logs: {result.get('error', 'Unknown error')}"
            )

        deleted_counts = result["deleted_counts"]
        total_deleted = deleted_counts["total"]

        return ResponseModel(
            success=True,
            message=f"Successfully cleared {total_deleted} old log entries (kept last {days_to_keep} days)",
            details=result
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to clear old logs: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Log cleanup failed: {str(e)}"
        )


@router.get("/levels", response_model=ResponseModel)
async def get_log_levels(current_user=Depends(get_current_user)):
    """
    Get available log levels for filtering
    Returns log level definitions and colors
    """
    try:
        log_levels = [
            {"value": "ALL", "label": "Tüm Loglar", "color": "primary"},
            {"value": "ALLOW", "label": "İzin Verildi", "color": "success"},
            {"value": "BLOCK", "label": "Engellendi", "color": "danger"},
            {"value": "DENY", "label": "Reddedildi", "color": "danger"},
            {"value": "WARNING", "label": "Uyarı", "color": "warning"},
            {"value": "ERROR", "label": "Hata", "color": "danger"},
            {"value": "CRITICAL", "label": "Kritik", "color": "danger"},
            {"value": "INFO", "label": "Bilgi", "color": "info"},
            {"value": "DEBUG", "label": "Hata Ayıklama", "color": "secondary"}
        ]

        return ResponseModel(
            success=True,
            message="Log levels retrieved successfully",
            details={"levels": log_levels}
        )

    except Exception as e:
        logger.error(f"❌ Failed to get log levels: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve log levels"
        )


@router.get("/sources", response_model=ResponseModel)
async def get_log_sources(current_user=Depends(get_current_user)):
    """
    Get available log sources for filtering
    Returns unique log sources from database
    """
    try:
        db = await get_database()

        # Get unique sources from last 30 days
        cutoff_date = datetime.utcnow() - timedelta(days=30)

        pipeline = [
            {"$match": {"timestamp": {"$gte": cutoff_date}}},
            {"$group": {"_id": "$source", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 20}
        ]

        sources_data = await db.system_logs.aggregate(pipeline).to_list(length=None)

        # Format sources for frontend
        sources = [{"value": "ALL", "label": "Tüm Kaynaklar", "count": None}]
        for source_info in sources_data:
            source = source_info["_id"]
            count = source_info["count"]

            # Create readable labels
            source_labels = {
                "iptables": "Iptables",
                "firewall_block": "Güvenlik Duvarı",
                "firewall_allow": "Güvenlik Duvarı",
                "netstat": "Ağ Bağlantıları",
                "interface_monitor": "Arayüz İzleyici",
                "real_time_stats": "Gerçek Zamanlı İstatistikler",
                "log_analysis": "Log Analizi",
                "auth": "Kimlik Doğrulama",
                "manual": "Manuel Girdi"
            }

            label = source_labels.get(source, source.title())
            sources.append({
                "value": source,
                "label": f"{label} ({count})",
                "count": count
            })

        return ResponseModel(
            success=True,
            message="Log sources retrieved successfully",
            details={"sources": sources}
        )

    except Exception as e:
        logger.error(f"❌ Failed to get log sources: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve log sources"
        )


@router.get("/traffic-summary", response_model=ResponseModel)
async def get_traffic_summary(
        time_range: str = Query("24h", description="Zaman aralığı"),
        current_user=Depends(get_current_user)
):
    """
    Get PC-to-PC traffic summary for dashboard
    Returns traffic flow analysis between devices
    """
    try:
        db = await get_database()

        # Calculate time range
        now = datetime.utcnow()
        if time_range == "1h":
            start_time = now - timedelta(hours=1)
        elif time_range == "24h":
            start_time = now - timedelta(hours=24)
        elif time_range == "7d":
            start_time = now - timedelta(days=7)
        else:
            start_time = now - timedelta(hours=24)

        # Get traffic data
        pipeline = [
            {"$match": {
                "timestamp": {"$gte": start_time},
                "event_type": {"$in": ["traffic_log", "packet_allowed", "packet_blocked"]},
                "source_ip": {"$exists": True},
                "destination_ip": {"$exists": True}
            }},
            {"$group": {
                "_id": {
                    "source_ip": "$source_ip",
                    "destination_ip": "$destination_ip",
                    "protocol": "$protocol"
                },
                "packet_count": {"$sum": 1},
                "bytes_transferred": {"$sum": {"$ifNull": ["$parsed_data.packet_size", 0]}}
            }},
            {"$sort": {"packet_count": -1}},
            {"$limit": 50}
        ]

        traffic_flows = await db.system_logs.aggregate(pipeline).to_list(length=None)

        # Analyze traffic patterns
        internal_traffic = []
        external_traffic = []
        blocked_traffic = []

        for flow in traffic_flows:
            flow_data = {
                "source_ip": flow["_id"]["source_ip"],
                "destination_ip": flow["_id"]["destination_ip"],
                "protocol": flow["_id"]["protocol"],
                "packet_count": flow["packet_count"],
                "bytes_transferred": flow["bytes_transferred"]
            }

            # Classify traffic type
            src_ip = flow["_id"]["source_ip"]
            dst_ip = flow["_id"]["destination_ip"]

            if src_ip.startswith("192.168.") and not dst_ip.startswith("192.168."):
                external_traffic.append(flow_data)  # Internal to external
            elif src_ip.startswith("192.168.") and dst_ip.startswith("192.168."):
                internal_traffic.append(flow_data)  # Internal to internal

        return ResponseModel(
            success=True,
            message="Traffic summary retrieved successfully",
            details={
                "time_range": time_range,
                "total_flows": len(traffic_flows),
                "internal_traffic": internal_traffic[:10],
                "external_traffic": external_traffic[:10],
                "summary": {
                    "internal_flows": len(internal_traffic),
                    "external_flows": len(external_traffic),
                    "total_packets": sum(flow["packet_count"] for flow in traffic_flows),
                    "total_bytes": sum(flow["bytes_transferred"] for flow in traffic_flows)
                }
            }
        )

    except Exception as e:
        logger.error(f"❌ Failed to get traffic summary: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve traffic summary"
        )


# Health check endpoint for logs system
@router.get("/health", response_model=ResponseModel)
async def logs_health_check(current_user=Depends(get_current_user)):
    """
    Health check for logs system
    Returns system status and recent activity
    """
    try:
        db = await get_database()

        # Check recent log activity
        recent_cutoff = datetime.utcnow() - timedelta(minutes=5)
        recent_logs = await db.system_logs.count_documents({
            "timestamp": {"$gte": recent_cutoff}
        })

        # Check database connectivity
        collections_status = {}
        try:
            collections_status["system_logs"] = await db.system_logs.estimated_document_count()
            collections_status["network_activity"] = await db.network_activity.estimated_document_count()
            collections_status["security_alerts"] = await db.security_alerts.estimated_document_count()
        except Exception as e:
            logger.warning(f"⚠️ Collection status check failed: {e}")

        # Check log service status
        log_service_status = "healthy" if hasattr(log_service, 'db') and log_service.db else "not_initialized"

        health_status = {
            "logs_system": "healthy",
            "log_service": log_service_status,
            "recent_activity": recent_logs,
            "collections": collections_status,
            "database_connected": bool(db),
            "timestamp": datetime.utcnow().isoformat()
        }

        return ResponseModel(
            success=True,
            message="Logs system health check completed",
            details=health_status
        )

    except Exception as e:
        logger.error(f"❌ Logs health check failed: {e}")
        return ResponseModel(
            success=False,
            message="Logs system health check failed",
            details={"error": str(e), "timestamp": datetime.utcnow().isoformat()}
        )