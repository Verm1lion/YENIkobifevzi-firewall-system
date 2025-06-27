"""
Enhanced Log monitoring and analysis tasks for PC-to-PC Internet Sharing
Real-time traffic monitoring, packet analysis, and comprehensive logging
"""
import asyncio
import re
import platform
import subprocess
import json
import psutil
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
import logging
from ..database import get_database

# Configure logging
logger = logging.getLogger(__name__)

# Regex patterns for log parsing
FWDROP_REGEX = re.compile(r"FWDROP:")
IPTABLES_REGEX = re.compile(r"(\w+\s+\d+\s+\d+:\d+:\d+).*?SRC=(\d+\.\d+\.\d+\.\d+).*?DST=(\d+\.\d+\.\d+\.\d+).*?PROTO=(\w+)")
TRAFFIC_REGEX = re.compile(r"IN=(\w+)?.*?OUT=(\w+)?.*?SRC=(\d+\.\d+\.\d+\.\d+).*?DST=(\d+\.\d+\.\d+\.\d+).*?PROTO=(\w+)")

# Global variables for real-time monitoring
active_connections = {}
traffic_stats = {
    "total_packets": 0,
    "blocked_packets": 0,
    "allowed_packets": 0,
    "bytes_transferred": 0,
    "unique_ips": set(),
    "protocols": {},
    "ports": {}
}

async def start_log_watchers():
    """Start all log monitoring tasks for PC-to-PC Internet Sharing"""
    logger.info("🔍 Starting enhanced log watchers for PC-to-PC sharing...")

    try:
        # Start platform-specific watchers
        if platform.system().lower().startswith("linux"):
            asyncio.create_task(iptables_traffic_watcher())
            asyncio.create_task(netstat_connection_watcher())
            asyncio.create_task(interface_traffic_monitor())
        elif platform.system().lower().startswith("win"):
            asyncio.create_task(windows_firewall_log_watcher())
            asyncio.create_task(windows_connection_watcher())

        # Start analysis and monitoring tasks
        asyncio.create_task(advanced_log_analysis_task())
        asyncio.create_task(security_alert_task())
        asyncio.create_task(real_time_stats_updater())
        asyncio.create_task(connection_state_monitor())
        asyncio.create_task(traffic_anomaly_detector())

        logger.info("✅ Enhanced log watchers started successfully")

    except Exception as e:
        logger.error(f"❌ Failed to start log watchers: {e}")

async def iptables_traffic_watcher():
    """
    Enhanced iptables log monitoring for PC-to-PC traffic
    Monitors both WAN and LAN interfaces for comprehensive logging
    """
    try:
        if not platform.system().lower().startswith("linux"):
            return

        logger.info("🔍 Starting enhanced iptables traffic watcher...")

        # Setup iptables logging rules for our scenario
        await setup_iptables_logging()

        # Monitor multiple log sources
        log_sources = [
            "/var/log/syslog",
            "/var/log/kern.log",
            "/var/log/messages"
        ]

        for log_source in log_sources:
            if await file_exists(log_source):
                asyncio.create_task(monitor_log_file(log_source))

    except Exception as e:
        logger.error(f"❌ Failed to start iptables traffic watcher: {e}")

async def monitor_log_file(log_file: str):
    """Monitor a specific log file for traffic"""
    try:
        cmd = ["tail", "-F", log_file]
        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            text=True
        )

        logger.info(f"📁 Monitoring log file: {log_file}")

        while True:
            try:
                line = await asyncio.wait_for(process.stdout.readline(), timeout=1.0)
                if not line:
                    await asyncio.sleep(0.1)
                    continue

                # Process different types of log entries
                if "NETFILTER" in line or "iptables" in line:
                    await process_iptables_log(line.strip())
                elif "FWDROP:" in line or "BLOCK" in line:
                    await process_blocked_packet_log(line.strip())
                elif "ACCEPT" in line or "ALLOW" in line:
                    await process_allowed_packet_log(line.strip())

            except asyncio.TimeoutError:
                continue
            except Exception as e:
                logger.warning(f"⚠️ Error monitoring {log_file}: {e}")
                await asyncio.sleep(5)

    except Exception as e:
        logger.error(f"❌ Failed to monitor log file {log_file}: {e}")

async def setup_iptables_logging():
    """Setup iptables rules for comprehensive logging"""
    try:
        logger.info("⚙️ Setting up iptables logging rules...")

        # Get NAT configuration to determine WAN/LAN interfaces
        db = await get_database()
        nat_config = await db.nat_configurations.find_one({}, sort=[("created_at", -1)])

        if not nat_config:
            logger.warning("⚠️ No NAT configuration found, using default interfaces")
            wan_interface = "wlan0"
            lan_interface = "eth0"
        else:
            wan_interface = nat_config.get("wan_interface", "wlan0")
            lan_interface = nat_config.get("lan_interface", "eth0")

        # Add logging rules for traffic monitoring
        logging_rules = [
            # Log forwarded packets (PC-to-PC traffic)
            f"iptables -I FORWARD -i {lan_interface} -o {wan_interface} -j LOG --log-prefix 'FORWARD_OUT: ' --log-level 4",
            f"iptables -I FORWARD -i {wan_interface} -o {lan_interface} -j LOG --log-prefix 'FORWARD_IN: ' --log-level 4",

            # Log NAT translations
            f"iptables -t nat -I POSTROUTING -o {wan_interface} -j LOG --log-prefix 'NAT_OUT: ' --log-level 4",

            # Log blocked traffic
            f"iptables -I INPUT -j LOG --log-prefix 'INPUT_DROP: ' --log-level 4",
            f"iptables -I OUTPUT -j LOG --log-prefix 'OUTPUT_DROP: ' --log-level 4"
        ]

        for rule in logging_rules:
            try:
                # Check if rule already exists
                check_cmd = rule.replace("-I", "-C").replace("-A", "-C")
                result = await asyncio.create_subprocess_shell(
                    check_cmd,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE
                )
                await result.wait()

                if result.returncode != 0:  # Rule doesn't exist
                    # Add the rule
                    process = await asyncio.create_subprocess_shell(
                        rule,
                        stdout=asyncio.subprocess.PIPE,
                        stderr=asyncio.subprocess.PIPE
                    )
                    await process.wait()
                    logger.info(f"✅ Added iptables logging rule: {rule}")

            except Exception as e:
                logger.warning(f"⚠️ Failed to add logging rule {rule}: {e}")

    except Exception as e:
        logger.error(f"❌ Failed to setup iptables logging: {e}")

async def process_iptables_log(log_line: str):
    """Process iptables log entries for traffic analysis"""
    try:
        db = await get_database()

        # Parse the log line
        parsed_data = parse_iptables_log(log_line)
        if not parsed_data:
            return

        # Create comprehensive log entry
        log_entry = {
            "timestamp": datetime.utcnow(),
            "source": "iptables",
            "event_type": "traffic_log",
            "raw_log": log_line,
            "parsed_data": parsed_data,
            "source_ip": parsed_data.get("src_ip"),
            "destination_ip": parsed_data.get("dst_ip"),
            "protocol": parsed_data.get("protocol"),
            "source_port": parsed_data.get("src_port"),
            "destination_port": parsed_data.get("dst_port"),
            "action": parsed_data.get("action", "UNKNOWN"),
            "interface_in": parsed_data.get("interface_in"),
            "interface_out": parsed_data.get("interface_out"),
            "packet_size": parsed_data.get("packet_size", 0)
        }

        # Add to database
        await db.system_logs.insert_one(log_entry)

        # Update real-time statistics
        await update_traffic_stats(parsed_data)

        # Check for security events
        await analyze_traffic_pattern(parsed_data)

    except Exception as e:
        logger.error(f"⚠️ Error processing iptables log: {e}")

def parse_iptables_log(log_line: str) -> Optional[Dict[str, Any]]:
    """Parse iptables log line into structured data"""
    try:
        parsed = {}

        # Extract timestamp
        if log_line.startswith(("Jan", "Feb", "Mar", "Apr", "May", "Jun",
                               "Jul", "Aug", "Sep", "Oct", "Nov", "Dec")):
            parts = log_line.split(" ", 3)
            if len(parts) >= 3:
                parsed["timestamp"] = f"{parts[0]} {parts[1]} {parts[2]}"

        # Extract action from prefix
        if "FORWARD_OUT:" in log_line:
            parsed["action"] = "ALLOW"
            parsed["direction"] = "OUTBOUND"
            parsed["traffic_type"] = "pc_to_internet"
        elif "FORWARD_IN:" in log_line:
            parsed["action"] = "ALLOW"
            parsed["direction"] = "INBOUND"
            parsed["traffic_type"] = "internet_to_pc"
        elif "NAT_OUT:" in log_line:
            parsed["action"] = "NAT"
            parsed["direction"] = "OUTBOUND"
            parsed["traffic_type"] = "nat_translation"
        elif "DROP" in log_line or "REJECT" in log_line:
            parsed["action"] = "BLOCK"
            parsed["traffic_type"] = "blocked"
        else:
            parsed["action"] = "ALLOW"
            parsed["traffic_type"] = "general"

        # Extract network information using regex
        patterns = {
            "src_ip": r"SRC=(\d+\.\d+\.\d+\.\d+)",
            "dst_ip": r"DST=(\d+\.\d+\.\d+\.\d+)",
            "protocol": r"PROTO=(\w+)",
            "src_port": r"SPT=(\d+)",
            "dst_port": r"DPT=(\d+)",
            "interface_in": r"IN=(\w+)",
            "interface_out": r"OUT=(\w+)",
            "packet_size": r"LEN=(\d+)"
        }

        for key, pattern in patterns.items():
            match = re.search(pattern, log_line)
            if match:
                if key in ["src_port", "dst_port", "packet_size"]:
                    parsed[key] = int(match.group(1))
                else:
                    parsed[key] = match.group(1)

        return parsed if parsed else None

    except Exception as e:
        logger.error(f"⚠️ Error parsing iptables log: {e}")
        return None

async def netstat_connection_watcher():
    """Monitor active network connections"""
    try:
        logger.info("🔗 Starting network connection watcher...")

        while True:
            try:
                connections = psutil.net_connections(kind='inet')
                current_time = datetime.utcnow()

                db = await get_database()
                connection_logs = []

                for conn in connections:
                    if conn.status == 'ESTABLISHED':
                        conn_info = {
                            "timestamp": current_time,
                            "source": "netstat",
                            "event_type": "active_connection",
                            "local_address": f"{conn.laddr.ip}:{conn.laddr.port}" if conn.laddr else None,
                            "remote_address": f"{conn.raddr.ip}:{conn.raddr.port}" if conn.raddr else None,
                            "protocol": "TCP" if conn.type == 1 else "UDP",
                            "status": conn.status,
                            "pid": conn.pid
                        }

                        # Get process name if available
                        if conn.pid:
                            try:
                                process = psutil.Process(conn.pid)
                                conn_info["process_name"] = process.name()
                            except:
                                conn_info["process_name"] = "unknown"

                        connection_logs.append(conn_info)

                # Batch insert for efficiency
                if connection_logs:
                    await db.network_activity.insert_many(connection_logs)

                await asyncio.sleep(30)  # Check every 30 seconds

            except Exception as e:
                logger.warning(f"⚠️ Error in connection watcher: {e}")
                await asyncio.sleep(60)

    except Exception as e:
        logger.error(f"❌ Failed to start connection watcher: {e}")

async def interface_traffic_monitor():
    """Monitor network interface statistics"""
    try:
        logger.info("📊 Starting interface traffic monitor...")

        while True:
            try:
                net_io = psutil.net_io_counters(pernic=True)
                current_time = datetime.utcnow()

                db = await get_database()
                interface_stats = []

                for interface, stats in net_io.items():
                    if not interface.startswith('lo'):  # Skip loopback
                        stat_entry = {
                            "timestamp": current_time,
                            "source": "interface_monitor",
                            "event_type": "interface_stats",
                            "interface": interface,
                            "bytes_sent": stats.bytes_sent,
                            "bytes_recv": stats.bytes_recv,
                            "packets_sent": stats.packets_sent,
                            "packets_recv": stats.packets_recv,
                            "errin": stats.errin,
                            "errout": stats.errout,
                            "dropin": stats.dropin,
                            "dropout": stats.dropout
                        }
                        interface_stats.append(stat_entry)

                if interface_stats:
                    await db.network_activity.insert_many(interface_stats)

                await asyncio.sleep(60)  # Every minute

            except Exception as e:
                logger.warning(f"⚠️ Error in interface monitor: {e}")
                await asyncio.sleep(120)

    except Exception as e:
        logger.error(f"❌ Failed to start interface monitor: {e}")

async def process_blocked_packet_log(log_line: str):
    """Enhanced blocked packet processing"""
    try:
        db = await get_database()
        parsed_data = parse_iptables_log(log_line)

        # Create blocked packet entry
        doc = {
            "timestamp": datetime.utcnow(),
            "source": "firewall_block",
            "event_type": "packet_blocked",
            "raw_log_line": log_line,
            "level": "BLOCK",
            "message": "Bağlantı Engellendi",
            "source_ip": parsed_data.get("src_ip") if parsed_data else None,
            "destination_ip": parsed_data.get("dst_ip") if parsed_data else None,
            "protocol": parsed_data.get("protocol") if parsed_data else "UNKNOWN",
            "destination_port": parsed_data.get("dst_port") if parsed_data else None,
            "details": f"Güvenlik kuralları gereği bağlantı engellendi",
            "parsed_data": parsed_data
        }

        await db.system_logs.insert_one(doc)

        # Update statistics
        traffic_stats["blocked_packets"] += 1
        traffic_stats["total_packets"] += 1

        # Check for alerts
        await check_blocked_alarm()

    except Exception as e:
        logger.error(f"⚠️ Error processing blocked packet: {e}")

async def process_allowed_packet_log(log_line: str):
    """Process allowed packet logs"""
    try:
        db = await get_database()
        parsed_data = parse_iptables_log(log_line)

        # Create allowed packet entry (sample only high-traffic)
        if traffic_stats["total_packets"] % 10 == 0:  # Log every 10th packet
            doc = {
                "timestamp": datetime.utcnow(),
                "source": "firewall_allow",
                "event_type": "packet_allowed",
                "raw_log_line": log_line,
                "level": "ALLOW",
                "message": "Erişim Reddedildi" if "DENY" in log_line else "Erişim İzni Başarılı",
                "source_ip": parsed_data.get("src_ip") if parsed_data else None,
                "destination_ip": parsed_data.get("dst_ip") if parsed_data else None,
                "protocol": parsed_data.get("protocol") if parsed_data else "TCP",
                "destination_port": parsed_data.get("dst_port") if parsed_data else 80,
                "details": parsed_data.get("traffic_type", "Normal trafik"),
                "parsed_data": parsed_data
            }

            await db.system_logs.insert_one(doc)

        # Update statistics
        traffic_stats["allowed_packets"] += 1
        traffic_stats["total_packets"] += 1

        if parsed_data:
            if parsed_data.get("src_ip"):
                traffic_stats["unique_ips"].add(parsed_data["src_ip"])
            if parsed_data.get("dst_ip"):
                traffic_stats["unique_ips"].add(parsed_data["dst_ip"])

            # Track protocols
            protocol = parsed_data.get("protocol", "UNKNOWN")
            traffic_stats["protocols"][protocol] = traffic_stats["protocols"].get(protocol, 0) + 1

            # Track ports
            if parsed_data.get("dst_port"):
                port = parsed_data["dst_port"]
                traffic_stats["ports"][port] = traffic_stats["ports"].get(port, 0) + 1

    except Exception as e:
        logger.error(f"⚠️ Error processing allowed packet: {e}")

async def update_traffic_stats(parsed_data: Dict[str, Any]):
    """Update real-time traffic statistics"""
    try:
        # Update bytes transferred
        if parsed_data.get("packet_size"):
            traffic_stats["bytes_transferred"] += parsed_data["packet_size"]

        # Update connection tracking
        if parsed_data.get("src_ip") and parsed_data.get("dst_ip"):
            connection_key = f"{parsed_data['src_ip']}:{parsed_data['dst_ip']}"
            if connection_key not in active_connections:
                active_connections[connection_key] = {
                    "start_time": datetime.utcnow(),
                    "packet_count": 0,
                    "bytes_transferred": 0
                }

            active_connections[connection_key]["packet_count"] += 1
            active_connections[connection_key]["bytes_transferred"] += parsed_data.get("packet_size", 0)

    except Exception as e:
        logger.error(f"⚠️ Error updating traffic stats: {e}")

async def real_time_stats_updater():
    """Update real-time statistics in database"""
    try:
        while True:
            await asyncio.sleep(5)  # Update every 5 seconds

            db = await get_database()

            # Convert set to list for JSON serialization
            unique_ips_list = list(traffic_stats["unique_ips"])

            stats_doc = {
                "timestamp": datetime.utcnow(),
                "source": "real_time_stats",
                "event_type": "statistics_update",
                "total_packets": traffic_stats["total_packets"],
                "blocked_packets": traffic_stats["blocked_packets"],
                "allowed_packets": traffic_stats["allowed_packets"],
                "bytes_transferred": traffic_stats["bytes_transferred"],
                "unique_ips_count": len(unique_ips_list),
                "unique_ips": unique_ips_list[:100],  # Limit to first 100
                "active_connections_count": len(active_connections),
                "top_protocols": dict(list(traffic_stats["protocols"].items())[:10]),
                "top_ports": dict(list(traffic_stats["ports"].items())[:10])
            }

            await db.system_stats.insert_one(stats_doc)

    except Exception as e:
        logger.error(f"⚠️ Error in real-time stats updater: {e}")
        await asyncio.sleep(30)

async def traffic_anomaly_detector():
    """Detect traffic anomalies and create alerts"""
    try:
        while True:
            await asyncio.sleep(120)  # Check every 2 minutes

            db = await get_database()
            now = datetime.utcnow()
            cutoff = now - timedelta(minutes=2)

            # Check for unusual traffic patterns
            recent_logs = await db.system_logs.find({
                "timestamp": {"$gte": cutoff},
                "event_type": {"$in": ["traffic_log", "packet_blocked", "packet_allowed"]}
            }).to_list(length=1000)

            if len(recent_logs) > 500:  # High traffic volume
                alert_doc = {
                    "timestamp": now,
                    "alert_type": "high_traffic_volume",
                    "severity": "MEDIUM",
                    "title": "Yüksek Trafik Hacmi Tespit Edildi",
                    "description": f"Son 2 dakikada {len(recent_logs)} log girişi tespit edildi",
                    "acknowledged": False,
                    "resolved": False,
                    "metadata": {
                        "log_count": len(recent_logs),
                        "time_window": "2_minutes"
                    }
                }
                await db.security_alerts.insert_one(alert_doc)
                logger.warning(f"🚨 High traffic alert: {len(recent_logs)} logs in 2 minutes")

    except Exception as e:
        logger.error(f"⚠️ Error in anomaly detector: {e}")
        await asyncio.sleep(300)

async def connection_state_monitor():
    """Monitor connection states and detect issues"""
    try:
        while True:
            await asyncio.sleep(60)  # Check every minute

            # Clean up old connections
            current_time = datetime.utcnow()
            cutoff_time = current_time - timedelta(minutes=5)

            connections_to_remove = []
            for conn_key, conn_data in active_connections.items():
                if conn_data["start_time"] < cutoff_time:
                    connections_to_remove.append(conn_key)

            for conn_key in connections_to_remove:
                del active_connections[conn_key]

            logger.info(f"📊 Active connections: {len(active_connections)}")

    except Exception as e:
        logger.error(f"⚠️ Error in connection state monitor: {e}")
        await asyncio.sleep(120)

# Windows-specific functions (keep existing ones but enhance them)
async def windows_firewall_log_watcher():
    """Enhanced Windows Firewall log monitoring"""
    try:
        logger.info("🔍 Starting enhanced Windows firewall log watcher...")
        import os

        log_paths = [
            os.path.join(os.environ.get('SYSTEMROOT', r'C:\Windows'), 'system32', 'LogFiles', 'Firewall', 'pfirewall.log'),
            os.path.join(os.environ.get('SYSTEMROOT', r'C:\Windows'), 'system32', 'LogFiles', 'Firewall', 'domainfw.log'),
            os.path.join(os.environ.get('SYSTEMROOT', r'C:\Windows'), 'system32', 'LogFiles', 'Firewall', 'privatefw.log'),
            os.path.join(os.environ.get('SYSTEMROOT', r'C:\Windows'), 'system32', 'LogFiles', 'Firewall', 'publicfw.log')
        ]

        for log_path in log_paths:
            if os.path.exists(log_path):
                asyncio.create_task(monitor_windows_log_file(log_path))
                logger.info(f"📁 Monitoring Windows log: {log_path}")

    except Exception as e:
        logger.error(f"❌ Failed to start Windows firewall watcher: {e}")

async def monitor_windows_log_file(log_path: str):
    """Monitor Windows firewall log file"""
    try:
        last_size = 0
        while True:
            try:
                current_size = os.path.getsize(log_path)
                if current_size > last_size:
                    with open(log_path, 'r', encoding='utf-8', errors='ignore') as f:
                        f.seek(last_size)
                        new_lines = f.readlines()

                    for line in new_lines:
                        if 'DROP' in line.upper():
                            await process_blocked_packet_log(line.strip())
                        elif 'ALLOW' in line.upper():
                            await process_allowed_packet_log(line.strip())

                    last_size = current_size

                await asyncio.sleep(5)

            except Exception as e:
                logger.warning(f"⚠️ Error reading Windows log {log_path}: {e}")
                await asyncio.sleep(10)

    except Exception as e:
        logger.error(f"❌ Failed to monitor Windows log {log_path}: {e}")

async def windows_connection_watcher():
    """Windows-specific connection monitoring"""
    try:
        logger.info("🔗 Starting Windows connection watcher...")
        # Use netstat command for Windows
        while True:
            try:
                process = await asyncio.create_subprocess_exec(
                    'netstat', '-an',
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                    text=True
                )

                stdout, stderr = await process.wait()
                if stdout:
                    lines = stdout.split('\n')
                    await process_netstat_output(lines)

                await asyncio.sleep(30)

            except Exception as e:
                logger.warning(f"⚠️ Error in Windows connection watcher: {e}")
                await asyncio.sleep(60)

    except Exception as e:
        logger.error(f"❌ Failed to start Windows connection watcher: {e}")

async def process_netstat_output(lines: List[str]):
    """Process netstat output for Windows"""
    try:
        db = await get_database()
        current_time = datetime.utcnow()

        connection_logs = []
        for line in lines:
            if 'ESTABLISHED' in line or 'LISTENING' in line:
                parts = line.split()
                if len(parts) >= 4:
                    conn_info = {
                        "timestamp": current_time,
                        "source": "windows_netstat",
                        "event_type": "active_connection",
                        "protocol": parts[0],
                        "local_address": parts[1],
                        "remote_address": parts[2] if len(parts) > 2 else None,
                        "status": parts[3] if len(parts) > 3 else None
                    }
                    connection_logs.append(conn_info)

        if connection_logs:
            await db.network_activity.insert_many(connection_logs)

    except Exception as e:
        logger.error(f"⚠️ Error processing netstat output: {e}")

# Keep existing functions but enhance them
async def check_blocked_alarm():
    """Enhanced blocked packet alarm system"""
    try:
        db = await get_database()
        now = datetime.utcnow()
        cutoff = now - timedelta(minutes=5)

        # Count blocked packets in last 5 minutes
        count_last_5min = await db.system_logs.count_documents({
            "timestamp": {"$gte": cutoff},
            "event_type": "packet_blocked"
        })

        if count_last_5min > 50:
            alert_doc = {
                "timestamp": now,
                "alert_type": "high_blocked_traffic",
                "severity": "HIGH",
                "title": "Yüksek Hacimde Engellenen Trafik",
                "description": f"Son 5 dakikada {count_last_5min} engellenen paket tespit edildi",
                "acknowledged": False,
                "resolved": False,
                "metadata": {
                    "blocked_count": count_last_5min,
                    "time_window": "5_minutes"
                }
            }
            await db.security_alerts.insert_one(alert_doc)
            logger.warning(f"🚨 Security alert: {count_last_5min} blocked packets in 5 minutes")

    except Exception as e:
        logger.error(f"⚠️ Error checking blocked alarm: {e}")

async def advanced_log_analysis_task():
    """Enhanced advanced log analysis"""
    while True:
        try:
            await asyncio.sleep(300)  # Run every 5 minutes
            db = await get_database()
            now = datetime.utcnow()
            cutoff = now - timedelta(minutes=10)

            # Analyze traffic patterns
            pipeline = [
                {"$match": {
                    "timestamp": {"$gte": cutoff},
                    "event_type": {"$in": ["traffic_log", "packet_blocked", "packet_allowed"]}
                }},
                {"$group": {
                    "_id": "$source_ip",
                    "count": {"$sum": 1},
                    "protocols": {"$addToSet": "$protocol"},
                    "actions": {"$addToSet": "$level"}
                }},
                {"$sort": {"count": -1}},
                {"$limit": 10}
            ]

            top_sources = await db.system_logs.aggregate(pipeline).to_list(length=10)

            # Create summary log
            summary_doc = {
                "timestamp": now,
                "source": "log_analysis",
                "event_type": "traffic_summary",
                "time_window": "10_minutes",
                "top_traffic_sources": top_sources,
                "total_unique_ips": len(traffic_stats["unique_ips"]),
                "total_packets": traffic_stats["total_packets"],
                "analysis_type": "periodic_summary"
            }

            await db.system_logs.insert_one(summary_doc)

        except Exception as e:
            logger.error(f"⚠️ Error in advanced log analysis: {e}")
            await asyncio.sleep(60)

async def security_alert_task():
    """Enhanced security monitoring task"""
    while True:
        try:
            await asyncio.sleep(60)  # Run every minute
            db = await get_database()
            now = datetime.utcnow()
            cutoff = now - timedelta(minutes=1)

            # Check for authentication failures
            auth_failures = await db.system_logs.count_documents({
                "timestamp": {"$gte": cutoff},
                "source": {"$in": ["auth", "authentication", "login"]},
                "level": {"$in": ["WARNING", "ERROR"]},
                "message": {"$regex": "failed|invalid|denied", "$options": "i"}
            })

            if auth_failures > 5:  # Lowered threshold for better sensitivity
                alert_doc = {
                    "timestamp": now,
                    "alert_type": "authentication_failures",
                    "severity": "HIGH",
                    "title": "Çoklu Kimlik Doğrulama Hatası",
                    "description": f"Son dakikada {auth_failures} kimlik doğrulama hatası tespit edildi",
                    "acknowledged": False,
                    "resolved": False,
                    "metadata": {
                        "failure_count": auth_failures,
                        "time_window": "1_minute"
                    }
                }
                await db.security_alerts.insert_one(alert_doc)
                logger.warning(f"🚨 Security alert: {auth_failures} auth failures")

        except Exception as e:
            logger.error(f"⚠️ Error in security alert task: {e}")
            await asyncio.sleep(30)

# Utility functions
async def file_exists(file_path: str) -> bool:
    """Check if file exists asynchronously"""
    try:
        import os
        return os.path.exists(file_path)
    except:
        return False

async def analyze_traffic_pattern(parsed_data: Dict[str, Any]):
    """Analyze traffic patterns for anomalies"""
    try:
        # Check for suspicious patterns
        src_ip = parsed_data.get("src_ip")
        dst_ip = parsed_data.get("dst_ip")
        protocol = parsed_data.get("protocol")
        dst_port = parsed_data.get("dst_port")

        # Detect potential threats
        suspicious_ports = [22, 23, 135, 445, 1433, 3389]  # Common attack ports
        if dst_port in suspicious_ports:
            db = await get_database()
            alert_doc = {
                "timestamp": datetime.utcnow(),
                "alert_type": "suspicious_port_access",
                "severity": "MEDIUM",
                "title": "Şüpheli Port Aktivitesi Tespit Edildi",
                "description": f"Port {dst_port} üzerinde aktivite tespit edildi ({src_ip} -> {dst_ip})",
                "source_ip": src_ip,
                "destination_ip": dst_ip,
                "port": dst_port,
                "protocol": protocol,
                "acknowledged": False,
                "resolved": False,
                "metadata": {
                    "suspicious_port": dst_port,
                    "traffic_type": parsed_data.get("traffic_type")
                }
            }
            await db.security_alerts.insert_one(alert_doc)

    except Exception as e:
        logger.error(f"⚠️ Error analyzing traffic pattern: {e}")