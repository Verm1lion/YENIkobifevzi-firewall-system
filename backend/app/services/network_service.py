import subprocess
import json
import re
import logging
from typing import List, Dict, Optional, Tuple
from pathlib import Path
import ipaddress
import asyncio
import os

logger = logging.getLogger(__name__)


class NetworkInterfaceService:
    """Linux network interface management service"""

    def __init__(self):
        self.netplan_config_path = "/etc/netplan/"
        self.interfaces_config_path = "/etc/network/interfaces"
        self.dnsmasq_config_path = "/etc/dnsmasq.d/netgate.conf"

    async def get_physical_interfaces(self) -> List[Dict]:
        """Fiziksel network interface'lerini tespit et"""
        try:
            interfaces = []

            # ip link show ile interface listesi al
            result = subprocess.run(['ip', 'link', 'show'],
                                    capture_output=True, text=True)

            if result.returncode != 0:
                logger.error(f"Failed to get interfaces: {result.stderr}")
                return self._get_fallback_interfaces()

            # Parse interface list
            interface_lines = result.stdout.strip().split('\n')
            current_interface = None

            for line in interface_lines:
                # Interface başlangıç satırı
                if re.match(r'^\d+:', line):
                    match = re.search(r'^\d+:\s+([^:@]+)', line)
                    if match:
                        interface_name = match.group(1).strip()

                        # Skip unwanted interfaces
                        if interface_name in ['lo', 'docker0', 'br-']:
                            continue
                        if interface_name.startswith('docker') or interface_name.startswith('br-'):
                            continue

                        current_interface = {
                            "name": interface_name,
                            "display_name": self._get_interface_display_name(interface_name),
                            "type": self._detect_interface_type(interface_name),
                            "status": "down",
                            "mac_address": None,
                            "description": f"{interface_name.upper()} Network Interface"
                        }

                        # Status detection
                        if 'state UP' in line:
                            current_interface["status"] = "up"
                        elif 'state DOWN' in line:
                            current_interface["status"] = "down"

                # MAC address satırı
                elif 'link/ether' in line and current_interface:
                    mac_match = re.search(r'link/ether\s+([a-fA-F0-9:]{17})', line)
                    if mac_match:
                        current_interface["mac_address"] = mac_match.group(1)

                    # Interface'i listeye ekle
                    interfaces.append(current_interface)
                    current_interface = None

            return interfaces if interfaces else self._get_fallback_interfaces()

        except Exception as e:
            logger.error(f"Failed to get physical interfaces: {e}")
            return self._get_fallback_interfaces()

    def _get_fallback_interfaces(self) -> List[Dict]:
        """Fallback interface listesi"""
        return [
            {
                "name": "eth0",
                "display_name": "Ethernet 1",
                "type": "ethernet",
                "status": "up",
                "mac_address": "00:11:22:33:44:55",
                "description": "Primary Ethernet Interface"
            },
            {
                "name": "wlan0",
                "display_name": "Wi-Fi",
                "type": "wireless",
                "status": "up",
                "mac_address": "AA:BB:CC:DD:EE:FF",
                "description": "Wireless Network Interface"
            }
        ]

    def _detect_interface_type(self, interface_name: str) -> str:
        """Interface tipini tespit et"""
        if interface_name.startswith('eth'):
            return 'ethernet'
        elif interface_name.startswith('wlan') or interface_name.startswith('wlp'):
            return 'wireless'
        elif interface_name.startswith('enp'):
            return 'ethernet'
        elif interface_name.startswith('wlx'):
            return 'wireless'
        else:
            return 'ethernet'

    def _get_interface_display_name(self, interface_name: str) -> str:
        """Interface için görünen ad oluştur"""
        type_map = {
            'eth0': 'Ethernet 1',
            'eth1': 'Ethernet 2',
            'wlan0': 'Wi-Fi',
            'wlan1': 'Wi-Fi 2',
            'enp0s3': 'Ethernet 1',
            'enp0s8': 'Ethernet 2',
            'wlp2s0': 'Wi-Fi'
        }
        return type_map.get(interface_name, interface_name.upper())

    async def configure_static_ip(self, interface_name: str, config: Dict) -> bool:
        """Statik IP yapılandırması"""
        try:
            logger.info(f"Configuring static IP for {interface_name}: {config}")

            commands = []

            # Interface'i flush et
            commands.append(['ip', 'addr', 'flush', 'dev', interface_name])

            # Static IP ata
            if config.get('ip_address') and config.get('subnet_mask'):
                cidr = self._netmask_to_cidr(config['subnet_mask'])
                commands.append([
                    'ip', 'addr', 'add',
                    f"{config['ip_address']}/{cidr}",
                    'dev', interface_name
                ])

            # Interface'i up yap
            commands.append(['ip', 'link', 'set', interface_name, 'up'])

            # Gateway ekle
            if config.get('gateway'):
                # Önce default route'u sil (hata vermesi normal)
                subprocess.run(['ip', 'route', 'del', 'default'], capture_output=True)
                commands.append([
                    'ip', 'route', 'add', 'default',
                    'via', config['gateway'],
                    'dev', interface_name
                ])

            # MTU ayarla
            if config.get('mtu_size'):
                commands.append([
                    'ip', 'link', 'set', 'dev', interface_name,
                    'mtu', str(config['mtu_size'])
                ])

            # Komutları çalıştır
            for cmd in commands:
                result = subprocess.run(cmd, capture_output=True, text=True)
                logger.info(f"Command: {' '.join(cmd)} - Return code: {result.returncode}")
                if result.returncode != 0:
                    logger.warning(f"Command warning: {result.stderr}")

            # DNS yapılandır
            if config.get('dns_primary') or config.get('dns_secondary'):
                await self._configure_dns(config)

            logger.info(f"Static IP configuration completed for {interface_name}")
            return True

        except Exception as e:
            logger.error(f"Failed to configure static IP: {e}")
            return False

    async def configure_dhcp(self, interface_name: str) -> bool:
        """DHCP yapılandırması"""
        try:
            logger.info(f"Configuring DHCP for {interface_name}")

            # dhclient'i sonlandır
            subprocess.run(['pkill', 'dhclient'], capture_output=True)

            # Interface'i flush et
            subprocess.run(['ip', 'addr', 'flush', 'dev', interface_name], capture_output=True)

            # Interface'i up yap
            result = subprocess.run(['ip', 'link', 'set', interface_name, 'up'],
                                    capture_output=True, text=True)
            if result.returncode != 0:
                logger.error(f"Failed to bring up interface: {result.stderr}")
                return False

            # DHCP başlat
            result = subprocess.run(['dhclient', interface_name],
                                    capture_output=True, text=True)

            logger.info(f"DHCP configuration completed for {interface_name}")
            return True

        except Exception as e:
            logger.error(f"Failed to configure DHCP: {e}")
            return False

    async def enable_interface(self, interface_name: str) -> bool:
        """Interface'i aktif et"""
        try:
            result = subprocess.run(['ip', 'link', 'set', interface_name, 'up'],
                                    capture_output=True, text=True)
            success = result.returncode == 0

            if success:
                logger.info(f"Interface {interface_name} enabled")
            else:
                logger.error(f"Failed to enable {interface_name}: {result.stderr}")

            return success

        except Exception as e:
            logger.error(f"Failed to enable interface {interface_name}: {e}")
            return False

    async def disable_interface(self, interface_name: str) -> bool:
        """Interface'i deaktif et"""
        try:
            result = subprocess.run(['ip', 'link', 'set', interface_name, 'down'],
                                    capture_output=True, text=True)
            success = result.returncode == 0

            if success:
                logger.info(f"Interface {interface_name} disabled")
            else:
                logger.error(f"Failed to disable {interface_name}: {result.stderr}")

            return success

        except Exception as e:
            logger.error(f"Failed to disable interface {interface_name}: {e}")
            return False

    async def setup_internet_sharing(self, source_interface: str, target_interface: str,
                                     dhcp_range_start: str = "192.168.100.100",
                                     dhcp_range_end: str = "192.168.100.200") -> bool:
        """Internet Connection Sharing (ICS) kurulumu"""
        try:
            logger.info(f"Setting up ICS: {source_interface} -> {target_interface}")

            # IP forwarding aktif et
            subprocess.run(['sysctl', 'net.ipv4.ip_forward=1'], capture_output=True)

            # Target interface'e statik IP ata
            target_ip = "192.168.100.1"
            target_config = {
                'ip_address': target_ip,
                'subnet_mask': '255.255.255.0'
            }

            success = await self.configure_static_ip(target_interface, target_config)
            if not success:
                logger.error("Failed to configure target interface for ICS")
                return False

            # iptables NAT kuralları
            nat_commands = [
                ['iptables', '-t', 'nat', '-F', 'POSTROUTING'],  # Temizle
                ['iptables', '-t', 'nat', '-A', 'POSTROUTING', '-o', source_interface, '-j', 'MASQUERADE'],
                ['iptables', '-A', 'FORWARD', '-i', source_interface, '-o', target_interface, '-m', 'state', '--state',
                 'RELATED,ESTABLISHED', '-j', 'ACCEPT'],
                ['iptables', '-A', 'FORWARD', '-i', target_interface, '-o', source_interface, '-j', 'ACCEPT']
            ]

            for cmd in nat_commands:
                result = subprocess.run(cmd, capture_output=True, text=True)
                if result.returncode != 0:
                    logger.warning(f"NAT command warning: {' '.join(cmd)} - {result.stderr}")

            # DHCP server kurulumu
            await self._setup_dhcp_server(target_interface, dhcp_range_start, dhcp_range_end)

            logger.info(f"ICS setup completed: {source_interface} -> {target_interface}")
            return True

        except Exception as e:
            logger.error(f"Failed to setup ICS: {e}")
            return False

    async def _setup_dhcp_server(self, interface: str, range_start: str, range_end: str):
        """DHCP server yapılandırması (dnsmasq)"""
        try:
            # dnsmasq konfigürasyonu
            config_content = f"""# NetGate Firewall DHCP Configuration
interface={interface}
dhcp-range={range_start},{range_end},24h
dhcp-option=3,192.168.100.1
dhcp-option=6,8.8.8.8,8.8.4.4
bind-interfaces
"""

            # Config dosyasını yaz
            os.makedirs('/etc/dnsmasq.d', exist_ok=True)
            with open(self.dnsmasq_config_path, 'w') as f:
                f.write(config_content)

            # dnsmasq'i yeniden başlat
            subprocess.run(['systemctl', 'restart', 'dnsmasq'], capture_output=True)
            subprocess.run(['systemctl', 'enable', 'dnsmasq'], capture_output=True)

            logger.info(f"DHCP server configured for {interface}")

        except Exception as e:
            logger.error(f"Failed to setup DHCP server: {e}")

    async def _configure_dns(self, config: Dict):
        """DNS yapılandırması"""
        try:
            dns_servers = []
            if config.get('dns_primary'):
                dns_servers.append(config['dns_primary'])
            if config.get('dns_secondary'):
                dns_servers.append(config['dns_secondary'])

            if dns_servers:
                dns_content = "# Generated by NetGate Firewall\n"
                for dns in dns_servers:
                    dns_content += f"nameserver {dns}\n"

                with open('/etc/resolv.conf', 'w') as f:
                    f.write(dns_content)

                logger.info(f"DNS configured: {dns_servers}")

        except Exception as e:
            logger.error(f"Failed to configure DNS: {e}")

    def _netmask_to_cidr(self, netmask: str) -> int:
        """Netmask'i CIDR formatına çevir"""
        try:
            return ipaddress.IPv4Network(f"0.0.0.0/{netmask}").prefixlen
        except:
            return 24

    async def get_interface_statistics(self, interface_name: str) -> Dict:
        """Interface istatistiklerini al"""
        try:
            result = subprocess.run(['cat', f'/sys/class/net/{interface_name}/statistics/rx_bytes'],
                                    capture_output=True, text=True)
            rx_bytes = int(result.stdout.strip()) if result.returncode == 0 else 0

            result = subprocess.run(['cat', f'/sys/class/net/{interface_name}/statistics/tx_bytes'],
                                    capture_output=True, text=True)
            tx_bytes = int(result.stdout.strip()) if result.returncode == 0 else 0

            result = subprocess.run(['cat', f'/sys/class/net/{interface_name}/statistics/rx_packets'],
                                    capture_output=True, text=True)
            rx_packets = int(result.stdout.strip()) if result.returncode == 0 else 0

            result = subprocess.run(['cat', f'/sys/class/net/{interface_name}/statistics/tx_packets'],
                                    capture_output=True, text=True)
            tx_packets = int(result.stdout.strip()) if result.returncode == 0 else 0

            return {
                "bytes_received": rx_bytes,
                "bytes_transmitted": tx_bytes,
                "packets_received": rx_packets,
                "packets_transmitted": tx_packets,
                "errors": 0,
                "drops": 0
            }

        except Exception as e:
            logger.error(f"Failed to get interface statistics: {e}")
            return {
                "bytes_received": 0,
                "bytes_transmitted": 0,
                "packets_received": 0,
                "packets_transmitted": 0,
                "errors": 0,
                "drops": 0
            }


# Singleton instance
network_service = NetworkInterfaceService()