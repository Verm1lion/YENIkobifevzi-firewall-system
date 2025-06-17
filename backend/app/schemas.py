"""
Request/Response schemas for API endpoints using Pydantic v2
"""
from datetime import datetime
from typing import Optional, List, Dict, Any, Union
from enum import Enum
from pydantic import BaseModel, Field, validator, ConfigDict

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

# Network Schemas
class NetworkInterfaceCreate(BaseModel):
    """Network interface creation schema"""
    interface_name: str = Field(..., min_length=1, max_length=50)
    display_name: Optional[str] = None
    ip_mode: str = "static"
    ip_address: Optional[str] = None
    subnet_mask: Optional[str] = None
    gateway: Optional[str] = None
    dns_primary: Optional[str] = None
    dns_secondary: Optional[str] = None
    admin_enabled: bool = True
    mtu: Optional[int] = Field(None, ge=576, le=9000)
    vlan_id: Optional[int] = Field(None, ge=0, le=4094)

class NetworkInterfaceResponse(BaseModel):
    """Network interface response schema"""
    id: str
    interface_name: str
    display_name: Optional[str] = None
    ip_mode: str
    ip_address: Optional[str] = None
    subnet_mask: Optional[str] = None
    gateway: Optional[str] = None
    dns_primary: Optional[str] = None
    dns_secondary: Optional[str] = None
    admin_enabled: bool
    mtu: Optional[int] = None
    vlan_id: Optional[int] = None
    link_state: Optional[str] = None
    admin_state: Optional[str] = None
    mac_address: Optional[str] = None
    speed: Optional[str] = None
    duplex: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

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

class SecurityAlertResponse(BaseModel):
    """Security alert response schema"""
    id: str
    alert_type: str
    severity: str
    title: str
    description: str
    source_ip: Optional[str] = None
    target_ip: Optional[str] = None
    port: Optional[int] = None
    protocol: Optional[str] = None
    acknowledged: bool
    acknowledged_by: Optional[str] = None
    acknowledged_at: Optional[datetime] = None
    resolved: bool
    resolved_at: Optional[datetime] = None
    created_at: datetime

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