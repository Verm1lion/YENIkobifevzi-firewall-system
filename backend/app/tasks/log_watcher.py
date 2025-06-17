"""
Log monitoring and analysis tasks
"""
import asyncio
import re
import platform
import subprocess
from datetime import datetime, timedelta
from ..database import get_database

FWDROP_REGEX = re.compile(r"FWDROP:")


async def start_log_watchers():
    """Start all log monitoring tasks"""
    print("🔍 Starting log watchers...")

    # Start different watchers based on platform
    if platform.system().lower().startswith("linux"):
        asyncio.create_task(iptables_log_watcher())
    elif platform.system().lower().startswith("win"):
        asyncio.create_task(windows_firewall_log_watcher())

    # Start analysis tasks
    asyncio.create_task(advanced_log_analysis_task())
    asyncio.create_task(security_alert_task())

    print("✅ Log watchers started")


async def iptables_log_watcher():
    """
    Monitor iptables logs for blocked packets (Linux only)
    """
    try:
        if not platform.system().lower().startswith("linux"):
            return

        print("🔍 Starting iptables log watcher...")

        # Try to monitor syslog
        cmd = ["tail", "-F", "/var/log/syslog"]
        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            text=True
        )

        while True:
            try:
                line = await asyncio.wait_for(process.stdout.readline(), timeout=1.0)
                if not line:
                    await asyncio.sleep(0.1)
                    continue

                if "FWDROP:" in line:
                    await process_blocked_packet_log(line.strip())

            except asyncio.TimeoutError:
                continue
            except Exception as e:
                print(f"⚠️ Error in iptables log watcher: {e}")
                await asyncio.sleep(5)

    except Exception as e:
        print(f"❌ Failed to start iptables log watcher: {e}")


async def windows_firewall_log_watcher():
    """
    Monitor Windows Firewall logs for blocked packets
    """
    try:
        print("🔍 Starting Windows firewall log watcher...")

        # Windows firewall log is typically at:
        # %systemroot%\system32\LogFiles\Firewall\pfirewall.log
        import os
        log_path = os.path.join(
            os.environ.get('SYSTEMROOT', r'C:\Windows'),
            'system32', 'LogFiles', 'Firewall', 'pfirewall.log'
        )

        if not os.path.exists(log_path):
            print(f"⚠️ Windows Firewall log not found at: {log_path}")
            return

        # Simple file monitoring (in production, use a proper file watcher)
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

                    last_size = current_size

                await asyncio.sleep(5)  # Check every 5 seconds

            except Exception as e:
                print(f"⚠️ Error reading Windows firewall log: {e}")
                await asyncio.sleep(10)

    except Exception as e:
        print(f"❌ Failed to start Windows firewall log watcher: {e}")


async def process_blocked_packet_log(log_line: str):
    """Process a blocked packet log entry"""
    try:
        db = get_database()

        # Create blocked packet entry
        doc = {
            "timestamp": datetime.utcnow(),
            "raw_log_line": log_line,
            "source": "firewall_log",
            "event_type": "packet_blocked"
        }

        # Try to extract IP addresses from log
        import re
        ip_pattern = r'\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b'
        ips = re.findall(ip_pattern, log_line)
        if ips:
            doc["source_ip"] = ips[0] if len(ips) > 0 else None
            doc["destination_ip"] = ips[1] if len(ips) > 1 else None

        await db.blocked_packets.insert_one(doc)

        # Check for alerts
        await check_blocked_alarm()

    except Exception as e:
        print(f"⚠️ Error processing blocked packet log: {e}")


async def check_blocked_alarm():
    """
    Check if there are too many blocked packets and create alerts
    """
    try:
        db = get_database()
        now = datetime.utcnow()
        cutoff = now - timedelta(minutes=5)

        # Count blocked packets in last 5 minutes
        count_last_5min = await db.blocked_packets.count_documents({
            "timestamp": {"$gte": cutoff}
        })

        if count_last_5min > 50:
            # Create security alert
            alert_doc = {
                "timestamp": now,
                "alert_type": "high_blocked_traffic",
                "severity": "HIGH",
                "title": "High Volume of Blocked Traffic",
                "description": f"Detected {count_last_5min} blocked packets in the last 5 minutes",
                "acknowledged": False,
                "resolved": False,
                "metadata": {
                    "blocked_count": count_last_5min,
                    "time_window": "5_minutes"
                }
            }
            await db.security_alerts.insert_one(alert_doc)
            print(f"🚨 Security alert: {count_last_5min} blocked packets in 5 minutes")

    except Exception as e:
        print(f"⚠️ Error checking blocked packet alarm: {e}")


async def advanced_log_analysis_task():
    """
    Advanced log analysis task that runs periodically
    """
    while True:
        try:
            await asyncio.sleep(300)  # Run every 5 minutes

            db = get_database()
            now = datetime.utcnow()
            cutoff = now - timedelta(minutes=10)

            # Count various log types
            query = {
                "timestamp": {"$gte": cutoff},
                "level": {"$in": ["ERROR", "WARNING"]},
                "message": {"$regex": "DENY|DROP|BLOCK", "$options": "i"}
            }

            count_deny = await db.system_logs.count_documents(query)

            if count_deny > 100:
                alert_doc = {
                    "timestamp": now,
                    "alert_type": "high_deny_activity",
                    "severity": "MEDIUM",
                    "title": "High Firewall Deny Activity",
                    "description": f"Detected {count_deny} DENY/DROP log entries in the last 10 minutes",
                    "acknowledged": False,
                    "resolved": False,
                    "metadata": {
                        "deny_count": count_deny,
                        "time_window": "10_minutes"
                    }
                }
                await db.security_alerts.insert_one(alert_doc)
                print(f"🚨 Alert: High deny activity - {count_deny} entries")

        except Exception as e:
            print(f"⚠️ Error in advanced log analysis: {e}")
            await asyncio.sleep(60)


async def security_alert_task():
    """
    General security monitoring task
    """
    while True:
        try:
            await asyncio.sleep(60)  # Run every minute

            db = get_database()
            now = datetime.utcnow()
            cutoff = now - timedelta(minutes=1)

            # Check for authentication failures
            auth_failures = await db.system_logs.count_documents({
                "timestamp": {"$gte": cutoff},
                "source": "auth",
                "level": "WARNING",
                "message": {"$regex": "failed|invalid", "$options": "i"}
            })

            if auth_failures > 10:
                alert_doc = {
                    "timestamp": now,
                    "alert_type": "authentication_failures",
                    "severity": "HIGH",
                    "title": "Multiple Authentication Failures",
                    "description": f"Detected {auth_failures} authentication failures in the last minute",
                    "acknowledged": False,
                    "resolved": False,
                    "metadata": {
                        "failure_count": auth_failures,
                        "time_window": "1_minute"
                    }
                }
                await db.security_alerts.insert_one(alert_doc)
                print(f"🚨 Security alert: {auth_failures} auth failures")

        except Exception as e:
            print(f"⚠️ Error in security alert task: {e}")
            await asyncio.sleep(30)