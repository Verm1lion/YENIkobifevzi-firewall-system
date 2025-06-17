"""
Database cleanup and maintenance tasks
"""
import asyncio
from datetime import datetime, timedelta
from ..database import get_database
from ..settings import get_settings

settings = get_settings()


async def start_cleanup_tasks():
    """Start cleanup tasks"""
    print("🧹 Starting cleanup tasks...")
    asyncio.create_task(log_cleanup_task())
    asyncio.create_task(session_cleanup_task())
    asyncio.create_task(temp_data_cleanup_task())
    print("✅ Cleanup tasks started")


async def log_cleanup_task():
    """Clean up old log entries"""
    while True:
        try:
            await asyncio.sleep(3600)  # Run every hour

            db = get_database()
            cutoff = datetime.utcnow() - timedelta(days=30)  # Keep logs for 30 days

            # Clean system logs
            result = await db.system_logs.delete_many({"timestamp": {"$lt": cutoff}})
            if result.deleted_count > 0:
                print(f"🧹 Cleaned {result.deleted_count} old system logs")

            # Clean blocked packets
            result = await db.blocked_packets.delete_many({"timestamp": {"$lt": cutoff}})
            if result.deleted_count > 0:
                print(f"🧹 Cleaned {result.deleted_count} old blocked packet logs")

            # Clean resolved security alerts (keep for 7 days after resolution)
            alert_cutoff = datetime.utcnow() - timedelta(days=7)
            result = await db.security_alerts.delete_many({
                "resolved": True,
                "resolved_at": {"$lt": alert_cutoff}
            })
            if result.deleted_count > 0:
                print(f"🧹 Cleaned {result.deleted_count} old security alerts")

        except Exception as e:
            print(f"⚠️ Error in log cleanup: {e}")
            await asyncio.sleep(3600)


async def session_cleanup_task():
    """Clean up expired sessions"""
    while True:
        try:
            await asyncio.sleep(1800)  # Run every 30 minutes

            from ..dependencies import security_manager

            # Clean expired sessions from memory
            current_time = datetime.utcnow()
            expired_sessions = []

            for user_id, session_data in security_manager.active_sessions.items():
                last_activity = session_data.get("last_activity")
                if last_activity and (current_time - last_activity).total_seconds() > 28800:  # 8 hours
                    expired_sessions.append(user_id)

            for user_id in expired_sessions:
                security_manager.remove_session(user_id)

            if expired_sessions:
                print(f"🧹 Cleaned {len(expired_sessions)} expired sessions")

        except Exception as e:
            print(f"⚠️ Error in session cleanup: {e}")
            await asyncio.sleep(1800)


async def temp_data_cleanup_task():
    """Clean up temporary data"""
    while True:
        try:
            await asyncio.sleep(86400)  # Run daily

            db = get_database()

            # Clean old health records (keep only 7 days)
            cutoff = datetime.utcnow() - timedelta(days=7)

            collections_to_clean = [
                "system_health",
                "database_health",
                "performance_metrics"
            ]

            for collection_name in collections_to_clean:
                try:
                    result = await db[collection_name].delete_many({"timestamp": {"$lt": cutoff}})
                    if result.deleted_count > 0:
                        print(f"🧹 Cleaned {result.deleted_count} old records from {collection_name}")
                except Exception as e:
                    print(f"⚠️ Error cleaning {collection_name}: {e}")

            # Clean up failed authentication attempts (reset daily)
            from ..dependencies import security_manager
            security_manager.failed_attempts.clear()
            security_manager.blocked_ips.clear()
            print("🧹 Reset failed authentication attempts")

        except Exception as e:
            print(f"⚠️ Error in temp data cleanup: {e}")
            await asyncio.sleep(86400)