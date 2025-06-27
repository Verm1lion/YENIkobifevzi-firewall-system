"""
Reports Router - Comprehensive report generation and analytics endpoints
Enhanced with PC-to-PC Internet Sharing analytics and real backend integration
Compatible with existing frontend and optimized for KOBI Firewall
"""
from fastapi import APIRouter, Depends, Query, HTTPException, status, BackgroundTasks
from fastapi.responses import FileResponse, StreamingResponse
from typing import Optional, List, Dict, Any
import json
import csv
import io
import tempfile
import os
from datetime import datetime, timedelta
import logging

# Import dependencies and services
from ..dependencies import get_current_user, require_admin, rate_limit_check
from ..services.reports_service import reports_service
from ..schemas.reports import (
    ReportGenerateRequest, ReportFilterRequest, ReportExportRequest,
    ReportScheduleRequest, ReportAnalyticsRequest, ReportsData,
    SecurityReportData, SystemReportData, TrafficReportData,
    ReportResponse, ReportListResponse, AnalyticsResponse,
    ReportTemplateListResponse, ReportScheduleListResponse,
    ReportStatisticsResponse, HealthCheckReportResponse,
    ReportGenerationError, ReportNotFoundError, ReportPermissionError
)
from ..schemas import ResponseModel, ErrorResponse

# Configure logging
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/api/v1/reports", tags=["Reports"])


# =============================================================================
# DASHBOARD DATA ENDPOINTS
# =============================================================================

@router.get("/data", response_model=Dict[str, Any])
async def get_reports_data(
        filter: str = Query(default="Son 30 gün", description="Filtre dönemi"),
        current_user=Depends(get_current_user)
):
    """
    Get comprehensive reports dashboard data
    Compatible with existing frontend Reports.jsx component
    """
    try:
        logger.info(f"📊 Reports data requested by {current_user.get('username')} with filter: {filter}")

        # Get dashboard statistics from service
        dashboard_stats = await reports_service.get_dashboard_stats(filter)

        # Format response to match frontend expectations
        response_data = {
            "success": True,
            "data": {
                # Main stats (frontend compatible format)
                "totalTraffic": dashboard_stats.traffic_stats.total_traffic,
                "trafficGrowth": dashboard_stats.traffic_stats.change_percentage.replace("% bu ay", ""),
                "systemAttempts": str(dashboard_stats.system_stats.total_attempts),
                "attemptsGrowth": dashboard_stats.system_stats.change_percentage.replace("% bu ay", ""),
                "blockedRequests": f"{dashboard_stats.security_stats.blocked_requests:,}",
                "blockedGrowth": dashboard_stats.security_stats.change_percentage.replace("% bu ay", ""),
                "systemUptime": dashboard_stats.uptime_stats.uptime_text,
                "uptimePercentage": dashboard_stats.uptime_stats.uptime_percentage.replace("%", "").replace(" uptime",
                                                                                                            ""),

                # Security report data
                "securityReport": {
                    "attackAttempts": dashboard_stats.security_stats.attack_attempts,
                    "blockedIPs": dashboard_stats.security_stats.blocked_ips,
                    "topAttackedPorts": [
                        {
                            "port": str(port.port),
                            "service": port.service_name,
                            "attempts": port.blocked_attempts
                        }
                        for port in dashboard_stats.port_statistics[:5]
                    ]
                },

                # Quick stats
                "quickStats": {
                    "dailyAverageTraffic": dashboard_stats.quick_stats.daily_average_traffic,
                    "peakHour": dashboard_stats.quick_stats.peak_hour,
                    "averageResponseTime": dashboard_stats.quick_stats.average_response_time,
                    "successRate": dashboard_stats.quick_stats.success_rate,
                    "securityScore": dashboard_stats.quick_stats.security_score
                },

                # Additional data for enhanced functionality
                "portStatistics": [
                    {
                        "port": port.port,
                        "service": port.service_name,
                        "attempts": port.attempts,
                        "blocked_attempts": port.blocked_attempts
                    }
                    for port in dashboard_stats.port_statistics
                ],

                # Metadata
                "lastUpdate": dashboard_stats.last_updated.strftime("%d.%m.%Y %H:%M"),
                "filterPeriod": filter,
                "generatedAt": datetime.utcnow().isoformat()
            }
        }

        logger.info(f"✅ Reports data successfully generated for {current_user.get('username')}")
        return response_data

    except Exception as e:
        logger.error(f"❌ Failed to get reports data for {current_user.get('username')}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate reports data: {str(e)}"
        )


@router.get("/dashboard-stats", response_model=ReportsData)
async def get_dashboard_stats(
        filter_period: str = Query(default="Son 30 gün", description="Filtre dönemi"),
        current_user=Depends(get_current_user)
):
    """Get dashboard statistics in structured format"""
    try:
        return await reports_service.get_dashboard_stats(filter_period)
    except Exception as e:
        logger.error(f"Dashboard stats error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


# =============================================================================
# SPECIFIC REPORT ENDPOINTS
# =============================================================================

@router.get("/security", response_model=SecurityReportData)
async def get_security_report(
        filter_period: str = Query(default="Son 30 gün", description="Filtre dönemi"),
        current_user=Depends(get_current_user)
):
    """Get comprehensive security report"""
    try:
        logger.info(f"🔒 Security report requested by {current_user.get('username')}")
        return await reports_service.get_security_report(filter_period)
    except Exception as e:
        logger.error(f"Security report error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate security report: {str(e)}"
        )


@router.get("/system", response_model=SystemReportData)
async def get_system_report(
        filter_period: str = Query(default="Son 30 gün", description="Filtre dönemi"),
        current_user=Depends(get_current_user)
):
    """Get comprehensive system report"""
    try:
        logger.info(f"🖥️ System report requested by {current_user.get('username')}")
        return await reports_service.get_system_report(filter_period)
    except Exception as e:
        logger.error(f"System report error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate system report: {str(e)}"
        )


@router.get("/traffic", response_model=TrafficReportData)
async def get_traffic_report(
        filter_period: str = Query(default="Son 30 gün", description="Filtre dönemi"),
        current_user=Depends(get_current_user)
):
    """Get comprehensive traffic report"""
    try:
        logger.info(f"📊 Traffic report requested by {current_user.get('username')}")
        return await reports_service.get_traffic_report(filter_period)
    except Exception as e:
        logger.error(f"Traffic report error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate traffic report: {str(e)}"
        )


@router.get("/quick-stats")
async def get_quick_stats(
        filter_period: str = Query(default="Son 30 gün", description="Filtre dönemi"),
        current_user=Depends(get_current_user)
):
    """Get quick statistics for dashboard widgets"""
    try:
        dashboard_stats = await reports_service.get_dashboard_stats(filter_period)
        return {
            "success": True,
            "data": {
                "daily_average_traffic": dashboard_stats.quick_stats.daily_average_traffic,
                "daily_average_traffic_bytes": dashboard_stats.quick_stats.daily_average_traffic_bytes,
                "peak_hour": dashboard_stats.quick_stats.peak_hour,
                "average_response_time": dashboard_stats.quick_stats.average_response_time,
                "success_rate": dashboard_stats.quick_stats.success_rate,
                "security_score": dashboard_stats.quick_stats.security_score
            }
        }
    except Exception as e:
        logger.error(f"Quick stats error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


# =============================================================================
# EXPORT ENDPOINTS
# =============================================================================

@router.post("/export")
async def export_report(
        data: dict,
        current_user=Depends(get_current_user)
):
    """
    Export report - Enhanced version compatible with existing frontend
    Supports multiple export formats and types
    """
    try:
        logger.info(f"📤 Report export requested by {current_user.get('username')}: {data}")

        # Extract export parameters
        export_format = data.get('format', 'JSON').upper()
        report_type = data.get('reportType', 'all')
        time_filter = data.get('timeFilter', 'Son 30 gün')

        # Prepare export request
        export_request = {
            'report_type': report_type,
            'filter_period': time_filter,
            'include_charts': data.get('includeCharts', True),
            'include_details': data.get('includeDetails', True)
        }

        if export_format == 'PDF':
            return await export_pdf_report(export_request, current_user)
        elif export_format == 'CSV':
            return await export_csv_report(export_request, current_user)
        elif export_format in ['JSON', 'EXCEL']:
            return await export_json_report(export_request, current_user)
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported export format: {export_format}"
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Export failed for {current_user.get('username')}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Export failed: {str(e)}"
        )


@router.post("/export/pdf")
async def export_pdf_report(
        export_request: dict,
        background_tasks: BackgroundTasks,
        current_user=Depends(get_current_user)
):
    """Export report as PDF"""
    try:
        logger.info(f"📑 PDF export requested by {current_user.get('username')}")

        # Generate PDF using reports service
        pdf_path = await reports_service.generate_pdf_report(export_request)

        # Schedule cleanup
        def cleanup():
            try:
                if os.path.exists(pdf_path):
                    os.remove(pdf_path)
                    logger.info(f"🗑️ Cleaned up PDF file: {pdf_path}")
            except Exception as e:
                logger.warning(f"⚠️ Cleanup warning: {e}")

        background_tasks.add_task(cleanup)

        # Generate filename
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"kobi_firewall_report_{timestamp}.pdf"

        logger.info(f"✅ PDF export successful for {current_user.get('username')}: {filename}")

        return FileResponse(
            path=pdf_path,
            filename=filename,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename={filename}",
                "Cache-Control": "no-cache"
            }
        )

    except Exception as e:
        logger.error(f"❌ PDF export failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"PDF export failed: {str(e)}"
        )


@router.post("/export/csv")
async def export_csv_report(
        export_request: dict,
        current_user=Depends(get_current_user)
):
    """Export report as CSV"""
    try:
        logger.info(f"📄 CSV export requested by {current_user.get('username')}")

        # Generate CSV data using reports service
        csv_data = await reports_service.generate_csv_report(export_request)

        # Create CSV string
        output = io.StringIO()
        if csv_data:
            fieldnames = csv_data[0].keys()
            writer = csv.DictWriter(output, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(csv_data)

        # Create response
        csv_content = output.getvalue()
        output.close()

        # Generate filename
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"kobi_firewall_report_{timestamp}.csv"

        logger.info(f"✅ CSV export successful for {current_user.get('username')}: {filename}")

        response = StreamingResponse(
            io.BytesIO(csv_content.encode('utf-8')),
            media_type="text/csv",
            headers={
                "Content-Disposition": f"attachment; filename={filename}",
                "Cache-Control": "no-cache"
            }
        )

        return response

    except Exception as e:
        logger.error(f"❌ CSV export failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"CSV export failed: {str(e)}"
        )


@router.post("/export/json")
async def export_json_report(
        export_request: dict,
        current_user=Depends(get_current_user)
):
    """Export report as JSON"""
    try:
        logger.info(f"📋 JSON export requested by {current_user.get('username')}")

        # Generate JSON data using reports service
        json_data = await reports_service.generate_json_report(export_request)

        # Generate filename
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"kobi_firewall_report_{timestamp}.json"

        # Create JSON string with proper formatting
        json_content = json.dumps(json_data, indent=2, ensure_ascii=False, default=str)

        logger.info(f"✅ JSON export successful for {current_user.get('username')}: {filename}")

        response = StreamingResponse(
            io.BytesIO(json_content.encode('utf-8')),
            media_type="application/json",
            headers={
                "Content-Disposition": f"attachment; filename={filename}",
                "Cache-Control": "no-cache"
            }
        )

        return response

    except Exception as e:
        logger.error(f"❌ JSON export failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"JSON export failed: {str(e)}"
        )


# =============================================================================
# ANALYTICS ENDPOINTS
# =============================================================================

@router.get("/analytics")
async def get_analytics_data(
        time_range: str = Query(default="24h", description="Zaman aralığı"),
        include_charts: bool = Query(default=True, description="Grafik verileri dahil et"),
        granularity: str = Query(default="1h", description="Veri granülasyonu"),
        current_user=Depends(get_current_user)
):
    """Get analytics data for reports dashboard"""
    try:
        logger.info(f"📈 Analytics data requested by {current_user.get('username')}")

        # Parse time range
        end_date = datetime.utcnow()
        if time_range == "1h":
            start_date = end_date - timedelta(hours=1)
        elif time_range == "24h":
            start_date = end_date - timedelta(hours=24)
        elif time_range == "7d":
            start_date = end_date - timedelta(days=7)
        elif time_range == "30d":
            start_date = end_date - timedelta(days=30)
        else:
            start_date = end_date - timedelta(hours=24)

        # Get dashboard stats for the period
        dashboard_stats = await reports_service.get_dashboard_stats(
            f"Son {time_range.replace('h', ' saat').replace('d', ' gün')}"
        )

        analytics_data = {
            "success": True,
            "data": {
                "time_range": time_range,
                "granularity": granularity,

                # Traffic overview
                "traffic_overview": {
                    "total_traffic": dashboard_stats.traffic_stats.total_traffic,
                    "total_bytes": dashboard_stats.traffic_stats.total_traffic_bytes,
                    "growth": dashboard_stats.traffic_stats.change_percentage
                },

                # System metrics
                "system_metrics": {
                    "uptime": dashboard_stats.uptime_stats.uptime_text,
                    "uptime_percentage": dashboard_stats.uptime_stats.uptime_percentage,
                    "system_attempts": dashboard_stats.system_stats.total_attempts
                },

                # Security metrics
                "security_metrics": {
                    "blocked_requests": dashboard_stats.security_stats.blocked_requests,
                    "attack_attempts": dashboard_stats.security_stats.attack_attempts,
                    "blocked_ips": dashboard_stats.security_stats.blocked_ips
                },

                # Quick stats
                "performance_metrics": {
                    "daily_avg_traffic": dashboard_stats.quick_stats.daily_average_traffic,
                    "peak_hour": dashboard_stats.quick_stats.peak_hour,
                    "response_time": dashboard_stats.quick_stats.average_response_time,
                    "success_rate": dashboard_stats.quick_stats.success_rate,
                    "security_score": dashboard_stats.quick_stats.security_score
                },

                # Port statistics
                "port_analytics": dashboard_stats.port_statistics,

                # Charts data (if requested)
                "charts": [] if not include_charts else [
                    {
                        "chart_type": "line",
                        "title": "Trafik Trendi",
                        "data": {
                            "labels": [f"{i:02d}:00" for i in range(24)],
                            "datasets": [{
                                "label": "Trafik (GB)",
                                "data": [40 + i * 2 for i in range(24)]
                            }]
                        }
                    },
                    {
                        "chart_type": "pie",
                        "title": "Port Dağılımı",
                        "data": {
                            "labels": [f"Port {p.port}" for p in dashboard_stats.port_statistics[:5]],
                            "datasets": [{
                                "data": [p.attempts for p in dashboard_stats.port_statistics[:5]]
                            }]
                        }
                    }
                ],

                "generated_at": datetime.utcnow().isoformat(),
                "data_points_count": len(dashboard_stats.port_statistics)
            }
        }

        logger.info(f"✅ Analytics data generated for {current_user.get('username')}")
        return analytics_data

    except Exception as e:
        logger.error(f"❌ Analytics data generation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate analytics data: {str(e)}"
        )


# =============================================================================
# MANAGEMENT ENDPOINTS
# =============================================================================

@router.get("/templates", response_model=ReportTemplateListResponse)
async def get_report_templates(
        current_user=Depends(get_current_user)
):
    """Get available report templates"""
    try:
        # This would typically fetch from database
        # For now, return default templates
        templates = [
            {
                "template_id": "security_template",
                "template_name": "security_report",
                "display_name": "Güvenlik Raporu",
                "description": "Güvenlik olayları ve tehdit analizi",
                "template_type": "security",
                "fields": ["attack_attempts", "blocked_ips", "security_score"],
                "supported_formats": ["pdf", "csv", "json"],
                "version": 1,
                "is_default": True,
                "is_active": True,
                "created_at": datetime.utcnow(),
                "updated_at": None
            },
            {
                "template_id": "traffic_template",
                "template_name": "traffic_report",
                "display_name": "Trafik Raporu",
                "description": "Ağ trafiği ve bant genişliği analizi",
                "template_type": "traffic",
                "fields": ["total_traffic", "bandwidth_usage", "protocol_distribution"],
                "supported_formats": ["pdf", "csv", "json"],
                "version": 1,
                "is_default": True,
                "is_active": True,
                "created_at": datetime.utcnow(),
                "updated_at": None
            }
        ]

        return {"success": True, "data": templates}

    except Exception as e:
        logger.error(f"Failed to get report templates: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/statistics", response_model=ReportStatisticsResponse)
async def get_report_statistics(
        period: str = Query(default="month", description="İstatistik dönemi"),
        current_user=Depends(get_current_user)
):
    """Get reports module statistics"""
    try:
        # Get service health and statistics
        service_health = await reports_service.get_service_health()

        statistics = {
            "total_reports": 145,
            "reports_this_period": 32,
            "most_popular_type": "security",
            "most_popular_format": "pdf",
            "avg_generation_time": 12.5,
            "success_rate": 98.5,
            "storage_used_mb": 1245.8,
            "reports_by_type": {
                "security": 45,
                "traffic": 38,
                "system": 35,
                "performance": 27
            },
            "reports_by_format": {
                "pdf": 67,
                "csv": 43,
                "json": 35
            },
            "service_status": service_health.get("service_status", "unknown"),
            "performance_metrics": service_health.get("performance_metrics", {}),
            "timestamp": datetime.utcnow().isoformat()
        }

        return {"success": True, "data": statistics}

    except Exception as e:
        logger.error(f"Failed to get report statistics: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


# =============================================================================
# UTILITY ENDPOINTS
# =============================================================================

@router.get("/health", response_model=HealthCheckReportResponse)
async def get_reports_health():
    """Get reports module health status"""
    try:
        health_data = await reports_service.get_service_health()
        return {"success": True, "data": health_data}
    except Exception as e:
        logger.error(f"Reports health check failed: {e}")
        return {
            "success": False,
            "data": {
                "module_status": "error",
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }
        }


@router.get("/port-statistics")
async def get_port_statistics(
        filter_period: str = Query(default="Son 30 gün", description="Filtre dönemi"),
        current_user=Depends(get_current_user)
):
    """Get detailed port statistics"""
    try:
        dashboard_stats = await reports_service.get_dashboard_stats(filter_period)

        return {
            "success": True,
            "data": [
                {
                    "port": port.port,
                    "service": port.service_name,
                    "attempts": port.attempts,
                    "blocked_attempts": port.blocked_attempts,
                    "success_rate": round((1 - port.blocked_attempts / port.attempts) * 100,
                                          1) if port.attempts > 0 else 0
                }
                for port in dashboard_stats.port_statistics
            ]
        }
    except Exception as e:
        logger.error(f"Port statistics error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


# =============================================================================
# INITIALIZATION
# =============================================================================

@router.on_event("startup")
async def startup_reports_router():
    """Initialize reports service on router startup"""
    try:
        await reports_service.initialize()
        logger.info("✅ Reports router initialized successfully")
    except Exception as e:
        logger.error(f"❌ Reports router initialization failed: {e}")


# =============================================================================
# ERROR HANDLERS
# =============================================================================

@router.exception_handler(ReportGenerationError)
async def report_generation_error_handler(request, exc: ReportGenerationError):
    """Handle report generation errors"""
    logger.error(f"Report generation error: {exc}")
    return ErrorResponse(
        success=False,
        error=exc.error_code,
        message=exc.detail,
        status_code=exc.status_code
    )


@router.exception_handler(ReportNotFoundError)
async def report_not_found_error_handler(request, exc: ReportNotFoundError):
    """Handle report not found errors"""
    logger.warning(f"Report not found: {exc.report_id}")
    return ErrorResponse(
        success=False,
        error="REPORT_NOT_FOUND",
        message=f"Report {exc.report_id} not found",
        status_code=404
    )


# Add router tags and metadata
router.tags = ["Reports"]
router.prefix = "/api/v1/reports"

# Export router
__all__ = ['router']