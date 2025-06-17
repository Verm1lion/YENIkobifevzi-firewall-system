"""
Pydantic v2 models with enhanced validation and serialization
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
    """Network interface configuration model"""

    interface_name: str = Field(..., min_length=1, max_length=50)
    display_name: Optional[str] = None

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

    # Status Information
    link_state: Optional[str] = None
    admin_state: Optional[str] = None
    mac_address: Optional[str] = None
    speed: Optional[str] = None
    duplex: Optional[str] = None

    @validator('ip_address', 'gateway', 'dns_primary', 'dns_secondary')
    def validate_ip_address(cls, v):
        if v is not None:
            import ipaddress
            try:
                ipaddress.ip_address(v)
            except ValueError:
                raise ValueError(f'Invalid IP address: {v}')
        return v


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


class SystemLog(BaseDbModel):
    """System log entry model"""

    timestamp: datetime = Field(default_factory=datetime.utcnow)
    level: str = Field(..., regex=r'^(DEBUG|INFO|WARNING|ERROR|CRITICAL)$')
    source: str = Field(..., max_length=100)
    message: str = Field(..., max_length=1000)
    details: Optional[Dict[str, Any]] = None
    user_id: Optional[str] = None
    source_ip: Optional[str] = None
    user_agent: Optional[str] = None


class SecurityAlert(BaseDbModel):
    """Security alert model"""

    alert_type: str = Field(..., max_length=50)
    severity: str = Field(..., regex=r'^(LOW|MEDIUM|HIGH|CRITICAL)$')
    title: str = Field(..., max_length=200)
    description: str = Field(..., max_length=1000)
    source_ip: Optional[str] = None
    target_ip: Optional[str] = None
    port: Optional[int] = None
    protocol: Optional[str] = None
    rule_id: Optional[str] = None
    acknowledged: bool = False
    acknowledged_by: Optional[str] = None
    acknowledged_at: Optional[datetime] = None
    resolved: bool = False
    resolved_at: Optional[datetime] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class SystemConfig(BaseDbModel):
    """System configuration model"""

    config_key: str = Field(..., max_length=100)
    config_value: Union[str, int, bool, Dict[str, Any]]
    description: Optional[str] = Field(None, max_length=500)
    category: str = Field(default="general")
    is_sensitive: bool = False
    modified_by: Optional[str] = None