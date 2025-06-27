"""
Log Service - Comprehensive log processing and analysis service
Handles PC-to-PC Internet Sharing traffic logging, analysis, and real-time monitoring
"""
import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from pymongo import ASCENDING, DESCENDING
from bson import ObjectId
import ipaddress
import json
import re
import subprocess
import os
from collections import defaultdict, Counter

from ..database import get_database
from .network_service import network_service

# Configure logging
logger = logging.getLogger(__name__)

class LogService:
    """Comprehensive log service for firewall and network traffic analysis"""

    def __init__(self):
        self.db = None
        self.cache = {
            "recent_logs": [],
            "stats": {},
            "alerts": [],
            "last_update": None
        }
        self.log_levels = {
            "ALLOW": {"severity": 1, "color": "green", "turkish": "İzin Verildi"},
            "BLOCK": {"severity": 4, "color": "red", "turkish": "Engellendi"},
            "DENY": {"severity": 4, "color": "red", "turkish": "Reddedildi"},
            "WARNING": {"severity": 3, "color": "yellow", "turkish": "Uyarı"},
            "INFO": {"severity": 2, "color": "blue", "turkish": "Bilgi"},
            "ERROR": {"severity": 5, "color": "red", "turkish": "Hata"},
            "CRITICAL": {"severity": 5, "color": "red", "turkish": "Kritik"},
            "DEBUG": {"severity": 1, "color": "gray", "turkish": "Hata Ayıklama"}
        }
        # PC-to-PC traffic monitoring
        self.pc_to_pc_active = False
        self.monitored_interfaces = {"wan": None, "lan": None}
        self.traffic_patterns = {}

    async def initialize(self):
        """Initialize log service and database connection"""
        try:
            self.db = await get_database()
            await self._ensure_indexes()
            await self._setup_pc_to_pc_monitoring()
            logger.info("✅ Log service initialized successfully")
        except Exception as e:
            logger.error(f"❌ Failed to initialize log service: {e}")
            raise

    async def _ensure_indexes(self):
        """Ensure required database indexes exist for optimal performance"""
        try:
            # System logs indexes
            await self.db.system_logs.create_index([
                ("timestamp", DESCENDING),
                ("level", ASCENDING)
            ], name="timestamp_level_idx")

            await self.db.system_logs.create_index([
                ("source_ip", ASCENDING),
                ("timestamp", DESCENDING)
            ], name="source_ip_time_idx")

            await self.db.system_logs.create_index([
                ("event_type", ASCENDING),
                ("timestamp", DESCENDING)
            ], name="event_type_time_idx")

            # Network activity indexes
            await self.db.network_activity.create_index([
                ("timestamp", DESCENDING)
            ], name="network_timestamp_idx")

            await self.db.network_activity.create_index([
                ("source_ip", ASCENDING),
                ("destination_ip", ASCENDING),
                ("timestamp", DESCENDING)
            ], name="network_connection_idx")

            # PC-to-PC traffic indexes
            await self.db.pc_to_pc_traffic.create_index([
                ("timestamp", DESCENDING)
            ], name="pc_traffic_timestamp_idx")

            # Security alerts indexes
            await self.db.security_alerts.create_index([
                ("timestamp", DESCENDING),
                ("severity", ASCENDING)
            ], name="alerts_time_severity_idx")

            logger.info("✅ Database indexes ensured")
        except Exception as e:
            logger.warning(f"⚠️ Index creation warning: {e}")

    async def _setup_pc_to_pc_monitoring(self):
        """Setup PC-to-PC traffic monitoring"""
        try:
            # Check if NAT is active
            nat_config = await self._get_nat_configuration()
            if nat_config and nat_config.get("enabled"):
                self.pc_to_pc_active = True
                self.monitored_interfaces["wan"] = nat_config.get("wan_interface")
                self.monitored_interfaces["lan"] = nat_config.get("lan_interface")
                logger.info(f"✅ PC-to-PC monitoring active: WAN={self.monitored_interfaces['wan']}, LAN={self.monitored_interfaces['lan']}")
            else:
                logger.info("ℹ️ PC-to-PC monitoring not active - NAT not configured")
        except Exception as e:
            logger.error(f"❌ Failed to setup PC-to-PC monitoring: {e}")

    async def _get_nat_configuration(self):
        """Get NAT configuration from database"""
        try:
            nat_config = await self.db.nat_configurations.find_one({}, sort=[("created_at", -1)])
            return nat_config
        except Exception as e:
            logger.error(f"Failed to get NAT config: {e}")
            return None

    async def monitor_network_traffic(self):
        """Monitor network traffic for PC-to-PC connections"""
        try:
            if not self.pc_to_pc_active:
                return

            # Parse system logs for network activity
            await self._parse_system_logs()

            # Monitor UFW logs
            await self._parse_ufw_logs()

            # Monitor iptables logs
            await self._parse_iptables_logs()

            # Monitor netstat for active connections
            await self._monitor_active_connections()

        except Exception as e:
            logger.error(f"❌ Network traffic monitoring failed: {e}")

    async def _parse_system_logs(self):
        """Parse system logs for network-related events"""
        try:
            # Read recent system logs
            log_files = ['/var/log/syslog', '/var/log/kern.log', '/var/log/messages']

            for log_file in log_files:
                if os.path.exists(log_file):
                    await self._process_log_file(log_file)

        except Exception as e:
            logger.error(f"Failed to parse system logs: {e}")

    async def _parse_ufw_logs(self):
        """Parse UFW firewall logs"""
        try:
            ufw_log_file = '/var/log/ufw.log'
            if os.path.exists(ufw_log_file):
                with open(ufw_log_file, 'r') as f:
                    lines = f.readlines()

                for line in lines[-100:]:  # Process last 100 lines
                    if 'UFW' in line:
                        await self._process_ufw_log_line(line)

        except Exception as e:
            logger.error(f"Failed to parse UFW logs: {e}")

    async def _parse_iptables_logs(self):
        """Parse iptables logs for blocked/allowed connections"""
        try:
            # Check dmesg for iptables messages
            result = subprocess.run(['dmesg', '-T'], capture_output=True, text=True, timeout=10)
            if result.returncode == 0:
                lines = result.stdout.split('\n')
                for line in lines[-50:]:  # Process last 50 lines
                    if 'iptables' in line.lower() or 'dropped' in line.lower():
                        await self._process_iptables_log_line(line)

        except Exception as e:
            logger.error(f"Failed to parse iptables logs: {e}")

    async def _monitor_active_connections(self):
        """Monitor active network connections"""
        try:
            # Use netstat to get active connections
            result = subprocess.run(['netstat', '-tuln'], capture_output=True, text=True, timeout=10)
            if result.returncode == 0:
                await self._process_netstat_output(result.stdout)

            # Use ss for more detailed connection info
            result = subprocess.run(['ss', '-tuln'], capture_output=True, text=True, timeout=10)
            if result.returncode == 0:
                await self._process_ss_output(result.stdout)

        except Exception as e:
            logger.error(f"Failed to monitor active connections: {e}")

    async def _process_log_file(self, log_file: str):
        """Process individual log file"""
        try:
            with open(log_file, 'r') as f:
                lines = f.readlines()

            for line in lines[-100:]:  # Process last 100 lines
                if any(keyword in line.lower() for keyword in ['network', 'connection', 'tcp', 'udp', 'blocked', 'dropped']):
                    await self._create_log_entry_from_line(line, log_file)

        except Exception as e:
            logger.error(f"Failed to process log file {log_file}: {e}")

    async def _process_ufw_log_line(self, line: str):
        """Process UFW log line and create structured log entry"""
        try:
            # Parse UFW log format
            # Example: Dec 26 14:07:11 hostname kernel: [UFW BLOCK] IN=eth0 OUT= MAC=... SRC=192.168.1.10 DST=192.168.1.1 LEN=60 TOS=0x00 PREC=0x00 TTL=64 ID=12345 PROTO=TCP SPT=12345 DPT=80

            ufw_match = re.search(r'\[UFW (BLOCK|ALLOW)\].*SRC=(\d+\.\d+\.\d+\.\d+).*DST=(\d+\.\d+\.\d+\.\d+).*PROTO=(\w+).*DPT=(\d+)', line)
            if ufw_match:
                action, src_ip, dst_ip, protocol, dst_port = ufw_match.groups()

                log_entry = {
                    "timestamp": datetime.utcnow(),
                    "level": "BLOCK" if action == "BLOCK" else "ALLOW",
                    "source": "UFW",
                    "event_type": "firewall_rule",
                    "source_ip": src_ip,
                    "destination_ip": dst_ip,
                    "protocol": protocol,
                    "destination_port": int(dst_port),
                    "message": f"UFW {action}: {src_ip} → {dst_ip}:{dst_port} ({protocol})",
                    "raw_log": line.strip()
                }

                await self._save_log_entry(log_entry)

        except Exception as e:
            logger.error(f"Failed to process UFW log line: {e}")

    async def _process_iptables_log_line(self, line: str):
        """Process iptables log line"""
        try:
            # Parse iptables log format
            if 'SRC=' in line and 'DST=' in line:
                src_match = re.search(r'SRC=(\d+\.\d+\.\d+\.\d+)', line)
                dst_match = re.search(r'DST=(\d+\.\d+\.\d+\.\d+)', line)
                proto_match = re.search(r'PROTO=(\w+)', line)
                dpt_match = re.search(r'DPT=(\d+)', line)

                if src_match and dst_match:
                    log_entry = {
                        "timestamp": datetime.utcnow(),
                        "level": "BLOCK" if "dropped" in line.lower() else "INFO",
                        "source": "iptables",
                        "event_type": "packet_filter",
                        "source_ip": src_match.group(1),
                        "destination_ip": dst_match.group(1),
                        "protocol": proto_match.group(1) if proto_match else "UNKNOWN",
                        "destination_port": int(dpt_match.group(1)) if dpt_match else None,
                        "message": f"Packet filtered: {src_match.group(1)} → {dst_match.group(1)}",
                        "raw_log": line.strip()
                    }

                    await self._save_log_entry(log_entry)

        except Exception as e:
            logger.error(f"Failed to process iptables log line: {e}")

    async def _process_netstat_output(self, output: str):
        """Process netstat output for active connections"""
        try:
            lines = output.split('\n')
            for line in lines:
                if 'ESTABLISHED' in line or 'LISTEN' in line:
                    parts = line.split()
                    if len(parts) >= 4:
                        protocol = parts[0]
                        local_addr = parts[3]
                        foreign_addr = parts[4] if len(parts) > 4 else "unknown"
                        state = parts[5] if len(parts) > 5 else "unknown"

                        # Create connection log entry
                        log_entry = {
                            "timestamp": datetime.utcnow(),
                            "level": "INFO",
                            "source": "netstat",
                            "event_type": "active_connection",
                            "protocol": protocol.upper(),
                            "local_address": local_addr,
                            "foreign_address": foreign_addr,
                            "connection_state": state,
                            "message": f"Active connection: {local_addr} ↔ {foreign_addr} ({protocol})"
                        }

                        await self._save_connection_log(log_entry)

        except Exception as e:
            logger.error(f"Failed to process netstat output: {e}")

    async def _process_ss_output(self, output: str):
        """Process ss command output for detailed connection info"""
        try:
            lines = output.split('\n')
            for line in lines[1:]:  # Skip header
                if line.strip():
                    parts = line.split()
                    if len(parts) >= 5:
                        protocol = parts[0]
                        state = parts[1]
                        local_addr = parts[4]
                        foreign_addr = parts[5] if len(parts) > 5 else "unknown"

                        # Extract IPs and ports
                        local_ip, local_port = self._parse_address(local_addr)
                        foreign_ip, foreign_port = self._parse_address(foreign_addr)

                        if local_ip and foreign_ip:
                            log_entry = {
                                "timestamp": datetime.utcnow(),
                                "level": "INFO",
                                "source": "ss",
                                "event_type": "connection_detail",
                                "protocol": protocol.upper(),
                                "source_ip": local_ip,
                                "destination_ip": foreign_ip,
                                "source_port": local_port,
                                "destination_port": foreign_port,
                                "connection_state": state,
                                "message": f"Connection: {local_ip}:{local_port} → {foreign_ip}:{foreign_port} ({protocol})"
                            }

                            await self._save_connection_log(log_entry)

        except Exception as e:
            logger.error(f"Failed to process ss output: {e}")

    def _parse_address(self, addr: str) -> Tuple[Optional[str], Optional[int]]:
        """Parse IP:port address"""
        try:
            if ':' in addr:
                parts = addr.rsplit(':', 1)
                ip = parts[0].strip('[]')  # Remove brackets for IPv6
                port = int(parts[1]) if parts[1] != '*' else None
                return ip, port
            return None, None
        except Exception:
            return None, None

    async def _save_log_entry(self, log_entry: Dict[str, Any]):
        """Save log entry to database"""
        try:
            if not self.db:
                await self.initialize()

            await self.db.system_logs.insert_one(log_entry)

            # Also save to PC-to-PC traffic if relevant
            if self._is_pc_to_pc_traffic(log_entry):
                await self._save_pc_to_pc_traffic(log_entry)

        except Exception as e:
            logger.error(f"Failed to save log entry: {e}")

    async def _save_connection_log(self, log_entry: Dict[str, Any]):
        """Save connection log to network activity collection"""
        try:
            if not self.db:
                await self.initialize()

            await self.db.network_activity.insert_one(log_entry)

        except Exception as e:
            logger.error(f"Failed to save connection log: {e}")

    async def _save_pc_to_pc_traffic(self, log_entry: Dict[str, Any]):
        """Save PC-to-PC specific traffic log"""
        try:
            pc_traffic_entry = {
                **log_entry,
                "traffic_type": "pc_to_pc",
                "wan_interface": self.monitored_interfaces["wan"],
                "lan_interface": self.monitored_interfaces["lan"]
            }

            await self.db.pc_to_pc_traffic.insert_one(pc_traffic_entry)

        except Exception as e:
            logger.error(f"Failed to save PC-to-PC traffic: {e}")

    def _is_pc_to_pc_traffic(self, log_entry: Dict[str, Any]) -> bool:
        """Check if log entry is PC-to-PC traffic"""
        try:
            if not self.pc_to_pc_active:
                return False

            src_ip = log_entry.get("source_ip")
            dst_ip = log_entry.get("destination_ip")

            if src_ip and dst_ip:
                # Check if traffic is between monitored networks
                src_private = ipaddress.ip_address(src_ip).is_private
                dst_private = ipaddress.ip_address(dst_ip).is_private

                # PC-to-PC traffic: one private (LAN) and one could be public (WAN)
                return src_private or dst_private

        except Exception:
            return False

    async def get_logs(self,
                       page: int = 1,
                       per_page: int = 50,
                       level: Optional[str] = None,
                       source: Optional[str] = None,
                       start_date: Optional[datetime] = None,
                       end_date: Optional[datetime] = None,
                       search: Optional[str] = None,
                       source_ip: Optional[str] = None) -> Dict[str, Any]:
        """Get filtered and paginated logs with comprehensive search capabilities"""
        try:
            if not self.db:
                await self.initialize()

            # Build query
            query = {}

            # Date range filter
            if start_date or end_date:
                date_filter = {}
                if start_date:
                    date_filter["$gte"] = start_date
                if end_date:
                    date_filter["$lte"] = end_date
                query["timestamp"] = date_filter

            # Level filter
            if level and level != "ALL":
                query["level"] = level.upper()

            # Source filter
            if source:
                query["source"] = {"$regex": source, "$options": "i"}

            # Source IP filter
            if source_ip:
                query["source_ip"] = source_ip

            # Search filter
            if search:
                search_regex = {"$regex": search, "$options": "i"}
                query["$or"] = [
                    {"message": search_regex},
                    {"details": search_regex},
                    {"source_ip": search_regex},
                    {"destination_ip": search_regex}
                ]

            # Calculate pagination
            skip = (page - 1) * per_page

            # Get total count
            total_count = await self.db.system_logs.count_documents(query)

            # Get logs with sorting
            cursor = self.db.system_logs.find(query).sort("timestamp", DESCENDING).skip(skip).limit(per_page)
            logs = await cursor.to_list(length=per_page)

            # Process logs for frontend
            processed_logs = []
            for log in logs:
                processed_log = await self._process_log_entry(log)
                processed_logs.append(processed_log)

            # Calculate pagination info
            total_pages = (total_count + per_page - 1) // per_page
            has_next = page < total_pages
            has_prev = page > 1

            return {
                "success": True,
                "data": processed_logs,
                "pagination": {
                    "current_page": page,
                    "per_page": per_page,
                    "total_count": total_count,
                    "total_pages": total_pages,
                    "has_next": has_next,
                    "has_prev": has_prev
                },
                "filters_applied": {
                    "level": level,
                    "source": source,
                    "source_ip": source_ip,
                    "search": search,
                    "date_range": bool(start_date or end_date)
                }
            }

        except Exception as e:
            logger.error(f"❌ Failed to get logs: {e}")
            return {"success": False, "error": str(e), "data": []}

    async def _process_log_entry(self, log: Dict[str, Any]) -> Dict[str, Any]:
        """Process raw log entry for frontend display"""
        try:
            # Convert ObjectId to string
            log["id"] = str(log.get("_id", ""))
            if "_id" in log:
                del log["_id"]

            # Format timestamp
            if "timestamp" in log:
                log["formatted_time"] = log["timestamp"].strftime("%d.%m.%Y %H:%M:%S")
                log["time_ago"] = self._get_time_ago(log["timestamp"])

            # Add level information
            level = log.get("level", "INFO")
            level_info = self.log_levels.get(level, self.log_levels["INFO"])
            log["level_info"] = {
                "severity": level_info["severity"],
                "color": level_info["color"],
                "turkish": level_info["turkish"]
            }

            # Process source IP information
            if log.get("source_ip"):
                log["source_info"] = await self._get_ip_info(log["source_ip"])

            # Process destination IP information
            if log.get("destination_ip"):
                log["destination_info"] = await self._get_ip_info(log["destination_ip"])

            # Add protocol information
            if log.get("protocol"):
                log["protocol_info"] = self._get_protocol_info(log["protocol"])

            # Add port information
            if log.get("destination_port"):
                log["port_info"] = self._get_port_info(log["destination_port"])

            # Format message for Turkish UI
            log["display_message"] = self._format_message_for_display(log)

            # Add action badge info
            log["action_badge"] = self._get_action_badge(log)

            return log

        except Exception as e:
            logger.error(f"⚠️ Error processing log entry: {e}")
            return log

    def _get_time_ago(self, timestamp: datetime) -> str:
        """Get human-readable time difference in Turkish"""
        try:
            now = datetime.utcnow()
            diff = now - timestamp

            if diff.days > 0:
                return f"{diff.days} gün önce"
            elif diff.seconds > 3600:
                hours = diff.seconds // 3600
                return f"{hours} saat önce"
            elif diff.seconds > 60:
                minutes = diff.seconds // 60
                return f"{minutes} dakika önce"
            else:
                return "Az önce"
        except Exception:
            return "Bilinmiyor"

    async def _get_ip_info(self, ip: str) -> Dict[str, Any]:
        """Get IP address information and classification"""
        try:
            ip_obj = ipaddress.ip_address(ip)
            info = {
                "ip": ip,
                "type": "IPv4" if ip_obj.version == 4 else "IPv6",
                "is_private": ip_obj.is_private,
                "is_loopback": ip_obj.is_loopback,
                "is_multicast": ip_obj.is_multicast
            }

            # Classify IP for Turkish display
            if ip_obj.is_private:
                if ip.startswith("192.168."):
                    info["classification"] = "Yerel Ağ"
                    info["description"] = "İç ağ adresi"
                elif ip.startswith("10."):
                    info["classification"] = "Özel Ağ"
                    info["description"] = "Kurumsal ağ adresi"
                else:
                    info["classification"] = "Özel IP"
                    info["description"] = "Özel ağ adresi"
            elif ip_obj.is_loopback:
                info["classification"] = "Yerel Makine"
                info["description"] = "Kendi bilgisayar"
            else:
                info["classification"] = "İnternet"
                info["description"] = "Harici IP adresi"

            return info

        except Exception as e:
            logger.error(f"⚠️ Error getting IP info for {ip}: {e}")
            return {"ip": ip, "classification": "Bilinmiyor", "description": "IP bilgisi alınamadı"}

    def _get_protocol_info(self, protocol: str) -> Dict[str, Any]:
        """Get protocol information for display"""
        protocol_map = {
            "TCP": {"name": "TCP", "description": "Güvenilir veri iletimi", "port_type": "Bağlantı tabanlı"},
            "UDP": {"name": "UDP", "description": "Hızlı veri iletimi", "port_type": "Bağlantısız"},
            "ICMP": {"name": "ICMP", "description": "Ağ kontrol mesajları", "port_type": "Kontrol protokolü"},
            "HTTP": {"name": "HTTP", "description": "Web trafiği", "port_type": "Uygulama protokolü"},
            "HTTPS": {"name": "HTTPS", "description": "Güvenli web trafiği", "port_type": "Güvenli protokol"},
            "FTP": {"name": "FTP", "description": "Dosya transferi", "port_type": "Transfer protokolü"},
            "SSH": {"name": "SSH", "description": "Güvenli uzak erişim", "port_type": "Güvenli protokol"}
        }
        return protocol_map.get(protocol.upper(), {
            "name": protocol,
            "description": "Bilinmeyen protokol",
            "port_type": "Diğer"
        })

    def _get_port_info(self, port: int) -> Dict[str, Any]:
        """Get port information and classification"""
        well_known_ports = {
            20: {"service": "FTP Data", "description": "FTP veri transferi", "risk": "MEDIUM"},
            21: {"service": "FTP Control", "description": "FTP kontrol", "risk": "MEDIUM"},
            22: {"service": "SSH", "description": "Güvenli uzak erişim", "risk": "HIGH"},
            23: {"service": "Telnet", "description": "Uzak terminal", "risk": "HIGH"},
            25: {"service": "SMTP", "description": "E-posta gönderimi", "risk": "LOW"},
            53: {"service": "DNS", "description": "Alan adı çözümleme", "risk": "LOW"},
            80: {"service": "HTTP", "description": "Web trafiği", "risk": "LOW"},
            110: {"service": "POP3", "description": "E-posta alma", "risk": "LOW"},
            143: {"service": "IMAP", "description": "E-posta erişimi", "risk": "LOW"},
            443: {"service": "HTTPS", "description": "Güvenli web trafiği", "risk": "LOW"},
            993: {"service": "IMAPS", "description": "Güvenli IMAP", "risk": "LOW"},
            995: {"service": "POP3S", "description": "Güvenli POP3", "risk": "LOW"},
            1433: {"service": "MSSQL", "description": "SQL Server", "risk": "HIGH"},
            3306: {"service": "MySQL", "description": "MySQL veritabanı", "risk": "HIGH"},
            3389: {"service": "RDP", "description": "Uzak masaüstü", "risk": "HIGH"},
            5432: {"service": "PostgreSQL", "description": "PostgreSQL veritabanı", "risk": "HIGH"}
        }

        if port in well_known_ports:
            return well_known_ports[port]
        elif port < 1024:
            return {"service": "Sistem Portu", "description": f"Ayrılmış sistem portu ({port})", "risk": "MEDIUM"}
        elif port < 49152:
            return {"service": "Kayıtlı Port", "description": f"Kayıtlı uygulama portu ({port})", "risk": "LOW"}
        else:
            return {"service": "Dinamik Port", "description": f"Dinamik/özel port ({port})", "risk": "LOW"}

    def _format_message_for_display(self, log: Dict[str, Any]) -> str:
        """Format log message for Turkish display"""
        try:
            level = log.get("level", "INFO")
            source_ip = log.get("source_ip", "")
            dest_ip = log.get("destination_ip", "")
            protocol = log.get("protocol", "")
            dest_port = log.get("destination_port", "")

            # Use existing message if available
            if log.get("message") and not log["message"].startswith("Raw"):
                base_message = log["message"]
            else:
                # Generate message based on log data
                if level == "BLOCK":
                    base_message = "Bağlantı Engellendi"
                elif level == "ALLOW":
                    base_message = "Bağlantı İzni Verildi"
                elif level == "DENY":
                    base_message = "Erişim Reddedildi"
                elif level == "WARNING":
                    base_message = "Güvenlik Uyarısı"
                else:
                    base_message = log.get("message", "Sistem Etkinliği")

            # Add connection details if available
            if source_ip and dest_ip:
                if dest_port:
                    detail = f" ({source_ip} → {dest_ip}:{dest_port})"
                else:
                    detail = f" ({source_ip} → {dest_ip})"
                if protocol:
                    detail += f" [{protocol}]"
                return base_message + detail

            return base_message

        except Exception as e:
            logger.error(f"⚠️ Error formatting message: {e}")
            return log.get("message", "Log mesajı formatlanamadı")

    def _get_action_badge(self, log: Dict[str, Any]) -> Dict[str, str]:
        """Get action badge information for UI"""
        level = log.get("level", "INFO")
        badge_map = {
            "ALLOW": {"color": "success", "text": "İzin", "icon": "check"},
            "BLOCK": {"color": "danger", "text": "Engel", "icon": "block"},
            "DENY": {"color": "danger", "text": "Red", "icon": "x"},
            "WARNING": {"color": "warning", "text": "Uyarı", "icon": "alert-triangle"},
            "ERROR": {"color": "danger", "text": "Hata", "icon": "alert-circle"},
            "CRITICAL": {"color": "danger", "text": "Kritik", "icon": "alert-octagon"},
            "INFO": {"color": "info", "text": "Bilgi", "icon": "info"},
            "DEBUG": {"color": "secondary", "text": "Debug", "icon": "bug"}
        }
        return badge_map.get(level, badge_map["INFO"])

    async def get_log_statistics(self, time_range: str = "24h") -> Dict[str, Any]:
        """Get comprehensive log statistics for dashboard"""
        try:
            if not self.db:
                await self.initialize()

            # Calculate time range
            now = datetime.utcnow()
            if time_range == "1h":
                start_time = now - timedelta(hours=1)
            elif time_range == "24h":
                start_time = now - timedelta(hours=24)
            elif time_range == "7d":
                start_time = now - timedelta(days=7)
            elif time_range == "30d":
                start_time = now - timedelta(days=30)
            else:
                start_time = now - timedelta(hours=24)

            # Base query
            base_query = {"timestamp": {"$gte": start_time}}

            # Get total log count
            total_logs = await self.db.system_logs.count_documents(base_query)

            # Get logs by level
            level_pipeline = [
                {"$match": base_query},
                {"$group": {"_id": "$level", "count": {"$sum": 1}}},
                {"$sort": {"count": -1}}
            ]
            level_stats = await self.db.system_logs.aggregate(level_pipeline).to_list(length=None)

            # Get logs by source
            source_pipeline = [
                {"$match": base_query},
                {"$group": {"_id": "$source", "count": {"$sum": 1}}},
                {"$sort": {"count": -1}},
                {"$limit": 10}
            ]
            source_stats = await self.db.system_logs.aggregate(source_pipeline).to_list(length=None)

            # Get top source IPs
            ip_pipeline = [
                {"$match": {**base_query, "source_ip": {"$exists": True, "$ne": None}}},
                {"$group": {"_id": "$source_ip", "count": {"$sum": 1}}},
                {"$sort": {"count": -1}},
                {"$limit": 10}
            ]
            ip_stats = await self.db.system_logs.aggregate(ip_pipeline).to_list(length=None)

            # Get hourly distribution for charts
            hourly_pipeline = [
                {"$match": base_query},
                {"$group": {
                    "_id": {
                        "hour": {"$hour": "$timestamp"},
                        "level": "$level"
                    },
                    "count": {"$sum": 1}
                }},
                {"$sort": {"_id.hour": 1}}
            ]
            hourly_stats = await self.db.system_logs.aggregate(hourly_pipeline).to_list(length=None)

            # Calculate security metrics
            blocked_count = await self.db.system_logs.count_documents({
                **base_query,
                "level": {"$in": ["BLOCK", "DENY"]}
            })

            allowed_count = await self.db.system_logs.count_documents({
                **base_query,
                "level": "ALLOW"
            })

            warning_count = await self.db.system_logs.count_documents({
                **base_query,
                "level": {"$in": ["WARNING", "ERROR", "CRITICAL"]}
            })

            # Process level statistics for Turkish display
            processed_level_stats = []
            for stat in level_stats:
                level = stat["_id"] or "UNKNOWN"
                level_info = self.log_levels.get(level, self.log_levels["INFO"])
                processed_level_stats.append({
                    "level": level,
                    "count": stat["count"],
                    "turkish_name": level_info["turkish"],
                    "color": level_info["color"],
                    "percentage": round((stat["count"] / total_logs) * 100, 1) if total_logs > 0 else 0
                })

            return {
                "success": True,
                "data": {
                    "time_range": time_range,
                    "total_logs": total_logs,
                    "blocked_requests": blocked_count,
                    "allowed_requests": allowed_count,
                    "warning_count": warning_count,
                    "unique_ips": len(ip_stats),
                    "level_distribution": processed_level_stats,
                    "top_sources": source_stats,
                    "top_ips": ip_stats,
                    "hourly_distribution": hourly_stats,
                    "security_metrics": {
                        "block_rate": round((blocked_count / total_logs) * 100, 1) if total_logs > 0 else 0,
                        "allow_rate": round((allowed_count / total_logs) * 100, 1) if total_logs > 0 else 0,
                        "warning_rate": round((warning_count / total_logs) * 100, 1) if total_logs > 0 else 0
                    }
                }
            }

        except Exception as e:
            logger.error(f"❌ Failed to get log statistics: {e}")
            return {"success": False, "error": str(e)}

    async def get_real_time_stats(self) -> Dict[str, Any]:
        """Get real-time statistics for live dashboard updates"""
        try:
            if not self.db:
                await self.initialize()

            # Get stats from last 5 minutes
            now = datetime.utcnow()
            recent_time = now - timedelta(minutes=5)

            # Recent logs count
            recent_logs = await self.db.system_logs.count_documents({
                "timestamp": {"$gte": recent_time}
            })

            # Recent blocked requests
            recent_blocked = await self.db.system_logs.count_documents({
                "timestamp": {"$gte": recent_time},
                "level": {"$in": ["BLOCK", "DENY"]}
            })

            # Active connections (from network activity)
            active_connections = await self.db.network_activity.count_documents({
                "timestamp": {"$gte": recent_time},
                "event_type": "active_connection"
            })

            # PC-to-PC traffic stats
            pc_to_pc_traffic = 0
            if self.pc_to_pc_active:
                pc_to_pc_traffic = await self.db.pc_to_pc_traffic.count_documents({
                    "timestamp": {"$gte": recent_time}
                })

            # Get latest system stats
            latest_stats = await self.db.system_stats.find_one(
                {},
                sort=[("timestamp", DESCENDING)]
            )

            stats = {
                "timestamp": now.isoformat(),
                "recent_logs_5min": recent_logs,
                "recent_blocked_5min": recent_blocked,
                "active_connections": active_connections,
                "pc_to_pc_traffic": pc_to_pc_traffic,
                "logs_per_minute": round(recent_logs / 5, 1),
                "system_status": "active" if recent_logs > 0 else "idle",
                "pc_to_pc_active": self.pc_to_pc_active,
                "monitored_interfaces": self.monitored_interfaces
            }

            # Add system stats if available
            if latest_stats:
                stats.update({
                    "total_packets": latest_stats.get("total_packets", 0),
                    "bytes_transferred": latest_stats.get("bytes_transferred", 0),
                    "unique_ips_count": latest_stats.get("unique_ips_count", 0)
                })

            return {"success": True, "data": stats}

        except Exception as e:
            logger.error(f"❌ Failed to get real-time stats: {e}")
            return {"success": False, "error": str(e)}

    async def get_pc_to_pc_traffic_stats(self, time_range: str = "1h") -> Dict[str, Any]:
        """Get PC-to-PC specific traffic statistics"""
        try:
            if not self.db:
                await self.initialize()

            if not self.pc_to_pc_active:
                return {"success": False, "error": "PC-to-PC monitoring not active"}

            # Calculate time range
            now = datetime.utcnow()
            if time_range == "1h":
                start_time = now - timedelta(hours=1)
            elif time_range == "24h":
                start_time = now - timedelta(hours=24)
            else:
                start_time = now - timedelta(hours=1)

            base_query = {"timestamp": {"$gte": start_time}}

            # Get PC-to-PC traffic count
            pc_traffic_count = await self.db.pc_to_pc_traffic.count_documents(base_query)

            # Get traffic by protocol
            protocol_pipeline = [
                {"$match": base_query},
                {"$group": {"_id": "$protocol", "count": {"$sum": 1}}},
                {"$sort": {"count": -1}}
            ]
            protocol_stats = await self.db.pc_to_pc_traffic.aggregate(protocol_pipeline).to_list(length=None)

            # Get traffic by direction (inbound/outbound)
            direction_pipeline = [
                {"$match": base_query},
                {"$group": {"_id": "$level", "count": {"$sum": 1}}},
                {"$sort": {"count": -1}}
            ]
            direction_stats = await self.db.pc_to_pc_traffic.aggregate(direction_pipeline).to_list(length=None)

            return {
                "success": True,
                "data": {
                    "time_range": time_range,
                    "total_pc_traffic": pc_traffic_count,
                    "wan_interface": self.monitored_interfaces["wan"],
                    "lan_interface": self.monitored_interfaces["lan"],
                    "protocol_distribution": protocol_stats,
                    "direction_distribution": direction_stats
                }
            }

        except Exception as e:
            logger.error(f"❌ Failed to get PC-to-PC traffic stats: {e}")
            return {"success": False, "error": str(e)}

    async def clear_old_logs(self, days_to_keep: int = 30) -> Dict[str, Any]:
        """Clear old logs to manage database size"""
        try:
            if not self.db:
                await self.initialize()

            cutoff_date = datetime.utcnow() - timedelta(days=days_to_keep)

            # Delete old system logs
            system_result = await self.db.system_logs.delete_many({
                "timestamp": {"$lt": cutoff_date}
            })

            # Delete old network activity
            network_result = await self.db.network_activity.delete_many({
                "timestamp": {"$lt": cutoff_date}
            })

            # Delete old PC-to-PC traffic
            pc_traffic_result = await self.db.pc_to_pc_traffic.delete_many({
                "timestamp": {"$lt": cutoff_date}
            })

            # Delete old system stats
            stats_result = await self.db.system_stats.delete_many({
                "timestamp": {"$lt": cutoff_date}
            })

            total_deleted = (system_result.deleted_count +
                             network_result.deleted_count +
                             pc_traffic_result.deleted_count +
                             stats_result.deleted_count)

            logger.info(f"✅ Cleared {total_deleted} old log entries (older than {days_to_keep} days)")

            return {
                "success": True,
                "deleted_counts": {
                    "system_logs": system_result.deleted_count,
                    "network_activity": network_result.deleted_count,
                    "pc_to_pc_traffic": pc_traffic_result.deleted_count,
                    "system_stats": stats_result.deleted_count,
                    "total": total_deleted
                },
                "cutoff_date": cutoff_date.isoformat()
            }

        except Exception as e:
            logger.error(f"❌ Failed to clear old logs: {e}")
            return {"success": False, "error": str(e)}

    async def export_logs(self,
                          format_type: str = "json",
                          start_date: Optional[datetime] = None,
                          end_date: Optional[datetime] = None,
                          level_filter: Optional[str] = None) -> Dict[str, Any]:
        """Export logs in various formats"""
        try:
            if not self.db:
                await self.initialize()

            # Build query
            query = {}
            if start_date or end_date:
                date_filter = {}
                if start_date:
                    date_filter["$gte"] = start_date
                if end_date:
                    date_filter["$lte"] = end_date
                query["timestamp"] = date_filter

            if level_filter and level_filter != "ALL":
                query["level"] = level_filter

            # Get logs
            cursor = self.db.system_logs.find(query).sort("timestamp", DESCENDING)
            logs = await cursor.to_list(length=10000)  # Limit for safety

            # Process logs for export
            export_data = []
            for log in logs:
                export_log = {
                    "timestamp": log["timestamp"].isoformat(),
                    "level": log.get("level", "INFO"),
                    "source": log.get("source", "unknown"),
                    "message": log.get("message", ""),
                    "source_ip": log.get("source_ip"),
                    "destination_ip": log.get("destination_ip"),
                    "protocol": log.get("protocol"),
                    "destination_port": log.get("destination_port"),
                    "details": log.get("details", "")
                }
                export_data.append(export_log)

            # Format based on requested type
            if format_type.lower() == "csv":
                # Convert to CSV format (would need CSV library)
                return {
                    "success": True,
                    "format": "csv",
                    "count": len(export_data),
                    "data": export_data  # Frontend can convert to CSV
                }
            else:
                # JSON format
                return {
                    "success": True,
                    "format": "json",
                    "count": len(export_data),
                    "data": export_data
                }

        except Exception as e:
            logger.error(f"❌ Failed to export logs: {e}")
            return {"success": False, "error": str(e)}

    async def search_logs(self,
                          search_term: str,
                          search_type: str = "message",
                          limit: int = 100) -> Dict[str, Any]:
        """Advanced log search functionality"""
        try:
            if not self.db:
                await self.initialize()

            # Build search query based on type
            if search_type == "ip":
                query = {
                    "$or": [
                        {"source_ip": {"$regex": search_term, "$options": "i"}},
                        {"destination_ip": {"$regex": search_term, "$options": "i"}}
                    ]
                }
            elif search_type == "message":
                query = {
                    "$or": [
                        {"message": {"$regex": search_term, "$options": "i"}},
                        {"details": {"$regex": search_term, "$options": "i"}}
                    ]
                }
            elif search_type == "source":
                query = {"source": {"$regex": search_term, "$options": "i"}}
            else:
                # General search across all fields
                query = {
                    "$or": [
                        {"message": {"$regex": search_term, "$options": "i"}},
                        {"details": {"$regex": search_term, "$options": "i"}},
                        {"source": {"$regex": search_term, "$options": "i"}},
                        {"source_ip": {"$regex": search_term, "$options": "i"}},
                        {"destination_ip": {"$regex": search_term, "$options": "i"}}
                    ]
                }

            # Get matching logs
            cursor = self.db.system_logs.find(query).sort("timestamp", DESCENDING).limit(limit)
            logs = await cursor.to_list(length=limit)

            # Process logs
            processed_logs = []
            for log in logs:
                processed_log = await self._process_log_entry(log)
                processed_logs.append(processed_log)

            return {
                "success": True,
                "search_term": search_term,
                "search_type": search_type,
                "count": len(processed_logs),
                "data": processed_logs
            }

        except Exception as e:
            logger.error(f"❌ Failed to search logs: {e}")
            return {"success": False, "error": str(e)}

    async def get_security_alerts(self, limit: int = 50) -> Dict[str, Any]:
        """Get recent security alerts"""
        try:
            if not self.db:
                await self.initialize()

            cursor = self.db.security_alerts.find({}).sort("timestamp", DESCENDING).limit(limit)
            alerts = await cursor.to_list(length=limit)

            processed_alerts = []
            for alert in alerts:
                alert["id"] = str(alert.get("_id", ""))
                if "_id" in alert:
                    del alert["_id"]

                # Format timestamp
                if "timestamp" in alert:
                    alert["formatted_time"] = alert["timestamp"].strftime("%d.%m.%Y %H:%M:%S")
                    alert["time_ago"] = self._get_time_ago(alert["timestamp"])

                processed_alerts.append(alert)

            return {
                "success": True,
                "count": len(processed_alerts),
                "data": processed_alerts
            }

        except Exception as e:
            logger.error(f"❌ Failed to get security alerts: {e}")
            return {"success": False, "error": str(e)}

    async def create_manual_log(self,
                                level: str,
                                message: str,
                                source: str = "manual",
                                details: Optional[str] = None,
                                user_id: Optional[str] = None) -> Dict[str, Any]:
        """Create a manual log entry"""
        try:
            if not self.db:
                await self.initialize()

            log_entry = {
                "timestamp": datetime.utcnow(),
                "level": level.upper(),
                "source": source,
                "message": message,
                "details": details,
                "event_type": "manual_log",
                "created_by": user_id
            }

            result = await self.db.system_logs.insert_one(log_entry)

            return {
                "success": True,
                "log_id": str(result.inserted_id),
                "message": "Manual log entry created successfully"
            }

        except Exception as e:
            logger.error(f"❌ Failed to create manual log: {e}")
            return {"success": False, "error": str(e)}

    async def start_monitoring(self):
        """Start continuous log monitoring"""
        try:
            logger.info("🔍 Starting log monitoring service...")
            while True:
                await self.monitor_network_traffic()
                await asyncio.sleep(10)  # Monitor every 10 seconds
        except Exception as e:
            logger.error(f"❌ Log monitoring failed: {e}")

# Create singleton instance
log_service = LogService()