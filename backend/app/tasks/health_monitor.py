"""
System health monitoring tasks
"""
import asyncio
import psutil
from datetime import datetime, timedelta
from ..database import get_database


async def start_health_monitor():
    """Start system health monitoring"""
    print("💓 Starting health monitor...")
    asyncio.create_task(system_health_task())
    asyncio.create_task(database_health_task())
    print("✅ Health monitor started")


async def system_health_task():
    """Monitor system health metrics"""
    while True:
        try:
            # Collect system metrics
            cpu_percent = psutil.cpu_percent(interval=1)
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage('/')

            db = get_database()

            # Create health record
            health_doc = {
                "timestamp": datetime.utcnow(),
                "cpu_usage": cpu_percent,
                "memory_usage": memory.percent,
                "disk_usage": disk.percent,
                "memory_available": memory.available,
                "disk_free": disk.free,
                "source": "system_monitor"
            }

            # Store in database (keep only last 24 hours)
            await db.system_health.insert_one(health_doc)

            # Clean old records
            cutoff = datetime.utcnow() - timedelta(hours=24)
            await db.system_health.delete_many({"timestamp": {"$lt": cutoff}})

            # Check for alerts
            if cpu_percent > 90:
                await create_health_alert("high_cpu", "HIGH", f"CPU usage is {cpu_percent}%")
            elif memory.percent > 90:
                await create_health_alert("high_memory", "HIGH", f"Memory usage is {memory.percent}%")
            elif disk.percent > 90:
                await create_health_alert("high_disk", "MEDIUM", f"Disk usage is {disk.percent}%")

            await asyncio.sleep(60)  # Check every minute

        except Exception as e:
            print(f"⚠️ Error in system health monitoring: {e}")
            await asyncio.sleep(60)


async def database_health_task():
    """Monitor database health"""
    while True:
        try:
            db = get_database()

            # Test database connection
            start_time = datetime.utcnow()
            await db.command('ping')
            response_time = (datetime.utcnow() - start_time).total_seconds() * 1000

            # Create database health record
            health_doc = {
                "timestamp": datetime.utcnow(),
                "response_time_ms": response_time,
                "status": "healthy",
                "source": "database_monitor"
            }

            await db.database_health.insert_one(health_doc)

            # Check for slow response
            if response_time > 1000:  # 1 second
                await create_health_alert(
                    "slow_database",
                    "MEDIUM",
                    f"Database response time is {response_time:.2f}ms"
                )

            # Clean old records
            cutoff = datetime.utcnow() - timedelta(hours=24)
            await db.database_health.delete_many({"timestamp": {"$lt": cutoff}})

            await asyncio.sleep(300)  # Check every 5 minutes

        except Exception as e:
            print(f"⚠️ Error in database health monitoring: {e}")
            await asyncio.sleep(300)


async def create_health_alert(alert_type: str, severity: str, description: str):
    """Create a health-related alert"""
    try:
        db = get_database()

        # Check if similar alert already exists in last 10 minutes
        cutoff = datetime.utcnow() - timedelta(minutes=10)
        existing_alert = await db.security_alerts.find_one({
            "alert_type": alert_type,
            "timestamp": {"$gte": cutoff},
            "resolved": False
        })

        if existing_alert:
            return  # Don't create duplicate alerts

        alert_doc = {
            "timestamp": datetime.utcnow(),
            "alert_type": alert_type,
            "severity": severity,
            "title": f"System Health Alert: {alert_type.replace('_', ' ').title()}",
            "description": description,
            "acknowledged": False,
            "resolved": False,
            "source": "health_monitor",
            "metadata": {
                "category": "system_health"
            }
        }

        await db.security_alerts.insert_one(alert_doc)
        print(f"🚨 Health alert: {alert_type} - {description}")

    except Exception as e:
        print(f"⚠️ Error creating health alert: {e}")