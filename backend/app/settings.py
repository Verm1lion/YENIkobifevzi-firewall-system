"""
Settings management using Pydantic v2 with 12-Factor App principles
"""

import os
from functools import lru_cache
from typing import List, Optional, Union
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    """Application settings with environment variable support"""

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

    # Database Configuration
    mongodb_url: str = Field(default="mongodb://localhost:27017", description="MongoDB connection URL")
    database_name: str = Field(default="kobi_firewall_db", description="Database name")

    # JWT Configuration
    jwt_secret: str = Field(default="change-this-secret-key-in-production-please-make-it-longer-than-32-chars", description="JWT secret key")
    jwt_algorithm: str = Field(default="HS256", description="JWT algorithm")
    access_token_expire_minutes: int = Field(default=480, description="Token expiration in minutes")

    # CORS Configuration - This will handle both string and list input
    cors_origins: Union[str, List[str]] = Field(
        default="http://localhost:3000,http://localhost:5173",
        description="Allowed CORS origins"
    )

    # Security Settings
    rate_limit_requests_per_minute: int = Field(default=100, description="Rate limit per minute")
    max_upload_size_mb: int = Field(default=10, description="Maximum upload size in MB")

    # Logging Configuration
    log_level: str = Field(default="INFO", description="Logging level")
    log_format: str = Field(default="detailed", description="Log format (simple/detailed)")

    # Network Settings
    default_dns_servers: Union[str, List[str]] = Field(
        default="8.8.8.8,8.8.4.4",
        description="Default DNS servers"
    )

    # Firewall Settings
    max_firewall_rules: int = Field(default=1000, description="Maximum number of firewall rules")
    rule_backup_enabled: bool = Field(default=True, description="Enable automatic rule backup")

    # Backward compatibility properties
    @property
    def MONGODB_URL(self) -> str:
        """Backward compatibility for MONGODB_URL"""
        return self.mongodb_url

    @property
    def DATABASE_NAME(self) -> str:
        """Backward compatibility for DATABASE_NAME"""
        return self.database_name

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
        """Validate JWT secret strength"""
        if len(v) < 32:
            raise ValueError('JWT secret must be at least 32 characters long')
        return v

    @field_validator('environment')
    @classmethod
    def validate_environment(cls, v):
        """Validate environment values"""
        allowed_envs = ['development', 'staging', 'production']
        if v not in allowed_envs:
            raise ValueError(f'Environment must be one of: {allowed_envs}')
        return v

    @property
    def is_production(self) -> bool:
        """Check if running in production"""
        return self.environment == "production"

    @property
    def is_development(self) -> bool:
        """Check if running in development"""
        return self.environment == "development"

    @property
    def database_url(self) -> str:
        """Get complete database URL"""
        return f"{self.mongodb_url}/{self.database_name}"

@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()

# Export settings instance
settings = get_settings()