"""
KOBI Firewall System Routers
Enhanced router management with proper imports, error handling, and Settings integration
Version 2.0.0 - Full Settings Router Support + Network Interface Management
"""

import logging
from typing import Dict, List, Any, Optional
from datetime import datetime
import importlib

# Configure logging for router module
logger = logging.getLogger(__name__)

# Core router modules with enhanced error handling
def safe_import_router(module_name: str, description: str = None):
    """Safely import a router module with error handling"""
    try:
        # DÜZELTME: importlib kullanarak doğru import
        module = importlib.import_module(f".{module_name}", package=__name__)
        logger.info(f"✅ Successfully imported {module_name} router")
        return module, True
    except ImportError as e:
        desc = description or module_name
        logger.warning(f"⚠️ {desc} router not available: {e}")
        return None, False
    except Exception as e:
        desc = description or module_name
        logger.error(f"❌ Error importing {desc} router: {e}")
        return None, False

# Import core routers
auth, AUTH_AVAILABLE = safe_import_router("auth", "Authentication")
firewall, FIREWALL_AVAILABLE = safe_import_router("firewall", "Firewall")
logs, LOGS_AVAILABLE = safe_import_router("logs", "Logs")
system, SYSTEM_AVAILABLE = safe_import_router("system", "System")
network, NETWORK_AVAILABLE = safe_import_router("network", "Network")  # ✅ Network router
routes, ROUTES_AVAILABLE = safe_import_router("routes", "Routes")
dns, DNS_AVAILABLE = safe_import_router("dns", "DNS")
nat, NAT_AVAILABLE = safe_import_router("nat", "NAT")
backup, BACKUP_AVAILABLE = safe_import_router("backup", "Backup")
firewall_groups, FIREWALL_GROUPS_AVAILABLE = safe_import_router("firewall_groups", "Firewall Groups")
status, STATUS_AVAILABLE = safe_import_router("status", "Status")

# Settings router - Enhanced import with fallback
settings = None
settings_router = None
SETTINGS_AVAILABLE = False

try:
    settings, settings_imported = safe_import_router("settings", "Settings")
    if settings and settings_imported:
        # Try to import the specific settings_router
        try:
            from .settings import settings_router
            SETTINGS_AVAILABLE = True
            logger.info("✅ Settings router with settings_router imported successfully")
        except ImportError:
            # Fallback: try to import 'router' from settings
            try:
                from .settings import router as settings_router
                SETTINGS_AVAILABLE = True
                logger.info("✅ Settings router with fallback 'router' imported successfully")
            except ImportError:
                logger.warning("⚠️ Settings module exists but no router found")
                SETTINGS_AVAILABLE = False
except Exception as e:
    logger.error(f"❌ Error importing Settings router: {e}")
    SETTINGS_AVAILABLE = False

# ✅ FIX: Network router specific import with error handling
network_router = None
try:
    if NETWORK_AVAILABLE and network:
        # Try to get the router from network module
        if hasattr(network, 'router'):
            network_router = network.router
            logger.info("✅ Network router extracted successfully")
        else:
            logger.warning("⚠️ Network module exists but no router attribute found")
            NETWORK_AVAILABLE = False
except Exception as e:
    logger.error(f"❌ Error extracting network router: {e}")
    NETWORK_AVAILABLE = False

# Optional routers (may not exist)
reports, REPORTS_AVAILABLE = safe_import_router("reports", "Reports")
layer7_inspect, LAYER7_AVAILABLE = safe_import_router("layer7_inspect", "Layer7 Inspect")

# Additional optional routers
dashboard, DASHBOARD_AVAILABLE = safe_import_router("dashboard", "Dashboard")
security, SECURITY_AVAILABLE = safe_import_router("security", "Security")
users, USERS_AVAILABLE = safe_import_router("users", "Users")

# Enhanced router availability check
def get_available_routers() -> Dict[str, bool]:
    """Get list of available routers with their status"""
    available = {
        # Core routers
        "auth": AUTH_AVAILABLE,
        "firewall": FIREWALL_AVAILABLE,
        "logs": LOGS_AVAILABLE,
        "system": SYSTEM_AVAILABLE,
        "network": NETWORK_AVAILABLE,  # ✅ Network router
        "routes": ROUTES_AVAILABLE,
        "dns": DNS_AVAILABLE,
        "nat": NAT_AVAILABLE,
        "backup": BACKUP_AVAILABLE,
        "firewall_groups": FIREWALL_GROUPS_AVAILABLE,
        "status": STATUS_AVAILABLE,
        # Main feature router
        "settings": SETTINGS_AVAILABLE,
        # Optional routers
        "reports": REPORTS_AVAILABLE,
        "layer7_inspect": LAYER7_AVAILABLE,
        "dashboard": DASHBOARD_AVAILABLE,
        "security": SECURITY_AVAILABLE,
        "users": USERS_AVAILABLE
    }
    return available

def get_available_router_names() -> List[str]:
    """Get list of available router names"""
    available_routers = get_available_routers()
    return [name for name, available in available_routers.items() if available]

def get_unavailable_router_names() -> List[str]:
    """Get list of unavailable router names"""
    available_routers = get_available_routers()
    return [name for name, available in available_routers.items() if not available]

# Export all available routers
__all__ = []

# Add core routers that are available
core_routers = [
    ("auth", AUTH_AVAILABLE),
    ("firewall", FIREWALL_AVAILABLE),
    ("logs", LOGS_AVAILABLE),
    ("system", SYSTEM_AVAILABLE),
    ("network", NETWORK_AVAILABLE),  # ✅ Network router export
    ("routes", ROUTES_AVAILABLE),
    ("dns", DNS_AVAILABLE),
    ("nat", NAT_AVAILABLE),
    ("backup", BACKUP_AVAILABLE),
    ("firewall_groups", FIREWALL_GROUPS_AVAILABLE),
    ("status", STATUS_AVAILABLE)
]

for router_name, available in core_routers:
    if available:
        __all__.append(router_name)

# ✅ FIX: Add network_router specifically
if NETWORK_AVAILABLE and network_router:
    __all__.append("network_router")

# Add settings if available (priority router)
if SETTINGS_AVAILABLE:
    __all__.extend(["settings", "settings_router"])

# Add optional routers if available
optional_routers = [
    ("reports", REPORTS_AVAILABLE),
    ("layer7_inspect", LAYER7_AVAILABLE),
    ("dashboard", DASHBOARD_AVAILABLE),
    ("security", SECURITY_AVAILABLE),
    ("users", USERS_AVAILABLE)
]

for router_name, available in optional_routers:
    if available:
        __all__.append(router_name)

# Enhanced Router configuration for main.py
ROUTER_CONFIGS = [
    # Authentication - Highest Priority
    {
        "module": "auth",
        "router_name": "router",
        "prefix": "/api/v1/auth",
        "tags": ["Authentication"],
        "required": True,
        "priority": 1,
        "description": "User authentication and authorization"
    },
    # Settings - Main Feature (High Priority)
    {
        "module": "settings",
        "router_name": "settings_router",
        "prefix": "/api/v1/settings",
        "tags": ["Settings"],
        "required": False,
        "priority": 2,
        "description": "System settings and configuration management",
        "fallback_router_name": "router"  # Fallback if settings_router not found
    },
    # System Management
    {
        "module": "system",
        "router_name": "router",
        "prefix": "/api/v1/system",
        "tags": ["System"],
        "required": False,
        "priority": 3,
        "description": "System information and management"
    },
    # Status and Monitoring
    {
        "module": "status",
        "router_name": "router",
        "prefix": "/api/v1/status",
        "tags": ["Status"],
        "required": True,
        "priority": 4,
        "description": "System status and health monitoring"
    },
    # Core Firewall Features
    {
        "module": "firewall",
        "router_name": "router",
        "prefix": "/api/v1/firewall",
        "tags": ["Firewall"],
        "required": True,
        "priority": 5,
        "description": "Firewall rules and policies"
    },
    {
        "module": "firewall_groups",
        "router_name": "router",
        "prefix": "/api/v1/firewall-groups",
        "tags": ["Firewall Groups"],
        "required": True,
        "priority": 6,
        "description": "Firewall rule groups management"
    },
    # ✅ FIX: Network Management - Updated Configuration
    {
        "module": "network",
        "router_name": "router",
        "prefix": None,  # ✅ Network router has its own prefix defined
        "tags": ["Network"],
        "required": True,
        "priority": 7,
        "description": "Network interfaces and configuration",
        "has_own_prefix": True  # ✅ Flag to indicate router defines its own prefix
    },
    {
        "module": "routes",
        "router_name": "router",
        "prefix": "/api/v1/routes",
        "tags": ["Routes"],
        "required": True,
        "priority": 8,
        "description": "Network routing configuration"
    },
    # Network Services
    {
        "module": "dns",
        "router_name": "router",
        "prefix": "/api/v1/dns",
        "tags": ["DNS"],
        "required": True,
        "priority": 9,
        "description": "DNS configuration and management"
    },
    {
        "module": "nat",
        "router_name": "router",
        "prefix": "/api/v1/nat",
        "tags": ["NAT"],
        "required": True,
        "priority": 10,
        "description": "Network Address Translation"
    },
    # System Utilities
    {
        "module": "logs",
        "router_name": "router",
        "prefix": "/api/v1/logs",
        "tags": ["Logs"],
        "required": True,
        "priority": 11,
        "description": "System logs and monitoring"
    },
    {
        "module": "backup",
        "router_name": "router",
        "prefix": "/api/v1/backup",
        "tags": ["Backup"],
        "required": True,
        "priority": 12,
        "description": "System backup and restore"
    },
    # Optional Features
    {
        "module": "reports",
        "router_name": "router",
        "prefix": "/api/v1/reports",
        "tags": ["Reports"],
        "required": False,
        "priority": 20,
        "description": "System reports and analytics"
    },
    {
        "module": "dashboard",
        "router_name": "router",
        "prefix": "/api/v1/dashboard",
        "tags": ["Dashboard"],
        "required": False,
        "priority": 21,
        "description": "Dashboard data and statistics"
    },
    {
        "module": "security",
        "router_name": "router",
        "prefix": "/api/v1/security",
        "tags": ["Security"],
        "required": False,
        "priority": 22,
        "description": "Security monitoring and alerts"
    },
    {
        "module": "users",
        "router_name": "router",
        "prefix": "/api/v1/users",
        "tags": ["Users"],
        "required": False,
        "priority": 23,
        "description": "User management"
    },
    {
        "module": "layer7_inspect",
        "router_name": "router",
        "prefix": "/api/v1/layer7",
        "tags": ["Layer7 Inspection"],
        "required": False,
        "priority": 24,
        "description": "Layer 7 traffic inspection"
    }
]

def get_router_configs() -> List[Dict[str, Any]]:
    """Get router configurations for automatic registration"""
    # Filter only available routers
    available_routers = get_available_routers()
    available_configs = []

    for config in ROUTER_CONFIGS:
        module_name = config["module"]
        if available_routers.get(module_name, False):
            available_configs.append(config)

    # Sort by priority
    available_configs.sort(key=lambda x: x.get("priority", 999))
    return available_configs

def get_required_router_configs() -> List[Dict[str, Any]]:
    """Get only required router configurations"""
    return [config for config in get_router_configs() if config.get("required", False)]

def get_optional_router_configs() -> List[Dict[str, Any]]:
    """Get only optional router configurations"""
    return [config for config in get_router_configs() if not config.get("required", False)]

# Enhanced Module info
MODULE_INFO = {
    "name": "KOBI Firewall Routers",
    "version": "2.0.0",
    "description": "Enhanced router management with Settings integration and Network Interface Management",
    "total_routers": len(__all__),
    "available_routers": get_available_routers(),
    "available_count": len(get_available_router_names()),
    "unavailable_count": len(get_unavailable_router_names()),
    "required_routers": len([r for r in ROUTER_CONFIGS if r["required"]]),
    "optional_routers": len([r for r in ROUTER_CONFIGS if not r["required"]]),
    "settings_available": SETTINGS_AVAILABLE,
    "network_available": NETWORK_AVAILABLE,  # ✅ Network status
    "core_features": {
        "authentication": AUTH_AVAILABLE,
        "settings_management": SETTINGS_AVAILABLE,
        "firewall_management": FIREWALL_AVAILABLE,
        "system_monitoring": STATUS_AVAILABLE,
        "network_management": NETWORK_AVAILABLE,  # ✅ Network feature
        "network_interface_management": NETWORK_AVAILABLE  # ✅ Specific feature
    },
    "last_updated": datetime.utcnow().isoformat()
}

def get_module_info() -> Dict[str, Any]:
    """Get comprehensive module information"""
    return MODULE_INFO

def get_router_status_report() -> Dict[str, Any]:
    """Get detailed router status report"""
    available_routers = get_available_routers()
    configs = get_router_configs()

    return {
        "summary": {
            "total_defined": len(ROUTER_CONFIGS),
            "total_available": len(get_available_router_names()),
            "total_unavailable": len(get_unavailable_router_names()),
            "required_available": len([c for c in configs if c.get("required", False)]),
            "optional_available": len([c for c in configs if not c.get("required", False)])
        },
        "status_by_router": available_routers,
        "available_routers": get_available_router_names(),
        "unavailable_routers": get_unavailable_router_names(),
        "critical_status": {
            "auth": AUTH_AVAILABLE,
            "settings": SETTINGS_AVAILABLE,
            "firewall": FIREWALL_AVAILABLE,
            "system": SYSTEM_AVAILABLE,
            "network": NETWORK_AVAILABLE,  # ✅ Network critical status
            "status": STATUS_AVAILABLE
        },
        "timestamp": datetime.utcnow().isoformat()
    }

def validate_router_integrity() -> Dict[str, Any]:
    """Validate router integrity and dependencies"""
    issues = []
    warnings = []

    # Check critical routers
    critical_routers = ["auth", "firewall", "status", "network"]  # ✅ Network added to critical
    for router_name in critical_routers:
        if not get_available_routers().get(router_name, False):
            if router_name == "network":
                issues.append(f"Critical router '{router_name}' is not available - Network Interface Management will not work")
            else:
                issues.append(f"Critical router '{router_name}' is not available")

    # Check settings router (important but not critical)
    if not SETTINGS_AVAILABLE:
        warnings.append("Settings router is not available - settings management will be limited")

    # ✅ FIX: Check network router specifically
    if not NETWORK_AVAILABLE:
        issues.append("Network router is not available - Interface Ayarları feature will not work")
    elif NETWORK_AVAILABLE and not network_router:
        warnings.append("Network module available but router not accessible")

    # Check for router conflicts or issues
    configs = get_router_configs()
    prefixes = [config.get("prefix") for config in configs if config.get("prefix")]
    duplicate_prefixes = [prefix for prefix in prefixes if prefixes.count(prefix) > 1]
    if duplicate_prefixes:
        issues.append(f"Duplicate router prefixes detected: {duplicate_prefixes}")

    return {
        "valid": len(issues) == 0,
        "issues": issues,
        "warnings": warnings,
        "health_score": max(0, 100 - (len(issues) * 20) - (len(warnings) * 5)),
        "network_interface_ready": NETWORK_AVAILABLE and network_router is not None,  # ✅ Network readiness
        "timestamp": datetime.utcnow().isoformat()
    }

# Debug and testing functions
def print_router_debug_info():
    """Print comprehensive router debug information"""
    print("🔍 KOBI Firewall Router Module Debug Info:")
    print(f"📦 Available routers: {__all__}")
    print(f"⚙️ Settings available: {SETTINGS_AVAILABLE}")
    print(f"🌐 Network available: {NETWORK_AVAILABLE}")  # ✅ Network debug info
    print(f"🔌 Network router: {'✅ Available' if network_router else '❌ Not available'}")
    print(f"📊 Reports available: {REPORTS_AVAILABLE}")
    print(f"🔍 Layer7 available: {LAYER7_AVAILABLE}")
    print(f"📋 Total routers: {len(__all__)}")

    print("\n📊 Router Status Report:")
    status_report = get_router_status_report()
    for key, value in status_report["summary"].items():
        print(f"   {key}: {value}")

    print("\n✅ Available Routers:")
    for router in get_available_router_names():
        print(f"   - {router}")

    unavailable = get_unavailable_router_names()
    if unavailable:
        print("\n❌ Unavailable Routers:")
        for router in unavailable:
            print(f"   - {router}")

    print("\n🔧 Router Integrity Check:")
    integrity = validate_router_integrity()
    print(f"   Health Score: {integrity['health_score']}/100")
    print(f"   Network Interface Ready: {integrity['network_interface_ready']}")  # ✅ Network readiness

    if integrity['issues']:
        print("   Issues:")
        for issue in integrity['issues']:
            print(f"     - {issue}")

    if integrity['warnings']:
        print("   Warnings:")
        for warning in integrity['warnings']:
            print(f"     - {warning}")

# Auto-run debug info if module is executed directly
if __name__ == "__main__":
    print_router_debug_info()