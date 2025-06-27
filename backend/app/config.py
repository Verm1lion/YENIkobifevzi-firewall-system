"""
Enhanced configuration management with security improvements and environment variable support
"""
import os
import secrets
from functools import lru_cache
from typing import Optional, List, Union

# Basit Settings class kullanarak Pydantic Settings hatasını çözelim
class Settings:
    """Enhanced application settings with security improvements"""

    def __init__(self):
        # App Configuration
        self.APP_NAME: str = "KOBI Firewall"
        self.PROJECT_NAME: str = "KOBI Firewall"  # Backward compatibility
        self.APP_VERSION: str = "2.0.0"
        self.DEBUG: bool = False
        self.NODE_ENV: str = "development"

        # Server Configuration
        self.HOST: str = "0.0.0.0"
        self.PORT: int = 8000
        self.RELOAD: bool = True
        self.FRONTEND_URL: str = "http://localhost:3000"

        # Database Configuration
        self.MONGODB_URL: str = "mongodb://admin:secretpassword@localhost:27017"
        self.MONGODB_URI: str = "mongodb://admin:secretpassword@localhost:27017/?authSource=admin"
        self.DATABASE_NAME: str = "kobi_firewall_db"
        self.DB_NAME: str = "kobi_firewall_db"

        # Security Configuration - ENHANCED
        self.SECRET_KEY: str = os.getenv("JWT_SECRET", secrets.token_urlsafe(64))
        self.JWT_SECRET: str = os.getenv("JWT_SECRET", secrets.token_urlsafe(64))
        self.ACCESS_TOKEN_EXPIRE_MINUTES: int = 480  # 8 hours
        self.JWT_EXPIRES_IN: str = "8h"
        self.JWT_REFRESH_SECRET: str = os.getenv("JWT_REFRESH_SECRET", secrets.token_urlsafe(64))
        self.JWT_REFRESH_EXPIRES_IN: str = "7d"
        self.JWT_ALGORITHM: str = "HS256"
        self.ALGORITHM: str = "HS256"

        # Enhanced Security Settings
        self.BCRYPT_ROUNDS: int = int(os.getenv("BCRYPT_ROUNDS", "12"))
        self.BCRYPT_SALT_ROUNDS: str = os.getenv("BCRYPT_SALT_ROUNDS", "12")
        self.MAX_LOGIN_ATTEMPTS: int = int(os.getenv("MAX_LOGIN_ATTEMPTS", "5"))
        self.LOCKOUT_DURATION_MINUTES: int = int(os.getenv("LOCKOUT_DURATION_MINUTES", "15"))

        # Rate Limiting
        self.RATE_LIMIT_REQUESTS: int = int(os.getenv("RATE_LIMIT_REQUESTS", "100"))
        self.RATE_LIMIT_MAX_REQUESTS: str = os.getenv("RATE_LIMIT_MAX_REQUESTS", "100")
        self.RATE_LIMIT_WINDOW: int = 60
        self.RATE_LIMIT_WINDOW_MS: str = os.getenv("RATE_LIMIT_WINDOW_MS", "60000")

        # CORS Configuration - String olarak tanımla, sonra parse et
        self.CORS_ORIGINS: List[str] = self._parse_cors_origins()
        self.ALLOWED_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"

        # Logging Configuration
        self.LOG_LEVEL: str = "INFO"
        self.LOG_FILE: str = "logs/kobi_firewall.log"

        # Feature Flags
        self.ENABLE_SWAGGER: bool = True
        self.ENABLE_REDOC: bool = True

        # File Upload Configuration
        self.MAX_FILE_SIZE: int = 10 * 1024 * 1024  # 10MB
        self.UPLOAD_DIR: str = "uploads"

        # Backup Configuration
        self.BACKUP_DIR: str = "backups"
        self.BACKUP_RETENTION_DAYS: int = 30

        # Firewall Configuration
        self.DEFAULT_POLICY: str = "DROP"
        self.MAX_RULES: int = 1000

        # Network Configuration
        self.NETWORK_SCAN_TIMEOUT: int = 30
        self.PING_TIMEOUT: int = 5

        # Default Admin Configuration
        self.DEFAULT_ADMIN_USERNAME: str = os.getenv("ADMIN_USERNAME", "admin")
        self.DEFAULT_ADMIN_PASSWORD: str = os.getenv("ADMIN_PASSWORD", "admin123")
        self.DEFAULT_ADMIN_EMAIL: str = os.getenv("ADMIN_EMAIL", "admin@netgate.local")

        # Email Configuration
        self.SMTP_HOST: Optional[str] = os.getenv("SMTP_HOST")
        self.SMTP_PORT: Optional[int] = int(os.getenv("SMTP_PORT", "587")) if os.getenv("SMTP_PORT") else None
        self.SMTP_USER: Optional[str] = os.getenv("SMTP_USER")
        self.SMTP_PASSWORD: Optional[str] = os.getenv("SMTP_PASSWORD")
        self.SMTP_TLS: bool = os.getenv("SMTP_TLS", "true").lower() == "true"

        # Session Configuration
        self.SESSION_TIMEOUT_HOURS: int = int(os.getenv("SESSION_TIMEOUT_HOURS", "8"))
        self.REMEMBER_ME_DAYS: int = int(os.getenv("REMEMBER_ME_DAYS", "30"))

        # Security Headers
        self.SECURITY_HEADERS_ENABLED: bool = True
        self.CONTENT_SECURITY_POLICY: str = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"

        # Initialize after setting all values
        self._post_init()

    def _parse_cors_origins(self) -> List[str]:
        """Parse CORS origins from environment or use defaults"""
        cors_env = os.getenv("CORS_ORIGINS", "")

        if cors_env:
            # Environment'tan gelen string'i parse et
            try:
                # Virgülle ayrılmış string olarak parse et
                origins = [origin.strip() for origin in cors_env.split(',') if origin.strip()]
                if origins:
                    return origins
            except Exception as e:
                print(f"⚠️  CORS_ORIGINS parse error: {e}")

        # Default values
        return [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:3001",
            "http://127.0.0.1:3001",
            "http://localhost:5173",
            "http://127.0.0.1:5173"
        ]

    def _post_init(self):
        """Post initialization validation and setup"""
        # Validate JWT secret strength
        if len(self.JWT_SECRET) < 64:
            print("⚠️  JWT_SECRET is too short. Generating a secure secret...")
            self.JWT_SECRET = secrets.token_urlsafe(64)
            self.SECRET_KEY = self.JWT_SECRET

        # Validate bcrypt rounds
        if self.BCRYPT_ROUNDS < 10:
            print("⚠️  BCRYPT_ROUNDS too low. Using minimum 12 rounds...")
            self.BCRYPT_ROUNDS = 12
        elif self.BCRYPT_ROUNDS > 15:
            print("⚠️  BCRYPT_ROUNDS too high. Using maximum 15 rounds...")
            self.BCRYPT_ROUNDS = 15

        # Security warnings for production
        if self.NODE_ENV == "production":
            if self.DEFAULT_ADMIN_PASSWORD == "admin123":
                print("🚨 SECURITY WARNING: Change default admin password in production!")

            if self.DEBUG:
                print("🚨 SECURITY WARNING: Debug mode should be disabled in production!")

        # Ensure required directories exist
        self._ensure_directories()

    def _ensure_directories(self):
        """Ensure required directories exist"""
        directories = [
            os.path.dirname(self.LOG_FILE),
            self.UPLOAD_DIR,
            self.BACKUP_DIR
        ]

        for directory in directories:
            if directory and not os.path.exists(directory):
                try:
                    os.makedirs(directory, exist_ok=True)
                except Exception as e:
                    print(f"⚠️  Could not create directory {directory}: {e}")

    @property
    def is_production(self) -> bool:
        """Check if running in production"""
        return self.NODE_ENV.lower() == "production"

    @property
    def is_development(self) -> bool:
        """Check if running in development"""
        return self.NODE_ENV.lower() == "development"

    @property
    def database_url(self) -> str:
        """Get complete database URL"""
        return f"{self.MONGODB_URL}/{self.DATABASE_NAME}"

    def get_cors_origins(self) -> List[str]:
        """Get CORS origins as list"""
        return self.CORS_ORIGINS

    def get_jwt_settings(self) -> dict:
        """Get JWT configuration"""
        return {
            "secret": self.JWT_SECRET,
            "algorithm": self.JWT_ALGORITHM,
            "access_token_expire_minutes": self.ACCESS_TOKEN_EXPIRE_MINUTES,
            "refresh_secret": self.JWT_REFRESH_SECRET
        }

    def get_security_settings(self) -> dict:
        """Get security configuration"""
        return {
            "bcrypt_rounds": self.BCRYPT_ROUNDS,
            "max_login_attempts": self.MAX_LOGIN_ATTEMPTS,
            "lockout_duration_minutes": self.LOCKOUT_DURATION_MINUTES,
            "rate_limit_requests": self.RATE_LIMIT_REQUESTS,
            "rate_limit_window": self.RATE_LIMIT_WINDOW,
            "session_timeout_hours": self.SESSION_TIMEOUT_HOURS
        }

    def get_admin_config(self) -> dict:
        """Get admin user configuration"""
        return {
            "username": self.DEFAULT_ADMIN_USERNAME,
            "password": self.DEFAULT_ADMIN_PASSWORD,
            "email": self.DEFAULT_ADMIN_EMAIL
        }

@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()

# ÖNEMLI: settings instance'ını export et
settings = get_settings()

# Environment-specific configurations
def get_development_settings() -> Settings:
    """Get development settings"""
    dev_settings = get_settings()
    dev_settings.DEBUG = True
    dev_settings.RELOAD = True
    dev_settings.LOG_LEVEL = "DEBUG"
    dev_settings.ENABLE_SWAGGER = True
    dev_settings.ENABLE_REDOC = True
    return dev_settings

def get_production_settings() -> Settings:
    """Get production settings"""
    prod_settings = get_settings()
    prod_settings.DEBUG = False
    prod_settings.RELOAD = False
    prod_settings.LOG_LEVEL = "INFO"
    prod_settings.ENABLE_SWAGGER = False
    prod_settings.ENABLE_REDOC = False

    # Override with environment variables for production
    prod_settings.SECRET_KEY = os.getenv("SECRET_KEY", prod_settings.SECRET_KEY)
    prod_settings.JWT_SECRET = os.getenv("JWT_SECRET", prod_settings.JWT_SECRET)
    prod_settings.DEFAULT_ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", prod_settings.DEFAULT_ADMIN_PASSWORD)

    return prod_settings

def get_test_settings() -> Settings:
    """Get test settings"""
    test_settings = get_settings()
    test_settings.DATABASE_NAME = "kobi_firewall_test_db"
    test_settings.DB_NAME = "kobi_firewall_test_db"
    test_settings.DEBUG = True
    test_settings.BCRYPT_ROUNDS = 4  # Faster for tests
    test_settings.ACCESS_TOKEN_EXPIRE_MINUTES = 30
    return test_settings

# Validation functions
def validate_environment():
    """Validate environment configuration"""
    current_settings = get_settings()
    issues = []

    # Check JWT secret
    if len(current_settings.JWT_SECRET) < 32:
        issues.append("JWT_SECRET is too short (minimum 32 characters)")

    # Check database URL
    if not current_settings.MONGODB_URL.startswith("mongodb://"):
        issues.append("MONGODB_URL should start with 'mongodb://'")

    # Check production settings
    if current_settings.is_production:
        if current_settings.DEFAULT_ADMIN_PASSWORD == "admin123":
            issues.append("Default admin password should be changed in production")

        if current_settings.DEBUG:
            issues.append("Debug mode should be disabled in production")

        if len(current_settings.JWT_SECRET) < 64:
            issues.append("JWT_SECRET should be at least 64 characters in production")

    return issues

def get_security_recommendations() -> List[str]:
    """Get security recommendations based on current configuration"""
    current_settings = get_settings()
    recommendations = []

    if current_settings.BCRYPT_ROUNDS < 12:
        recommendations.append("Consider increasing BCRYPT_ROUNDS to 12 or higher for better security")

    if current_settings.MAX_LOGIN_ATTEMPTS > 10:
        recommendations.append("Consider lowering MAX_LOGIN_ATTEMPTS to prevent brute force attacks")

    if current_settings.ACCESS_TOKEN_EXPIRE_MINUTES > 1440:  # 24 hours
        recommendations.append("Consider shorter token expiration times for better security")

    if not current_settings.is_production and current_settings.DEFAULT_ADMIN_PASSWORD == "admin123":
        recommendations.append("Change default admin password even in development")

    return recommendations

# Export commonly used settings
def get_database_config() -> dict:
    """Get database configuration"""
    current_settings = get_settings()
    return {
        "url": current_settings.MONGODB_URL,
        "database": current_settings.DATABASE_NAME,
        "full_url": current_settings.database_url
    }

def get_server_config() -> dict:
    """Get server configuration"""
    current_settings = get_settings()
    return {
        "host": current_settings.HOST,
        "port": current_settings.PORT,
        "reload": current_settings.RELOAD,
        "debug": current_settings.DEBUG
    }

# Export for easy import
__all__ = [
    "Settings",
    "settings",
    "get_settings",
    "get_development_settings",
    "get_production_settings",
    "get_test_settings",
    "validate_environment",
    "get_security_recommendations",
    "get_database_config",
    "get_server_config"
]