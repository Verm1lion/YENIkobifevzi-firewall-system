"""
Settings management using Pydantic v2 with 12-Factor App principles
Enhanced security configuration with environment variables
"""
import os
import secrets
from functools import lru_cache
from typing import List, Optional, Union
from pydantic import Field, field_validator, computed_field
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    """Application settings with environment variable support and enhanced security"""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )

    # Project Information
    project_name: str = Field(default="KOBI Firewall", description="Project name")
    version: str = Field(default="2.0.0", description="Application version")
    description: str = Field(default="Enterprise Security Solution", description="Project description")

    # Environment
    environment: str = Field(default="development", description="Environment (development/production)")
    debug: bool = Field(default=False, description="Debug mode")
    node_env: str = Field(default="development", description="Node environment")

    # Server Configuration
    host: str = Field(default="0.0.0.0", description="Server host")
    port: int = Field(default=8000, description="Server port")

    # Database Configuration
    mongodb_url: str = Field(default="mongodb://localhost:27017", description="MongoDB connection URL")
    database_name: str = Field(default="kobi_firewall_db", description="Database name")

    # JWT Configuration - GÜÇLENDIRILDI
    jwt_secret: str = Field(
        default_factory=lambda: secrets.token_urlsafe(64),
        description="JWT secret key - minimum 64 characters"
    )
    jwt_algorithm: str = Field(default="HS256", description="JWT algorithm")
    access_token_expire_minutes: int = Field(default=480, description="Access token expiration in minutes")
    refresh_token_expire_days: int = Field(default=7, description="Refresh token expiration in days")

    # Security Settings - GÜÇLENDIRILDI
    bcrypt_rounds: int = Field(default=12, ge=10, le=15, description="BCrypt rounds (10-15)")
    max_login_attempts: int = Field(default=5, description="Maximum login attempts before lockout")
    lockout_duration_minutes: int = Field(default=15, description="Account lockout duration in minutes")
    rate_limit_requests_per_minute: int = Field(default=100, description="Rate limit per minute")
    max_upload_size_mb: int = Field(default=10, description="Maximum upload size in MB")

    # CORS Configuration
    cors_origins: Union[str, List[str]] = Field(
        default="http://localhost:3000,http://localhost:5173",
        description="Allowed CORS origins"
    )
    frontend_url: str = Field(default="http://localhost:3000", description="Frontend URL")

    # Admin Configuration - Environment'tan alınacak
    admin_username: str = Field(default="admin", description="Default admin username")
    admin_password: str = Field(default="admin123", description="Default admin password")
    admin_email: str = Field(default="admin@netgate.local", description="Default admin email")

    # Logging Configuration
    log_level: str = Field(default="INFO", description="Logging level")
    log_format: str = Field(default="detailed", description="Log format (simple/detailed)")
    log_file: str = Field(default="logs/kobi_firewall.log", description="Log file path")

    # Network Settings
    default_dns_servers: Union[str, List[str]] = Field(
        default="8.8.8.8,8.8.4.4",
        description="Default DNS servers"
    )

    # Firewall Settings
    max_firewall_rules: int = Field(default=1000, description="Maximum number of firewall rules")
    rule_backup_enabled: bool = Field(default=True, description="Enable automatic rule backup")

    # Backward compatibility properties
    @computed_field
    @property
    def MONGODB_URL(self) -> str:
        """Backward compatibility for MONGODB_URL"""
        return self.mongodb_url

    @computed_field
    @property
    def DATABASE_NAME(self) -> str:
        """Backward compatibility for DATABASE_NAME"""
        return self.database_name

    @computed_field
    @property
    def SECRET_KEY(self) -> str:
        """Backward compatibility for SECRET_KEY"""
        return self.jwt_secret

    @computed_field
    @property
    def JWT_SECRET(self) -> str:
        """Backward compatibility for JWT_SECRET"""
        return self.jwt_secret

    @computed_field
    @property
    def ACCESS_TOKEN_EXPIRE_MINUTES(self) -> int:
        """Backward compatibility for ACCESS_TOKEN_EXPIRE_MINUTES"""
        return self.access_token_expire_minutes

    @field_validator('cors_origins', mode='before')
    @classmethod
    def parse_cors_origins(cls, v):
        """Parse CORS origins from string or list"""
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(',') if origin.strip()]
        elif isinstance(v, list):
            return v
        return ["http://localhost:3000", "http://localhost:5173"]

    @field_validator('default_dns_servers', mode='before')
    @classmethod
    def parse_dns_servers(cls, v):
        """Parse DNS servers from string or list"""
        if isinstance(v, str):
            return [server.strip() for server in v.split(',') if server.strip()]
        elif isinstance(v, list):
            return v
        return ["8.8.8.8", "8.8.4.4"]

    @field_validator('jwt_secret')
    @classmethod
    def validate_jwt_secret(cls, v):
        """Validate JWT secret strength - minimum 64 characters"""
        if len(v) < 64:
            # Generate a secure secret if not provided
            secure_secret = secrets.token_urlsafe(64)
            print(f"⚠️  JWT secret too short ({len(v)} chars). Generated secure secret ({len(secure_secret)} chars)")
            return secure_secret
        return v

    @field_validator('environment', 'node_env')
    @classmethod
    def validate_environment(cls, v):
        """Validate environment values"""
        allowed_envs = ['development', 'staging', 'production']
        if v not in allowed_envs:
            print(f"⚠️  Invalid environment '{v}'. Using 'development'")
            return 'development'
        return v

    @field_validator('bcrypt_rounds')
    @classmethod
    def validate_bcrypt_rounds(cls, v):
        """Validate BCrypt rounds for security"""
        if v < 10:
            print(f"⚠️  BCrypt rounds too low ({v}). Using minimum 12")
            return 12
        elif v > 15:
            print(f"⚠️  BCrypt rounds too high ({v}). Using maximum 15")
            return 15
        return v

    @field_validator('admin_password')
    @classmethod
    def validate_admin_password(cls, v):
        """Validate admin password strength"""
        if len(v) < 8:
            print("⚠️  Admin password too short. Consider using a stronger password")
        return v

    @computed_field
    @property
    def is_production(self) -> bool:
        """Check if running in production"""
        return self.environment == "production"

    @computed_field
    @property
    def is_development(self) -> bool:
        """Check if running in development"""
        return self.environment == "development"

    @computed_field
    @property
    def database_url(self) -> str:
        """Get complete database URL"""
        return f"{self.mongodb_url}/{self.database_name}"

    def generate_secure_secret(self) -> str:
        """Generate a secure random secret"""
        return secrets.token_urlsafe(64)

    def get_cors_origins_list(self) -> List[str]:
        """Get CORS origins as list"""
        if isinstance(self.cors_origins, str):
            return [origin.strip() for origin in self.cors_origins.split(',') if origin.strip()]
        return self.cors_origins

    def get_dns_servers_list(self) -> List[str]:
        """Get DNS servers as list"""
        if isinstance(self.default_dns_servers, str):
            return [server.strip() for server in self.default_dns_servers.split(',') if server.strip()]
        return self.default_dns_servers

@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()

# Export settings instance
settings = get_settings()

# Validation on import
if settings.is_production and settings.admin_password == "admin123":
    print("🚨 SECURITY WARNING: Change default admin password in production!")

if settings.is_production and len(settings.jwt_secret) < 64:
    print("🚨 SECURITY WARNING: JWT secret should be at least 64 characters in production!")