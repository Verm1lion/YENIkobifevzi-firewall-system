"""
Enhanced database management with comprehensive security, connection pooling,
advanced error handling, and Settings integration
Production-ready MongoDB management for KOBI Firewall
Version 2.0.0 - Full Settings Router Support with Network Interface Management + REPORTS MODULE
"""
import motor.motor_asyncio
import asyncio
import logging
import time
from pymongo.errors import (
    ServerSelectionTimeoutError,
    OperationFailure,
    DuplicateKeyError,
    ConnectionFailure,
    NetworkTimeout
)
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List, Union
import bcrypt
from pathlib import Path
from .settings import get_settings

# Enhanced Logger setup
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class DatabaseConnectionError(Exception):
    """Custom database connection exception"""
    pass

class DatabaseManager:
    """Enhanced database connection manager with comprehensive features and Settings support"""
    def __init__(self):
        self.settings = get_settings()
        self.client: Optional[motor.motor_asyncio.AsyncIOMotorClient] = None
        self.database = None
        self.is_connected = False
        self.connection_attempts = 0
        self.max_connection_attempts = 5
        self.last_health_check = None
        self.connection_start_time = None
        self.reconnect_count = 0

        # Enhanced connection monitoring
        self.connection_history: List[Dict[str, Any]] = []
        self.performance_metrics = {
            'connection_time': 0,
            'query_count': 0,
            'error_count': 0,
            'last_error': None,
            'total_operations': 0,
            'average_response_time': 0
        }

        # Settings-specific tracking
        self.settings_operations = {
            'reads': 0,
            'writes': 0,
            'updates': 0,
            'deletes': 0
        }

    async def connect(self) -> bool:
        """Enhanced MongoDB connection with comprehensive retry logic and monitoring"""
        if self.is_connected and self.client:
            # Verify existing connection
            try:
                await self.client.admin.command('ping')
                return True
            except Exception:
                logger.warning("🔄 Existing connection failed ping test, reconnecting...")
                self.is_connected = False

        connection_start = time.time()
        self.connection_start_time = datetime.utcnow()

        while self.connection_attempts < self.max_connection_attempts:
            try:
                self.connection_attempts += 1
                attempt_start = time.time()
                logger.info(
                    f"🔌 Attempting MongoDB connection "
                    f"(attempt {self.connection_attempts}/{self.max_connection_attempts})"
                )
                logger.info(f"📍 MongoDB URL: {self.settings.mongodb_url}")

                # Enhanced MongoDB client configuration
                client_config = {
                    'serverSelectionTimeoutMS': 15000,  # 15 seconds
                    'connectTimeoutMS': 10000,           # 10 seconds
                    'socketTimeoutMS': 20000,            # 20 seconds
                    'maxPoolSize': 100,                  # Increased pool size
                    'minPoolSize': 10,
                    'maxIdleTimeMS': 30000,
                    'waitQueueTimeoutMS': 15000,
                    'retryWrites': True,
                    'retryReads': True,
                    'heartbeatFrequencyMS': 10000,       # 10 seconds heartbeat
                    'serverSelectionTimeoutMS': 15000,
                    # Enhanced write concern for data consistency
                    'w': 'majority',
                    'wtimeout': 10000,
                    'j': True  # Journal write concern
                }

                # Create MongoDB client with enhanced settings
                self.client = motor.motor_asyncio.AsyncIOMotorClient(
                    self.settings.mongodb_url,
                    **client_config
                )

                # Test connection with timeout
                try:
                    await asyncio.wait_for(
                        self.client.admin.command('ping'),
                        timeout=10.0
                    )
                except asyncio.TimeoutError:
                    raise ServerSelectionTimeoutError("Connection ping timeout")

                # Get database reference
                self.database = self.client[self.settings.database_name]

                # Verify database access with additional checks
                try:
                    collections = await self.database.list_collection_names()
                    await self.database.command('dbstats')  # Additional verification
                    logger.info(
                        f"✅ Database connected: {self.settings.database_name} "
                        f"({len(collections)} collections)"
                    )
                except Exception as e:
                    logger.error(f"❌ Database verification failed: {e}")
                    raise

                # Initialize database schema and data
                await self._initialize_database()

                # Update connection status
                self.is_connected = True
                self.connection_attempts = 0  # Reset on success
                connection_time = time.time() - connection_start
                self.performance_metrics['connection_time'] = connection_time

                # Log successful connection
                self._log_connection_event('success', {
                    'attempt': self.connection_attempts,
                    'connection_time': connection_time,
                    'collections_count': len(collections)
                })

                logger.info(f"🎉 MongoDB connection established in {connection_time:.2f}s")
                return True

            except ServerSelectionTimeoutError as e:
                attempt_time = time.time() - attempt_start
                logger.error(
                    f"❌ MongoDB connection timeout "
                    f"(attempt {self.connection_attempts}, {attempt_time:.2f}s): {e}"
                )
                self._log_connection_event('timeout', {
                    'attempt': self.connection_attempts,
                    'error': str(e),
                    'attempt_time': attempt_time
                })

            except ConnectionFailure as e:
                attempt_time = time.time() - attempt_start
                logger.error(
                    f"❌ MongoDB connection failure "
                    f"(attempt {self.connection_attempts}, {attempt_time:.2f}s): {e}"
                )
                self._log_connection_event('connection_failure', {
                    'attempt': self.connection_attempts,
                    'error': str(e),
                    'attempt_time': attempt_time
                })

            except Exception as e:
                attempt_time = time.time() - attempt_start
                logger.error(
                    f"❌ MongoDB connection error "
                    f"(attempt {self.connection_attempts}, {attempt_time:.2f}s): {e}"
                )
                self._log_connection_event('general_error', {
                    'attempt': self.connection_attempts,
                    'error': str(e),
                    'error_type': type(e).__name__,
                    'attempt_time': attempt_time
                })

            # Cleanup failed connection
            if self.client:
                try:
                    self.client.close()
                except:
                    pass
                self.client = None

            # Check if we should continue retrying
            if self.connection_attempts >= self.max_connection_attempts:
                error_msg = f"❌ Maximum connection attempts ({self.max_connection_attempts}) reached"
                logger.error(error_msg)
                self.performance_metrics['error_count'] += 1
                self.performance_metrics['last_error'] = error_msg
                raise DatabaseConnectionError(
                    f"Failed to connect to MongoDB after {self.max_connection_attempts} attempts. "
                    "Please check if MongoDB is running and accessible."
                )

            # Exponential backoff with jitter
            wait_time = min(2 ** self.connection_attempts + (time.time() % 1), 30)
            logger.info(f"⏳ Waiting {wait_time:.1f}s before retry...")
            await asyncio.sleep(wait_time)

        return False

    def _log_connection_event(self, event_type: str, data: Dict[str, Any]):
        """Log connection events for monitoring"""
        event = {
            'timestamp': datetime.utcnow(),
            'event_type': event_type,
            'data': data
        }
        self.connection_history.append(event)
        # Keep only last 50 events
        if len(self.connection_history) > 50:
            self.connection_history = self.connection_history[-50:]

    async def disconnect(self):
        """Enhanced disconnect with cleanup"""
        if self.client:
            try:
                # Graceful closure
                self.client.close()
                logger.info("📤 MongoDB connection closed gracefully")
            except Exception as e:
                logger.warning(f"⚠️ Error during disconnection: {e}")
            finally:
                self.client = None
                self.database = None
                self.is_connected = False
                self._log_connection_event('disconnect', {
                    'graceful': True,
                    'uptime': self._get_connection_uptime()
                })

    def _get_connection_uptime(self) -> float:
        """Calculate connection uptime in seconds"""
        if self.connection_start_time:
            return (datetime.utcnow() - self.connection_start_time).total_seconds()
        return 0

    async def get_database(self):
        """Get database instance with enhanced auto-reconnect"""
        if not self.is_connected:
            logger.info("🔄 Database not connected, attempting connection...")
            success = await self.connect()
            if not success:
                raise DatabaseConnectionError("Failed to establish database connection")

        # Verify connection health before returning database
        try:
            await self.client.admin.command('ping')
        except Exception as e:
            logger.warning(f"🔄 Database ping failed, reconnecting: {e}")
            self.is_connected = False
            await self.connect()

        return self.database

    async def _initialize_database(self):
        """Enhanced database initialization with comprehensive setup including Settings"""
        try:
            logger.info("🔧 Initializing database schema and data...")
            # Initialize in order of dependency
            await self._create_indexes()
            await self._initialize_admin_user()
            await self._initialize_default_configs()
            await self._create_system_collections()
            await self._setup_data_retention_policies()
            # NEW: Initialize Settings-specific collections
            await self._initialize_settings_collections()
            # NEW: Initialize Reports-specific collections
            await self._initialize_reports_collections()
            logger.info("✅ Database initialization completed successfully")
        except Exception as e:
            logger.error(f"❌ Database initialization failed: {str(e)}")
            self.performance_metrics['error_count'] += 1
            self.performance_metrics['last_error'] = f"Init failed: {str(e)}"
            raise

    async def _create_indexes(self):
        """Enhanced index creation with comprehensive performance optimization"""
        try:
            logger.info("📋 Creating optimized database indexes...")
            # Users collection indexes
            await self._create_users_indexes()
            # Firewall collections indexes
            await self._create_firewall_indexes()
            # System monitoring indexes
            await self._create_system_indexes()
            # Settings and configuration indexes
            await self._create_config_indexes()
            # NEW: Settings-specific indexes
            await self._create_settings_indexes()
            # NEW: Reports-specific indexes
            await self._create_reports_indexes()
            logger.info("✅ All database indexes created successfully")
        except Exception as e:
            logger.error(f"❌ Index creation failed: {str(e)}")
            raise

    async def _create_users_indexes(self):
        """Create comprehensive user collection indexes"""
        try:
            users_collection = self.database.users
            existing_indexes = await users_collection.list_indexes().to_list(length=None)
            existing_index_names = [idx['name'] for idx in existing_indexes]

            indexes_to_create = [
                # Unique indexes
                ('username', {'unique': True}),
                ('email', {'unique': True, 'sparse': True}),
                # Performance indexes
                ('is_active', {}),
                ('role', {}),
                ('last_login', {}),
                ('last_seen', {}),
                ('created_at', {}),
                # Security indexes
                ('failed_login_attempts', {}),
                ('locked_until', {'sparse': True}),
                # Compound indexes for complex queries
                (('is_active', 'role'), {}),
                (('username', 'is_active'), {}),
                (('email', 'is_active'), {'sparse': True}),
            ]

            for index_spec, options in indexes_to_create:
                index_name = f"{index_spec}_1" if isinstance(index_spec, str) else f"{'_'.join(index_spec)}_compound"
                if index_name not in existing_index_names:
                    try:
                        if isinstance(index_spec, tuple):
                            await users_collection.create_index(
                                [(field, 1) for field in index_spec],
                                **options
                            )
                        else:
                            await users_collection.create_index(index_spec, **options)
                        logger.info(f"✅ Created users index: {index_name}")
                    except Exception as e:
                        logger.warning(f"⚠️ Users index creation warning ({index_name}): {e}")
        except Exception as e:
            logger.error(f"❌ Users indexes creation failed: {e}")
            raise

    async def _create_firewall_indexes(self):
        """Create firewall-related collection indexes"""
        try:
            # Firewall rules indexes
            firewall_rules = self.database.firewall_rules
            indexes = [
                ('rule_name', {'unique': True, 'sparse': True}),
                ('enabled', {}),
                ('priority', {}),
                ('action', {}),
                ('direction', {}),
                ('protocol', {}),
                ('created_at', {}),
                ('updated_at', {}),
                (('enabled', 'priority'), {}),
                (('action', 'enabled'), {}),
            ]

            for index_spec, options in indexes:
                try:
                    if isinstance(index_spec, tuple):
                        await firewall_rules.create_index(
                            [(field, 1) for field in index_spec],
                            **options
                        )
                    else:
                        await firewall_rules.create_index(index_spec, **options)
                except Exception as e:
                    logger.warning(f"⚠️ Firewall rules index warning: {e}")

            # Firewall groups indexes
            firewall_groups = self.database.firewall_groups
            group_indexes = [
                ('group_name', {'unique': True, 'sparse': True}),
                ('enabled', {}),
                ('created_at', {}),
            ]

            for index_spec, options in group_indexes:
                try:
                    await firewall_groups.create_index(index_spec, **options)
                except Exception as e:
                    logger.warning(f"⚠️ Firewall groups index warning: {e}")

            logger.info("✅ Created firewall collection indexes")
        except Exception as e:
            logger.error(f"❌ Firewall indexes creation failed: {e}")
            raise

    async def _create_system_indexes(self):
        """Create system monitoring and logging indexes with TTL"""
        try:
            # System logs with TTL (Time To Live) - 30 days retention
            system_logs = self.database.system_logs
            log_indexes = [
                ('timestamp', {'expireAfterSeconds': 2592000}),  # 30 days
                ('level', {}),
                ('source', {}),
                ('user_id', {'sparse': True}),
                (('level', 'timestamp'), {}),
                (('source', 'timestamp'), {}),
            ]

            for index_spec, options in log_indexes:
                try:
                    if isinstance(index_spec, tuple):
                        await system_logs.create_index(
                            [(field, 1 if field != 'timestamp' else -1) for field in index_spec],
                            **options
                        )
                    else:
                        await system_logs.create_index(
                            index_spec if index_spec != 'timestamp' else [('timestamp', -1)],
                            **options
                        )
                except Exception as e:
                    logger.warning(f"⚠️ System logs index warning: {e}")

            # Network activity with TTL - 7 days retention
            network_activity = self.database.network_activity
            network_indexes = [
                ('timestamp', {'expireAfterSeconds': 604800}),  # 7 days
                ('source_ip', {}),
                ('destination_ip', {}),
                ('action', {}),
                ('protocol', {}),
                (('action', 'timestamp'), {}),
                (('source_ip', 'timestamp'), {}),
            ]

            for index_spec, options in network_indexes:
                try:
                    if isinstance(index_spec, tuple):
                        await network_activity.create_index(
                            [(field, 1 if field != 'timestamp' else -1) for field in index_spec],
                            **options
                        )
                    else:
                        await network_activity.create_index(
                            index_spec if index_spec != 'timestamp' else [('timestamp', -1)],
                            **options
                        )
                except Exception as e:
                    logger.warning(f"⚠️ Network activity index warning: {e}")

            # Security alerts indexes
            security_alerts = self.database.security_alerts
            alert_indexes = [
                ('timestamp', {}),
                ('severity', {}),
                ('acknowledged', {}),
                ('resolved', {}),
                ('alert_type', {}),
                (('severity', 'acknowledged'), {}),
                (('acknowledged', 'resolved'), {}),
            ]

            for index_spec, options in alert_indexes:
                try:
                    if isinstance(index_spec, tuple):
                        await security_alerts.create_index(
                            [(field, 1 if field != 'timestamp' else -1) for field in index_spec],
                            **options
                        )
                    else:
                        await security_alerts.create_index(
                            index_spec if index_spec != 'timestamp' else [('timestamp', -1)],
                            **options
                        )
                except Exception as e:
                    logger.warning(f"⚠️ Security alerts index warning: {e}")

            logger.info("✅ Created system monitoring indexes with TTL")
        except Exception as e:
            logger.error(f"❌ System indexes creation failed: {e}")
            raise

    async def _create_config_indexes(self):
        """Create configuration and settings indexes"""
        try:
            # System configs indexes
            system_configs = self.database.system_config
            config_indexes = [
                ('config_key', {'unique': True, 'sparse': True}),
                ('category', {}),
                ('updated_at', {}),
                ('modified_by', {'sparse': True}),
            ]

            for index_spec, options in config_indexes:
                try:
                    await system_configs.create_index(index_spec, **options)
                except Exception as e:
                    logger.warning(f"⚠️ System config index warning: {e}")

            # Network interfaces indexes - ENHANCED
            network_interfaces = self.database.network_interfaces
            interface_indexes = [
                ('interface_name', {'unique': True, 'sparse': True}),
                ('physical_device', {'sparse': True}),
                ('admin_enabled', {}),
                ('ip_mode', {}),
                ('interface_type', {}),
                ('ics_enabled', {}),  # YENİ
                ('operational_status', {}),  # YENİ
                (('admin_enabled', 'ip_mode'), {}),
                (('interface_type', 'admin_enabled'), {}),
                (('ics_enabled', 'admin_enabled'), {}),  # YENİ
            ]

            for index_spec, options in interface_indexes:
                try:
                    if isinstance(index_spec, tuple):
                        await network_interfaces.create_index(
                            [(field, 1) for field in index_spec],
                            **options
                        )
                    else:
                        await network_interfaces.create_index(index_spec, **options)
                except Exception as e:
                    logger.warning(f"⚠️ Network interfaces index warning: {e}")

            # Static routes indexes
            static_routes = self.database.static_routes
            route_indexes = [
                ('destination', {}),
                ('enabled', {}),
                ('metric', {}),
                (('destination', 'enabled'), {}),
            ]

            for index_spec, options in route_indexes:
                try:
                    if isinstance(index_spec, tuple):
                        await static_routes.create_index(
                            [(field, 1) for field in index_spec],
                            **options
                        )
                    else:
                        await static_routes.create_index(index_spec, **options)
                except Exception as e:
                    logger.warning(f"⚠️ Static routes index warning: {e}")

            # Blocked domains indexes
            blocked_domains = self.database.blocked_domains
            domain_indexes = [
                ('domain', {'unique': True}),
                ('category', {'sparse': True}),
                ('created_at', {}),
                ('use_wildcard', {}),
            ]

            for index_spec, options in domain_indexes:
                try:
                    await blocked_domains.create_index(index_spec, **options)
                except Exception as e:
                    logger.warning(f"⚠️ Blocked domains index warning: {e}")

            logger.info("✅ Created configuration indexes")
        except Exception as e:
            logger.error(f"❌ Configuration indexes creation failed: {e}")
            raise

    async def _create_settings_indexes(self):
        """NEW: Create Settings-specific indexes for enhanced performance"""
        try:
            logger.info("⚙️ Creating Settings-specific database indexes...")
            # Settings configuration collection
            settings_config = self.database.settings_config
            settings_indexes = [
                ('section', {'unique': True}),
                ('updated_at', {}),
                ('updated_by', {'sparse': True}),
                ('version', {}),
                ('active', {}),
            ]

            for index_spec, options in settings_indexes:
                try:
                    await settings_config.create_index(index_spec, **options)
                    logger.info(f"✅ Created settings config index: {index_spec}")
                except Exception as e:
                    logger.warning(f"⚠️ Settings config index warning ({index_spec}): {e}")

            # Settings history collection (for audit trail)
            settings_history = self.database.settings_history
            history_indexes = [
                ('timestamp', {'expireAfterSeconds': 7776000}),  # 90 days retention
                ('section', {}),
                ('changed_by', {}),
                ('change_type', {}),
                (('section', 'timestamp'), {}),
                (('changed_by', 'timestamp'), {}),
            ]

            for index_spec, options in history_indexes:
                try:
                    if isinstance(index_spec, tuple):
                        await settings_history.create_index(
                            [(field, 1 if field != 'timestamp' else -1) for field in index_spec],
                            **options
                        )
                    else:
                        await settings_history.create_index(
                            index_spec if index_spec != 'timestamp' else [('timestamp', -1)],
                            **options
                        )
                    logger.info(f"✅ Created settings history index: {index_spec}")
                except Exception as e:
                    logger.warning(f"⚠️ Settings history index warning ({index_spec}): {e}")

            # System operations log (for settings operations tracking)
            system_operations = self.database.system_operations
            operations_indexes = [
                ('timestamp', {'expireAfterSeconds': 2592000}),  # 30 days retention
                ('operation_type', {}),
                ('user_id', {}),
                ('status', {}),
                ('category', {}),
                (('operation_type', 'timestamp'), {}),
                (('user_id', 'timestamp'), {}),
                (('status', 'timestamp'), {}),
            ]

            for index_spec, options in operations_indexes:
                try:
                    if isinstance(index_spec, tuple):
                        await system_operations.create_index(
                            [(field, 1 if field != 'timestamp' else -1) for field in index_spec],
                            **options
                        )
                    else:
                        await system_operations.create_index(
                            index_spec if index_spec != 'timestamp' else [('timestamp', -1)],
                            **options
                        )
                    logger.info(f"✅ Created system operations index: {index_spec}")
                except Exception as e:
                    logger.warning(f"⚠️ System operations index warning ({index_spec}): {e}")

            logger.info("✅ Settings-specific indexes created successfully")
        except Exception as e:
            logger.error(f"❌ Settings indexes creation failed: {e}")
            raise

    async def _create_reports_indexes(self):
        """NEW: Create Reports-specific indexes for enhanced performance"""
        try:
            logger.info("📊 Creating Reports-specific database indexes...")

            # Reports config collection
            reports_config = self.database.reports_config
            reports_config_indexes = [
                ('enabled', {}),
                ('created_at', {}),
                ('updated_at', {}),
            ]

            for index_spec, options in reports_config_indexes:
                try:
                    await reports_config.create_index(index_spec, **options)
                    logger.info(f"✅ Created reports config index: {index_spec}")
                except Exception as e:
                    logger.warning(f"⚠️ Reports config index warning ({index_spec}): {e}")

            # Report templates collection
            report_templates = self.database.report_templates
            template_indexes = [
                ('template_name', {'unique': True}),
                ('template_type', {}),
                ('created_at', {}),
                (('template_type', 'created_at'), {}),
            ]

            for index_spec, options in template_indexes:
                try:
                    if isinstance(index_spec, tuple):
                        await report_templates.create_index(
                            [(field, 1 if field != 'created_at' else -1) for field in index_spec],
                            **options
                        )
                    else:
                        await report_templates.create_index(index_spec, **options)
                    logger.info(f"✅ Created report templates index: {index_spec}")
                except Exception as e:
                    logger.warning(f"⚠️ Report templates index warning ({index_spec}): {e}")

            # Generated reports collection with TTL
            generated_reports = self.database.generated_reports
            generated_indexes = [
                ('timestamp', {'expireAfterSeconds': 7776000}),  # 90 days retention
                ('report_type', {}),
                ('user_id', {}),
                ('status', {}),
                (('report_type', 'timestamp'), {}),
                (('user_id', 'timestamp'), {}),
                (('status', 'timestamp'), {}),
            ]

            for index_spec, options in generated_indexes:
                try:
                    if isinstance(index_spec, tuple):
                        await generated_reports.create_index(
                            [(field, 1 if field != 'timestamp' else -1) for field in index_spec],
                            **options
                        )
                    else:
                        await generated_reports.create_index(
                            index_spec if index_spec != 'timestamp' else [('timestamp', -1)],
                            **options
                        )
                    logger.info(f"✅ Created generated reports index: {index_spec}")
                except Exception as e:
                    logger.warning(f"⚠️ Generated reports index warning ({index_spec}): {e}")

            # Report schedules collection
            report_schedules = self.database.report_schedules
            schedule_indexes = [
                ('enabled', {}),
                ('next_run', {}),
                ('report_type', {}),
                ('frequency', {}),
                (('enabled', 'next_run'), {}),
            ]

            for index_spec, options in schedule_indexes:
                try:
                    if isinstance(index_spec, tuple):
                        await report_schedules.create_index(
                            [(field, 1) for field in index_spec],
                            **options
                        )
                    else:
                        await report_schedules.create_index(index_spec, **options)
                    logger.info(f"✅ Created report schedules index: {index_spec}")
                except Exception as e:
                    logger.warning(f"⚠️ Report schedules index warning ({index_spec}): {e}")

            # Traffic analytics collection with TTL
            traffic_analytics = self.database.traffic_analytics
            traffic_indexes = [
                ('timestamp', {'expireAfterSeconds': 2592000}),  # 30 days retention
                ('interface', {}),
                ('protocol', {}),
                ('direction', {}),
                (('interface', 'timestamp'), {}),
                (('protocol', 'timestamp'), {}),
            ]

            for index_spec, options in traffic_indexes:
                try:
                    if isinstance(index_spec, tuple):
                        await traffic_analytics.create_index(
                            [(field, 1 if field != 'timestamp' else -1) for field in index_spec],
                            **options
                        )
                    else:
                        await traffic_analytics.create_index(
                            index_spec if index_spec != 'timestamp' else [('timestamp', -1)],
                            **options
                        )
                    logger.info(f"✅ Created traffic analytics index: {index_spec}")
                except Exception as e:
                    logger.warning(f"⚠️ Traffic analytics index warning ({index_spec}): {e}")

            # Performance metrics collection with TTL
            performance_metrics = self.database.performance_metrics
            performance_indexes = [
                ('timestamp', {'expireAfterSeconds': 2592000}),  # 30 days retention
                ('metric_type', {}),
                ('source', {}),
                (('metric_type', 'timestamp'), {}),
                (('source', 'timestamp'), {}),
            ]

            for index_spec, options in performance_indexes:
                try:
                    if isinstance(index_spec, tuple):
                        await performance_metrics.create_index(
                            [(field, 1 if field != 'timestamp' else -1) for field in index_spec],
                            **options
                        )
                    else:
                        await performance_metrics.create_index(
                            index_spec if index_spec != 'timestamp' else [('timestamp', -1)],
                            **options
                        )
                    logger.info(f"✅ Created performance metrics index: {index_spec}")
                except Exception as e:
                    logger.warning(f"⚠️ Performance metrics index warning ({index_spec}): {e}")

            logger.info("✅ Reports-specific indexes created successfully")
        except Exception as e:
            logger.error(f"❌ Reports indexes creation failed: {e}")
            raise

    async def _initialize_settings_collections(self):
        """NEW: Initialize Settings-specific collections"""
        try:
            logger.info("📦 Initializing Settings-specific collections...")
            # Create Settings collections if they don't exist
            settings_collections = [
                'settings_config',
                'settings_history',
                'system_operations',
                'backup_metadata',
                'update_history'
            ]

            existing_collections = await self.database.list_collection_names()
            for collection_name in settings_collections:
                if collection_name not in existing_collections:
                    await self.database.create_collection(collection_name)
                    logger.info(f"✅ Created Settings collection: {collection_name}")

            # Initialize default settings data
            await self._initialize_default_settings_data()

            logger.info("✅ Settings collections initialized successfully")
        except Exception as e:
            logger.warning(f"⚠️ Settings collections initialization warning: {e}")

    async def _initialize_reports_collections(self):
        """NEW: Initialize Reports-specific collections"""
        try:
            logger.info("📊 Initializing Reports-specific collections...")
            # Create Reports collections if they don't exist
            reports_collections = [
                'reports_config',
                'report_templates',
                'generated_reports',
                'report_schedules',
                'report_history',
                'traffic_analytics',
                'security_events',
                'performance_metrics'
            ]

            existing_collections = await self.database.list_collection_names()
            for collection_name in reports_collections:
                if collection_name not in existing_collections:
                    await self.database.create_collection(collection_name)
                    logger.info(f"✅ Created Reports collection: {collection_name}")

            # Initialize with sample reports data if empty
            await self._initialize_reports_sample_data()

            logger.info("✅ Reports collections initialized successfully")
        except Exception as e:
            logger.warning(f"⚠️ Reports collections creation warning: {e}")

    async def _initialize_reports_sample_data(self):
        """NEW: Initialize reports collections with sample/default data"""
        try:
            # Default reports config
            reports_config = self.database.reports_config
            if await reports_config.count_documents({}) == 0:
                default_reports_config = {
                    "_id": "main",
                    "enabled": True,
                    "auto_generation": True,
                    "retention_days": 90,
                    "export_formats": ["pdf", "csv", "json"],
                    "dashboard_refresh_interval": 5,
                    "created_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
                }
                await reports_config.insert_one(default_reports_config)

            # Default report templates
            report_templates = self.database.report_templates
            if await report_templates.count_documents({}) == 0:
                default_templates = [
                    {
                        "template_name": "security_report",
                        "display_name": "Güvenlik Raporu",
                        "description": "Güvenlik olayları ve tehdit analizi",
                        "template_type": "security",
                        "fields": ["attack_attempts", "blocked_ips", "security_score"],
                        "created_at": datetime.utcnow()
                    },
                    {
                        "template_name": "traffic_report",
                        "display_name": "Trafik Raporu",
                        "description": "Ağ trafiği ve bant genişliği analizi",
                        "template_type": "traffic",
                        "fields": ["total_traffic", "bandwidth_usage", "protocol_distribution"],
                        "created_at": datetime.utcnow()
                    },
                    {
                        "template_name": "system_report",
                        "display_name": "Sistem Raporu",
                        "description": "Sistem performansı ve kaynak kullanımı",
                        "template_type": "system",
                        "fields": ["cpu_usage", "memory_usage", "uptime"],
                        "created_at": datetime.utcnow()
                    }
                ]
                await report_templates.insert_many(default_templates)

            logger.info("✅ Reports sample data initialized")

        except Exception as e:
            logger.warning(f"⚠️ Reports sample data initialization warning: {e}")

    async def _initialize_default_settings_data(self):
        """NEW: Initialize default settings data"""
        try:
            settings_config = self.database.settings_config
            # Check if settings data exists
            existing_settings = await settings_config.count_documents({})
            if existing_settings == 0:
                logger.info("🔧 Creating default settings configuration...")
                default_settings_sections = [
                    {
                        "_id": "general",
                        "section": "general",
                        "data": {
                            "timezone": "Türkiye (UTC+3)",
                            "language": "Türkçe",
                            "sessionTimeout": 60,
                            "logLevel": "Info (Normal)"
                        },
                        "version": 1,
                        "active": True,
                        "created_at": datetime.utcnow(),
                        "updated_at": datetime.utcnow(),
                        "updated_by": "system"
                    },
                    {
                        "_id": "autoUpdates",
                        "section": "autoUpdates",
                        "data": {
                            "enabled": True,
                            "frequency": "daily",
                            "time": "02:00"
                        },
                        "version": 1,
                        "active": True,
                        "created_at": datetime.utcnow(),
                        "updated_at": datetime.utcnow(),
                        "updated_by": "system"
                    },
                    {
                        "_id": "systemFeedback",
                        "section": "systemFeedback",
                        "data": {
                            "enabled": True,
                            "errorReporting": True,
                            "analytics": False
                        },
                        "version": 1,
                        "active": True,
                        "created_at": datetime.utcnow(),
                        "updated_at": datetime.utcnow(),
                        "updated_by": "system"
                    },
                    {
                        "_id": "darkTheme",
                        "section": "darkTheme",
                        "data": {
                            "enabled": True,
                            "autoSwitch": False
                        },
                        "version": 1,
                        "active": True,
                        "created_at": datetime.utcnow(),
                        "updated_at": datetime.utcnow(),
                        "updated_by": "system"
                    },
                    {
                        "_id": "backup",
                        "section": "backup",
                        "data": {
                            "frequency": "Haftalık",
                            "location": "/opt/firewall/backups",
                            "retention": 30,
                            "autoCleanup": True
                        },
                        "version": 1,
                        "active": True,
                        "created_at": datetime.utcnow(),
                        "updated_at": datetime.utcnow(),
                        "updated_by": "system"
                    }
                ]
                await settings_config.insert_many(default_settings_sections)
                logger.info(f"✅ Created {len(default_settings_sections)} default settings sections")
            else:
                logger.info("✅ Settings configuration already exists")
        except Exception as e:
            logger.warning(f"⚠️ Default settings data initialization warning: {e}")

    async def _initialize_admin_user(self):
        """Enhanced admin user initialization with comprehensive security"""
        try:
            logger.info("👤 Initializing admin user with enhanced security...")
            users_collection = self.database.users
            # Check if admin exists
            admin_user = await users_collection.find_one({"username": "admin"})
            if not admin_user:
                logger.info("🔧 Creating new admin user with bcrypt security")
                # Enhanced admin user creation
                admin_user_data = await self._create_admin_user_data()
                await users_collection.insert_one(admin_user_data)
                logger.info(f"✅ Admin user created with bcrypt (rounds: {self.settings.bcrypt_rounds})")
            else:
                logger.info("👤 Admin user exists, checking configuration...")
                await self._update_existing_admin_user(admin_user, users_collection)
        except Exception as e:
            logger.error(f"❌ Admin user initialization failed: {str(e)}")
            raise

    async def _create_admin_user_data(self) -> Dict[str, Any]:
        """Create comprehensive admin user data"""
        # Hash admin password using bcrypt with configured rounds
        salt = bcrypt.gensalt(rounds=self.settings.bcrypt_rounds)
        hashed_password = bcrypt.hashpw(
            self.settings.admin_password.encode('utf-8'),
            salt
        ).decode('utf-8')

        return {
            "username": "admin",
            "email": self.settings.admin_email,
            "password": hashed_password,
            "full_name": "System Administrator",
            "role": "admin",
            "is_active": True,
            "is_verified": True,
            "failed_login_attempts": 0,
            "locked_until": None,
            "permissions": ["*"],  # All permissions
            "settings": {
                "theme": "dark",
                "language": "tr",
                "timezone": "Europe/Istanbul"
            },
            "security": {
                "password_changed_at": datetime.utcnow(),
                "must_change_password": False,
                "two_factor_enabled": False,
                "login_notification": True
            },
            "profile": {
                "avatar": None,
                "phone": None,
                "department": "IT Security",
                "title": "System Administrator"
            },
            "audit": {
                "created_at": datetime.utcnow(),
                "created_by": "system",
                "updated_at": datetime.utcnow(),
                "updated_by": "system",
                "last_login": None,
                "last_seen": None,
                "login_count": 0
            }
        }

    async def _update_existing_admin_user(self, admin_user: Dict[str, Any], users_collection):
        """Update existing admin user with enhanced fields"""
        update_fields = {}
        needs_password_update = False

        # Check required fields
        required_fields = {
            "is_active": True,
            "role": "admin",
            "email": self.settings.admin_email,
            "full_name": "System Administrator",
            "is_verified": True,
            "failed_login_attempts": 0,
            "permissions": ["*"]
        }

        for field, default_value in required_fields.items():
            if field not in admin_user or admin_user[field] != default_value:
                update_fields[field] = default_value

        # Check if password needs bcrypt upgrade
        if "password" in admin_user:
            try:
                # Try to verify with bcrypt
                bcrypt.checkpw(
                    self.settings.admin_password.encode('utf-8'),
                    admin_user["password"].encode('utf-8')
                )
                logger.info("✅ Admin password already uses bcrypt")
            except (ValueError, TypeError):
                # Password is not bcrypt, needs update
                needs_password_update = True
                logger.info("🔧 Upgrading admin password to bcrypt")
        else:
            needs_password_update = True
            logger.info("🔧 Adding missing admin password")

        # Update password if needed
        if needs_password_update:
            salt = bcrypt.gensalt(rounds=self.settings.bcrypt_rounds)
            hashed_password = bcrypt.hashpw(
                self.settings.admin_password.encode('utf-8'),
                salt
            ).decode('utf-8')
            update_fields["password"] = hashed_password
            update_fields["security.password_changed_at"] = datetime.utcnow()

        # Add enhanced fields if missing
        if "security" not in admin_user:
            update_fields["security"] = {
                "password_changed_at": datetime.utcnow(),
                "must_change_password": False,
                "two_factor_enabled": False,
                "login_notification": True
            }

        if "audit" not in admin_user:
            update_fields["audit"] = {
                "created_at": admin_user.get("created_at", datetime.utcnow()),
                "created_by": "system",
                "updated_at": datetime.utcnow(),
                "updated_by": "system",
                "last_login": admin_user.get("last_login"),
                "last_seen": admin_user.get("last_seen"),
                "login_count": 0
            }

        # Always update timestamp
        update_fields["audit.updated_at"] = datetime.utcnow()

        # Apply updates
        if update_fields:
            await users_collection.update_one(
                {"username": "admin"},
                {"$set": update_fields}
            )
            logger.info(f"✅ Admin user updated ({len(update_fields)} fields)")
        else:
            logger.info("✅ Admin user is up to date")

    async def _initialize_default_configs(self):
        """Enhanced default configuration initialization"""
        try:
            logger.info("⚙️ Initializing comprehensive default configurations...")
            # Settings configurations
            await self._create_settings_configs()
            # System configurations
            await self._create_system_configs()
            # Security configurations
            await self._create_security_configs()
            # Network configurations
            await self._create_network_configs()
            logger.info("✅ All default configurations initialized")
        except Exception as e:
            logger.warning(f"⚠️ Default configs initialization warning: {str(e)}")

    async def _create_settings_configs(self):
        """Create settings-related configurations"""
        configs_collection = self.database.system_config
        settings_configs = [
            {
                "_id": "settings",
                "settings": {
                    "general": {
                        "timezone": "Türkiye (UTC+3)",
                        "language": "Türkçe",
                        "sessionTimeout": 60,
                        "logLevel": "Info (Normal)"
                    },
                    "autoUpdates": {
                        "enabled": True,
                        "frequency": "daily",
                        "time": "02:00"
                    },
                    "systemFeedback": {
                        "enabled": True,
                        "errorReporting": True,
                        "analytics": False
                    },
                    "darkTheme": {
                        "enabled": True,
                        "autoSwitch": False
                    },
                    "backup": {
                        "frequency": "Haftalık",
                        "location": "/opt/firewall/backups",
                        "retention": 30,
                        "autoCleanup": True
                    }
                },
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
                "updated_by": "system"
            }
        ]

        for config in settings_configs:
            await configs_collection.update_one(
                {"_id": config["_id"]},
                {"$setOnInsert": config},
                upsert=True
            )

    async def _create_system_configs(self):
        """Create system-level configurations"""
        configs_collection = self.database.system_configs
        system_configs = [
            {
                "config_key": "firewall_enabled",
                "config_value": True,
                "description": "Enable/disable firewall functionality",
                "category": "firewall"
            },
            {
                "config_key": "dns_proxy_enabled",
                "config_value": False,
                "description": "Enable/disable DNS proxy",
                "category": "dns"
            },
            {
                "config_key": "logging_level",
                "config_value": self.settings.log_level,
                "description": "System logging level",
                "category": "logging"
            },
            {
                "config_key": "log_retention_days",
                "config_value": 30,
                "description": "Log retention period in days",
                "category": "logging"
            },
            {
                "config_key": "backup_enabled",
                "config_value": True,
                "description": "Enable automatic backups",
                "category": "backup"
            },
            {
                "config_key": "backup_retention_days",
                "config_value": 30,
                "description": "Backup retention period in days",
                "category": "backup"
            }
        ]

        for config in system_configs:
            existing = await configs_collection.find_one({"config_key": config["config_key"]})
            if not existing:
                config.update({
                    "created_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow(),
                    "modified_by": "system"
                })
                await configs_collection.insert_one(config)

    async def _create_security_configs(self):
        """Create security-related configurations"""
        configs_collection = self.database.system_configs
        security_configs = [
            {
                "config_key": "max_login_attempts",
                "config_value": self.settings.max_login_attempts,
                "description": "Maximum login attempts before lockout",
                "category": "security"
            },
            {
                "config_key": "lockout_duration_minutes",
                "config_value": self.settings.lockout_duration_minutes,
                "description": "Account lockout duration in minutes",
                "category": "security"
            },
            {
                "config_key": "session_timeout_hours",
                "config_value": 8,
                "description": "Session timeout in hours",
                "category": "security"
            },
            {
                "config_key": "password_min_length",
                "config_value": 8,
                "description": "Minimum password length",
                "category": "security"
            },
            {
                "config_key": "bcrypt_rounds",
                "config_value": self.settings.bcrypt_rounds,
                "description": "BCrypt hashing rounds",
                "category": "security"
            }
        ]

        for config in security_configs:
            existing = await configs_collection.find_one({"config_key": config["config_key"]})
            if not existing:
                config.update({
                    "created_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow(),
                    "modified_by": "system"
                })
                await configs_collection.insert_one(config)

    async def _create_network_configs(self):
        """Create network-related configurations"""
        configs_collection = self.database.system_configs
        network_configs = [
            {
                "config_key": "default_policy",
                "config_value": "DROP",
                "description": "Default firewall policy",
                "category": "network"
            },
            {
                "config_key": "max_firewall_rules",
                "config_value": 1000,
                "description": "Maximum number of firewall rules",
                "category": "network"
            },
            {
                "config_key": "network_scan_timeout",
                "config_value": 30,
                "description": "Network scan timeout in seconds",
                "category": "network"
            }
        ]

        for config in network_configs:
            existing = await configs_collection.find_one({"config_key": config["config_key"]})
            if not existing:
                config.update({
                    "created_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow(),
                    "modified_by": "system"
                })
                await configs_collection.insert_one(config)

    async def _create_system_collections(self):
        """Create and initialize system collections with sample data"""
        try:
            logger.info("📦 Creating system collections...")
            # Create collections if they don't exist
            collections_to_create = [
                'firewall_groups',
                'network_interfaces',
                'static_routes',
                'blocked_domains',
                'nat_config',
                'dns_proxy_config'
            ]

            existing_collections = await self.database.list_collection_names()
            for collection_name in collections_to_create:
                if collection_name not in existing_collections:
                    await self.database.create_collection(collection_name)
                    logger.info(f"✅ Created collection: {collection_name}")

            # Initialize with sample data if empty
            await self._initialize_sample_data()
        except Exception as e:
            logger.warning(f"⚠️ System collections creation warning: {e}")

    async def _initialize_sample_data(self):
        """Initialize collections with sample/default data"""
        try:
            # Sample firewall group
            firewall_groups = self.database.firewall_groups
            if await firewall_groups.count_documents({}) == 0:
                sample_group = {
                    "group_name": "Web Services",
                    "description": "HTTP/HTTPS web services rules",
                    "enabled": True,
                    "created_at": datetime.utcnow()
                }
                await firewall_groups.insert_one(sample_group)

            # Default NAT configuration
            nat_config = self.database.nat_config
            if await nat_config.count_documents({}) == 0:
                default_nat = {
                    "_id": "main",
                    "enabled": False,
                    "wan_interface": "",
                    "lan_interface": "",
                    "port_forwarding_rules": [],
                    "created_at": datetime.utcnow()
                }
                await nat_config.insert_one(default_nat)

            # Default DNS proxy configuration
            dns_proxy_config = self.database.dns_proxy_config
            if await dns_proxy_config.count_documents({}) == 0:
                default_dns = {
                    "_id": "main",
                    "enabled": False,
                    "listen_port": 53,
                    "upstream_servers": ["8.8.8.8", "8.8.4.4"],
                    "block_malware": True,
                    "block_ads": False,
                    "custom_records": [],
                    "created_at": datetime.utcnow()
                }
                await dns_proxy_config.insert_one(default_dns)

            logger.info("✅ Sample data initialized")
        except Exception as e:
            logger.warning(f"⚠️ Sample data initialization warning: {e}")

    async def _setup_data_retention_policies(self):
        """Setup enhanced data retention policies"""
        try:
            logger.info("🗂️ Setting up data retention policies...")
            # Check and update TTL indexes
            ttl_collections = {
                'system_logs': 2592000,      # 30 days
                'network_activity': 604800,   # 7 days
                'security_alerts': 7776000,   # 90 days (keep longer for security)
                'settings_history': 7776000,  # 90 days for settings audit trail
                'system_operations': 2592000, # 30 days for operations log
                'generated_reports': 7776000, # 90 days for generated reports
                'traffic_analytics': 2592000, # 30 days for traffic data
                'performance_metrics': 2592000, # 30 days for performance data
            }

            for collection_name, ttl_seconds in ttl_collections.items():
                collection = self.database[collection_name]
                try:
                    # Check if TTL index exists and is correct
                    indexes = await collection.list_indexes().to_list(length=None)
                    ttl_index_exists = False
                    for index in indexes:
                        if 'expireAfterSeconds' in index and 'timestamp' in index.get('key', {}):
                            current_ttl = index['expireAfterSeconds']
                            if current_ttl != ttl_seconds:
                                # Update TTL
                                await collection.drop_index('timestamp_-1')
                                await collection.create_index(
                                    [('timestamp', -1)],
                                    expireAfterSeconds=ttl_seconds
                                )
                                logger.info(f"✅ Updated TTL for {collection_name}: {ttl_seconds}s")
                            ttl_index_exists = True
                            break

                    if not ttl_index_exists:
                        await collection.create_index(
                            [('timestamp', -1)],
                            expireAfterSeconds=ttl_seconds
                        )
                        logger.info(f"✅ Created TTL index for {collection_name}: {ttl_seconds}s")
                except Exception as e:
                    logger.warning(f"⚠️ TTL setup warning for {collection_name}: {e}")

            logger.info("✅ Data retention policies configured")
        except Exception as e:
            logger.warning(f"⚠️ Data retention setup warning: {e}")

    # NEW: Settings-specific database operations
    async def log_settings_operation(self, operation_type: str, user_id: str, details: Dict[str, Any]):
        """Log settings-related operations for audit trail"""
        try:
            self.settings_operations[operation_type.lower()] = self.settings_operations.get(operation_type.lower(), 0) + 1
            operation_log = {
                "timestamp": datetime.utcnow(),
                "operation_type": operation_type,
                "user_id": user_id,
                "details": details,
                "status": "success",
                "category": "settings"
            }
            await self.database.system_operations.insert_one(operation_log)
            logger.info(f"✅ Settings operation logged: {operation_type} by {user_id}")
        except Exception as e:
            logger.error(f"❌ Failed to log settings operation: {e}")

    async def get_settings_metrics(self) -> Dict[str, Any]:
        """Get Settings-specific performance metrics"""
        try:
            return {
                "operations": self.settings_operations,
                "database_performance": self.performance_metrics,
                "collections": {
                    "settings_config": await self.database.settings_config.count_documents({}),
                    "settings_history": await self.database.settings_history.count_documents({}),
                    "system_operations": await self.database.system_operations.count_documents({})
                },
                "timestamp": datetime.utcnow().isoformat()
            }
        except Exception as e:
            logger.error(f"❌ Failed to get settings metrics: {e}")
            return {"error": str(e)}

    async def health_check(self) -> Dict[str, Any]:
        """Comprehensive database health check with detailed metrics"""
        try:
            start_time = time.time()
            if not self.is_connected or not self.database:
                return {
                    "status": "disconnected",
                    "error": "No database connection",
                    "connection_attempts": self.connection_attempts,
                    "last_attempt": self.connection_history[-1] if self.connection_history else None
                }

            # Test database connection
            await self.database.command("ping")
            ping_time = time.time() - start_time

            # Get comprehensive database statistics
            stats = await self.database.command("dbstats")

            # Count documents in main collections
            collections_info = {}
            main_collections = [
                "users", "firewall_rules", "firewall_groups", "system_logs",
                "network_activity", "security_alerts", "system_config",
                "network_interfaces", "static_routes", "blocked_domains",
                "settings_config", "settings_history", "system_operations",  # Added settings collections
                "reports_config", "report_templates", "generated_reports", # NEW: Reports collections
                "traffic_analytics", "performance_metrics"  # NEW: Analytics collections
            ]

            for collection_name in main_collections:
                try:
                    count = await self.database[collection_name].count_documents({})
                    collections_info[collection_name] = count
                except Exception:
                    collections_info[collection_name] = "unknown"

            # Get server information
            server_status = await self.database.command("serverStatus")
            uptime_seconds = server_status.get("uptime", 0)

            # Calculate performance metrics
            total_check_time = time.time() - start_time

            return {
                "status": "healthy",
                "database": self.settings.database_name,
                "mongodb_version": await self._get_mongodb_version(),
                "connection": {
                    "uptime_seconds": self._get_connection_uptime(),
                    "reconnect_count": self.reconnect_count,
                    "last_ping_ms": round(ping_time * 1000, 2),
                    "health_check_ms": round(total_check_time * 1000, 2)
                },
                "database_stats": {
                    "collections": stats.get("collections", 0),
                    "objects": stats.get("objects", 0),
                    "avgObjSize": stats.get("avgObjSize", 0),
                    "dataSize": stats.get("dataSize", 0),
                    "indexSize": stats.get("indexSize", 0),
                    "storageSize": stats.get("storageSize", 0)
                },
                "server_info": {
                    "uptime_seconds": uptime_seconds,
                    "connections": server_status.get("connections", {}),
                    "memory": server_status.get("mem", {}),
                    "network": server_status.get("network", {})
                },
                "collections_info": collections_info,
                "performance_metrics": self.performance_metrics,
                "settings_metrics": await self.get_settings_metrics(),  # NEW: Settings metrics
                "connection_attempts": self.connection_attempts,
                "timestamp": datetime.utcnow().isoformat()
            }
        except Exception as e:
            error_info = {
                "status": "error",
                "error": str(e),
                "error_type": type(e).__name__,
                "connection_attempts": self.connection_attempts,
                "performance_metrics": self.performance_metrics,
                "timestamp": datetime.utcnow().isoformat()
            }
            # Update performance metrics
            self.performance_metrics['error_count'] += 1
            self.performance_metrics['last_error'] = str(e)
            return error_info

    async def _get_mongodb_version(self) -> str:
        """Get MongoDB server version with fallback"""
        try:
            build_info = await self.database.command("buildinfo")
            return build_info.get("version", "unknown")
        except Exception:
            try:
                # Fallback method
                server_status = await self.database.command("serverStatus")
                return server_status.get("version", "unknown")
            except Exception:
                return "unknown"

    async def get_connection_metrics(self) -> Dict[str, Any]:
        """Get detailed connection metrics for monitoring"""
        return {
            "is_connected": self.is_connected,
            "connection_attempts": self.connection_attempts,
            "reconnect_count": self.reconnect_count,
            "uptime_seconds": self._get_connection_uptime(),
            "performance_metrics": self.performance_metrics,
            "settings_operations": self.settings_operations,  # NEW: Settings operations
            "connection_history": self.connection_history[-10:],  # Last 10 events
            "last_health_check": self.last_health_check
        }

    async def cleanup_old_data(self):
        """Manual cleanup of old data beyond TTL"""
        try:
            logger.info("🧹 Starting manual data cleanup...")
            # Cleanup very old logs (beyond TTL)
            old_cutoff = datetime.utcnow() - timedelta(days=60)
            cleanup_results = {}

            # Clean extremely old system logs
            result = await self.database.system_logs.delete_many({
                "timestamp": {"$lt": old_cutoff}
            })
            cleanup_results["system_logs"] = result.deleted_count

            # Clean old network activity
            network_cutoff = datetime.utcnow() - timedelta(days=14)
            result = await self.database.network_activity.delete_many({
                "timestamp": {"$lt": network_cutoff}
            })
            cleanup_results["network_activity"] = result.deleted_count

            # NEW: Clean old settings history (beyond 90 days)
            settings_cutoff = datetime.utcnow() - timedelta(days=90)
            result = await self.database.settings_history.delete_many({
                "timestamp": {"$lt": settings_cutoff}
            })
            cleanup_results["settings_history"] = result.deleted_count

            # NEW: Clean old system operations (beyond 30 days)
            operations_cutoff = datetime.utcnow() - timedelta(days=30)
            result = await self.database.system_operations.delete_many({
                "timestamp": {"$lt": operations_cutoff}
            })
            cleanup_results["system_operations"] = result.deleted_count

            # NEW: Clean old generated reports (beyond 90 days)
            reports_cutoff = datetime.utcnow() - timedelta(days=90)
            result = await self.database.generated_reports.delete_many({
                "timestamp": {"$lt": reports_cutoff}
            })
            cleanup_results["generated_reports"] = result.deleted_count

            # NEW: Clean old traffic analytics (beyond 30 days)
            analytics_cutoff = datetime.utcnow() - timedelta(days=30)
            result = await self.database.traffic_analytics.delete_many({
                "timestamp": {"$lt": analytics_cutoff}
            })
            cleanup_results["traffic_analytics"] = result.deleted_count

            logger.info(f"✅ Manual cleanup completed: {cleanup_results}")
            return cleanup_results
        except Exception as e:
            logger.error(f"❌ Manual cleanup failed: {e}")
            raise


# Global database manager instance
db_manager = DatabaseManager()

# Enhanced sync initialization
def _sync_init():
    """Enhanced synchronous initialization for module import"""
    global client, db
    try:
        settings = get_settings()
        # Create client with basic configuration for immediate use
        client = motor.motor_asyncio.AsyncIOMotorClient(
            settings.mongodb_url,
            serverSelectionTimeoutMS=5000,
            connectTimeoutMS=5000,
            maxPoolSize=50,
            minPoolSize=10
        )
        # Database reference for immediate use
        db = client[settings.database_name]
        logger.info("✅ MongoDB client and db references created (sync)")
    except Exception as e:
        logger.error(f"❌ Sync initialization failed: {str(e)}")
        client = None
        db = None

# Initialize client and db
_sync_init()

# Enhanced legacy functions for backward compatibility
async def connect_to_mongo() -> bool:
    """Enhanced legacy function - connect to MongoDB"""
    try:
        return await db_manager.connect()
    except Exception as e:
        logger.error(f"❌ Legacy connect function failed: {e}")
        return False

async def close_mongo_connection():
    """Enhanced legacy function - close MongoDB connection"""
    try:
        await db_manager.disconnect()
    except Exception as e:
        logger.error(f"❌ Legacy disconnect function failed: {e}")

async def get_database():
    """Enhanced legacy function - get database instance"""
    try:
        return await db_manager.get_database()
    except Exception as e:
        logger.error(f"❌ Legacy get_database function failed: {e}")
        raise

async def check_database_health() -> Dict[str, Any]:
    """Enhanced legacy function - check database health"""
    try:
        return await db_manager.health_check()
    except Exception as e:
        logger.error(f"❌ Legacy health check function failed: {e}")
        return {
            "status": "error",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }

# Enhanced collection getter functions
async def get_users_collection():
    """Get users collection with connection verification"""
    database = await get_database()
    return database.users

async def get_logs_collection():
    """Get system logs collection with connection verification"""
    database = await get_database()
    return database.system_logs

async def get_firewall_rules_collection():
    """Get firewall rules collection with connection verification"""
    database = await get_database()
    return database.firewall_rules

async def get_network_activity_collection():
    """Get network activity collection with connection verification"""
    database = await get_database()
    return database.network_activity

async def get_security_alerts_collection():
    """Get security alerts collection with connection verification"""
    database = await get_database()
    return database.security_alerts

async def get_system_config_collection():
    """Get system config collection with connection verification"""
    database = await get_database()
    return database.system_config

# NEW: Settings-specific collection getters
async def get_settings_config_collection():
    """Get settings config collection with connection verification"""
    database = await get_database()
    return database.settings_config

async def get_settings_history_collection():
    """Get settings history collection with connection verification"""
    database = await get_database()
    return database.settings_history

async def get_system_operations_collection():
    """Get system operations collection with connection verification"""
    database = await get_database()
    return database.system_operations

# NEW: Reports-specific collection getters
async def get_reports_config_collection():
    """Get reports config collection with connection verification"""
    database = await get_database()
    return database.reports_config

async def get_report_templates_collection():
    """Get report templates collection with connection verification"""
    database = await get_database()
    return database.report_templates

async def get_generated_reports_collection():
    """Get generated reports collection with connection verification"""
    database = await get_database()
    return database.generated_reports

async def get_report_schedules_collection():
    """Get report schedules collection with connection verification"""
    database = await get_database()
    return database.report_schedules

async def get_report_history_collection():
    """Get report history collection with connection verification"""
    database = await get_database()
    return database.report_history

async def get_traffic_analytics_collection():
    """Get traffic analytics collection with connection verification"""
    database = await get_database()
    return database.traffic_analytics

async def get_performance_metrics_collection():
    """Get performance metrics collection with connection verification"""
    database = await get_database()
    return database.performance_metrics

# Collection references for backward compatibility
users_collection = None
logs_collection = None
firewall_rules_collection = None
network_activity_collection = None
security_alerts_collection = None
system_config_collection = None

# NEW: Settings collection references
settings_config_collection = None
settings_history_collection = None
system_operations_collection = None

# NEW: Reports collection references
reports_config_collection = None
report_templates_collection = None
generated_reports_collection = None
report_schedules_collection = None
report_history_collection = None
traffic_analytics_collection = None
performance_metrics_collection = None

async def init_collection_references():
    """Enhanced collection references initialization"""
    global users_collection, logs_collection, firewall_rules_collection
    global network_activity_collection, security_alerts_collection, system_config_collection
    global settings_config_collection, settings_history_collection, system_operations_collection
    global reports_config_collection, report_templates_collection, generated_reports_collection
    global report_schedules_collection, report_history_collection, traffic_analytics_collection
    global performance_metrics_collection

    try:
        database = await get_database()
        users_collection = database.users
        logs_collection = database.system_logs
        firewall_rules_collection = database.firewall_rules
        network_activity_collection = database.network_activity
        security_alerts_collection = database.security_alerts
        system_config_collection = database.system_config

        # NEW: Settings collections
        settings_config_collection = database.settings_config
        settings_history_collection = database.settings_history
        system_operations_collection = database.system_operations

        # NEW: Reports collections
        reports_config_collection = database.reports_config
        report_templates_collection = database.report_templates
        generated_reports_collection = database.generated_reports
        report_schedules_collection = database.report_schedules
        report_history_collection = database.report_history
        traffic_analytics_collection = database.traffic_analytics
        performance_metrics_collection = database.performance_metrics

        logger.info("✅ All collection references initialized successfully (including Reports)")
    except Exception as e:
        logger.error(f"❌ Collection references initialization failed: {str(e)}")
        raise

# Enhanced admin user functions
async def initialize_admin_user_manual():
    """Enhanced manual admin user initialization"""
    try:
        return await db_manager._initialize_admin_user()
    except Exception as e:
        logger.error(f"❌ Manual admin initialization failed: {e}")
        raise

async def reset_admin_password(new_password: str = None):
    """Reset admin password with new bcrypt hash"""
    try:
        if not new_password:
            new_password = "admin123"  # Default password

        database = await get_database()
        users_collection = database.users

        # Hash new password
        salt = bcrypt.gensalt(rounds=db_manager.settings.bcrypt_rounds)
        hashed_password = bcrypt.hashpw(new_password.encode('utf-8'), salt).decode('utf-8')

        # Update admin password
        result = await users_collection.update_one(
            {"username": "admin"},
            {
                "$set": {
                    "password": hashed_password,
                    "failed_login_attempts": 0,
                    "locked_until": None,
                    "security.password_changed_at": datetime.utcnow(),
                    "audit.updated_at": datetime.utcnow(),
                    "audit.updated_by": "manual_reset"
                }
            }
        )

        if result.modified_count > 0:
            logger.info("✅ Admin password reset successfully")
            return True
        else:
            logger.warning("⚠️ Admin user not found or no changes made")
            return False
    except Exception as e:
        logger.error(f"❌ Admin password reset failed: {e}")
        raise

# Enhanced utility functions
async def get_database_stats() -> Dict[str, Any]:
    """Get comprehensive database statistics"""
    try:
        database = await get_database()
        # Basic stats
        stats = await database.command("dbstats")

        # Collection details
        collections = await database.list_collection_names()
        collection_stats = {}

        for collection_name in collections:
            try:
                collection = database[collection_name]
                count = await collection.count_documents({})
                collection_stats[collection_name] = {
                    "count": count,
                    "estimated_size": await collection.estimated_document_count() if count > 0 else 0
                }
            except Exception as e:
                collection_stats[collection_name] = {"error": str(e)}

        return {
            "database_name": db_manager.settings.database_name,
            "collections_count": len(collections),
            "total_size": stats.get("dataSize", 0),
            "index_size": stats.get("indexSize", 0),
            "objects": stats.get("objects", 0),
            "collections": collection_stats,
            "connection_metrics": await db_manager.get_connection_metrics(),
            "settings_metrics": await db_manager.get_settings_metrics(),  # NEW: Settings metrics
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"❌ Database stats failed: {e}")
        raise

# NEW: Settings-specific utility functions
async def log_settings_change(section: str, old_data: Dict[str, Any], new_data: Dict[str, Any], user_id: str):
    """Log settings changes for audit trail"""
    try:
        await db_manager.log_settings_operation(
            operation_type="settings_update",
            user_id=user_id,
            details={
                "section": section,
                "old_data": old_data,
                "new_data": new_data,
                "changes": get_data_changes(old_data, new_data)
            }
        )
    except Exception as e:
        logger.error(f"❌ Failed to log settings change: {e}")

def get_data_changes(old_data: Dict[str, Any], new_data: Dict[str, Any]) -> List[str]:
    """Get list of changes between old and new data"""
    changes = []
    all_keys = set(old_data.keys()) | set(new_data.keys())
    for key in all_keys:
        old_value = old_data.get(key)
        new_value = new_data.get(key)
        if old_value != new_value:
            changes.append(f"{key}: {old_value} → {new_value}")
    return changes

# Export all enhanced functionality
__all__ = [
    # Core components
    'client', 'db', 'db_manager', 'DatabaseManager', 'DatabaseConnectionError',
    # Connection functions
    'connect_to_mongo', 'close_mongo_connection', 'get_database', 'check_database_health',
    # Collection getters
    'get_users_collection', 'get_logs_collection', 'get_firewall_rules_collection',
    'get_network_activity_collection', 'get_security_alerts_collection', 'get_system_config_collection',
    # NEW: Settings collection getters
    'get_settings_config_collection', 'get_settings_history_collection', 'get_system_operations_collection',
    # NEW: Reports collection getters
    'get_reports_config_collection', 'get_report_templates_collection', 'get_generated_reports_collection',
    'get_report_schedules_collection', 'get_report_history_collection', 'get_traffic_analytics_collection',
    'get_performance_metrics_collection',
    # Collection references
    'init_collection_references', 'users_collection', 'logs_collection', 'firewall_rules_collection',
    'network_activity_collection', 'security_alerts_collection', 'system_config_collection',
    # NEW: Settings collection references
    'settings_config_collection', 'settings_history_collection', 'system_operations_collection',
    # NEW: Reports collection references
    'reports_config_collection', 'report_templates_collection', 'generated_reports_collection',
    'report_schedules_collection', 'report_history_collection', 'traffic_analytics_collection',
    'performance_metrics_collection',
    # Admin functions
    'initialize_admin_user_manual', 'reset_admin_password',
    # Utility functions
    'get_database_stats',
    # NEW: Settings utility functions
    'log_settings_change', 'get_data_changes'
]