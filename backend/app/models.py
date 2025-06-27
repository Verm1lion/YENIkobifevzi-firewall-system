"""
Pydantic v2 models with enhanced validation and serialization
UPDATED: NAT (Network Address Translation) Models Added
UPDATED: Enhanced Log Models for PC-to-PC Internet Sharing
"""
from datetime import datetime
from typing import Optional, List, Dict, Any, Union
from enum import Enum
from pydantic import BaseModel, Field, validator, ConfigDict
from bson import ObjectId

class PyObjectId(ObjectId):
    """Custom ObjectId type for Pydantic v2"""
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return ObjectId(v)

    @classmethod
    def __modify_schema__(cls, field_schema):
        field_schema.update(type="string")

class BaseDbModel(BaseModel):
    """Base model for database documents"""
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str}
    )

    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    created_at: Optional[datetime] = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None

class UserRole(str, Enum):
    """User roles enumeration"""
    ADMIN = "admin"
    OPERATOR = "operator"
    VIEWER = "viewer"

class User(BaseDbModel):
    """User model with enhanced security features"""
    username: str = Field(..., min_length=3, max_length=50)
    email: Optional[str] = Field(None, regex=r'^[^@]+@[^@]+\.[^@]+$')
    hashed_password: str
    role: UserRole = UserRole.VIEWER
    is_active: bool = True
    is_verified: bool = False
    last_login: Optional[datetime] = None
    last_seen: Optional[datetime] = None
    failed_login_attempts: int = 0
    locked_until: Optional[datetime] = None
    settings: Dict[str, Any] = Field(default_factory=dict)
    permissions: List[str] = Field(default_factory=list)

    @validator('username')
    def validate_username(cls, v):
        if not v.replace('_', '').replace('-', '').isalnum():
            raise ValueError('Username must contain only alphanumeric characters, hyphens, and underscores')
        return v.lower()

class FirewallAction(str, Enum):
    """Firewall action types"""
    ALLOW = "ALLOW"
    DENY = "DENY"
    DROP = "DROP"
    REJECT = "REJECT"

class FirewallDirection(str, Enum):
    """Firewall direction types"""
    IN = "IN"
    OUT = "OUT"
    BOTH = "BOTH"

class FirewallProtocol(str, Enum):
    """Firewall protocol types"""
    TCP = "TCP"
    UDP = "UDP"
    ICMP = "ICMP"
    ANY = "ANY"

class FirewallRule(BaseDbModel):
    """Enhanced firewall rule model"""
    rule_name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)

    # Network configuration
    source_ips: List[str] = Field(default_factory=list)
    destination_ips: List[str] = Field(default_factory=list)
    source_ports: List[str] = Field(default_factory=list)
    destination_ports: List[str] = Field(default_factory=list)

    # Rule configuration
    protocol: FirewallProtocol = FirewallProtocol.ANY
    action: FirewallAction = FirewallAction.ALLOW
    direction: FirewallDirection = FirewallDirection.IN

    # Advanced settings
    enabled: bool = True
    priority: int = Field(default=100, ge=1, le=1000)
    profile: str = "Any"
    interface: Optional[str] = None

    # Scheduling
    schedule_start: Optional[str] = Field(None, regex=r'^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$')
    schedule_end: Optional[str] = Field(None, regex=r'^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$')
    days_of_week: List[int] = Field(default_factory=list)

    # Grouping
    group_id: Optional[str] = None
    tags: List[str] = Field(default_factory=list)

    # Statistics
    hit_count: int = 0
    last_hit: Optional[datetime] = None

    @validator('source_ips', 'destination_ips', each_item=True)
    def validate_ip_addresses(cls, v):
        import ipaddress
        try:
            ipaddress.ip_network(v, strict=False)
        except ValueError:
            raise ValueError(f'Invalid IP address or network: {v}')
        return v

    @validator('days_of_week', each_item=True)
    def validate_days_of_week(cls, v):
        if not 0 <= v <= 6:
            raise ValueError('Day of week must be between 0 (Monday) and 6 (Sunday)')
        return v

class FirewallGroup(BaseDbModel):
    """Firewall rule group model"""
    group_name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    enabled: bool = True
    rule_count: int = 0
    tags: List[str] = Field(default_factory=list)

class NetworkInterface(BaseDbModel):
    """Enhanced network interface configuration model with ICS support"""
    interface_name: str = Field(..., min_length=1, max_length=50)
    display_name: Optional[str] = None
    physical_device: Optional[str] = None  # Fiziksel cihaz adı (eth0, wlan0)
    interface_type: str = Field(default="ethernet")  # ethernet, wireless, bridge

    # IP Configuration
    ip_mode: str = Field(default="static")  # static, dhcp
    ip_address: Optional[str] = None
    subnet_mask: Optional[str] = None
    gateway: Optional[str] = None

    # DNS Configuration
    dns_primary: Optional[str] = None
    dns_secondary: Optional[str] = None

    # Interface Settings
    admin_enabled: bool = True
    mtu: Optional[int] = Field(None, ge=576, le=9000)
    vlan_id: Optional[int] = Field(None, ge=0, le=4094)
    metric: int = Field(default=100, ge=1, le=1000)

    # ICS Settings (Internet Connection Sharing) - YENİ
    ics_enabled: bool = False
    ics_source_interface: Optional[str] = None
    ics_dhcp_range_start: Optional[str] = None
    ics_dhcp_range_end: Optional[str] = None

    # Status Information
    link_state: Optional[str] = None  # up, down
    admin_state: Optional[str] = None  # up, down
    operational_status: str = "down"
    mac_address: Optional[str] = None
    speed: Optional[str] = None
    duplex: Optional[str] = None

    # Statistics
    bytes_received: int = 0
    bytes_transmitted: int = 0
    packets_received: int = 0
    packets_transmitted: int = 0
    errors: int = 0
    drops: int = 0

    # Metadata
    description: Optional[str] = Field(None, max_length=500)

    @validator('ip_address', 'gateway', 'dns_primary', 'dns_secondary')
    def validate_ip_address(cls, v):
        if v is not None and v.strip():
            import ipaddress
            try:
                ipaddress.ip_address(v)
            except ValueError:
                raise ValueError(f'Invalid IP address: {v}')
        return v

    @validator('ics_dhcp_range_start', 'ics_dhcp_range_end')
    def validate_dhcp_range(cls, v):
        if v is not None and v.strip():
            import ipaddress
            try:
                ipaddress.ip_address(v)
            except ValueError:
                raise ValueError(f'Invalid DHCP range IP: {v}')
        return v

    @validator('interface_name')
    def validate_interface_name(cls, v):
        if not v or not v.strip():
            raise ValueError('Interface name cannot be empty')
        # Allow alphanumeric, dots, hyphens, underscores
        import re
        if not re.match(r'^[a-zA-Z0-9._-]+$', v):
            raise ValueError('Invalid interface name format')
        return v.strip()

# =============================================================================
# NAT (Network Address Translation) Models - NEW SECTION
# =============================================================================

class NATConfiguration(BaseDbModel):
    """NAT configuration model for database storage"""
    enabled: bool = Field(default=False, description="NAT enabled status")
    wan_interface: str = Field(default="", description="WAN interface name")
    lan_interface: str = Field(default="", description="LAN interface name")
    dhcp_range_start: str = Field(default="192.168.100.100", description="DHCP range start")
    dhcp_range_end: str = Field(default="192.168.100.200", description="DHCP range end")
    gateway_ip: str = Field(default="192.168.100.1", description="Gateway IP address")
    masquerade_enabled: bool = Field(default=True, description="Masquerading enabled")
    configuration_type: str = Field(default="pc_to_pc_sharing", description="Configuration type")
    created_by: Optional[str] = Field(None, description="User ID who created this config")

    @validator('wan_interface', 'lan_interface')
    def validate_interface_names(cls, v):
        if v and not isinstance(v, str):
            raise ValueError('Interface name must be a string')
        if v:
            import re
            if not re.match(r'^[a-zA-Z0-9._-]+$', v):
                raise ValueError('Invalid interface name format')
        return v.strip() if v else ""

    @validator('dhcp_range_start', 'dhcp_range_end', 'gateway_ip')
    def validate_ip_addresses(cls, v):
        if v and v.strip():
            import ipaddress
            try:
                ipaddress.ip_address(v)
            except ValueError:
                raise ValueError(f'Invalid IP address: {v}')
        return v

    class Config:
        schema_extra = {
            "example": {
                "enabled": True,
                "wan_interface": "wlan0",
                "lan_interface": "eth0",
                "dhcp_range_start": "192.168.100.100",
                "dhcp_range_end": "192.168.100.200",
                "gateway_ip": "192.168.100.1",
                "masquerade_enabled": True,
                "configuration_type": "pc_to_pc_sharing"
            }
        }

class NATStatus(BaseModel):
    """NAT status model"""
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

    class Config:
        schema_extra = {
            "example": {
                "enabled": True,
                "status": "active",
                "wan_interface": "wlan0",
                "lan_interface": "eth0",
                "gateway_ip": "192.168.100.1",
                "dhcp_range_start": "192.168.100.100",
                "dhcp_range_end": "192.168.100.200",
                "ip_forwarding": True,
                "masquerade_active": True,
                "message": "NAT is active and working"
            }
        }

class NATInterfaceInfo(BaseModel):
    """NAT interface information model"""
    name: str = Field(..., description="Interface name")
    display_name: str = Field(..., description="Human readable name")
    type: str = Field(..., description="Interface type (ethernet, wireless)")
    status: str = Field(..., description="Interface status (up, down)")
    mac_address: Optional[str] = Field(None, description="MAC address")
    description: str = Field(..., description="Interface description")

    @validator('name')
    def validate_interface_name(cls, v):
        if not v or not isinstance(v, str):
            raise ValueError('Interface name must be specified')
        import re
        if not re.match(r'^[a-zA-Z0-9._-]+$', v):
            raise ValueError('Invalid interface name format')
        return v.strip()

    @validator('type')
    def validate_interface_type(cls, v):
        valid_types = ['ethernet', 'wireless', 'bridge', 'virtual']
        if v not in valid_types:
            raise ValueError(f'Interface type must be one of: {valid_types}')
        return v

    @validator('status')
    def validate_interface_status(cls, v):
        valid_statuses = ['up', 'down', 'testing', 'unknown']
        if v not in valid_statuses:
            raise ValueError(f'Interface status must be one of: {valid_statuses}')
        return v

class NATInterfaceList(BaseModel):
    """NAT interface list model"""
    wan_candidates: List[NATInterfaceInfo] = Field(default_factory=list, description="Wi-Fi interfaces for WAN")
    lan_candidates: List[NATInterfaceInfo] = Field(default_factory=list, description="Ethernet interfaces for LAN")
    all_interfaces: List[NATInterfaceInfo] = Field(default_factory=list, description="All available interfaces")

class NATValidationResult(BaseModel):
    """NAT interface validation result model"""
    valid: bool = Field(..., description="Whether the configuration is valid")
    errors: List[str] = Field(default_factory=list, description="Validation errors")
    warnings: List[str] = Field(default_factory=list, description="Validation warnings")

class PCToPCSharingResult(BaseModel):
    """PC-to-PC sharing setup result model"""
    success: bool = Field(..., description="Whether the setup was successful")
    wan_interface: Optional[str] = Field(None, description="WAN interface used")
    lan_interface: Optional[str] = Field(None, description="LAN interface used")
    gateway_ip: Optional[str] = Field(None, description="Gateway IP address")
    dhcp_range: Optional[str] = Field(None, description="DHCP range")
    masquerade_enabled: Optional[bool] = Field(None, description="Masquerading status")
    error: Optional[str] = Field(None, description="Error message if failed")

# NAT Enums
class NATStatusEnum(str, Enum):
    """NAT status enumeration"""
    ACTIVE = "active"
    DISABLED = "disabled"
    CONFIGURED_BUT_INACTIVE = "configured_but_inactive"
    NOT_CONFIGURED = "not_configured"
    ERROR = "error"

class NATConfigurationType(str, Enum):
    """NAT configuration type enumeration"""
    PC_TO_PC_SHARING = "pc_to_pc_sharing"
    ENTERPRISE_NAT = "enterprise_nat"
    SIMPLE_NAT = "simple_nat"
    CUSTOM = "custom"

# =============================================================================
# End of NAT Models Section
# =============================================================================

class StaticRoute(BaseDbModel):
    """Static route configuration model"""
    destination: str = Field(..., description="Destination network")
    mask: str = Field(..., description="Subnet mask")
    gateway: str = Field(..., description="Gateway IP address")
    interface_name: Optional[str] = None
    metric: int = Field(default=1, ge=1, le=9999)
    enabled: bool = True
    description: Optional[str] = Field(None, max_length=200)

    @validator('destination', 'gateway')
    def validate_ip_address(cls, v):
        import ipaddress
        try:
            ipaddress.ip_address(v)
        except ValueError:
            raise ValueError(f'Invalid IP address: {v}')
        return v

class BlockedDomain(BaseDbModel):
    """Blocked domain model for DNS filtering"""
    domain: str = Field(..., min_length=1, max_length=255)
    note: Optional[str] = Field(None, max_length=200)
    use_wildcard: bool = True
    category: Optional[str] = None
    source: Optional[str] = None  # manual, adblock, etc.
    hit_count: int = 0
    last_blocked: Optional[datetime] = None

    @validator('domain')
    def validate_domain(cls, v):
        import re
        domain_pattern = r'^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$'
        if not re.match(domain_pattern, v):
            raise ValueError('Invalid domain format')
        return v.lower()

# =============================================================================
# ENHANCED LOG MODELS FOR PC-TO-PC INTERNET SHARING
# =============================================================================

class LogLevel(str, Enum):
    """Enhanced log level enumeration"""
    DEBUG = "DEBUG"
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"
    CRITICAL = "CRITICAL"
    ALLOW = "ALLOW"
    BLOCK = "BLOCK"
    DENY = "DENY"

class LogEventType(str, Enum):
    """Log event type enumeration"""
    TRAFFIC_LOG = "traffic_log"
    PACKET_BLOCKED = "packet_blocked"
    PACKET_ALLOWED = "packet_allowed"
    CONNECTION_ESTABLISHED = "connection_established"
    CONNECTION_CLOSED = "connection_closed"
    AUTHENTICATION = "authentication"
    SYSTEM_EVENT = "system_event"
    SECURITY_ALERT = "security_alert"
    MANUAL_LOG = "manual_log"
    INTERFACE_STATS = "interface_stats"
    STATISTICS_UPDATE = "statistics_update"
    ACTIVE_CONNECTION = "active_connection"
    TRAFFIC_SUMMARY = "traffic_summary"

class LogSeverity(str, Enum):
    """Log severity levels"""
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

class TrafficDirection(str, Enum):
    """Traffic direction enumeration"""
    INBOUND = "INBOUND"
    OUTBOUND = "OUTBOUND"
    INTERNAL = "INTERNAL"
    EXTERNAL = "EXTERNAL"
    BIDIRECTIONAL = "BIDIRECTIONAL"

class SystemLog(BaseDbModel):
    """Enhanced system log entry model for PC-to-PC traffic monitoring"""
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    level: str = Field(..., regex=r'^(DEBUG|INFO|WARNING|ERROR|CRITICAL|ALLOW|BLOCK|DENY)$')
    source: str = Field(..., max_length=100)
    message: str = Field(..., max_length=2000)
    event_type: str = Field(default="system_event")

    # Network Traffic Information
    source_ip: Optional[str] = Field(None, description="Source IP address")
    destination_ip: Optional[str] = Field(None, description="Destination IP address")
    source_port: Optional[int] = Field(None, ge=1, le=65535, description="Source port")
    destination_port: Optional[int] = Field(None, ge=1, le=65535, description="Destination port")
    protocol: Optional[str] = Field(None, description="Network protocol (TCP, UDP, ICMP)")

    # Traffic Analysis
    traffic_direction: Optional[str] = None
    traffic_type: Optional[str] = Field(None, description="Traffic classification")
    packet_size: Optional[int] = Field(None, ge=0, description="Packet size in bytes")
    interface_in: Optional[str] = Field(None, description="Incoming interface")
    interface_out: Optional[str] = Field(None, description="Outgoing interface")

    # Action and Result
    action: Optional[str] = Field(None, description="Action taken (ALLOW, BLOCK, DROP)")
    rule_id: Optional[str] = Field(None, description="Associated firewall rule ID")
    rule_name: Optional[str] = Field(None, description="Associated firewall rule name")

    # Additional Context
    details: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Additional log details")
    parsed_data: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Parsed log data")
    raw_log_line: Optional[str] = Field(None, description="Original raw log line")

    # User and Session Information
    user_id: Optional[str] = Field(None, description="Associated user ID")
    session_id: Optional[str] = Field(None, description="Session identifier")
    user_agent: Optional[str] = Field(None, description="User agent string")

    # Classification
    threat_level: Optional[str] = None
    is_suspicious: bool = Field(default=False, description="Marked as suspicious activity")

    # Processing Information
    processed_at: Optional[datetime] = Field(None, description="When log was processed")
    processing_time_ms: Optional[float] = Field(None, description="Processing time in milliseconds")

    @validator('source_ip', 'destination_ip')
    def validate_ip_addresses(cls, v):
        if v and v.strip():
            import ipaddress
            try:
                ipaddress.ip_address(v)
                return v.strip()
            except ValueError:
                # Allow special values like "unknown", "localhost"
                if v.lower() in ['unknown', 'localhost', 'any', '*']:
                    return v
                raise ValueError(f'Invalid IP address: {v}')
        return v

    @validator('protocol')
    def validate_protocol(cls, v):
        if v:
            valid_protocols = ['TCP', 'UDP', 'ICMP', 'HTTP', 'HTTPS', 'FTP', 'SSH', 'DNS', 'DHCP', 'ARP', 'ANY']
            return v.upper()
        return v

class NetworkActivity(BaseDbModel):
    """Network activity tracking model for real-time monitoring"""
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    event_type: str = Field(default="active_connection")
    source: str = Field(..., description="Activity source")

    # Connection Information
    local_address: Optional[str] = Field(None, description="Local address (IP:Port)")
    remote_address: Optional[str] = Field(None, description="Remote address (IP:Port)")
    connection_state: Optional[str] = Field(None, description="Connection state (ESTABLISHED, LISTENING, etc.)")
    protocol: str = Field(default="TCP", description="Connection protocol")

    # Process Information
    process_id: Optional[int] = Field(None, description="Process ID")
    process_name: Optional[str] = Field(None, description="Process name")

    # Interface Statistics
    interface: Optional[str] = Field(None, description="Network interface")
    bytes_sent: int = Field(default=0, description="Bytes sent")
    bytes_received: int = Field(default=0, description="Bytes received")
    packets_sent: int = Field(default=0, description="Packets sent")
    packets_received: int = Field(default=0, description="Packets received")
    errors: int = Field(default=0, description="Error count")
    drops: int = Field(default=0, description="Dropped packets")

    # Duration and Performance
    connection_duration: Optional[float] = Field(None, description="Connection duration in seconds")

    # Classification
    is_internal: bool = Field(default=True, description="Internal network connection")
    is_outbound: bool = Field(default=False, description="Outbound connection")

    # Metadata
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata")

class SystemStats(BaseDbModel):
    """System statistics model for performance monitoring"""
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    source: str = Field(default="system_monitor", description="Statistics source")
    event_type: str = Field(default="statistics_update")

    # Traffic Statistics
    total_packets: int = Field(default=0, description="Total packets processed")
    blocked_packets: int = Field(default=0, description="Blocked packets count")
    allowed_packets: int = Field(default=0, description="Allowed packets count")
    bytes_transferred: int = Field(default=0, description="Total bytes transferred")

    # Connection Statistics
    active_connections_count: int = Field(default=0, description="Active connections count")
    unique_ips_count: int = Field(default=0, description="Unique IP addresses count")
    unique_ips: List[str] = Field(default_factory=list, description="Unique IP addresses")

    # Protocol Distribution
    protocol_distribution: Dict[str, int] = Field(default_factory=dict, description="Protocol usage statistics")
    port_distribution: Dict[str, int] = Field(default_factory=dict, description="Port usage statistics")

    # Interface Statistics
    interface_stats: Dict[str, Dict[str, Any]] = Field(default_factory=dict, description="Per-interface statistics")

    # Performance Metrics
    cpu_usage: Optional[float] = Field(None, description="CPU usage percentage")
    memory_usage: Optional[float] = Field(None, description="Memory usage percentage")
    network_utilization: Optional[float] = Field(None, description="Network utilization percentage")

    # Security Metrics
    threat_level: str = Field(default="LOW")
    security_score: Optional[float] = Field(None, ge=0, le=100, description="Security score (0-100)")
    anomaly_count: int = Field(default=0, description="Detected anomalies count")

    # Time Window
    time_window: str = Field(default="5_minutes", description="Statistics time window")

class SecurityAlert(BaseDbModel):
    """Enhanced security alert model with detailed threat analysis"""
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    alert_type: str = Field(..., max_length=100, description="Alert type identifier")
    severity: str = Field(..., regex=r'^(LOW|MEDIUM|HIGH|CRITICAL)$')

    # Alert Content
    title: str = Field(..., max_length=300, description="Alert title")
    description: str = Field(..., max_length=2000, description="Detailed alert description")
    recommendation: Optional[str] = Field(None, max_length=1000, description="Recommended action")

    # Network Context
    source_ip: Optional[str] = Field(None, description="Source IP address")
    target_ip: Optional[str] = Field(None, description="Target IP address")
    port: Optional[int] = Field(None, ge=1, le=65535)
    protocol: Optional[str] = Field(None, description="Network protocol")

    # Attack Information
    attack_vector: Optional[str] = Field(None, description="Attack vector classification")
    threat_category: Optional[str] = Field(None, description="Threat category")
    confidence_score: Optional[float] = Field(None, ge=0, le=1, description="Detection confidence (0-1)")

    # Impact Assessment
    potential_impact: Optional[str] = Field(None, description="Potential impact assessment")
    affected_systems: List[str] = Field(default_factory=list, description="List of affected systems")

    # Response Information
    auto_response_taken: bool = Field(default=False, description="Automatic response was taken")
    response_actions: List[str] = Field(default_factory=list, description="Response actions taken")

    # Acknowledgment and Resolution
    acknowledged: bool = Field(default=False)
    acknowledged_by: Optional[str] = Field(None, description="User who acknowledged")
    acknowledged_at: Optional[datetime] = Field(None)
    resolved: bool = Field(default=False)
    resolved_by: Optional[str] = Field(None, description="User who resolved")
    resolved_at: Optional[datetime] = Field(None)

    # Reference Information
    rule_id: Optional[str] = Field(None, description="Associated rule ID")
    correlation_id: Optional[str] = Field(None, description="Alert correlation ID")

    # Metadata and Context
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional alert metadata")
    detection_method: Optional[str] = Field(None, description="Detection method used")

    # Timeline
    first_detected: Optional[datetime] = Field(None, description="First detection time")
    last_detected: Optional[datetime] = Field(None, description="Last detection time")
    detection_count: int = Field(default=1, description="Number of detections")

class SystemConfig(BaseDbModel):
    """System configuration model"""
    config_key: str = Field(..., max_length=100)
    config_value: Union[str, int, bool, Dict[str, Any]]
    description: Optional[str] = Field(None, max_length=500)
    category: str = Field(default="general")
    is_sensitive: bool = False
    modified_by: Optional[str] = None

# Network Interface Enums - YENİ
class NetworkInterfaceType(str, Enum):
    """Network interface types"""
    ETHERNET = "ethernet"
    WIRELESS = "wireless"
    BRIDGE = "bridge"
    VIRTUAL = "virtual"

class IPConfigMode(str, Enum):
    """IP configuration modes"""
    STATIC = "static"
    DHCP = "dhcp"
    MANUAL = "manual"

class InterfaceStatus(str, Enum):
    """Interface status types"""
    UP = "up"
    DOWN = "down"
    TESTING = "testing"
    UNKNOWN = "unknown"

# =============================================================================
# LOG UTILITY MODELS
# =============================================================================

class LogFilter(BaseModel):
    """Log filtering criteria model"""
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    level: Optional[str] = None
    source: Optional[str] = None
    event_type: Optional[str] = None
    source_ip: Optional[str] = None
    destination_ip: Optional[str] = None
    protocol: Optional[str] = None
    search_term: Optional[str] = None
    page: int = Field(default=1, ge=1)
    per_page: int = Field(default=50, ge=1, le=1000)
    sort_by: str = Field(default="timestamp")
    sort_order: str = Field(default="desc", regex=r"^(asc|desc)$")

class TrafficSummary(BaseDbModel):
    """Traffic summary model for dashboard reporting"""
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    time_range: str = Field(..., description="Summary time range")
    event_type: str = Field(default="traffic_summary")

    # Traffic Volumes
    total_connections: int = Field(default=0)
    internal_connections: int = Field(default=0)
    external_connections: int = Field(default=0)
    blocked_connections: int = Field(default=0)

    # Data Transfer
    total_bytes_in: int = Field(default=0)
    total_bytes_out: int = Field(default=0)

    # Top Sources and Destinations
    top_source_ips: List[Dict[str, Any]] = Field(default_factory=list)
    top_destination_ips: List[Dict[str, Any]] = Field(default_factory=list)
    top_protocols: List[Dict[str, Any]] = Field(default_factory=list)
    top_ports: List[Dict[str, Any]] = Field(default_factory=list)

    # Security Summary
    security_events: int = Field(default=0)
    threat_level: str = Field(default="LOW")
    anomalies_detected: int = Field(default=0)
    blocked_attacks: int = Field(default=0)

    # Metadata
    summary_metadata: Dict[str, Any] = Field(default_factory=dict)