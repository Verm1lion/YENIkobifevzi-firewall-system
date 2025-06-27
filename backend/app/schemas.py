"""
Request/Response schemas for API endpoints using Pydantic v2
Enhanced with Settings Management schemas and Network Interface Management
UPDATED: NAT (Network Address Translation) Schemas Added
UPDATED: Enhanced Log Management Schemas for PC-to-PC Internet Sharing
"""
from datetime import datetime
from typing import Optional, List, Dict, Any, Union
from enum import Enum
from pydantic import BaseModel, Field, validator, ConfigDict
import re

class ResponseModel(BaseModel):
    """Base response model"""
    model_config = ConfigDict(from_attributes=True)
    success: bool = True
    message: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    details: Optional[Dict[str, Any]] = None

class ErrorResponse(ResponseModel):
    """Error response model"""
    success: bool = False
    error_code: Optional[str] = None
    details: Optional[Dict[str, Any]] = None

class PaginatedResponse(ResponseModel):
    """Paginated response model"""
    data: List[Any]
    total: int
    page: int = 1
    per_page: int = 50
    pages: int
    has_next: bool
    has_prev: bool

# Authentication Schemas
class UserRegister(BaseModel):
    """User registration schema"""
    username: str = Field(..., min_length=3, max_length=50)
    email: Optional[str] = Field(None)
    password: str = Field(..., min_length=8, max_length=128)
    confirm_password: str

    @validator('confirm_password')
    def passwords_match(cls, v, values):
        if 'password' in values and v != values['password']:
            raise ValueError('Passwords do not match')
        return v

    @validator('password')
    def validate_password_strength(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        if not any(c.isupper() for c in v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not any(c.islower() for c in v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not any(c.isdigit() for c in v):
            raise ValueError('Password must contain at least one digit')
        return v

class UserLogin(BaseModel):
    """User login schema"""
    username: str = Field(..., min_length=1)
    password: str = Field(..., min_length=1)
    remember_me: bool = False

class UserResponse(BaseModel):
    """User response schema"""
    id: str
    username: str
    email: Optional[str] = None
    role: str
    is_active: bool
    created_at: datetime
    last_login: Optional[datetime] = None
    last_seen: Optional[datetime] = None

class TokenResponse(BaseModel):
    """Token response schema"""
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    refresh_token: Optional[str] = None
    user: UserResponse

class PasswordChange(BaseModel):
    """Password change schema"""
    current_password: str
    new_password: str = Field(..., min_length=8)
    confirm_password: str

    @validator('confirm_password')
    def passwords_match(cls, v, values):
        if 'new_password' in values and v != values['new_password']:
            raise ValueError('Passwords do not match')
        return v

# ===== SETTINGS SCHEMAS - NEWLY ADDED =====
class GeneralSettingsRequest(BaseModel):
    """General settings update request"""
    timezone: Optional[str] = Field(None, description="System timezone")
    language: Optional[str] = Field(None, description="System language")
    sessionTimeout: Optional[int] = Field(None, ge=5, le=480, description="Session timeout in minutes")

class SettingsResponse(BaseModel):
    """Settings response schema"""
    success: bool = True
    data: Dict[str, Any]
    message: Optional[str] = None
    timestamp: Optional[datetime] = Field(default_factory=datetime.utcnow)

class SystemInfoData(BaseModel):
    """System information data schema"""
    version: str
    platform: str
    platformVersion: Optional[str] = None
    uptime: str
    uptimeSeconds: int
    memoryUsage: float
    memoryUsed: float
    memoryTotal: float
    diskUsage: float
    diskUsed: float
    diskTotal: float
    cpuUsage: float
    cpuCores: int

class SystemInfoResponse(BaseModel):
    """System information response schema"""
    success: bool = True
    data: SystemInfoData
    timestamp: Optional[datetime] = Field(default_factory=datetime.utcnow)

class SecurityStatusData(BaseModel):
    """Security status data schema"""
    firewall: Dict[str, str]
    ssl: Dict[str, str]
    lastScan: Dict[str, str]

class SecurityStatusResponse(BaseModel):
    """Security status response schema"""
    success: bool = True
    data: SecurityStatusData
    timestamp: Optional[datetime] = Field(default_factory=datetime.utcnow)

class SystemActionResponse(BaseModel):
    """System action response schema"""
    success: bool = True
    message: str
    data: Optional[Dict[str, Any]] = None
    timestamp: Optional[datetime] = Field(default_factory=datetime.utcnow)

class BackupInfo(BaseModel):
    """Backup information schema"""
    name: str
    path: str
    timestamp: str
    files: List[str]
    size: str

class BackupResponse(BaseModel):
    """Backup operation response schema"""
    success: bool = True
    message: str
    data: Optional[BackupInfo] = None
    timestamp: Optional[datetime] = Field(default_factory=datetime.utcnow)

class UpdateInfo(BaseModel):
    """Update information schema"""
    available: bool
    count: int
    packages: List[str] = Field(default_factory=list)
    lastCheck: str
    currentVersion: Optional[str] = None
    latestVersion: Optional[str] = None
    status: str = "Güncel"

class UpdateCheckResponse(BaseModel):
    """Update check response schema"""
    success: bool = True
    message: str
    data: UpdateInfo
    timestamp: Optional[datetime] = Field(default_factory=datetime.utcnow)

class LogClearInfo(BaseModel):
    """Log clear information schema"""
    deletedLogs: int
    clearedFiles: List[str]
    freedSpace: str

class LogClearResponse(BaseModel):
    """Log clear operation response schema"""
    success: bool = True
    message: str
    data: LogClearInfo
    timestamp: Optional[datetime] = Field(default_factory=datetime.utcnow)

class DataStatusInfo(BaseModel):
    """Data status information schema"""
    persistence: Dict[str, Any]

class DataStatusResponse(BaseModel):
    """Data status response schema"""
    success: bool = True
    data: DataStatusInfo
    timestamp: Optional[datetime] = Field(default_factory=datetime.utcnow)

# ===== SETTINGS CONFIGURATION SCHEMAS =====
class AutoUpdateSettings(BaseModel):
    """Auto update settings schema"""
    enabled: bool = True
    frequency: str = "daily"
    time: str = "02:00"

class SystemFeedbackSettings(BaseModel):
    """System feedback settings schema"""
    enabled: bool = True
    errorReporting: bool = True
    analytics: bool = False

class DarkThemeSettings(BaseModel):
    """Dark theme settings schema"""
    enabled: bool = True
    autoSwitch: bool = False

class BackupSettings(BaseModel):
    """Backup settings schema"""
    frequency: str = "Haftalık"
    location: str = "/opt/firewall/backups"
    retention: int = 30
    autoCleanup: bool = True

class GeneralSettings(BaseModel):
    """General settings schema"""
    timezone: str = "Türkiye (UTC+3)"
    language: str = "Türkçe"
    sessionTimeout: int = 60
    logLevel: str = "Info (Normal)"

class AllSettingsData(BaseModel):
    """All settings data schema"""
    general: GeneralSettings
    autoUpdates: AutoUpdateSettings
    systemFeedback: SystemFeedbackSettings
    darkTheme: DarkThemeSettings
    backup: BackupSettings

# =============================================================================
# NAT (Network Address Translation) Schemas - NEW SECTION
# =============================================================================
class NetworkInterfaceSchema(BaseModel):
    """Network interface schema for NAT configuration"""
    name: str = Field(..., description="Interface name (e.g., eth0, wlan0)")
    display_name: str = Field(..., description="Human readable interface name")
    type: str = Field(..., description="Interface type (ethernet, wireless)")
    status: str = Field(..., description="Interface status (up, down)")
    mac_address: Optional[str] = Field(None, description="MAC address")
    description: Optional[str] = Field(None, description="Interface description")

class NATConfigRequest(BaseModel):
    """NAT configuration request schema"""
    enabled: bool = Field(..., description="Enable/disable NAT")
    wan_interface: str = Field("", description="WAN interface name")
    lan_interface: str = Field("", description="LAN interface name")
    dhcp_range_start: Optional[str] = Field("192.168.100.100", description="DHCP range start IP")
    dhcp_range_end: Optional[str] = Field("192.168.100.200", description="DHCP range end IP")
    gateway_ip: Optional[str] = Field("192.168.100.1", description="Gateway IP address")
    masquerade_enabled: Optional[bool] = Field(True, description="Enable masquerading")

    @validator('wan_interface')
    def validate_wan_interface(cls, v):
        if not v or not isinstance(v, str):
            raise ValueError('WAN interface must be specified')
        if not re.match(r'^[a-zA-Z0-9_-]+$', v):
            raise ValueError('Invalid WAN interface name')
        return v.strip()

    @validator('lan_interface')
    def validate_lan_interface(cls, v):
        if not v or not isinstance(v, str):
            raise ValueError('LAN interface must be specified')
        if not re.match(r'^[a-zA-Z0-9_-]+$', v):
            raise ValueError('Invalid LAN interface name')
        return v.strip()

    @validator('dhcp_range_start', 'dhcp_range_end', 'gateway_ip')
    def validate_ip_address(cls, v):
        if v:
            ip_pattern = r'^(\d{1,3}\.){3}\d{1,3}$'
            if not re.match(ip_pattern, v):
                raise ValueError('Invalid IP address format')
            # Validate IP octets
            octets = v.split('.')
            for octet in octets:
                if not (0 <= int(octet) <= 255):
                    raise ValueError('IP address octets must be between 0 and 255')
        return v

class PCToPCSharingRequest(BaseModel):
    """PC-to-PC internet sharing specific request"""
    wan_interface: str = Field(..., description="Wi-Fi interface for WAN")
    lan_interface: str = Field(..., description="Ethernet interface for LAN")
    dhcp_range_start: Optional[str] = Field("192.168.100.100")
    dhcp_range_end: Optional[str] = Field("192.168.100.200")

    @validator('wan_interface', 'lan_interface')
    def validate_interface_names(cls, v):
        if not v or not isinstance(v, str):
            raise ValueError('Interface name must be specified')
        return v.strip()

class NATConfigResponse(BaseModel):
    """NAT configuration response schema"""
    success: bool
    data: Optional[dict] = None
    message: Optional[str] = None
    errors: Optional[List[str]] = None
    warnings: Optional[List[str]] = None

class NATStatusResponse(BaseModel):
    """NAT status response schema"""
    success: bool
    data: dict
    message: Optional[str] = None

class InterfaceListResponse(BaseModel):
    """Interface list response schema"""
    success: bool
    data: dict = Field(..., description="Contains wan_candidates, lan_candidates, all_interfaces")
    message: Optional[str] = None

class ValidationResponse(BaseModel):
    """Interface validation response"""
    valid: bool
    errors: List[str] = []
    warnings: List[str] = []

# NAT Status Data Schema
class NATStatusData(BaseModel):
    """NAT status data schema"""
    enabled: bool
    status: str = Field(..., description="Status: active, disabled, configured_but_inactive, error")
    wan_interface: str = ""
    lan_interface: str = ""
    gateway_ip: str = "192.168.100.1"
    dhcp_range_start: str = "192.168.100.100"
    dhcp_range_end: str = "192.168.100.200"
    ip_forwarding: bool = False
    masquerade_active: bool = False
    message: str = ""

# Interface List Data Schema
class InterfaceListData(BaseModel):
    """Interface list data schema"""
    wan_candidates: List[NetworkInterfaceSchema] = []
    lan_candidates: List[NetworkInterfaceSchema] = []
    all_interfaces: List[NetworkInterfaceSchema] = []

# PC-to-PC Sharing Response Data
class PCToPCSharingResponseData(BaseModel):
    """PC-to-PC sharing response data schema"""
    success: bool
    wan_interface: str
    lan_interface: str
    gateway_ip: str
    dhcp_range: str
    masquerade_enabled: bool

# Enhanced NAT Configuration Data
class NATConfigData(BaseModel):
    """NAT configuration data schema"""
    enabled: bool = False
    wan_interface: str = ""
    lan_interface: str = ""
    dhcp_range_start: str = "192.168.100.100"
    dhcp_range_end: str = "192.168.100.200"
    gateway_ip: str = "192.168.100.1"
    masquerade_enabled: bool = True
    configuration_type: str = "pc_to_pc_sharing"
    status: str = "Devre Dışı"

# =============================================================================
# ENHANCED LOG MANAGEMENT SCHEMAS - NEW SECTION
# =============================================================================

class LogLevelRequest(str, Enum):
    """Log level request enumeration"""
    DEBUG = "DEBUG"
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"
    CRITICAL = "CRITICAL"
    ALLOW = "ALLOW"
    BLOCK = "BLOCK"
    DENY = "DENY"
    ALL = "ALL"

class LogEventTypeRequest(str, Enum):
    """Log event type request enumeration"""
    TRAFFIC_LOG = "traffic_log"
    PACKET_BLOCKED = "packet_blocked"
    PACKET_ALLOWED = "packet_allowed"
    CONNECTION_ESTABLISHED = "connection_established"
    AUTHENTICATION = "authentication"
    SYSTEM_EVENT = "system_event"
    SECURITY_ALERT = "security_alert"
    MANUAL_LOG = "manual_log"
    INTERFACE_STATS = "interface_stats"
    STATISTICS_UPDATE = "statistics_update"
    ACTIVE_CONNECTION = "active_connection"

class LogFilterRequest(BaseModel):
    """Log filtering request schema"""
    page: int = Field(default=1, ge=1, description="Sayfa numarası")
    per_page: int = Field(default=50, ge=1, le=500, description="Sayfa başına kayıt")
    level: Optional[str] = Field(None, description="Log seviyesi (ALLOW, BLOCK, INFO, etc.)")
    source: Optional[str] = Field(None, description="Log kaynağı")
    source_ip: Optional[str] = Field(None, description="Kaynak IP adresi")
    destination_ip: Optional[str] = Field(None, description="Hedef IP adresi")
    protocol: Optional[str] = Field(None, description="Protokol (TCP, UDP, etc.)")
    search: Optional[str] = Field(None, min_length=2, description="Arama terimi")
    start_date: Optional[str] = Field(None, description="Başlangıç tarihi (ISO format)")
    end_date: Optional[str] = Field(None, description="Bitiş tarihi (ISO format)")
    event_type: Optional[str] = Field(None, description="Olay türü")

class LogSearchRequest(BaseModel):
    """Log search request schema"""
    query: str = Field(..., min_length=2, max_length=200, description="Arama sorgusu")
    search_type: str = Field(default="message", description="Arama türü (message, ip, source, all)")
    limit: int = Field(default=100, ge=1, le=1000, description="Maksimum sonuç sayısı")
    include_metadata: bool = Field(default=False, description="Metadata dahil et")

    @validator('search_type')
    def validate_search_type(cls, v):
        valid_types = ['message', 'ip', 'source', 'all']
        if v not in valid_types:
            raise ValueError(f'Search type must be one of: {valid_types}')
        return v

class LogExportRequest(BaseModel):
    """Log export request schema"""
    format: str = Field(default="json", description="Export formatı (json, csv)")
    start_date: Optional[str] = Field(None, description="Başlangıç tarihi")
    end_date: Optional[str] = Field(None, description="Bitiş tarihi")
    level: Optional[str] = Field(None, description="Log seviyesi filtresi")
    source: Optional[str] = Field(None, description="Kaynak filtresi")
    max_records: int = Field(default=10000, ge=1, le=100000, description="Maksimum kayıt sayısı")
    include_metadata: bool = Field(default=True, description="Metadata dahil et")
    compress: bool = Field(default=False, description="Sıkıştır")

    @validator('format')
    def validate_format(cls, v):
        valid_formats = ['json', 'csv']
        if v.lower() not in valid_formats:
            raise ValueError(f'Format must be one of: {valid_formats}')
        return v.lower()

class ManualLogRequest(BaseModel):
    """Manual log creation request schema"""
    level: str = Field(..., description="Log seviyesi")
    message: str = Field(..., min_length=1, max_length=2000, description="Log mesajı")
    source: str = Field(default="manual", max_length=100, description="Log kaynağı")
    details: Optional[str] = Field(None, max_length=1000, description="Ek detaylar")
    source_ip: Optional[str] = Field(None, description="Kaynak IP (opsiyonel)")
    destination_ip: Optional[str] = Field(None, description="Hedef IP (opsiyonel)")
    protocol: Optional[str] = Field(None, description="Protokol (opsiyonel)")

    @validator('level')
    def validate_level(cls, v):
        valid_levels = ['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL', 'ALLOW', 'BLOCK', 'DENY']
        if v.upper() not in valid_levels:
            raise ValueError(f'Level must be one of: {valid_levels}')
        return v.upper()

    @validator('source_ip', 'destination_ip')
    def validate_ip_address(cls, v):
        if v and v.strip():
            import ipaddress
            try:
                ipaddress.ip_address(v.strip())
            except ValueError:
                raise ValueError(f'Invalid IP address: {v}')
        return v

class LogStatisticsRequest(BaseModel):
    """Log statistics request schema"""
    time_range: str = Field(default="24h", description="Zaman aralığı")
    include_charts: bool = Field(default=True, description="Grafik verileri dahil et")
    include_top_ips: bool = Field(default=True, description="En çok kullanılan IP'leri dahil et")
    include_protocols: bool = Field(default=True, description="Protokol dağılımını dahil et")

    @validator('time_range')
    def validate_time_range(cls, v):
        valid_ranges = ['1h', '24h', '7d', '30d']
        if v not in valid_ranges:
            raise ValueError(f'Time range must be one of: {valid_ranges}')
        return v

class LogEntryResponse(BaseModel):
    """Individual log entry response schema"""
    id: str = Field(..., description="Log girişi ID'si")
    timestamp: datetime = Field(..., description="Zaman damgası")
    level: str = Field(..., description="Log seviyesi")
    source: str = Field(..., description="Log kaynağı")
    message: str = Field(..., description="Log mesajı")
    event_type: str = Field(..., description="Olay türü")

    # Network Information
    source_ip: Optional[str] = Field(None, description="Kaynak IP adresi")
    destination_ip: Optional[str] = Field(None, description="Hedef IP adresi")
    source_port: Optional[int] = Field(None, description="Kaynak port")
    destination_port: Optional[int] = Field(None, description="Hedef port")
    protocol: Optional[str] = Field(None, description="Protokol")

    # Traffic Analysis
    traffic_direction: Optional[str] = Field(None, description="Trafik yönü")
    traffic_type: Optional[str] = Field(None, description="Trafik türü")
    packet_size: Optional[int] = Field(None, description="Paket boyutu")
    action: Optional[str] = Field(None, description="Yapılan işlem")

    # UI Enhancement Fields
    formatted_time: Optional[str] = Field(None, description="Formatlanmış zaman")
    time_ago: Optional[str] = Field(None, description="Zaman farkı (örn: '5 dakika önce')")
    level_info: Optional[Dict[str, Any]] = Field(None, description="Seviye bilgisi (renk, Türkçe)")
    source_info: Optional[Dict[str, Any]] = Field(None, description="Kaynak IP bilgisi")
    destination_info: Optional[Dict[str, Any]] = Field(None, description="Hedef IP bilgisi")
    protocol_info: Optional[Dict[str, Any]] = Field(None, description="Protokol bilgisi")
    port_info: Optional[Dict[str, Any]] = Field(None, description="Port bilgisi")
    display_message: Optional[str] = Field(None, description="Ekran gösterim mesajı")
    action_badge: Optional[Dict[str, str]] = Field(None, description="İşlem rozeti bilgisi")

    # Additional Data
    details: Optional[Dict[str, Any]] = Field(None, description="Ek detaylar")
    parsed_data: Optional[Dict[str, Any]] = Field(None, description="Ayrıştırılmış veri")
    is_suspicious: Optional[bool] = Field(None, description="Şüpheli işaretli mi")
    threat_level: Optional[str] = Field(None, description="Tehdit seviyesi")

class LogStatisticsResponse(BaseModel):
    """Log statistics response schema"""
    success: bool = True
    data: Dict[str, Any] = Field(..., description="İstatistik verileri")
    message: Optional[str] = Field(None, description="İşlem mesajı")

    class Config:
        schema_extra = {
            "example": {
                "success": True,
                "data": {
                    "time_range": "24h",
                    "total_logs": 15847,
                    "blocked_requests": 2,
                    "allowed_requests": 15845,
                    "warning_count": 3,
                    "unique_ips": 25,
                    "level_distribution": [
                        {"level": "ALLOW", "count": 15845, "turkish_name": "İzin Verildi", "color": "green"},
                        {"level": "BLOCK", "count": 2, "turkish_name": "Engellendi", "color": "red"}
                    ]
                }
            }
        }

class LogSearchResponse(BaseModel):
    """Log search response schema"""
    success: bool = True
    search_term: str = Field(..., description="Arama terimi")
    search_type: str = Field(..., description="Arama türü")
    count: int = Field(..., description="Bulunan sonuç sayısı")
    data: List[LogEntryResponse] = Field(..., description="Arama sonuçları")
    message: Optional[str] = Field(None, description="İşlem mesajı")

class SecurityAlertResponse(BaseModel):
    """Enhanced security alert response schema"""
    id: str = Field(..., description="Uyarı ID'si")
    timestamp: datetime = Field(..., description="Oluşturulma zamanı")
    alert_type: str = Field(..., description="Uyarı türü")
    severity: str = Field(..., description="Önem derecesi")
    title: str = Field(..., description="Uyarı başlığı")
    description: str = Field(..., description="Uyarı açıklaması")

    # Network Context
    source_ip: Optional[str] = Field(None, description="Kaynak IP")
    target_ip: Optional[str] = Field(None, description="Hedef IP")
    port: Optional[int] = Field(None, description="Port")
    protocol: Optional[str] = Field(None, description="Protokol")

    # Enhanced Information
    attack_vector: Optional[str] = Field(None, description="Saldırı vektörü")
    threat_category: Optional[str] = Field(None, description="Tehdit kategorisi")
    confidence_score: Optional[float] = Field(None, description="Güven skoru")
    recommendation: Optional[str] = Field(None, description="Önerilen işlem")

    # Status
    acknowledged: bool = Field(..., description="Onaylanmış mı")
    acknowledged_by: Optional[str] = Field(None, description="Onaylayan kullanıcı")
    acknowledged_at: Optional[datetime] = Field(None, description="Onaylanma zamanı")
    resolved: bool = Field(..., description="Çözülmüş mü")
    resolved_at: Optional[datetime] = Field(None, description="Çözülme zamanı")

    # UI Enhancement
    formatted_time: Optional[str] = Field(None, description="Formatlanmış zaman")
    time_ago: Optional[str] = Field(None, description="Zaman farkı")
    severity_info: Optional[Dict[str, str]] = Field(None, description="Önem derecesi bilgisi")

class RealTimeStatsResponse(BaseModel):
    """Real-time statistics response schema"""
    success: bool = True
    data: Dict[str, Any] = Field(..., description="Gerçek zamanlı istatistikler")
    message: Optional[str] = Field(None, description="İşlem mesajı")

    class Config:
        schema_extra = {
            "example": {
                "success": True,
                "data": {
                    "timestamp": "2024-06-26T14:12:34Z",
                    "recent_logs_5min": 125,
                    "recent_blocked_5min": 2,
                    "active_connections": 45,
                    "logs_per_minute": 25.0,
                    "system_status": "active",
                    "total_packets": 150000,
                    "bytes_transferred": 2048576,
                    "unique_ips_count": 25
                }
            }
        }

class TrafficSummaryResponse(BaseModel):
    """Traffic summary response schema"""
    success: bool = True
    data: Dict[str, Any] = Field(..., description="Trafik özet verileri")
    message: Optional[str] = Field(None, description="İşlem mesajı")

    class Config:
        schema_extra = {
            "example": {
                "success": True,
                "data": {
                    "time_range": "24h",
                    "total_flows": 500,
                    "internal_traffic": [],
                    "external_traffic": [],
                    "summary": {
                        "internal_flows": 150,
                        "external_flows": 350,
                        "total_packets": 50000,
                        "total_bytes": 1048576
                    }
                }
            }
        }

class LogLevelInfo(BaseModel):
    """Log level information schema"""
    value: str = Field(..., description="Log seviyesi değeri")
    label: str = Field(..., description="Türkçe etiket")
    color: str = Field(..., description="Renk kodu")
    description: Optional[str] = Field(None, description="Açıklama")

class LogSourceInfo(BaseModel):
    """Log source information schema"""
    value: str = Field(..., description="Kaynak değeri")
    label: str = Field(..., description="Türkçe etiket")
    count: Optional[int] = Field(None, description="Kayıt sayısı")
    description: Optional[str] = Field(None, description="Açıklama")

class LogMetaResponse(BaseModel):
    """Log metadata response schema"""
    success: bool = True
    data: Dict[str, Any] = Field(..., description="Log meta verileri")
    message: Optional[str] = Field(None, description="İşlem mesajı")

# =============================================================================
# End of Enhanced Log Schemas Section
# =============================================================================

# Firewall Schemas
class FirewallRuleCreate(BaseModel):
    """Firewall rule creation schema"""
    rule_name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    source_ips: List[str] = Field(default_factory=list)
    destination_ips: List[str] = Field(default_factory=list)
    source_ports: List[str] = Field(default_factory=list)
    destination_ports: List[str] = Field(default_factory=list)
    protocol: str = "ANY"
    action: str = "ALLOW"
    direction: str = "IN"
    enabled: bool = True
    priority: int = Field(default=100, ge=1, le=1000)
    profile: str = "Any"
    interface: Optional[str] = None
    schedule_start: Optional[str] = Field(None)
    schedule_end: Optional[str] = Field(None)
    days_of_week: List[int] = Field(default_factory=list)
    group_id: Optional[str] = None
    tags: List[str] = Field(default_factory=list)

class FirewallRuleUpdate(BaseModel):
    """Firewall rule update schema"""
    rule_name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    source_ips: Optional[List[str]] = None
    destination_ips: Optional[List[str]] = None
    source_ports: Optional[List[str]] = None
    destination_ports: Optional[List[str]] = None
    protocol: Optional[str] = None
    action: Optional[str] = None
    direction: Optional[str] = None
    enabled: Optional[bool] = None
    priority: Optional[int] = Field(None, ge=1, le=1000)
    profile: Optional[str] = None
    interface: Optional[str] = None
    schedule_start: Optional[str] = Field(None)
    schedule_end: Optional[str] = Field(None)
    days_of_week: Optional[List[int]] = None
    group_id: Optional[str] = None
    tags: Optional[List[str]] = None

class FirewallRuleResponse(BaseModel):
    """Firewall rule response schema"""
    id: str
    rule_name: str
    description: Optional[str] = None
    source_ips: List[str]
    destination_ips: List[str]
    source_ports: List[str]
    destination_ports: List[str]
    protocol: str
    action: str
    direction: str
    enabled: bool
    priority: int
    profile: str
    interface: Optional[str] = None
    schedule_start: Optional[str] = None
    schedule_end: Optional[str] = None
    days_of_week: List[int]
    group_id: Optional[str] = None
    tags: List[str]
    hit_count: int = 0
    last_hit: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

class FirewallGroupCreate(BaseModel):
    """Firewall group creation schema"""
    group_name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    enabled: bool = True
    tags: List[str] = Field(default_factory=list)

class FirewallGroupResponse(BaseModel):
    """Firewall group response schema"""
    id: str
    group_name: str
    description: Optional[str] = None
    enabled: bool
    rule_count: int
    tags: List[str]
    created_at: datetime
    updated_at: Optional[datetime] = None

# Network Schemas - ENHANCED WITH ICS SUPPORT
class NetworkInterfaceCreate(BaseModel):
    """Enhanced network interface creation schema"""
    interface_name: str = Field(..., min_length=1, max_length=50)
    display_name: Optional[str] = None
    physical_device: Optional[str] = None
    interface_type: str = "ethernet"
    ip_mode: str = "static"
    ip_address: Optional[str] = None
    subnet_mask: Optional[str] = None
    gateway: Optional[str] = None
    dns_primary: Optional[str] = None
    dns_secondary: Optional[str] = None
    admin_enabled: bool = True
    mtu: Optional[int] = Field(None, ge=576, le=9000)
    vlan_id: Optional[int] = Field(None, ge=0, le=4094)
    metric: int = Field(default=100, ge=1, le=1000)
    description: Optional[str] = Field(None, max_length=500)
    # ICS Settings - YENİ
    ics_enabled: bool = False
    ics_source_interface: Optional[str] = None
    ics_dhcp_range_start: Optional[str] = None
    ics_dhcp_range_end: Optional[str] = None

class NetworkInterfaceUpdate(BaseModel):
    """Network interface update schema"""
    interface_name: Optional[str] = Field(None, min_length=1, max_length=50)
    display_name: Optional[str] = None
    physical_device: Optional[str] = None
    interface_type: Optional[str] = None
    ip_mode: Optional[str] = None
    ip_address: Optional[str] = None
    subnet_mask: Optional[str] = None
    gateway: Optional[str] = None
    dns_primary: Optional[str] = None
    dns_secondary: Optional[str] = None
    admin_enabled: Optional[bool] = None
    mtu: Optional[int] = Field(None, ge=576, le=9000)
    vlan_id: Optional[int] = Field(None, ge=0, le=4094)
    metric: Optional[int] = Field(None, ge=1, le=1000)
    description: Optional[str] = Field(None, max_length=500)
    # ICS Settings - YENİ
    ics_enabled: Optional[bool] = None
    ics_source_interface: Optional[str] = None
    ics_dhcp_range_start: Optional[str] = None
    ics_dhcp_range_end: Optional[str] = None

class NetworkInterfaceResponse(BaseModel):
    """Enhanced network interface response schema"""
    id: str
    interface_name: str
    display_name: Optional[str] = None
    physical_device: Optional[str] = None
    interface_type: str
    ip_mode: str
    ip_address: Optional[str] = None
    subnet_mask: Optional[str] = None
    gateway: Optional[str] = None
    dns_primary: Optional[str] = None
    dns_secondary: Optional[str] = None
    admin_enabled: bool
    mtu: Optional[int] = None
    vlan_id: Optional[int] = None
    metric: int
    # ICS Settings - YENİ
    ics_enabled: bool = False
    ics_source_interface: Optional[str] = None
    ics_dhcp_range_start: Optional[str] = None
    ics_dhcp_range_end: Optional[str] = None
    # Status - YENİ
    link_state: Optional[str] = None
    admin_state: Optional[str] = None
    operational_status: str = "down"
    mac_address: Optional[str] = None
    speed: Optional[str] = None
    duplex: Optional[str] = None
    # Statistics - YENİ
    bytes_received: int = 0
    bytes_transmitted: int = 0
    packets_received: int = 0
    packets_transmitted: int = 0
    errors: int = 0
    drops: int = 0
    description: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

# YENİ NETWORK SCHEMAS - INTERFACE MANAGEMENT
class PhysicalInterfaceInfo(BaseModel):
    """Physical interface information schema"""
    name: str
    display_name: str
    type: str  # ethernet, wireless
    status: str  # up, down
    mac_address: Optional[str] = None
    description: str

class PhysicalInterfacesResponse(BaseModel):
    """Physical interfaces response schema"""
    success: bool = True
    data: List[PhysicalInterfaceInfo]
    message: Optional[str] = None

class InterfaceToggleRequest(BaseModel):
    """Interface toggle request schema"""
    enabled: bool

class ICSSetupRequest(BaseModel):
    """Internet Connection Sharing setup request"""
    source_interface: str
    target_interface: str
    dhcp_range_start: str = "192.168.100.100"
    dhcp_range_end: str = "192.168.100.200"

class InterfaceStatsResponse(BaseModel):
    """Interface statistics response"""
    success: bool = True
    data: Dict[str, Any]
    message: Optional[str] = None

class NetworkInterfaceListResponse(BaseModel):
    """Network interface list response"""
    success: bool = True
    data: List[NetworkInterfaceResponse]
    message: Optional[str] = None

class StaticRouteCreate(BaseModel):
    """Static route creation schema"""
    destination: str
    mask: str
    gateway: str
    interface_name: Optional[str] = None
    metric: int = Field(default=1, ge=1, le=9999)
    enabled: bool = True
    description: Optional[str] = Field(None, max_length=200)

class StaticRouteResponse(BaseModel):
    """Static route response schema"""
    id: str
    destination: str
    mask: str
    gateway: str
    interface_name: Optional[str] = None
    metric: int
    enabled: bool
    description: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

# DNS Schemas
class BlockedDomainCreate(BaseModel):
    """Blocked domain creation schema"""
    domain: str = Field(..., min_length=1, max_length=255)
    note: Optional[str] = Field(None, max_length=200)
    use_wildcard: bool = True
    category: Optional[str] = None

class BlockedDomainResponse(BaseModel):
    """Blocked domain response schema"""
    id: str
    domain: str
    note: Optional[str] = None
    use_wildcard: bool
    category: Optional[str] = None
    source: Optional[str] = None
    hit_count: int = 0
    last_blocked: Optional[datetime] = None
    created_at: datetime

class AdblockListImport(BaseModel):
    """Adblock list import schema"""
    url: str = Field(..., min_length=1)
    category: Optional[str] = None
    overwrite_existing: bool = False

# System Schemas
class SystemLogResponse(BaseModel):
    """System log response schema"""
    id: str
    timestamp: datetime
    level: str
    source: str
    message: str
    details: Optional[Dict[str, Any]] = None
    user_id: Optional[str] = None
    source_ip: Optional[str] = None

class SystemStatsResponse(BaseModel):
    """System statistics response schema"""
    cpu_usage: float
    memory_usage: float
    disk_usage: float
    network_interfaces: List[Dict[str, Any]]
    uptime_seconds: int
    firewall_rules_count: int
    active_rules_count: int
    blocked_domains_count: int
    logs_count_24h: int
    alerts_count_24h: int
    blocked_requests_24h: int
    timestamp: datetime

# Configuration Schemas
class NATConfig(BaseModel):
    """NAT configuration schema"""
    enabled: bool = False
    wan_interface: Optional[str] = None
    lan_interface: Optional[str] = None
    port_forwarding_rules: List[Dict[str, Any]] = Field(default_factory=list)

class DNSProxyConfig(BaseModel):
    """DNS proxy configuration schema"""
    enabled: bool = False
    listen_port: int = Field(default=53, ge=1, le=65535)
    upstream_servers: List[str] = Field(default_factory=lambda: ["8.8.8.8", "8.8.4.4"])
    block_malware: bool = True
    block_ads: bool = False
    custom_records: List[Dict[str, str]] = Field(default_factory=list)

# ===== ENHANCED ERROR RESPONSE =====
class ErrorResponseModel(BaseModel):
    """Enhanced error response model"""
    success: bool = False
    error: str
    message: str
    status_code: int
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    path: Optional[str] = None

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

# ===== VALIDATION HELPERS =====
class TimezoneEnum(str, Enum):
    """Supported timezones"""
    TURKEY = "Türkiye (UTC+3)"
    UTC = "UTC"
    EST = "EST"

class LanguageEnum(str, Enum):
    """Supported languages"""
    TURKISH = "Türkçe"
    ENGLISH = "English"

class LogLevelEnum(str, Enum):
    """Log levels"""
    DEBUG = "Debug (Detaylı)"
    INFO = "Info (Normal)"
    WARNING = "Warning (Uyarı)"
    ERROR = "Error (Hata)"
    CRITICAL = "Critical (Kritik)"