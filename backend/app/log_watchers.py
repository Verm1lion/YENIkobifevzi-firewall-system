import asyncio
import re
import platform
import subprocess
from datetime import datetime, timedelta

from app.database import db

FWDROP_REGEX = re.compile(r"FWDROP:")

async def iptables_log_watcher():
    """
    Basit bir syslog (tail -F) takibi yaparak 'FWDROP:' prefixli satırları
    blocked_packets koleksiyonuna ekler. Sadece Linux örneği.
    """
    if not platform.system().lower().startswith("linux"):
        return

    cmd = ["tail", "-F", "/var/log/syslog"]
    process = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True
    )

    while True:
        line = await process.stdout.readline()
        if not line:
            await asyncio.sleep(0.1)
            continue

        if "FWDROP:" in line:
            doc = {
                "timestamp": datetime.utcnow(),
                "raw_log_line": line.strip()
            }
            await db["blocked_packets"].insert_one(doc)

            await check_blocked_alarm()

async def check_blocked_alarm():
    """
    Basit alarm kontrolü: Son 5 dk içinde 50'den fazla DROP varsa 'ALERT' log ekler.
    """
    now = datetime.utcnow()
    cutoff = now - timedelta(minutes=5)
    count_last_5min = await db["blocked_packets"].count_documents({"timestamp": {"$gte": cutoff}})

    if count_last_5min > 50:
        alarm_doc = {
            "timestamp": now,
            "level": "ALERT",
            "message": f"Son 5 dakika içinde {count_last_5min} DROP tespit edildi!"
        }
        await db["logs"].insert_one(alarm_doc)


async def advanced_log_analysis_task():
    """
    Her 5 dakikada bir, 'logs' tablosunda çok fazla DENY (firewall_rules) varsa alert üretir.
    Ör: son 10 dakikada 100'den fazla DENY log kaydı -> 'alerts' koleksiyonuna ekle
    """
    while True:
        now = datetime.utcnow()
        cutoff = now - timedelta(minutes=10)

        query = {
            "timestamp": {"$gte": cutoff},
            "level": "INFO",
            "message": {"$regex": "DENY|DROP"}
        }
        count_deny = await db["logs"].count_documents(query)

        if count_deny > 100:
            alert_doc = {
                "timestamp": now,
                "level": "ALERT",
                "message": f"Son 10 dk içinde {count_deny} adet DENY log kaydı tespit edildi!"
            }
            await db["alerts"].insert_one(alert_doc)

        await asyncio.sleep(300)  # 5 dk

async def start_log_watchers():
    asyncio.create_task(iptables_log_watcher())
    asyncio.create_task(advanced_log_analysis_task())
