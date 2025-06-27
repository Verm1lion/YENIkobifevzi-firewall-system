"""
Reports Request/Response schemas for API endpoints using Pydantic v2
Enhanced with PC-to-PC Internet Sharing analytics and comprehensive reporting
Compatible with existing backend structure and KOBI Firewall requirements
"""
from datetime import datetime
from typing import Optional, List, Dict, Any, Union
from enum import Enum
from pydantic import BaseModel, Field, validator, ConfigDict

# Import from existing schemas for consistency
from ..schemas import ResponseModel, ErrorResponse, PaginatedResponse

# Import report enums from models
from ..models.reports import (
    ReportType, ReportStatus, ReportFormat, ReportFrequency,
    TrafficDirection, SecurityThreatLevel, MetricType
)


# =============================================================================
# REPORTS REQUEST SCHEMAS
# =============================================================================

class ReportGenerateRequest(BaseModel):
    """Request schema for generating reports"""
    model_config = ConfigDict(from_attributes=True)

    report_type: ReportType = Field(..., description="Type of report to generate")
    report_name: Optional[str] = Field(None, min_length=1, max_length=200, description="Custom report name")
    template_id: Optional[str] = Field(None, description="Template ID to use for generation")

    # Time parameters
    start_date: datetime = Field(..., description="Report data start date")
    end_date: datetime = Field(..., description="Report data end date")
    timezone: str = Field(default="Europe/Istanbul", description="Timezone for date interpretation")

    # Output configuration
    format: ReportFormat = Field(default=ReportFormat.PDF, description="Output format")
    include_charts: bool = Field(default=True, description="Include charts in report")
    include_raw_data: bool = Field(default=False, description="Include raw data appendix")
    include_summary: bool = Field(default=True, description="Include executive summary")

    # Filtering parameters
    filters: Dict[str, Any] = Field(default_factory=dict, description="Report filters")
    source_ip_filter: Optional[str] = Field(None, description="Filter by source IP")
    destination_ip_filter: Optional[str] = Field(None, description="Filter by destination IP")
    protocol_filter: Optional[str] = Field(None, description="Filter by protocol")
    interface_filter: Optional[str] = Field(None, description="Filter by network interface")

    # PC-to-PC specific filters
    pc_to_pc_only: bool = Field(default=False, description="Include only PC-to-PC traffic")
    internet_sharing_only: bool = Field(default=False, description="Include only internet sharing traffic")

    # Advanced options
    max_data_points: int = Field(default=10000, ge=100, le=100000, description="Maximum data points")
    compression_enabled: bool = Field(default=True, description="Enable report compression")

    @validator('end_date')
    def validate_date_range(cls, v, values):
        if 'start_date' in values and v <= values['start_date']:
            raise ValueError('End date must be after start date')
        return v

    @validator('start_date', 'end_date')
    def validate_date_not_future(cls, v):
        if v > datetime.utcnow():
            raise ValueError('Date cannot be in the future')
        return v


class ReportFilterRequest(BaseModel):
    """Request schema for filtering existing reports"""
    model_config = ConfigDict(from_attributes=True)

    # Pagination
    page: int = Field(default=1, ge=1, description="Page number")
    per_page: int = Field(default=50, ge=1, le=500, description="Items per page")

    # Filtering
    report_type: Optional[ReportType] = Field(None, description="Filter by report type")
    status: Optional[ReportStatus] = Field(None, description="Filter by report status")
    format: Optional[ReportFormat] = Field(None, description="Filter by report format")
    generated_by: Optional[str] = Field(None, description="Filter by user who generated")

    # Date range filtering
    generated_after: Optional[datetime] = Field(None, description="Reports generated after this date")
    generated_before: Optional[datetime] = Field(None, description="Reports generated before this date")

    # Text search
    search_term: Optional[str] = Field(None, min_length=2, max_length=100, description="Search in report names")

    # Sorting
    sort_by: str = Field(default="created_at", description="Sort field")
    sort_order: str = Field(default="desc", regex=r"^(asc|desc)$", description="Sort order")


class ReportExportRequest(BaseModel):
    """Request schema for exporting reports"""
    model_config = ConfigDict(from_attributes=True)

    report_type: str = Field(..., description="Type of report (security, system, traffic, full)")
    filter_period: str = Field(default="Son 30 gün", description="Filter period")
    include_charts: bool = Field(default=True, description="Include charts in export")
    include_details: bool = Field(default=True, description="Include detailed data")

    # Export specific options
    compress_output: bool = Field(default=True, description="Compress export file")
    password_protect: bool = Field(default=False, description="Password protect export")

    @validator('report_type')
    def validate_report_type(cls, v):
        valid_types = ['security', 'system', 'traffic', 'full', 'performance', 'network']
        if v not in valid_types:
            raise ValueError(f'Report type must be one of: {valid_types}')
        return v


class ReportScheduleRequest(BaseModel):
    """Request schema for scheduling reports"""
    model_config = ConfigDict(from_attributes=True)

    schedule_name: str = Field(..., min_length=1, max_length=100, description="Schedule name")
    description: Optional[str] = Field(None, max_length=500, description="Schedule description")

    # Report configuration
    report_type: ReportType = Field(..., description="Type of report to generate")
    template_id: Optional[str] = Field(None, description="Template to use")
    format: ReportFormat = Field(default=ReportFormat.PDF, description="Output format")

    # Schedule timing
    frequency: ReportFrequency = Field(..., description="Schedule frequency")
    time_of_day: str = Field(..., regex=r'^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$', description="Time to run (HH:MM)")
    days_of_week: List[int] = Field(default_factory=list, description="Days of week (0=Monday)")
    day_of_month: Optional[int] = Field(None, ge=1, le=31, description="Day of month for monthly")

    # Report parameters
    data_range_days: int = Field(default=7, ge=1, le=365, description="Days of data to include")
    filters: Dict[str, Any] = Field(default_factory=dict, description="Default filters")

    # Notification settings
    notify_on_completion: bool = Field(default=False, description="Send notification when ready")
    notification_emails: List[str] = Field(default_factory=list, description="Notification email addresses")

    @validator('days_of_week', each_item=True)
    def validate_days_of_week(cls, v):
        if not 0 <= v <= 6:
            raise ValueError('Day of week must be between 0 (Monday) and 6 (Sunday)')
        return v

    @validator('notification_emails', each_item=True)
    def validate_email(cls, v):
        import re
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_pattern, v):
            raise ValueError(f'Invalid email format: {v}')
        return v


class ReportAnalyticsRequest(BaseModel):
    """Request schema for analytics data"""
    model_config = ConfigDict(from_attributes=True)

    # Time range
    start_date: datetime = Field(..., description="Analytics start date")
    end_date: datetime = Field(..., description="Analytics end date")
    granularity: str = Field(default="1h", description="Data granularity (1m, 5m, 1h, 1d)")

    # Metrics selection
    metrics: List[MetricType] = Field(default_factory=list, description="Metrics to include")
    include_trends: bool = Field(default=True, description="Include trend analysis")
    include_predictions: bool = Field(default=False, description="Include predictions")

    # Filtering
    interfaces: List[str] = Field(default_factory=list, description="Network interfaces to include")
    protocols: List[str] = Field(default_factory=list, description="Protocols to include")

    # PC-to-PC specific
    pc_to_pc_analysis: bool = Field(default=True, description="Include PC-to-PC analysis")
    internet_sharing_analysis: bool = Field(default=True, description="Include internet sharing analysis")

    @validator('granularity')
    def validate_granularity(cls, v):
        valid_granularities = ['1m', '5m', '15m', '1h', '6h', '1d']
        if v not in valid_granularities:
            raise ValueError(f'Granularity must be one of: {valid_granularities}')
        return v


# =============================================================================
# REPORTS RESPONSE SCHEMAS
# =============================================================================

class TrafficStatsData(BaseModel):
    """Traffic statistics data schema"""
    model_config = ConfigDict(from_attributes=True)

    total_traffic: str = Field(..., description="Total traffic (e.g., 2.4 TB)")
    total_traffic_bytes: int = Field(..., description="Total traffic in bytes")
    change_percentage: str = Field(..., description="Change percentage (e.g., +12%)")


class SystemStatsData(BaseModel):
    """System statistics data schema"""
    model_config = ConfigDict(from_attributes=True)

    total_attempts: int = Field(..., description="System attempts")
    change_percentage: str = Field(..., description="Change percentage")


class SecurityStatsData(BaseModel):
    """Security statistics data schema"""
    model_config = ConfigDict(from_attributes=True)

    blocked_requests: int = Field(..., description="Blocked requests")
    change_percentage: str = Field(..., description="Change percentage")
    attack_attempts: int = Field(..., description="Attack attempts")
    blocked_ips: int = Field(..., description="Blocked IP addresses")


class UptimeStatsData(BaseModel):
    """Uptime statistics data schema"""
    model_config = ConfigDict(from_attributes=True)

    uptime_text: str = Field(..., description="Uptime text (e.g., 15 gün 6 saat)")
    uptime_percentage: str = Field(..., description="Uptime percentage")
    uptime_seconds: int = Field(..., description="Uptime in seconds")


class PortStatisticData(BaseModel):
    """Port statistics data schema"""
    model_config = ConfigDict(from_attributes=True)

    port: int = Field(..., ge=1, le=65535, description="Port number")
    service_name: str = Field(..., description="Service name (SSH, HTTP, HTTPS)")
    attempts: int = Field(..., ge=0, description="Total attempts")
    blocked_attempts: int = Field(..., ge=0, description="Blocked attempts")


class QuickStatsData(BaseModel):
    """Quick statistics data schema"""
    model_config = ConfigDict(from_attributes=True)

    daily_average_traffic: str = Field(..., description="Daily average traffic")
    daily_average_traffic_bytes: int = Field(..., description="Daily average in bytes")
    peak_hour: str = Field(..., description="Peak usage hour")
    average_response_time: str = Field(..., description="Average response time")
    success_rate: str = Field(..., description="Success rate percentage")
    security_score: str = Field(..., description="Security score")


class ReportsData(BaseModel):
    """Main reports data response schema"""
    model_config = ConfigDict(from_attributes=True)

    traffic_stats: TrafficStatsData
    system_stats: SystemStatsData
    security_stats: SecurityStatsData
    uptime_stats: UptimeStatsData
    quick_stats: QuickStatsData
    port_statistics: List[PortStatisticData]
    last_updated: datetime = Field(..., description="Last update timestamp")


class SecurityReportData(BaseModel):
    """Security report response schema"""
    model_config = ConfigDict(from_attributes=True)

    attack_attempts: int
    blocked_ips: int
    top_attack_sources: List[Dict[str, Any]]
    attack_types: List[Dict[str, Any]]
    blocked_countries: List[Dict[str, Any]]
    threat_level_distribution: List[Dict[str, Any]]
    security_events_timeline: List[Dict[str, Any]]

    # PC-to-PC specific security data
    pc_to_pc_threats: int = Field(default=0, description="PC-to-PC related threats")
    internet_sharing_security_events: int = Field(default=0, description="Internet sharing security events")


class SystemReportData(BaseModel):
    """System report response schema"""
    model_config = ConfigDict(from_attributes=True)

    cpu_usage: float
    memory_usage: float
    disk_usage: float
    network_usage: Dict[str, float]
    system_health: str
    active_connections: int
    uptime_seconds: int

    # Performance trends
    cpu_trend: List[Dict[str, Any]] = Field(default_factory=list)
    memory_trend: List[Dict[str, Any]] = Field(default_factory=list)
    network_trend: List[Dict[str, Any]] = Field(default_factory=list)

    # PC-to-PC system metrics
    pc_to_pc_active: bool = Field(default=False, description="PC-to-PC sharing active")
    shared_connections: int = Field(default=0, description="Shared internet connections")


class TrafficReportData(BaseModel):
    """Traffic report response schema"""
    model_config = ConfigDict(from_attributes=True)

    total_bandwidth: str
    peak_usage: str
    average_usage: str
    top_protocols: List[Dict[str, Any]]
    traffic_by_hour: List[Dict[str, Any]]

    # PC-to-PC traffic analysis
    pc_to_pc_traffic_percentage: float = Field(default=0.0, description="PC-to-PC traffic percentage")
    internet_sharing_bandwidth: str = Field(default="0 MB", description="Internet sharing bandwidth")
    shared_data_volume: str = Field(default="0 MB", description="Total shared data volume")

    # Interface breakdown
    interface_statistics: List[Dict[str, Any]] = Field(default_factory=list)
    wan_interface_usage: Dict[str, Any] = Field(default_factory=dict)
    lan_interface_usage: Dict[str, Any] = Field(default_factory=dict)


class PerformanceReportData(BaseModel):
    """Performance report response schema"""
    model_config = ConfigDict(from_attributes=True)

    # System performance
    avg_cpu_usage: float
    avg_memory_usage: float
    avg_disk_usage: float
    network_throughput: float

    # Response times
    avg_response_time_ms: float
    p95_response_time_ms: float
    p99_response_time_ms: float

    # Connection metrics
    max_concurrent_connections: int
    avg_concurrent_connections: float
    connection_success_rate: float

    # PC-to-PC performance
    pc_to_pc_latency_ms: Optional[float] = Field(None, description="PC-to-PC connection latency")
    internet_sharing_efficiency: Optional[float] = Field(None, description="Internet sharing efficiency percentage")


class ReportResponse(BaseModel):
    """Individual report response schema"""
    model_config = ConfigDict(from_attributes=True)

    success: bool = True
    report_id: str = Field(..., description="Unique report identifier")
    report_name: str = Field(..., description="Report display name")
    report_type: ReportType = Field(..., description="Report type")
    status: ReportStatus = Field(..., description="Report generation status")
    format: ReportFormat = Field(..., description="Report format")

    # Generation details
    generated_at: Optional[datetime] = Field(None, description="Generation completion time")
    generation_time_seconds: Optional[float] = Field(None, description="Time taken to generate")
    file_size_bytes: Optional[int] = Field(None, description="Report file size")

    # Data details
    data_start_date: datetime = Field(..., description="Report data start date")
    data_end_date: datetime = Field(..., description="Report data end date")
    data_points_count: Optional[int] = Field(None, description="Number of data points")

    # Download information
    download_url: Optional[str] = Field(None, description="Download URL")
    expires_at: Optional[datetime] = Field(None, description="Download expiration")
    download_count: int = Field(default=0, description="Number of downloads")

    # Content summary
    summary: Dict[str, Any] = Field(default_factory=dict, description="Report summary")
    filters_applied: Dict[str, Any] = Field(default_factory=dict, description="Applied filters")

    # Error information
    error_message: Optional[str] = Field(None, description="Error message if generation failed")


class ReportListResponse(PaginatedResponse):
    """Report list response schema"""
    data: List[ReportResponse]


class AnalyticsChartData(BaseModel):
    """Analytics chart data schema"""
    model_config = ConfigDict(from_attributes=True)

    chart_type: str = Field(..., description="Chart type (line, bar, pie, area)")
    title: str = Field(..., description="Chart title")
    labels: List[str] = Field(..., description="Chart labels")
    datasets: List[Dict[str, Any]] = Field(..., description="Chart datasets")
    options: Dict[str, Any] = Field(default_factory=dict, description="Chart options")


class AnalyticsResponse(BaseModel):
    """Analytics data response schema"""
    model_config = ConfigDict(from_attributes=True)

    success: bool = True
    time_range: str = Field(..., description="Analytics time range")
    granularity: str = Field(..., description="Data granularity")

    # Traffic analytics
    traffic_overview: Dict[str, Any] = Field(default_factory=dict)
    bandwidth_utilization: List[Dict[str, Any]] = Field(default_factory=list)
    protocol_distribution: List[Dict[str, Any]] = Field(default_factory=list)

    # PC-to-PC analytics
    pc_to_pc_metrics: Dict[str, Any] = Field(default_factory=dict)
    internet_sharing_stats: Dict[str, Any] = Field(default_factory=dict)
    connection_sharing_timeline: List[Dict[str, Any]] = Field(default_factory=list)

    # Performance analytics
    system_performance: Dict[str, Any] = Field(default_factory=dict)
    network_performance: Dict[str, Any] = Field(default_factory=dict)

    # Security analytics
    security_events: List[Dict[str, Any]] = Field(default_factory=list)
    threat_analysis: Dict[str, Any] = Field(default_factory=dict)

    # Charts data
    charts: List[AnalyticsChartData] = Field(default_factory=list)

    # Metadata
    generated_at: datetime = Field(default_factory=datetime.utcnow)
    data_points_count: int = Field(default=0)


class ReportTemplateResponse(BaseModel):
    """Report template response schema"""
    model_config = ConfigDict(from_attributes=True)

    template_id: str = Field(..., description="Template identifier")
    template_name: str = Field(..., description="Template name")
    display_name: str = Field(..., description="Display name")
    description: Optional[str] = Field(None, description="Template description")
    template_type: ReportType = Field(..., description="Template type")

    # Template configuration
    fields: List[str] = Field(..., description="Available fields")
    default_filters: Dict[str, Any] = Field(default_factory=dict)
    supported_formats: List[ReportFormat] = Field(..., description="Supported export formats")

    # Template metadata
    version: int = Field(..., description="Template version")
    is_default: bool = Field(..., description="Is default template")
    is_active: bool = Field(..., description="Template is active")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: Optional[datetime] = Field(None, description="Last update timestamp")


class ReportTemplateListResponse(ResponseModel):
    """Report template list response schema"""
    data: List[ReportTemplateResponse]


class ReportScheduleResponse(BaseModel):
    """Report schedule response schema"""
    model_config = ConfigDict(from_attributes=True)

    schedule_id: str = Field(..., description="Schedule identifier")
    schedule_name: str = Field(..., description="Schedule name")
    description: Optional[str] = Field(None, description="Schedule description")
    enabled: bool = Field(..., description="Schedule is active")

    # Schedule configuration
    report_type: ReportType = Field(..., description="Report type")
    format: ReportFormat = Field(..., description="Output format")
    frequency: ReportFrequency = Field(..., description="Schedule frequency")
    time_of_day: str = Field(..., description="Execution time")

    # Execution status
    next_run: Optional[datetime] = Field(None, description="Next execution time")
    last_run: Optional[datetime] = Field(None, description="Last execution time")
    last_status: Optional[ReportStatus] = Field(None, description="Last execution status")
    run_count: int = Field(default=0, description="Successful executions count")
    failure_count: int = Field(default=0, description="Failed executions count")

    # Metadata
    created_by: str = Field(..., description="User who created schedule")
    created_at: datetime = Field(..., description="Creation timestamp")


class ReportScheduleListResponse(ResponseModel):
    """Report schedule list response schema"""
    data: List[ReportScheduleResponse]


class ReportStatisticsResponse(ResponseModel):
    """Report statistics response schema"""
    data: Dict[str, Any] = Field(..., description="Statistics data")

    class Config:
        schema_extra = {
            "example": {
                "success": True,
                "data": {
                    "total_reports": 145,
                    "reports_this_month": 32,
                    "most_popular_type": "security",
                    "most_popular_format": "pdf",
                    "avg_generation_time": 12.5,
                    "storage_used_mb": 1245.8,
                    "reports_by_type": {
                        "security": 45,
                        "traffic": 38,
                        "system": 35,
                        "performance": 27
                    },
                    "success_rate": 98.5,
                    "pc_to_pc_reports": 23,
                    "internet_sharing_reports": 18
                }
            }
        }


# =============================================================================
# SPECIALIZED REQUEST/RESPONSE SCHEMAS
# =============================================================================

class ReportComparisonRequest(BaseModel):
    """Request schema for comparing reports"""
    model_config = ConfigDict(from_attributes=True)

    base_report_id: str = Field(..., description="Base report for comparison")
    compare_report_ids: List[str] = Field(..., min_items=1, max_items=5, description="Reports to compare with")
    comparison_metrics: List[str] = Field(..., description="Metrics to compare")
    include_variance_analysis: bool = Field(default=True, description="Include variance analysis")


class ReportComparisonResponse(ResponseModel):
    """Response schema for report comparisons"""
    data: Dict[str, Any] = Field(..., description="Comparison results")


class ReportInsightsRequest(BaseModel):
    """Request schema for generating report insights"""
    model_config = ConfigDict(from_attributes=True)

    report_id: str = Field(..., description="Report ID for insights generation")
    insight_types: List[str] = Field(..., description="Types of insights to generate")
    include_recommendations: bool = Field(default=True, description="Include recommendations")

    # PC-to-PC specific insights
    analyze_pc_to_pc_patterns: bool = Field(default=True, description="Analyze PC-to-PC usage patterns")
    analyze_internet_sharing_efficiency: bool = Field(default=True, description="Analyze internet sharing efficiency")


class ReportInsightsResponse(ResponseModel):
    """Response schema for report insights"""
    data: Dict[str, Any] = Field(..., description="Generated insights")


class HealthCheckReportResponse(ResponseModel):
    """Health check response for reports module"""
    data: Dict[str, Any] = Field(..., description="Reports module health status")

    class Config:
        schema_extra = {
            "example": {
                "success": True,
                "data": {
                    "module_status": "healthy",
                    "database_connection": "connected",
                    "active_reports": 3,
                    "pending_reports": 1,
                    "failed_reports": 0,
                    "storage_available_mb": 2048,
                    "last_successful_generation": "2024-01-15T10:30:00Z",
                    "pc_to_pc_monitoring": True,
                    "internet_sharing_analytics": True
                }
            }
        }


# =============================================================================
# ERROR RESPONSE SCHEMAS
# =============================================================================

class ReportGenerationError(ErrorResponse):
    """Report generation error response"""
    error_code: str = Field(..., description="Specific error code")
    retry_after: Optional[int] = Field(None, description="Retry after seconds")
    max_retries_exceeded: bool = Field(default=False, description="Maximum retries exceeded")


class ReportNotFoundError(ErrorResponse):
    """Report not found error response"""
    report_id: str = Field(..., description="Report ID that was not found")
    suggestions: List[str] = Field(default_factory=list, description="Suggested alternatives")


class ReportPermissionError(ErrorResponse):
    """Report permission error response"""
    required_permission: str = Field(..., description="Required permission")
    user_permissions: List[str] = Field(..., description="User's current permissions")


# =============================================================================
# VALIDATION UTILITIES
# =============================================================================

def validate_report_date_range(start_date: datetime, end_date: datetime) -> bool:
    """Validate report date range"""
    if start_date >= end_date:
        raise ValueError("End date must be after start date")

    from datetime import timedelta
    max_range = timedelta(days=365)
    if (end_date - start_date) > max_range:
        raise ValueError("Date range cannot exceed 365 days")

    if start_date > datetime.utcnow():
        raise ValueError("Start date cannot be in the future")

    return True


def validate_report_filters(filters: Dict[str, Any]) -> Dict[str, Any]:
    """Validate and sanitize report filters"""
    cleaned_filters = {}

    for key, value in filters.items():
        if value is not None and value != "":
            # Validate IP addresses
            if key in ['source_ip', 'destination_ip'] and value:
                try:
                    import ipaddress
                    ipaddress.ip_address(value)
                    cleaned_filters[key] = value
                except ValueError:
                    raise ValueError(f"Invalid IP address format: {value}")

            # Validate port numbers
            elif key in ['source_port', 'destination_port'] and value:
                try:
                    port = int(value)
                    if 1 <= port <= 65535:
                        cleaned_filters[key] = port
                    else:
                        raise ValueError(f"Port must be between 1 and 65535: {port}")
                except ValueError:
                    raise ValueError(f"Invalid port number: {value}")

            # Other filters
            else:
                cleaned_filters[key] = value

    return cleaned_filters


# Export all schemas
__all__ = [
    # Request schemas
    'ReportGenerateRequest', 'ReportFilterRequest', 'ReportExportRequest',
    'ReportScheduleRequest', 'ReportAnalyticsRequest', 'ReportComparisonRequest',
    'ReportInsightsRequest',

    # Response data schemas
    'TrafficStatsData', 'SystemStatsData', 'SecurityStatsData', 'UptimeStatsData',
    'PortStatisticData', 'QuickStatsData', 'ReportsData', 'SecurityReportData',
    'SystemReportData', 'TrafficReportData', 'PerformanceReportData',

    # Response schemas
    'ReportResponse', 'ReportListResponse', 'AnalyticsResponse', 'ReportTemplateResponse',
    'ReportTemplateListResponse', 'ReportScheduleResponse', 'ReportScheduleListResponse',
    'ReportStatisticsResponse', 'ReportComparisonResponse', 'ReportInsightsResponse',
    'HealthCheckReportResponse',

    # Error schemas
    'ReportGenerationError', 'ReportNotFoundError', 'ReportPermissionError',

    # Validation utilities
    'validate_report_date_range', 'validate_report_filters'
]