"""
Modern database connection management with lifespan events
"""
import asyncio
from contextlib import asynccontextmanager
from typing import Optional
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo.errors import ServerSelectionTimeoutError
from .settings import get_settings

settings = get_settings()

class DatabaseManager:
    """Database connection manager with proper lifecycle management"""

    def __init__(self):
        self.client: Optional[AsyncIOMotorClient] = None
        self.database: Optional[AsyncIOMotorDatabase] = None

    async def connect(self):
        """Establish database connection"""
        try:
            self.client = AsyncIOMotorClient(
                settings.mongodb_url,
                serverSelectionTimeoutMS=5000,
                maxPoolSize=10,
                minPoolSize=5,
                maxIdleTimeMS=30000,
                socketTimeoutMS=20000,
            )
            # Test connection
            await self.client.admin.command('ping')
            self.database = self.client[settings.database_name]
            print(f"✅ Connected to MongoDB: {settings.database_name}")
        except ServerSelectionTimeoutError as e:
            print(f"❌ Failed to connect to MongoDB: {e}")
            raise
        except Exception as e:
            print(f"❌ Database connection error: {e}")
            raise

    async def disconnect(self):
        """Close database connection"""
        if self.client:
            self.client.close()
            print("✅ Disconnected from MongoDB")

    async def health_check(self) -> bool:
        """Check database health"""
        try:
            if not self.client:
                return False
            await self.client.admin.command('ping')
            return True
        except Exception:
            return False

    def get_database(self) -> AsyncIOMotorDatabase:
        """Get database instance"""
        if not self.database:
            raise RuntimeError("Database not connected")
        return self.database

# Global database manager instance
db_manager = DatabaseManager()

@asynccontextmanager
async def lifespan(app):
    """Application lifespan manager"""
    # Startup
    print("🚀 Starting KOBI Firewall...")
    await db_manager.connect()

    # Background tasks
    asyncio.create_task(periodic_health_check())

    yield

    # Shutdown
    print("🛑 Shutting down KOBI Firewall...")
    await db_manager.disconnect()

async def periodic_health_check():
    """Periodic database health check"""
    while True:
        try:
            await asyncio.sleep(60)  # Check every minute
            if not await db_manager.health_check():
                print("⚠️  Database health check failed")
                # Here you could implement reconnection logic
        except asyncio.CancelledError:
            break
        except Exception as e:
            print(f"❌ Health check error: {e}")

def get_database() -> AsyncIOMotorDatabase:
    """Get database instance (dependency injection)"""
    return db_manager.get_database()

# Convenience alias for backward compatibility
db = get_database