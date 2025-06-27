"""
NAT (Network Address Translation) Service
PC-to-PC Internet Sharing ve NAT konfigürasyonu
"""
import subprocess
import json
import logging
from typing import List, Dict, Optional, Any
from datetime import datetime
from bson import ObjectId
import asyncio

# Import existing services
from .network_service import network_service
from ..database import get_database

logger = logging.getLogger(__name__)


class NATService:
    """NAT configuration and management service"""

    def __init__(self):
        self.nat_collection_name = "nat_configurations"

    async def get_available_interfaces(self) -> Dict[str, List[Dict]]:
        """
        Get available network interfaces categorized by type
        Returns interfaces suitable for WAN/LAN selection
        """
        try:
            # Mevcut network service'den interface'leri al
            all_interfaces = await network_service.get_physical_interfaces()

            # Interface'leri kategorize et
            wifi_interfaces = []
            ethernet_interfaces = []

            for interface in all_interfaces:
                if interface['type'] == 'wireless':
                    wifi_interfaces.append({
                        "name": interface['name'],
                        "display_name": interface['display_name'],
                        "type": "wireless",
                        "status": interface['status'],
                        "mac_address": interface.get('mac_address'),
                        "description": interface.get('description', f"Wi-Fi Interface ({interface['name']})")
                    })
                elif interface['type'] == 'ethernet':
                    ethernet_interfaces.append({
                        "name": interface['name'],
                        "display_name": interface['display_name'],
                        "type": "ethernet",
                        "status": interface['status'],
                        "mac_address": interface.get('mac_address'),
                        "description": interface.get('description', f"Ethernet Interface ({interface['name']})")
                    })

            return {
                "wan_candidates": wifi_interfaces,  # Wi-Fi interfaces for WAN
                "lan_candidates": ethernet_interfaces,  # Ethernet interfaces for LAN
                "all_interfaces": all_interfaces
            }

        except Exception as e:
            logger.error(f"Failed to get available interfaces: {e}")
            return {
                "wan_candidates": [],
                "lan_candidates": [],
                "all_interfaces": []
            }

    async def get_nat_configuration(self) -> Optional[Dict]:
        """Get current NAT configuration from database"""
        try:
            db = await get_database()
            collection = db[self.nat_collection_name]

            # Get latest configuration
            config = await collection.find_one({}, sort=[("created_at", -1)])

            if config:
                config['id'] = str(config['_id'])
                del config['_id']
                return config

            # Return default configuration if none exists
            return {
                "enabled": False,
                "wan_interface": "",
                "lan_interface": "",
                "dhcp_range_start": "192.168.100.100",
                "dhcp_range_end": "192.168.100.200",
                "gateway_ip": "192.168.100.1",
                "masquerade_enabled": True
            }

        except Exception as e:
            logger.error(f"Failed to get NAT configuration: {e}")
            return None

    async def save_nat_configuration(self, config: Dict, user_id: str) -> bool:
        """Save NAT configuration to database"""
        try:
            db = await get_database()
            collection = db[self.nat_collection_name]

            # Prepare configuration document
            config_doc = {
                **config,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
                "created_by": user_id,
                "configuration_type": "pc_to_pc_sharing"
            }

            # Insert new configuration
            result = await collection.insert_one(config_doc)
            logger.info(f"NAT configuration saved with ID: {result.inserted_id}")
            return True

        except Exception as e:
            logger.error(f"Failed to save NAT configuration: {e}")
            return False

    async def setup_pc_to_pc_sharing(self, wan_interface: str, lan_interface: str,
                                     dhcp_range_start: str = "192.168.100.100",
                                     dhcp_range_end: str = "192.168.100.200") -> Dict:
        """
        Setup PC-to-PC internet sharing using existing network service
        """
        try:
            logger.info(f"Setting up PC-to-PC sharing: WAN={wan_interface}, LAN={lan_interface}")

            # Validate interfaces exist
            available_interfaces = await self.get_available_interfaces()
            wan_valid = any(iface['name'] == wan_interface for iface in available_interfaces['wan_candidates'])
            lan_valid = any(iface['name'] == lan_interface for iface in available_interfaces['lan_candidates'])

            if not wan_valid:
                raise ValueError(f"Invalid WAN interface: {wan_interface}")
            if not lan_valid:
                raise ValueError(f"Invalid LAN interface: {lan_interface}")

            # Use existing network service ICS function
            success = await network_service.setup_internet_sharing(
                source_interface=wan_interface,  # WAN (Wi-Fi)
                target_interface=lan_interface,  # LAN (Ethernet)
                dhcp_range_start=dhcp_range_start,
                dhcp_range_end=dhcp_range_end
            )

            if success:
                logger.info("PC-to-PC sharing setup completed successfully")
                return {
                    "success": True,
                    "wan_interface": wan_interface,
                    "lan_interface": lan_interface,
                    "gateway_ip": "192.168.100.1",
                    "dhcp_range": f"{dhcp_range_start} - {dhcp_range_end}",
                    "masquerade_enabled": True
                }
            else:
                raise Exception("Network service setup failed")

        except Exception as e:
            logger.error(f"Failed to setup PC-to-PC sharing: {e}")
            return {
                "success": False,
                "error": str(e)
            }

    async def disable_nat(self, wan_interface: str = None, lan_interface: str = None) -> bool:
        """Disable NAT configuration and cleanup iptables rules"""
        try:
            logger.info("Disabling NAT configuration...")

            # Clean up iptables rules
            if wan_interface:
                cleanup_commands = [
                    ['iptables', '-t', 'nat', '-D', 'POSTROUTING', '-o', wan_interface, '-j', 'MASQUERADE'],
                    ['iptables', '-D', 'FORWARD', '-i', wan_interface, '-o', lan_interface, '-m', 'state', '--state',
                     'RELATED,ESTABLISHED', '-j', 'ACCEPT'],
                    ['iptables', '-D', 'FORWARD', '-i', lan_interface, '-o', wan_interface, '-j', 'ACCEPT']
                ]

                for cmd in cleanup_commands:
                    try:
                        subprocess.run(cmd, capture_output=True, text=True, timeout=10)
                    except Exception as cmd_error:
                        logger.warning(f"Cleanup command failed (may be expected): {cmd} - {cmd_error}")

            # Stop dnsmasq if running
            try:
                subprocess.run(['systemctl', 'stop', 'dnsmasq'], capture_output=True, timeout=10)
            except Exception as e:
                logger.warning(f"Failed to stop dnsmasq: {e}")

            # Disable IP forwarding
            try:
                subprocess.run(['sysctl', 'net.ipv4.ip_forward=0'], capture_output=True, timeout=10)
            except Exception as e:
                logger.warning(f"Failed to disable IP forwarding: {e}")

            logger.info("NAT disabled successfully")
            return True

        except Exception as e:
            logger.error(f"Failed to disable NAT: {e}")
            return False

    async def get_nat_status(self) -> Dict:
        """Get current NAT status from system and database"""
        try:
            # Get configuration from database
            config = await self.get_nat_configuration()
            if not config:
                return {
                    "enabled": False,
                    "status": "not_configured",
                    "message": "NAT not configured"
                }

            # Check if NAT is actually running
            status = {
                "enabled": config.get("enabled", False),
                "wan_interface": config.get("wan_interface", ""),
                "lan_interface": config.get("lan_interface", ""),
                "gateway_ip": config.get("gateway_ip", "192.168.100.1"),
                "dhcp_range_start": config.get("dhcp_range_start", "192.168.100.100"),
                "dhcp_range_end": config.get("dhcp_range_end", "192.168.100.200")
            }

            # Check IP forwarding status
            try:
                result = subprocess.run(['sysctl', 'net.ipv4.ip_forward'],
                                        capture_output=True, text=True, timeout=5)
                ip_forward_enabled = '1' in result.stdout
                status["ip_forwarding"] = ip_forward_enabled
            except:
                status["ip_forwarding"] = False

            # Check iptables NAT rules
            try:
                result = subprocess.run(['iptables', '-t', 'nat', '-L', 'POSTROUTING'],
                                        capture_output=True, text=True, timeout=5)
                masquerade_active = 'MASQUERADE' in result.stdout
                status["masquerade_active"] = masquerade_active
            except:
                status["masquerade_active"] = False

            # Determine overall status
            if config.get("enabled") and status["ip_forwarding"] and status["masquerade_active"]:
                status["status"] = "active"
                status["message"] = "NAT is active and working"
            elif config.get("enabled"):
                status["status"] = "configured_but_inactive"
                status["message"] = "NAT is configured but not fully active"
            else:
                status["status"] = "disabled"
                status["message"] = "NAT is disabled"

            return status

        except Exception as e:
            logger.error(f"Failed to get NAT status: {e}")
            return {
                "enabled": False,
                "status": "error",
                "message": f"Error checking NAT status: {str(e)}"
            }

    async def validate_interfaces(self, wan_interface: str, lan_interface: str) -> Dict:
        """Validate selected WAN and LAN interfaces"""
        try:
            available = await self.get_available_interfaces()
            errors = []
            warnings = []

            # Validate WAN interface
            wan_found = any(iface['name'] == wan_interface for iface in available['wan_candidates'])
            if not wan_found:
                errors.append(f"WAN interface '{wan_interface}' not found or not suitable for WAN")

            # Validate LAN interface
            lan_found = any(iface['name'] == lan_interface for iface in available['lan_candidates'])
            if not lan_found:
                errors.append(f"LAN interface '{lan_interface}' not found or not suitable for LAN")

            # Check if interfaces are the same
            if wan_interface == lan_interface:
                errors.append("WAN and LAN interfaces cannot be the same")

            # Check interface status
            for iface in available['all_interfaces']:
                if iface['name'] == wan_interface and iface['status'] != 'up':
                    warnings.append(f"WAN interface '{wan_interface}' is not up")
                if iface['name'] == lan_interface and iface['status'] != 'up':
                    warnings.append(f"LAN interface '{lan_interface}' is not up")

            return {
                "valid": len(errors) == 0,
                "errors": errors,
                "warnings": warnings
            }

        except Exception as e:
            logger.error(f"Interface validation failed: {e}")
            return {
                "valid": False,
                "errors": [f"Validation failed: {str(e)}"],
                "warnings": []
            }


# Create singleton instance
nat_service = NATService()