"""
Reports Models - Enhanced report generation and analytics models
PC-to-PC Internet Sharing optimized for KOBI Firewall
Compatible with existing backend structure and MongoDB integration
"""
from datetime import datetime
from typing import Optional, List, Dict, Any, Union
from enum import Enum
from pydantic import BaseModel, Field, validator, ConfigDict
from bson import ObjectId

# Import base components from existing models
from .models import PyObjectId, BaseDbModel


# =============================================================================
# REPORTS ENUMS
# =============================================================================

class ReportType(str, Enum):
    """Report type enumeration"""
    SECURITY = "security"
    TRAFFIC = "traffic"
    SYSTEM = "system"
    PERFORMANCE = "performance"
    NETWORK = "network"
    FIREWALL = "firewall"
    CUSTOM = "custom"
    FULL = "full"


class ReportStatus(str, Enum):
    """Report generation status"""
    PENDING = "pending"
    GENERATING = "generating"
    COMPLETED = "completed"
    FAILED = "failed"
    SCHEDULED = "scheduled"
    EXPIRED = "expired"


class ReportFormat(str, Enum):
    """Report export formats"""
    PDF = "pdf"
    CSV = "csv"
    JSON = "json"
    EXCEL = "excel"
    HTML = "html"


class ReportFrequency(str, Enum):
    """Report schedule frequency"""
    HOURLY = "hourly"
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    YEARLY = "yearly"
    CUSTOM = "custom"


class TrafficDirection(str, Enum):
    """PC-to-PC Traffic direction"""
    INBOUND = "inbound"
    OUTBOUND = "outbound"
    INTERNAL = "internal"
    EXTERNAL = "external"
    PC_TO_PC = "pc_to_pc"
    INTERNET_SHARING = "internet_sharing"


class SecurityThreatLevel(str, Enum):
    """Security threat levels"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class MetricType(str, Enum):
    """Performance metric types"""
    CPU_USAGE = "cpu_usage"
    MEMORY_USAGE = "memory_usage"
    DISK_USAGE = "disk_usage"
    NETWORK_USAGE = "network_usage"
    BANDWIDTH_USAGE = "bandwidth_usage"
    CONNECTION_COUNT = "connection_count"
    PACKET_COUNT = "packet_count"
    ERROR_RATE = "error_rate"
    RESPONSE_TIME = "response_time"


# =============================================================================
# REPORTS CONFIGURATION MODELS
# =============================================================================

class ReportsConfig(BaseDbModel):
    """Main reports configuration model"""
    enabled: bool = Field(default=True, description="Reports module enabled")
    auto_generation: bool = Field(default=True, description="Automatic report generation")
    retention_days: int = Field(default=90, ge=1, le=365, description="Report retention period in days")
    export_formats: List[ReportFormat] = Field(
        default_factory=lambda: [ReportFormat.PDF, ReportFormat.CSV, ReportFormat.JSON])
    dashboard_refresh_interval: int = Field(default=5, ge=1, le=60, description="Dashboard refresh interval in minutes")
    max_concurrent_reports: int = Field(default=5, ge=1, le=20, description="Maximum concurrent report generation")
    default_timezone: str = Field(default="Europe/Istanbul", description="Default timezone for reports")

    # PC-to-PC specific settings
    pc_to_pc_monitoring: bool = Field(default=True, description="Enable PC-to-PC traffic monitoring")
    internet_sharing_analytics: bool = Field(default=True, description="Enable internet sharing analytics")

    # Performance settings
    max_data_points: int = Field(default=10000, ge=100, le=100000, description="Maximum data points per report")
    compression_enabled: bool = Field(default=True, description="Enable report compression")

    # Security settings
    encrypt_reports: bool = Field(default=False, description="Encrypt sensitive reports")
    access_control_enabled: bool = Field(default=True, description="Enable report access control")


class ReportTemplate(BaseDbModel):
    """Report template model for predefined report structures"""
    template_name: str = Field(..., min_length=1, max_length=100, description="Unique template name")
    display_name: str = Field(..., min_length=1, max_length=200, description="Human readable template name")
    description: Optional[str] = Field(None, max_length=1000, description="Template description")
    template_type: ReportType = Field(..., description="Type of report template")

    # Template structure
    fields: List[str] = Field(default_factory=list, description="Fields to include in report")
    filters: Dict[str, Any] = Field(default_factory=dict, description="Default filters for template")
    charts: List[Dict[str, Any]] = Field(default_factory=list, description="Chart configurations")
    layout: Dict[str, Any] = Field(default_factory=dict, description="Report layout configuration")

    # Template metadata
    version: int = Field(default=1, ge=1, description="Template version")
    is_default: bool = Field(default=False, description="Is default template for type")
    is_active: bool = Field(default=True, description="Template is active")

    # Access control
    required_permissions: List[str] = Field(default_factory=list, description="Required permissions to use template")

    @validator('template_name')
    def validate_template_name(cls, v):
        if not v.replace('_', '').replace('-', '').isalnum():
            raise ValueError('Template name must contain only alphanumeric characters, hyphens, and underscores')
        return v.lower()


# =============================================================================
# GENERATED REPORTS MODELS
# =============================================================================

class GeneratedReport(BaseDbModel):
    """Generated report model for tracking report generation and storage"""
    report_id: str = Field(..., description="Unique report identifier")
    report_name: str = Field(..., min_length=1, max_length=200, description="Report display name")
    report_type: ReportType = Field(..., description="Type of generated report")
    template_id: Optional[str] = Field(None, description="Template used for generation")

    # Generation details
    status: ReportStatus = Field(default=ReportStatus.PENDING, description="Report generation status")
    format: ReportFormat = Field(..., description="Report output format")
    size_bytes: Optional[int] = Field(None, ge=0, description="Report file size in bytes")

    # Time parameters
    start_date: datetime = Field(..., description="Report data start date")
    end_date: datetime = Field(..., description="Report data end date")
    generated_at: Optional[datetime] = Field(None, description="Report generation completion time")
    expires_at: Optional[datetime] = Field(None, description="Report expiration time")

    # Generation metadata
    generated_by: str = Field(..., description="User ID who generated the report")
    generation_time_seconds: Optional[float] = Field(None, ge=0, description="Time taken to generate report")
    data_points_count: Optional[int] = Field(None, ge=0, description="Number of data points in report")

    # File storage
    file_path: Optional[str] = Field(None, description="Report file storage path")
    file_url: Optional[str] = Field(None, description="Report download URL")
    checksum: Optional[str] = Field(None, description="Report file checksum")

    # Report content summary
    summary: Dict[str, Any] = Field(default_factory=dict, description="Report content summary")
    filters_applied: Dict[str, Any] = Field(default_factory=dict, description="Filters applied during generation")

    # Error handling
    error_message: Optional[str] = Field(None, description="Error message if generation failed")
    retry_count: int = Field(default=0, ge=0, description="Number of generation retries")

    # Access tracking
    download_count: int = Field(default=0, ge=0, description="Number of times report was downloaded")
    last_accessed: Optional[datetime] = Field(None, description="Last access time")

    @validator('report_id')
    def validate_report_id(cls, v):
        if len(v) < 8:
            raise ValueError('Report ID must be at least 8 characters long')
        return v


class ReportSchedule(BaseDbModel):
    """Report schedule model for automated report generation"""
    schedule_name: str = Field(..., min_length=1, max_length=100, description="Schedule name")
    description: Optional[str] = Field(None, max_length=500, description="Schedule description")

    # Schedule configuration
    enabled: bool = Field(default=True, description="Schedule is active")
    report_type: ReportType = Field(..., description="Type of report to generate")
    template_id: Optional[str] = Field(None, description="Template to use for generation")
    format: ReportFormat = Field(default=ReportFormat.PDF, description="Output format")

    # Timing configuration
    frequency: ReportFrequency = Field(..., description="Schedule frequency")
    time_of_day: str = Field(..., regex=r'^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$', description="Time to run (HH:MM)")
    days_of_week: List[int] = Field(default_factory=list, description="Days of week (0=Monday, 6=Sunday)")
    day_of_month: Optional[int] = Field(None, ge=1, le=31, description="Day of month for monthly schedules")

    # Report parameters
    data_range_days: int = Field(default=7, ge=1, le=365, description="Days of data to include")
    filters: Dict[str, Any] = Field(default_factory=dict, description="Filters to apply")

    # Execution tracking
    next_run: Optional[datetime] = Field(None, description="Next scheduled execution time")
    last_run: Optional[datetime] = Field(None, description="Last execution time")
    last_status: Optional[ReportStatus] = Field(None, description="Status of last execution")
    run_count: int = Field(default=0, ge=0, description="Number of successful executions")
    failure_count: int = Field(default=0, ge=0, description="Number of failed executions")

    # Notification settings
    notify_on_completion: bool = Field(default=False, description="Send notification when report is ready")
    notification_emails: List[str] = Field(default_factory=list, description="Email addresses for notifications")

    # Access control
    created_by: str = Field(..., description="User ID who created the schedule")
    shared_with: List[str] = Field(default_factory=list, description="User IDs with access to scheduled reports")

    @validator('days_of_week', each_item=True)
    def validate_days_of_week(cls, v):
        if not 0 <= v <= 6:
            raise ValueError('Day of week must be between 0 (Monday) and 6 (Sunday)')
        return v


# =============================================================================
# ANALYTICS DATA MODELS
# =============================================================================

class TrafficAnalytics(BaseDbModel):
    """Traffic analytics model for PC-to-PC internet sharing monitoring"""
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Data collection timestamp")

    # Interface information
    interface: str = Field(..., description="Network interface name")
    interface_type: str = Field(..., description="Interface type (wan, lan, etc.)")

    # Traffic data
    bytes_in: int = Field(default=0, ge=0, description="Incoming bytes")
    bytes_out: int = Field(default=0, ge=0, description="Outgoing bytes")
    packets_in: int = Field(default=0, ge=0, description="Incoming packets")
    packets_out: int = Field(default=0, ge=0, description="Outgoing packets")

    # Protocol breakdown
    tcp_bytes: int = Field(default=0, ge=0, description="TCP traffic bytes")
    udp_bytes: int = Field(default=0, ge=0, description="UDP traffic bytes")
    icmp_bytes: int = Field(default=0, ge=0, description="ICMP traffic bytes")
    other_bytes: int = Field(default=0, ge=0, description="Other protocol bytes")

    # Connection tracking
    active_connections: int = Field(default=0, ge=0, description="Active connections count")
    new_connections: int = Field(default=0, ge=0, description="New connections in period")
    closed_connections: int = Field(default=0, ge=0, description="Closed connections in period")

    # PC-to-PC specific metrics
    pc_to_pc_traffic: bool = Field(default=False, description="Traffic is PC-to-PC")
    internet_sharing_active: bool = Field(default=False, description="Internet sharing is active")
    shared_connections: int = Field(default=0, ge=0, description="Shared internet connections")

    # Quality metrics
    errors: int = Field(default=0, ge=0, description="Error count")
    drops: int = Field(default=0, ge=0, description="Dropped packets")
    retransmissions: int = Field(default=0, ge=0, description="TCP retransmissions")
    latency_ms: Optional[float] = Field(None, ge=0, description="Average latency in milliseconds")

    # Bandwidth utilization
    bandwidth_utilization_percent: Optional[float] = Field(None, ge=0, le=100,
                                                           description="Bandwidth utilization percentage")
    peak_bandwidth_bps: Optional[int] = Field(None, ge=0, description="Peak bandwidth in bits per second")

    # Geographic and source data
    source_ips: List[str] = Field(default_factory=list, description="Source IP addresses")
    destination_ips: List[str] = Field(default_factory=list, description="Destination IP addresses")
    countries: List[str] = Field(default_factory=list, description="Countries involved in traffic")

    # Aggregation metadata
    aggregation_period: str = Field(default="5m", description="Data aggregation period")
    sample_count: int = Field(default=1, ge=1, description="Number of samples aggregated")


class SecurityEvent(BaseDbModel):
    """Security event model for security reporting and analysis"""
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Event timestamp")

    # Event classification
    event_type: str = Field(..., description="Type of security event")
    threat_level: SecurityThreatLevel = Field(..., description="Threat severity level")
    category: str = Field(..., description="Event category")

    # Event details
    title: str = Field(..., min_length=1, max_length=200, description="Event title")
    description: str = Field(..., min_length=1, max_length=2000, description="Event description")
    recommendation: Optional[str] = Field(None, max_length=1000, description="Recommended action")

    # Network context
    source_ip: Optional[str] = Field(None, description="Source IP address")
    destination_ip: Optional[str] = Field(None, description="Destination IP address")
    source_port: Optional[int] = Field(None, ge=1, le=65535, description="Source port")
    destination_port: Optional[int] = Field(None, ge=1, le=65535, description="Destination port")
    protocol: Optional[str] = Field(None, description="Network protocol")

    # Attack information
    attack_vector: Optional[str] = Field(None, description="Attack method/vector")
    attack_signature: Optional[str] = Field(None, description="Attack signature or pattern")
    confidence_score: Optional[float] = Field(None, ge=0, le=1, description="Detection confidence (0-1)")

    # Impact assessment
    potential_impact: Optional[str] = Field(None, description="Potential impact description")
    affected_assets: List[str] = Field(default_factory=list, description="Affected system assets")

    # Response tracking
    blocked: bool = Field(default=False, description="Attack was blocked")
    response_action: Optional[str] = Field(None, description="Response action taken")
    auto_response: bool = Field(default=False, description="Automatic response was triggered")

    # Investigation details
    investigated: bool = Field(default=False, description="Event has been investigated")
    investigated_by: Optional[str] = Field(None, description="User who investigated")
    investigation_notes: Optional[str] = Field(None, description="Investigation findings")
    false_positive: bool = Field(default=False, description="Marked as false positive")

    # Reference data
    rule_id: Optional[str] = Field(None, description="Firewall rule ID")
    log_entries: List[str] = Field(default_factory=list, description="Related log entry IDs")
    external_references: List[str] = Field(default_factory=list, description="External threat intelligence references")

    # PC-to-PC context
    pc_to_pc_related: bool = Field(default=False, description="Event related to PC-to-PC traffic")
    internet_sharing_related: bool = Field(default=False, description="Event related to internet sharing")


class PerformanceMetric(BaseDbModel):
    """Performance metric model for system performance tracking"""
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Metric collection timestamp")

    # Metric identification
    metric_type: MetricType = Field(..., description="Type of performance metric")
    source: str = Field(..., description="Metric source (system, interface, process, etc.)")
    component: Optional[str] = Field(None, description="System component being measured")

    # Metric values
    value: float = Field(..., description="Primary metric value")
    unit: str = Field(..., description="Metric unit (%, MB, count, etc.)")
    min_value: Optional[float] = Field(None, description="Minimum value in period")
    max_value: Optional[float] = Field(None, description="Maximum value in period")
    avg_value: Optional[float] = Field(None, description="Average value in period")

    # Threshold monitoring
    threshold_warning: Optional[float] = Field(None, description="Warning threshold value")
    threshold_critical: Optional[float] = Field(None, description="Critical threshold value")
    threshold_exceeded: bool = Field(default=False, description="Threshold was exceeded")

    # Context data
    context: Dict[str, Any] = Field(default_factory=dict, description="Additional context data")
    tags: List[str] = Field(default_factory=list, description="Metric tags for categorization")

    # System information
    cpu_cores: Optional[int] = Field(None, description="Number of CPU cores")
    total_memory_mb: Optional[int] = Field(None, description="Total system memory in MB")
    total_disk_gb: Optional[int] = Field(None, description="Total disk space in GB")

    # Network performance (PC-to-PC specific)
    network_interface: Optional[str] = Field(None, description="Network interface for network metrics")
    connection_count: Optional[int] = Field(None, description="Active network connections")
    bandwidth_usage_percent: Optional[float] = Field(None, ge=0, le=100, description="Bandwidth utilization percentage")

    # Aggregation metadata
    aggregation_period: str = Field(default="1m", description="Data aggregation period")
    sample_count: int = Field(default=1, ge=1, description="Number of samples in aggregation")
    collection_method: str = Field(default="automatic", description="How metric was collected")


# =============================================================================
# REPORT HISTORY AND AUDIT MODELS
# =============================================================================

class ReportHistory(BaseDbModel):
    """Report history model for audit trail and tracking"""
    report_id: str = Field(..., description="Generated report ID")
    action: str = Field(..., description="Action performed (generated, downloaded, deleted, etc.)")
    user_id: str = Field(..., description="User who performed the action")

    # Action details
    action_timestamp: datetime = Field(default_factory=datetime.utcnow, description="When action was performed")
    ip_address: Optional[str] = Field(None, description="User IP address")
    user_agent: Optional[str] = Field(None, description="User agent string")

    # Action context
    details: Dict[str, Any] = Field(default_factory=dict, description="Additional action details")
    status: str = Field(default="success", description="Action status")
    error_message: Optional[str] = Field(None, description="Error message if action failed")

    # Audit metadata
    session_id: Optional[str] = Field(None, description="User session ID")
    request_id: Optional[str] = Field(None, description="Request identifier")


# =============================================================================
# DASHBOARD STATISTICS MODELS
# =============================================================================

class ReportStatistics(BaseDbModel):
    """Report statistics model for dashboard and monitoring"""
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Statistics collection time")
    period: str = Field(..., description="Statistics period (hour, day, week, month)")

    # Generation statistics
    total_reports: int = Field(default=0, ge=0, description="Total reports generated")
    successful_reports: int = Field(default=0, ge=0, description="Successfully generated reports")
    failed_reports: int = Field(default=0, ge=0, description="Failed report generations")
    pending_reports: int = Field(default=0, ge=0, description="Pending report generations")

    # Performance statistics
    avg_generation_time: Optional[float] = Field(None, ge=0, description="Average generation time in seconds")
    total_data_processed: Optional[int] = Field(None, ge=0, description="Total data points processed")
    storage_used_mb: Optional[float] = Field(None, ge=0, description="Storage used by reports in MB")

    # Usage statistics
    total_downloads: int = Field(default=0, ge=0, description="Total report downloads")
    unique_users: int = Field(default=0, ge=0, description="Unique users generating reports")
    most_popular_type: Optional[ReportType] = Field(None, description="Most popular report type")
    most_popular_format: Optional[ReportFormat] = Field(None, description="Most popular export format")

    # Type breakdown
    reports_by_type: Dict[str, int] = Field(default_factory=dict, description="Report count by type")
    reports_by_format: Dict[str, int] = Field(default_factory=dict, description="Report count by format")

    # Error analysis
    error_types: Dict[str, int] = Field(default_factory=dict, description="Error count by type")
    retry_rate: Optional[float] = Field(None, ge=0, le=1, description="Report retry rate")

    # System impact
    cpu_usage_during_generation: Optional[float] = Field(None, ge=0, le=100,
                                                         description="CPU usage during report generation")
    memory_usage_during_generation: Optional[float] = Field(None, ge=0,
                                                            description="Memory usage during generation in MB")


# =============================================================================
# EXPORT AND UTILITY MODELS
# =============================================================================

class ReportExportRequest(BaseDbModel):
    """Report export request model for tracking export operations"""
    export_id: str = Field(..., description="Unique export operation ID")
    report_ids: List[str] = Field(..., min_items=1, description="List of report IDs to export")
    format: ReportFormat = Field(..., description="Export format")

    # Export configuration
    include_charts: bool = Field(default=True, description="Include charts in export")
    include_raw_data: bool = Field(default=False, description="Include raw data")
    compress: bool = Field(default=True, description="Compress export file")
    password_protect: bool = Field(default=False, description="Password protect export")

    # Request metadata
    requested_by: str = Field(..., description="User ID who requested export")
    requested_at: datetime = Field(default_factory=datetime.utcnow, description="Export request time")

    # Processing status
    status: ReportStatus = Field(default=ReportStatus.PENDING, description="Export status")
    progress_percent: int = Field(default=0, ge=0, le=100, description="Export progress percentage")
    estimated_completion: Optional[datetime] = Field(None, description="Estimated completion time")

    # Output details
    output_file_path: Optional[str] = Field(None, description="Export file path")
    output_file_size: Optional[int] = Field(None, ge=0, description="Export file size in bytes")
    download_url: Optional[str] = Field(None, description="Download URL for export")
    expires_at: Optional[datetime] = Field(None, description="Export file expiration time")

    # Error handling
    error_message: Optional[str] = Field(None, description="Error message if export failed")
    retry_count: int = Field(default=0, ge=0, description="Number of export retries")


# =============================================================================
# VALIDATION HELPERS
# =============================================================================

def validate_date_range(start_date: datetime, end_date: datetime) -> bool:
    """Validate that end_date is after start_date and within reasonable limits"""
    if start_date >= end_date:
        raise ValueError("End date must be after start date")

    # Check for reasonable date range (max 1 year)
    max_range = timedelta(days=365)
    if (end_date - start_date) > max_range:
        raise ValueError("Date range cannot exceed 365 days")

    return True


def validate_filter_params(filters: Dict[str, Any]) -> Dict[str, Any]:
    """Validate and sanitize filter parameters"""
    # Remove None values and empty strings
    cleaned_filters = {k: v for k, v in filters.items() if v is not None and v != ""}

    # Validate IP addresses if present
    for key in ['source_ip', 'destination_ip']:
        if key in cleaned_filters:
            ip_value = cleaned_filters[key]
            try:
                import ipaddress
                ipaddress.ip_address(ip_value)
            except ValueError:
                raise ValueError(f"Invalid IP address format: {ip_value}")

    return cleaned_filters


# Export all models
__all__ = [
    # Enums
    'ReportType', 'ReportStatus', 'ReportFormat', 'ReportFrequency',
    'TrafficDirection', 'SecurityThreatLevel', 'MetricType',
    # Configuration models
    'ReportsConfig', 'ReportTemplate',
    # Generation models
    'GeneratedReport', 'ReportSchedule',
    # Analytics models
    'TrafficAnalytics', 'SecurityEvent', 'PerformanceMetric',
    # Audit models
    'ReportHistory', 'ReportStatistics',
    # Export models
    'ReportExportRequest',
    # Validation helpers
    'validate_date_range', 'validate_filter_params'
]