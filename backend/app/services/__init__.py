"""
NetGate Firewall Services Module
Enhanced service layer with network interface management and system integration
Version: 2.0.0
"""

import logging
from typing import Optional, Dict, Any

# Configure logger for services module
logger = logging.getLogger(__name__)

# Module information
__version__ = "2.0.0"
__author__ = "NetGate Firewall Team"
__description__ = "Service layer for network interface management and system integration"

# ==================================================================
# SERVICE IMPORTS WITH ERROR HANDLING
# ==================================================================

# Network Interface Service - Primary Service
try:
    from .network_service import NetworkInterfaceService, network_service

    NETWORK_SERVICE_AVAILABLE = True
    logger.info("✅ NetworkInterfaceService imported successfully")
except ImportError as e:
    logger.error(f"❌ Failed to import NetworkInterfaceService: {e}")
    NetworkInterfaceService = None
    network_service = None
    NETWORK_SERVICE_AVAILABLE = False
except Exception as e:
    logger.error(f"❌ Unexpected error importing NetworkInterfaceService: {e}")
    NetworkInterfaceService = None
    network_service = None
    NETWORK_SERVICE_AVAILABLE = False

# Firewall Service - Existing Service
try:
    from .firewall_service import FirewallService

    FIREWALL_SERVICE_AVAILABLE = True
    logger.debug("✅ FirewallService imported successfully")
except ImportError as e:
    logger.warning(f"⚠️ FirewallService not available: {e}")
    FirewallService = None
    FIREWALL_SERVICE_AVAILABLE = False
except Exception as e:
    logger.error(f"❌ Unexpected error importing FirewallService: {e}")
    FirewallService = None
    FIREWALL_SERVICE_AVAILABLE = False


# ==================================================================
# SERVICE REGISTRY AND MANAGEMENT
# ==================================================================

class ServiceRegistry:
    """
    Central registry for managing all services in the NetGate system
    Provides service discovery, health checking, and dependency management
    """

    def __init__(self):
        self._services: Dict[str, Any] = {}
        self._service_status: Dict[str, bool] = {}
        self._initialized = False

        # Register available services
        self._register_services()
        self._initialized = True

        logger.info(f"ServiceRegistry initialized with {len(self._services)} services")

    def _register_services(self):
        """Register all available services"""

        # Register Network Interface Service
        if NETWORK_SERVICE_AVAILABLE and NetworkInterfaceService:
            self._services["network"] = {
                "class": NetworkInterfaceService,
                "instance": network_service,
                "description": "Network Interface Management Service",
                "version": "2.0.0",
                "dependencies": ["system", "iptables", "dnsmasq"],
                "critical": True
            }
            self._service_status["network"] = True
            logger.info("📡 Registered NetworkInterfaceService")
        else:
            self._service_status["network"] = False
            logger.warning("⚠️ NetworkInterfaceService not registered (unavailable)")

        # Register Firewall Service
        if FIREWALL_SERVICE_AVAILABLE and FirewallService:
            try:
                firewall_instance = FirewallService()
                self._services["firewall"] = {
                    "class": FirewallService,
                    "instance": firewall_instance,
                    "description": "Firewall Management Service",
                    "version": "1.0.0",
                    "dependencies": ["iptables", "ufw"],
                    "critical": True
                }
                self._service_status["firewall"] = True
                logger.info("🛡️ Registered FirewallService")
            except Exception as e:
                logger.error(f"❌ Failed to initialize FirewallService: {e}")
                self._service_status["firewall"] = False
        else:
            self._service_status["firewall"] = False
            logger.warning("⚠️ FirewallService not registered (unavailable)")

    def get_service(self, service_name: str) -> Optional[Any]:
        """
        Get a service instance by name

        Args:
            service_name: Name of the service to retrieve

        Returns:
            Service instance or None if not available
        """
        if not self._initialized:
            logger.warning("ServiceRegistry not initialized")
            return None

        service_info = self._services.get(service_name)
        if service_info:
            return service_info.get("instance")

        logger.warning(f"Service '{service_name}' not found")
        return None

    def get_service_class(self, service_name: str) -> Optional[type]:
        """
        Get a service class by name

        Args:
            service_name: Name of the service class to retrieve

        Returns:
            Service class or None if not available
        """
        service_info = self._services.get(service_name)
        if service_info:
            return service_info.get("class")

        return None

    def is_service_available(self, service_name: str) -> bool:
        """
        Check if a service is available and healthy

        Args:
            service_name: Name of the service to check

        Returns:
            True if service is available, False otherwise
        """
        return self._service_status.get(service_name, False)

    def get_service_info(self, service_name: str) -> Optional[Dict[str, Any]]:
        """
        Get detailed information about a service

        Args:
            service_name: Name of the service

        Returns:
            Service information dictionary or None
        """
        return self._services.get(service_name)

    def list_services(self) -> Dict[str, Dict[str, Any]]:
        """
        List all registered services with their status

        Returns:
            Dictionary of service information
        """
        return {
            name: {
                **info,
                "available": self._service_status.get(name, False)
            }
            for name, info in self._services.items()
        }

    def get_health_status(self) -> Dict[str, Any]:
        """
        Get overall health status of all services

        Returns:
            Health status summary
        """
        total_services = len(self._services)
        available_services = sum(self._service_status.values())
        critical_services = [
            name for name, info in self._services.items()
            if info.get("critical", False) and self._service_status.get(name, False)
        ]

        return {
            "total_services": total_services,
            "available_services": available_services,
            "critical_services_available": len(critical_services),
            "overall_health": "healthy" if available_services > 0 else "degraded",
            "service_status": self._service_status.copy(),
            "critical_services": critical_services
        }


# ==================================================================
# GLOBAL SERVICE REGISTRY INSTANCE
# ==================================================================

# Create global service registry
try:
    service_registry = ServiceRegistry()
    SERVICE_REGISTRY_AVAILABLE = True
    logger.info("🏢 Global ServiceRegistry created successfully")
except Exception as e:
    logger.error(f"❌ Failed to create ServiceRegistry: {e}")
    service_registry = None
    SERVICE_REGISTRY_AVAILABLE = False


# ==================================================================
# CONVENIENCE FUNCTIONS
# ==================================================================

def get_network_service() -> Optional[NetworkInterfaceService]:
    """
    Get the NetworkInterfaceService instance

    Returns:
        NetworkInterfaceService instance or None if not available
    """
    if SERVICE_REGISTRY_AVAILABLE and service_registry:
        return service_registry.get_service("network")

    # Fallback to direct import
    if NETWORK_SERVICE_AVAILABLE:
        return network_service

    logger.warning("NetworkInterfaceService not available")
    return None


def get_firewall_service() -> Optional[Any]:
    """
    Get the FirewallService instance

    Returns:
        FirewallService instance or None if not available
    """
    if SERVICE_REGISTRY_AVAILABLE and service_registry:
        return service_registry.get_service("firewall")

    logger.warning("FirewallService not available")
    return None


def is_network_service_available() -> bool:
    """
    Check if NetworkInterfaceService is available

    Returns:
        True if available, False otherwise
    """
    if SERVICE_REGISTRY_AVAILABLE and service_registry:
        return service_registry.is_service_available("network")

    return NETWORK_SERVICE_AVAILABLE


def is_firewall_service_available() -> bool:
    """
    Check if FirewallService is available

    Returns:
        True if available, False otherwise
    """
    if SERVICE_REGISTRY_AVAILABLE and service_registry:
        return service_registry.is_service_available("firewall")

    return FIREWALL_SERVICE_AVAILABLE


def get_services_health() -> Dict[str, Any]:
    """
    Get health status of all services

    Returns:
        Health status dictionary
    """
    if SERVICE_REGISTRY_AVAILABLE and service_registry:
        return service_registry.get_health_status()

    # Fallback health check
    return {
        "total_services": 2,
        "available_services": int(NETWORK_SERVICE_AVAILABLE) + int(FIREWALL_SERVICE_AVAILABLE),
        "overall_health": "degraded",
        "service_status": {
            "network": NETWORK_SERVICE_AVAILABLE,
            "firewall": FIREWALL_SERVICE_AVAILABLE
        },
        "registry_available": False
    }


def list_available_services() -> Dict[str, bool]:
    """
    List all available services

    Returns:
        Dictionary of service names and availability status
    """
    if SERVICE_REGISTRY_AVAILABLE and service_registry:
        services = service_registry.list_services()
        return {name: info["available"] for name, info in services.items()}

    # Fallback service list
    return {
        "network": NETWORK_SERVICE_AVAILABLE,
        "firewall": FIREWALL_SERVICE_AVAILABLE
    }


# ==================================================================
# MODULE EXPORTS
# ==================================================================

# Primary exports for Network Interface Management
__all__ = [
    # Classes
    "NetworkInterfaceService",
    "FirewallService",
    "ServiceRegistry",

    # Instances
    "network_service",
    "service_registry",

    # Convenience functions
    "get_network_service",
    "get_firewall_service",
    "is_network_service_available",
    "is_firewall_service_available",
    "get_services_health",
    "list_available_services",

    # Status flags
    "NETWORK_SERVICE_AVAILABLE",
    "FIREWALL_SERVICE_AVAILABLE",
    "SERVICE_REGISTRY_AVAILABLE",

    # Module metadata
    "__version__",
    "__author__",
    "__description__"
]

# ==================================================================
# MODULE INITIALIZATION LOG
# ==================================================================

# Log module initialization status
logger.info("🔧 NetGate Services Module Initialized")
logger.info(f"   Version: {__version__}")
logger.info(f"   Network Service: {'✅ Available' if NETWORK_SERVICE_AVAILABLE else '❌ Unavailable'}")
logger.info(f"   Firewall Service: {'✅ Available' if FIREWALL_SERVICE_AVAILABLE else '❌ Unavailable'}")
logger.info(f"   Service Registry: {'✅ Available' if SERVICE_REGISTRY_AVAILABLE else '❌ Unavailable'}")

# Health check on module load
if SERVICE_REGISTRY_AVAILABLE:
    health = get_services_health()
    logger.info(f"   Overall Health: {health['overall_health'].upper()}")
    logger.info(f"   Available Services: {health['available_services']}/{health['total_services']}")

# ==================================================================
# BACKWARDS COMPATIBILITY
# ==================================================================

# Ensure network_service is available even if registry fails
if not network_service and NETWORK_SERVICE_AVAILABLE:
    try:
        from .network_service import network_service as _network_service

        network_service = _network_service
        logger.info("🔄 Network service loaded via fallback import")
    except Exception as e:
        logger.error(f"❌ Fallback network service import failed: {e}")

# Final availability check
if not NETWORK_SERVICE_AVAILABLE:
    logger.warning("⚠️ CRITICAL: NetworkInterfaceService is not available!")
    logger.warning("   Network interface management features will be disabled.")
    logger.warning("   Please check system dependencies and installation.")