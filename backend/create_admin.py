#!/usr/bin/env python3
"""
KOBI Firewall - Database Initialization & Admin Creation
Modern async implementation with comprehensive error handling
"""
import asyncio
import sys
import os
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any

# Add backend directory to path
sys.path.append(str(Path(__file__).parent))

from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from rich.console import Console
from rich.progress import Progress, SpinnerColumn, TextColumn
from rich.panel import Panel
from rich.table import Table

from app.settings import get_settings

# Initialize rich console and crypto context
console = Console()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
settings = get_settings()


class DatabaseInitializer:
    """Modern database initialization with comprehensive setup"""

    def __init__(self):
        self.client = AsyncIOMotorClient(settings.MONGODB_URL)
        self.db = self.client[settings.DATABASE_NAME]

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        self.client.close()

    async def check_connection(self) -> bool:
        """Test MongoDB connection with detailed feedback"""
        try:
            await self.client.admin.command('ping')
            server_info = await self.client.server_info()
            console.print("✅ MongoDB Connection Successful", style="green")
            console.print(f"   Server Version: {server_info.get('version', 'Unknown')}")
            console.print(f"   Connection URL: {settings.MONGODB_URL}")
            return True
        except Exception as e:
            console.print(f"❌ MongoDB Connection Failed: {e}", style="red")
            console.print("\n💡 Troubleshooting:")
            console.print("   • Ensure MongoDB service is running")
            console.print("   • Check connection URL in .env file")
            console.print("   • Verify network connectivity")
            return False

    async def create_collections(self) -> bool:
        """Create required collections with proper structure"""
        collections_config = {
            'users': [
                ("username", 1),
                ("email", 1)
            ],
            'firewall_rules': [
                ("rule_name", 1),
                ("priority", 1),
                ("enabled", 1)
            ],
            'firewall_groups': [
                ("group_name", 1)
            ],
            'network_interfaces': [
                ("interface_name", 1)
            ],
            'static_routes': [
                ("destination", 1),
                ("enabled", 1)
            ],
            'blocked_domains': [
                ("domain", 1),
                ("created_at", -1)
            ],
            'system_logs': [
                ("timestamp", -1),
                ("level", 1),
                ("source", 1)
            ],
            'blocked_packets': [
                ("timestamp", -1),
                ("source_ip", 1)
            ],
            'security_alerts': [
                ("timestamp", -1),
                ("severity", 1),
                ("acknowledged", 1)
            ],
            'nat_config': [],
            'dns_proxy_config': [],
            'system_config': []
        }

        try:
            existing_collections = set(await self.db.list_collection_names())

            with Progress(
                    SpinnerColumn(),
                    TextColumn("[progress.description]{task.description}"),
                    console=console
            ) as progress:
                task = progress.add_task("Creating collections...", total=len(collections_config))

                for collection_name, indexes in collections_config.items():
                    progress.update(task, description=f"Setting up {collection_name}")

                    # Create collection if it doesn't exist
                    if collection_name not in existing_collections:
                        await self.db.create_collection(collection_name)

                    # Create indexes
                    for index_spec in indexes:
                        try:
                            if collection_name == 'users':
                                if index_spec[0] == "username":
                                    await self.db[collection_name].create_index([index_spec], unique=True)
                                elif index_spec[0] == "email":
                                    await self.db[collection_name].create_index([index_spec], unique=True, sparse=True)
                                else:
                                    await self.db[collection_name].create_index([index_spec])
                            elif collection_name == 'firewall_rules' and index_spec[0] == "rule_name":
                                await self.db[collection_name].create_index([index_spec], unique=True)
                            elif collection_name == 'firewall_groups' and index_spec[0] == "group_name":
                                await self.db[collection_name].create_index([index_spec], unique=True)
                            elif collection_name == 'network_interfaces' and index_spec[0] == "interface_name":
                                await self.db[collection_name].create_index([index_spec], unique=True)
                            elif collection_name == 'blocked_domains' and index_spec[0] == "domain":
                                await self.db[collection_name].create_index([index_spec], unique=True)
                            else:
                                await self.db[collection_name].create_index([index_spec])
                        except Exception as e:
                            if "already exists" not in str(e).lower():
                                console.print(f"⚠️  Index creation warning for {collection_name}: {e}")

                    progress.advance(task)

            console.print("✅ Collections and indexes created successfully", style="green")
            return True
        except Exception as e:
            console.print(f"❌ Collection creation failed: {e}", style="red")
            return False

    async def create_admin_user(self) -> bool:
        """Create admin user with secure password hashing"""
        try:
            # Check if admin already exists
            existing_admin = await self.db.users.find_one({"username": "admin"})
            if existing_admin:
                console.print("✅ Admin user already exists", style="yellow")
                return True

            # Create admin user
            hashed_password = pwd_context.hash("admin123")
            admin_user = {
                "username": "admin",
                "email": "admin@localhost",
                "hashed_password": hashed_password,
                "role": "admin",
                "is_active": True,
                "created_at": datetime.utcnow(),
                "last_login": None,
                "failed_login_attempts": 0,
                "settings": {
                    "theme": "dark",
                    "language": "en",
                    "timezone": "UTC"
                },
                "permissions": []
            }

            result = await self.db.users.insert_one(admin_user)

            # Create credentials panel
            credentials_table = Table(title="Admin Credentials")
            credentials_table.add_column("Field", style="cyan")
            credentials_table.add_column("Value", style="green")
            credentials_table.add_row("Username", "admin")
            credentials_table.add_row("Password", "admin123")
            credentials_table.add_row("Role", "admin")
            credentials_table.add_row("Database ID", str(result.inserted_id))

            console.print(Panel(credentials_table, title="✅ Admin User Created"))
            return True
        except Exception as e:
            console.print(f"❌ Admin user creation failed: {e}", style="red")
            return False

    async def create_default_configs(self) -> bool:
        """Create default system configurations"""
        try:
            configs = [
                {
                    "collection": "system_config",
                    "document": {
                        "_id": "main",
                        "project_name": "KOBI Firewall",
                        "version": "2.0.0",
                        "timezone": "UTC",
                        "auto_backup": True,
                        "log_retention_days": 30,
                        "created_at": datetime.utcnow()
                    }
                },
                {
                    "collection": "nat_config",
                    "document": {
                        "_id": "main",
                        "enabled": False,
                        "wan_interface": "",
                        "lan_interface": "",
                        "created_at": datetime.utcnow()
                    }
                },
                {
                    "collection": "dns_proxy_config",
                    "document": {
                        "_id": "main",
                        "enabled": False,
                        "listen_port": 53,
                        "upstream_servers": ["8.8.8.8", "8.8.4.4"],
                        "block_malware": True,
                        "block_ads": False,
                        "created_at": datetime.utcnow()
                    }
                }
            ]

            for config in configs:
                await self.db[config["collection"]].update_one(
                    {"_id": config["document"]["_id"]},
                    {"$setOnInsert": config["document"]},
                    upsert=True
                )

            console.print("✅ Default configurations created", style="green")
            return True
        except Exception as e:
            console.print(f"❌ Default config creation failed: {e}", style="red")
            return False

    async def create_sample_data(self) -> bool:
        """Create sample firewall rules and groups"""
        try:
            # Sample firewall group
            sample_group = {
                "group_name": "Web Services",
                "description": "HTTP/HTTPS web services rules",
                "created_at": datetime.utcnow()
            }
            await self.db.firewall_groups.update_one(
                {"group_name": "Web Services"},
                {"$setOnInsert": sample_group},
                upsert=True
            )

            # Sample firewall rule
            sample_rule = {
                "rule_name": "Allow_HTTP_HTTPS",
                "source_ips": ["0.0.0.0/0"],
                "destination_ports": ["80", "443"],
                "protocol": "TCP",
                "action": "ALLOW",
                "direction": "IN",
                "enabled": True,
                "priority": 100,
                "description": "Allow HTTP and HTTPS traffic",
                "created_at": datetime.utcnow()
            }
            await self.db.firewall_rules.update_one(
                {"rule_name": "Allow_HTTP_HTTPS"},
                {"$setOnInsert": sample_rule},
                upsert=True
            )

            console.print("✅ Sample data created", style="green")
            return True
        except Exception as e:
            console.print(f"⚠️  Sample data creation failed: {e}", style="yellow")
            return False


async def main():
    """Main initialization function"""
    console.print(Panel.fit(
        "[bold blue]KOBI Firewall[/bold blue]\n"
        "[green]Enterprise Security Solution[/green]\n"
        "[dim]Database Initialization & Setup[/dim]",
        border_style="blue"
    ))

    try:
        async with DatabaseInitializer() as db_init:
            steps = [
                ("Connection Test", db_init.check_connection),
                ("Collections Setup", db_init.create_collections),
                ("Admin User Creation", db_init.create_admin_user),
                ("Default Configs", db_init.create_default_configs),
                ("Sample Data", db_init.create_sample_data)
            ]

            success_count = 0
            for step_name, step_func in steps:
                console.print(f"\n🔄 {step_name}...")
                if await step_func():
                    success_count += 1
                else:
                    console.print(f"❌ {step_name} failed", style="red")
                    if step_name in ["Connection Test", "Collections Setup", "Admin User Creation"]:
                        console.print("⚠️  Critical step failed, stopping initialization", style="red")
                        return 1

            # Final summary
            console.print(f"\n{'=' * 60}")
            console.print(f"✅ Initialization Complete! ({success_count}/{len(steps)} steps successful)")

            # Access information panel
            access_info = Table(title="🌐 Access Information")
            access_info.add_column("Service", style="cyan")
            access_info.add_column("URL", style="green")
            access_info.add_row("Web Interface", "http://localhost:3001")
            access_info.add_row("API Documentation", "http://localhost:8000/docs")
            access_info.add_row("Admin Panel", "http://localhost:8000/admin")

            console.print(Panel(access_info))
            console.print("\n🚀 Ready to start the application!")
            console.print("   Backend: uvicorn app.main:app --reload")
            console.print("   Frontend: npm start (port 3001)")
            return 0

    except KeyboardInterrupt:
        console.print("\n⚠️  Initialization cancelled by user", style="yellow")
        return 1
    except Exception as e:
        console.print(f"\n❌ Unexpected error: {e}", style="red")
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)