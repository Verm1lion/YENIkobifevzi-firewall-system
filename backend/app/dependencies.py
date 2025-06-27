"""
Enhanced dependency injection with comprehensive security, validation, and system management
Fully integrated with Settings and System management features
UPDATED: Increased rate limits for concurrent request handling
Network Interface Management validation and security
"""

import re
import ipaddress
from typing import Optional, Any, Dict, List
from datetime import datetime, timedelta
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer, HTTPBearer
from jose import jwt, JWTError
import bcrypt
from collections import defaultdict
import time
import logging

from .settings import get_settings

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Security schemes
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/auth/login", auto_error=False)
bearer_scheme = HTTPBearer(auto_error=False)


class SecurityError(Exception):
    """Custom security exception"""
    pass


class InputSanitizer:
    """Enhanced input sanitization utility"""

    # Dangerous characters for MongoDB injection
    DANGEROUS_CHARS = ['$', '{', '}', '[', ']', '(', ')', '\\', '"', "'", '`']

    # Dangerous patterns
    DANGEROUS_PATTERNS = [
        r'\$where', r'\$ne', r'\$gt', r'\$lt', r'\$in', r'\$nin',
        r'\$or', r'\$and', r'\$regex', r'javascript:', r'<script',
        r'</script>', r'eval\(', r'function\(', r'exec\(', r'system\(',
        r'cmd\(', r'shell_exec', r'passthru', r'proc_open',
        r'file_get_contents', r'file_put_contents', r'fopen', r'fwrite'
    ]

    @classmethod
    def sanitize_string(cls, input_str: str, max_length: int = 255) -> str:
        """Sanitize string input with enhanced security"""
        if not isinstance(input_str, str):
            raise ValueError("Input must be a string")

        # Length check
        if len(input_str) > max_length:
            raise ValueError(f"Input too long. Maximum {max_length} characters allowed")

        # Remove dangerous characters
        sanitized = input_str
        for char in cls.DANGEROUS_CHARS:
            sanitized = sanitized.replace(char, '')

        # Check for dangerous patterns
        for pattern in cls.DANGEROUS_PATTERNS:
            if re.search(pattern, sanitized, re.IGNORECASE):
                raise ValueError(f"Invalid input detected: {pattern}")

        return sanitized.strip()

    @classmethod
    def sanitize_username(cls, username: str) -> str:
        """Sanitize username with specific rules"""
        if not username:
            raise ValueError("Username cannot be empty")

        # Length check
        if len(username) < 2 or len(username) > 50:
            raise ValueError("Username must be between 2 and 50 characters")

        # Allowed characters only
        if not re.match(r'^[a-zA-Z0-9_.-]+$', username):
            raise ValueError("Username can only contain letters, numbers, dots, hyphens, and underscores")

        return username.lower().strip()

    @classmethod
    def validate_ip_address(cls, ip_str: str) -> str:
        """Validate IP address"""
        try:
            ip = ipaddress.ip_address(ip_str)
            return str(ip)
        except ValueError:
            raise ValueError(f"Invalid IP address: {ip_str}")

    @classmethod
    def validate_email(cls, email: str) -> str:
        """Validate email address"""
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_pattern, email):
            raise ValueError("Invalid email format")
        return email.lower().strip()

    @classmethod
    def validate_timezone(cls, timezone: str) -> str:
        """Validate timezone string"""
        valid_timezones = [
            "Türkiye (UTC+3)", "UTC", "EST", "PST", "CET", "GMT",
            "Europe/Istanbul", "America/New_York", "America/Los_Angeles",
            "Europe/London", "Asia/Tokyo", "Australia/Sydney"
        ]
        if timezone not in valid_timezones:
            raise ValueError(f"Invalid timezone. Must be one of: {valid_timezones}")
        return timezone

    @classmethod
    def validate_language(cls, language: str) -> str:
        """Validate language string"""
        valid_languages = ["Türkçe", "English", "Français", "Deutsch", "Español", "Italiano"]
        if language not in valid_languages:
            raise ValueError(f"Invalid language. Must be one of: {valid_languages}")
        return language

    @classmethod
    def validate_session_timeout(cls, timeout: int) -> int:
        """Validate session timeout"""
        if not isinstance(timeout, int):
            raise ValueError("Session timeout must be an integer")
        if timeout < 5 or timeout > 480:
            raise ValueError("Session timeout must be between 5 and 480 minutes")
        return timeout

    @classmethod
    def validate_file_path(cls, file_path: str) -> str:
        """Validate file path for security"""
        # Prevent path traversal
        if ".." in file_path or file_path.startswith("/"):
            raise ValueError("Invalid file path detected")

        # Check for dangerous file extensions
        dangerous_extensions = ['.exe', '.bat', '.cmd', '.sh', '.ps1', '.php', '.jsp']
        if any(file_path.lower().endswith(ext) for ext in dangerous_extensions):
            raise ValueError("Dangerous file extension detected")

        return file_path

    @classmethod
    def validate_system_command(cls, command: str) -> str:
        """Validate system command for security"""
        dangerous_commands = [
            'rm', 'del', 'format', 'fdisk', 'mkfs', 'dd',
            'sudo rm', 'sudo del', 'chmod 777', 'chown root'
        ]

        command_lower = command.lower()
        for dangerous in dangerous_commands:
            if dangerous in command_lower:
                raise ValueError(f"Dangerous command detected: {dangerous}")

        return command


class PasswordManager:
    """Enhanced password management with bcrypt"""

    def __init__(self):
        self.settings = get_settings()
        self.salt_rounds = self.settings.bcrypt_rounds

    def hash_password(self, password: str) -> str:
        """Hash password using bcrypt with configured rounds"""
        try:
            # Validate password strength
            self._validate_password_strength(password)

            # Generate salt and hash
            salt = bcrypt.gensalt(rounds=self.salt_rounds)
            hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
            return hashed.decode('utf-8')
        except Exception as e:
            raise SecurityError(f"Password hashing failed: {str(e)}")

    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verify password against bcrypt hash"""
        try:
            return bcrypt.checkpw(
                plain_password.encode('utf-8'),
                hashed_password.encode('utf-8')
            )
        except Exception as e:
            logger.error(f"Password verification error: {e}")
            return False

    def _validate_password_strength(self, password: str) -> None:
        """Validate password strength with enhanced rules"""
        if len(password) < 8:
            raise ValueError("Password must be at least 8 characters long")
        if len(password) > 128:
            raise ValueError("Password must be less than 128 characters")

        # Check for character variety
        has_upper = any(c.isupper() for c in password)
        has_lower = any(c.islower() for c in password)
        has_digit = any(c.isdigit() for c in password)
        has_special = any(c in "!@#$%^&*()_+-=[]{}|;:,.<>?" for c in password)

        strength_score = sum([has_upper, has_lower, has_digit, has_special])
        if strength_score < 3:
            logger.warning("⚠️ Weak password detected - recommend stronger password")

        # Check for common weak passwords
        weak_passwords = [
            'password', '123456', 'admin', 'admin123', 'password123',
            'qwerty', 'letmein', 'welcome', 'monkey', 'dragon'
        ]
        if password.lower() in weak_passwords:
            raise ValueError("Password is too common and weak")


class SecurityManager:
    """Enhanced security manager with comprehensive protection"""

    def __init__(self):
        self.settings = get_settings()
        self.failed_attempts: Dict[str, Dict[str, Any]] = {}
        self.blocked_ips: Dict[str, datetime] = {}
        self.active_sessions: Dict[str, Dict[str, Any]] = {}
        self.password_manager = PasswordManager()
        self.input_sanitizer = InputSanitizer()
        self.suspicious_activities: Dict[str, List[datetime]] = {}

    def is_ip_blocked(self, ip: str) -> bool:
        """Check if IP is temporarily blocked"""
        if ip in self.blocked_ips:
            block_time = self.blocked_ips[ip]
            if datetime.utcnow() - block_time > timedelta(minutes=self.settings.lockout_duration_minutes):
                del self.blocked_ips[ip]
                self.failed_attempts.pop(ip, None)
                return False
            return True
        return False

    def record_failed_attempt(self, ip: str, username: str = None, activity_type: str = "login") -> bool:
        """Record failed authentication attempt with activity tracking"""
        current_time = datetime.utcnow()

        if ip not in self.failed_attempts:
            self.failed_attempts[ip] = {
                'count': 0,
                'first_attempt': current_time,
                'last_attempt': current_time,
                'usernames': [],
                'activities': []
            }

        self.failed_attempts[ip]['count'] += 1
        self.failed_attempts[ip]['last_attempt'] = current_time
        self.failed_attempts[ip]['activities'].append({
            'type': activity_type,
            'timestamp': current_time,
            'username': username
        })

        if username:
            self.failed_attempts[ip]['usernames'].append(username)

        # Track suspicious activities
        if ip not in self.suspicious_activities:
            self.suspicious_activities[ip] = []
        self.suspicious_activities[ip].append(current_time)

        # Clean old suspicious activities (last hour)
        cutoff_time = current_time - timedelta(hours=1)
        self.suspicious_activities[ip] = [
            t for t in self.suspicious_activities[ip] if t > cutoff_time
        ]

        # Block IP if too many failed attempts
        if self.failed_attempts[ip]['count'] >= self.settings.max_login_attempts:
            self.blocked_ips[ip] = current_time
            logger.warning(f"🚫 IP {ip} blocked for {self.settings.lockout_duration_minutes} minutes")
            return True

        # Check for rapid suspicious activities
        if len(self.suspicious_activities[ip]) > 20:  # More than 20 activities in an hour
            self.blocked_ips[ip] = current_time
            logger.warning(f"🚫 IP {ip} blocked for suspicious activity pattern")
            return True

        return False

    def clear_failed_attempts(self, ip: str):
        """Clear failed attempts for successful authentication"""
        self.failed_attempts.pop(ip, None)
        self.blocked_ips.pop(ip, None)
        # Keep suspicious activities for monitoring

    def get_remaining_attempts(self, ip: str) -> int:
        """Get remaining login attempts for IP"""
        if ip in self.failed_attempts:
            return max(0, self.settings.max_login_attempts - self.failed_attempts[ip]['count'])
        return self.settings.max_login_attempts

    def get_lockout_remaining_time(self, ip: str) -> int:
        """Get remaining lockout time in minutes"""
        if ip in self.blocked_ips:
            elapsed = datetime.utcnow() - self.blocked_ips[ip]
            remaining = self.settings.lockout_duration_minutes - (elapsed.total_seconds() / 60)
            return max(0, int(remaining))
        return 0

    def add_session(self, user_id: str, session_data: Dict[str, Any]):
        """Add active session with enhanced tracking"""
        self.active_sessions[user_id] = {
            **session_data,
            "last_activity": datetime.utcnow(),
            "created_at": datetime.utcnow(),
            "activity_count": 0,
            "permissions_used": set()
        }

    def remove_session(self, user_id: str):
        """Remove active session"""
        self.active_sessions.pop(user_id, None)

    def is_session_valid(self, user_id: str, max_hours: int = 8) -> bool:
        """Check if session is still valid with enhanced validation"""
        if user_id not in self.active_sessions:
            return False

        session = self.active_sessions[user_id]
        last_activity = session["last_activity"]

        # Check session timeout
        if datetime.utcnow() - last_activity > timedelta(hours=max_hours):
            self.remove_session(user_id)
            return False

        # Check for session anomalies
        if session.get("activity_count", 0) > 1000:  # Too many activities
            logger.warning(f"⚠️ High activity count for session: {user_id}")

        return True

    def update_session_activity(self, user_id: str, activity_type: str = "general"):
        """Update session activity with tracking"""
        if user_id in self.active_sessions:
            session = self.active_sessions[user_id]
            session["last_activity"] = datetime.utcnow()
            session["activity_count"] = session.get("activity_count", 0) + 1

            if "recent_activities" not in session:
                session["recent_activities"] = []

            session["recent_activities"].append({
                "type": activity_type,
                "timestamp": datetime.utcnow()
            })

            # Keep only last 50 activities
            session["recent_activities"] = session["recent_activities"][-50:]

    def get_security_summary(self) -> Dict[str, Any]:
        """Get security summary for monitoring"""
        return {
            "blocked_ips": len(self.blocked_ips),
            "failed_attempts": len(self.failed_attempts),
            "active_sessions": len(self.active_sessions),
            "suspicious_activities": len(self.suspicious_activities),
            "most_targeted_ips": list(self.failed_attempts.keys())[:5],
            "current_time": datetime.utcnow().isoformat()
        }


# Global security manager instance
security_manager = SecurityManager()


class TokenManager:
    """Enhanced JWT token management"""

    def __init__(self):
        self.settings = get_settings()

    def create_access_token(self, data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
        """Create JWT access token with enhanced security"""
        to_encode = data.copy()
        current_time = datetime.utcnow()

        if expires_delta:
            expire = current_time + expires_delta
        else:
            expire = current_time + timedelta(minutes=self.settings.access_token_expire_minutes)

        to_encode.update({
            "exp": expire,
            "iat": current_time,
            "type": "access",
            "jti": f"access_{int(current_time.timestamp())}"  # JWT ID for tracking
        })

        encoded_jwt = jwt.encode(
            to_encode,
            self.settings.jwt_secret,
            algorithm=self.settings.jwt_algorithm
        )

        return encoded_jwt

    def create_refresh_token(self, data: Dict[str, Any]) -> str:
        """Create JWT refresh token"""
        to_encode = data.copy()
        current_time = datetime.utcnow()
        expire = current_time + timedelta(days=7)  # 7 days for refresh token

        to_encode.update({
            "exp": expire,
            "iat": current_time,
            "type": "refresh",
            "jti": f"refresh_{int(current_time.timestamp())}"
        })

        encoded_jwt = jwt.encode(
            to_encode,
            self.settings.jwt_secret,
            algorithm=self.settings.jwt_algorithm
        )

        return encoded_jwt

    def verify_token(self, token: str, token_type: str = "access") -> Dict[str, Any]:
        """Verify and decode JWT token with enhanced validation"""
        try:
            payload = jwt.decode(
                token,
                self.settings.jwt_secret,
                algorithms=[self.settings.jwt_algorithm]
            )

            # Verify token type
            if payload.get("type") != token_type:
                raise JWTError(f"Invalid token type. Expected {token_type}")

            # Additional security checks
            if "jti" not in payload:
                raise JWTError("Token missing unique identifier")

            return payload

        except JWTError as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid token: {str(e)}",
                headers={"WWW-Authenticate": "Bearer"},
            )


# Global token manager instance
token_manager = TokenManager()


# Enhanced Dependency Functions
async def get_database():
    """Get database instance (dependency injection)"""
    from .database import get_database as db_get_database
    return await db_get_database()


async def get_current_user(
    request: Request,
    token: Optional[str] = Depends(oauth2_scheme),
    db = Depends(get_database)
):
    """Get current authenticated user with enhanced security checks"""
    client_ip = request.client.host if request.client else "unknown"

    # Check if no token provided
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token required",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Check if IP is blocked
    if security_manager.is_ip_blocked(client_ip):
        remaining_time = security_manager.get_lockout_remaining_time(client_ip)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"IP temporarily blocked. Try again in {remaining_time} minutes."
        )

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        # Verify token
        payload = token_manager.verify_token(token, "access")
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception

        # Sanitize username
        username = security_manager.input_sanitizer.sanitize_username(username)

        # Get user from database
        database = db
        user = await database.users.find_one({"username": username})
        if user is None:
            raise credentials_exception

        # Check if user is active
        if not user.get("is_active", True):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is disabled"
            )

        # Update session activity
        user_id = str(user["_id"])
        security_manager.update_session_activity(user_id, "api_access")

        # Update user's last seen
        try:
            await database.users.update_one(
                {"_id": user["_id"]},
                {"$set": {"last_seen": datetime.utcnow()}}
            )
        except Exception as e:
            logger.error(f"Failed to update user last seen: {e}")

        return user

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get current user error: {e}")
        raise credentials_exception


async def get_current_active_user(current_user=Depends(get_current_user)):
    """Get current active user"""
    if not current_user.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    return current_user


async def require_admin(current_user=Depends(get_current_active_user)):
    """Require admin privileges with enhanced validation"""
    user_role = current_user.get("role", "").lower()
    is_admin = (
        user_role == "admin" or
        user_role == "administrator" or
        current_user.get("is_admin", False)
    )

    if not is_admin:
        # Log unauthorized admin access attempt
        logger.warning(f"⚠️ Unauthorized admin access attempt by {current_user.get('username')}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required"
        )

    # Track admin action
    user_id = str(current_user["_id"])
    security_manager.update_session_activity(user_id, "admin_action")

    return current_user


async def require_super_admin(current_user=Depends(require_admin)):
    """Require super admin privileges for critical operations"""
    if current_user.get("username") != "admin":
        logger.warning(f"⚠️ Super admin access attempt by {current_user.get('username')}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super admin privileges required for this operation"
        )
    return current_user


async def get_current_user_optional(
    request: Request,
    credentials: Optional[str] = Depends(bearer_scheme)
):
    """Optional user authentication - returns None if not authenticated"""
    if not credentials:
        return None

    try:
        return await get_current_user(request, credentials.credentials)
    except HTTPException:
        return None
    except Exception:
        return None


def check_user_permissions(required_permissions: List[str]):
    """Dependency factory for checking specific permissions"""
    async def permission_checker(current_user: dict = Depends(get_current_user)):
        user_permissions = current_user.get('permissions', [])
        user_role = current_user.get('role', '').lower()

        # Admin has all permissions
        if user_role in ['admin', 'administrator']:
            return current_user

        # Check specific permissions
        for permission in required_permissions:
            if permission not in user_permissions:
                logger.warning(f"⚠️ Permission denied: {permission} for {current_user.get('username')}")
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Permission required: {permission}"
                )

        return current_user

    return permission_checker


async def require_permissions(permissions: List[str]):
    """Require specific permissions"""
    def permission_checker(current_user=Depends(get_current_active_user)):
        user_permissions = current_user.get("permissions", [])
        for permission in permissions:
            if permission not in user_permissions and current_user.get("role") != "admin":
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Permission '{permission}' required"
                )
        return current_user
    return permission_checker


# Rate limiting dependency (gevşetilmiş)
request_counts = defaultdict(list)


def rate_limit(requests_per_minute: int = 200):  # 60'tan 200'e çıkardık
    """Rate limiting dependency with enhanced tracking"""
    def rate_limiter(request: Request):
        client_ip = request.client.host
        current_time = time.time()

        # Clean old requests
        request_counts[client_ip] = [
            req_time for req_time in request_counts[client_ip]
            if current_time - req_time < 60
        ]

        # Check rate limit
        if len(request_counts[client_ip]) >= requests_per_minute:
            logger.warning(f"🚫 Rate limit exceeded for IP: {client_ip}")
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Rate limit exceeded"
            )

        # Add current request
        request_counts[client_ip].append(current_time)
        return True

    return rate_limiter


async def rate_limit_check(request: Request):
    """Enhanced rate limiting check"""
    client_ip = request.client.host if request.client else "unknown"

    # Check if IP is blocked
    if security_manager.is_ip_blocked(client_ip):
        remaining_time = security_manager.get_lockout_remaining_time(client_ip)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Rate limit exceeded. Try again in {remaining_time} minutes."
        )

    return client_ip


# Enhanced validation dependencies
def validate_settings_input():
    """Enhanced dependency for validating settings input"""
    async def validator(request: Request):
        try:
            if request.method in ['POST', 'PUT', 'PATCH']:
                # Validate content type
                content_type = request.headers.get('content-type', '')
                if 'application/json' not in content_type:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Content-Type must be application/json"
                    )

                # Additional security headers check
                if not request.headers.get('user-agent'):
                    logger.warning("⚠️ Request without User-Agent header")

            return True
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Request validation failed: {str(e)}"
            )

    return validator


def sanitize_settings_data(data: Dict[str, Any]) -> Dict[str, Any]:
    """Enhanced settings data sanitization"""
    sanitized = {}
    sanitizer = security_manager.input_sanitizer

    for key, value in data.items():
        try:
            if key == "timezone" and value:
                sanitized[key] = sanitizer.validate_timezone(value)
            elif key == "language" and value:
                sanitized[key] = sanitizer.validate_language(value)
            elif key == "sessionTimeout" and value:
                sanitized[key] = sanitizer.validate_session_timeout(int(value))
            elif key in ["backupLocation", "logPath"] and value:
                sanitized[key] = sanitizer.validate_file_path(value)
            elif isinstance(value, str):
                sanitized[key] = sanitizer.sanitize_string(value)
            else:
                sanitized[key] = value
        except ValueError as e:
            logger.warning(f"⚠️ Invalid setting value for {key}: {e}")
            # Skip invalid values rather than failing completely
            continue

    return sanitized


# System-specific dependencies
async def validate_system_action(
    request: Request,
    current_user: dict = Depends(require_admin)
):
    """Enhanced validation for system action requests"""
    client_ip = request.client.host if request.client else "unknown"
    username = current_user.get('username', 'unknown')

    # Log the system action request
    logger.warning(f"🔧 System action requested by {username} from {client_ip}")

    # Additional security checks for critical operations
    if request.url.path.endswith('/restart'):
        logger.critical(f"⚠️ SYSTEM RESTART requested by {username} from {client_ip}")
    elif request.url.path.endswith('/backup'):
        logger.info(f"💾 System backup requested by {username} from {client_ip}")

    return current_user


async def validate_settings_section(
    section: str,
    current_user: dict = Depends(get_current_user)
):
    """Enhanced validation for settings section names"""
    valid_sections = [
        "general", "autoUpdates", "systemFeedback", "darkTheme",
        "backup", "security", "network", "logging", "notifications"
    ]

    if section not in valid_sections:
        logger.warning(f"⚠️ Invalid settings section access attempt: {section} by {current_user.get('username')}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid settings section: {section}. Must be one of: {valid_sections}"
        )

    return section


def log_settings_change(section: str, data: Dict[str, Any], user: dict):
    """Enhanced logging for settings changes"""
    username = user.get('username', 'unknown')
    user_id = user.get('_id', 'unknown')

    logger.info(f"📝 Settings change: {section} updated by {username} (ID: {user_id})")
    logger.debug(f"📝 Settings data: {data}")

    # Track sensitive setting changes
    sensitive_settings = ['security', 'backup', 'network']
    if section in sensitive_settings:
        logger.warning(f"🔒 Sensitive settings changed: {section} by {username}")

    return True


# Network Interface Validation Functions - YENİ
def validate_interface_name(interface_name: str) -> str:
    """Validate network interface name"""
    if not interface_name or not interface_name.strip():
        raise ValueError("Interface name cannot be empty")

    # Clean input
    cleaned_name = security_manager.input_sanitizer.sanitize_string(interface_name, 50)

    # Allow alphanumeric, dots, hyphens, underscores
    import re
    if not re.match(r'^[a-zA-Z0-9._-]+$', cleaned_name):
        raise ValueError("Invalid interface name format")

    return cleaned_name


def validate_ip_configuration(ip_mode: str, ip_data: Dict[str, Any]) -> bool:
    """Validate IP configuration data"""
    if ip_mode == "static":
        required_fields = ['ip_address', 'subnet_mask']
        for field in required_fields:
            if not ip_data.get(field):
                raise ValueError(f"Static IP mode requires {field}")

        # Validate IP addresses
        for field in ['ip_address', 'subnet_mask', 'gateway', 'dns_primary', 'dns_secondary']:
            value = ip_data.get(field)
            if value and value.strip():
                try:
                    security_manager.input_sanitizer.validate_ip_address(value)
                except ValueError as e:
                    raise ValueError(f"Invalid {field}: {str(e)}")

    return True


def validate_ics_configuration(ics_data: Dict[str, Any]) -> bool:
    """Validate Internet Connection Sharing configuration"""
    if ics_data.get('ics_enabled'):
        if not ics_data.get('ics_source_interface'):
            raise ValueError("ICS requires source interface")

        # Validate DHCP range
        dhcp_start = ics_data.get('ics_dhcp_range_start')
        dhcp_end = ics_data.get('ics_dhcp_range_end')

        if dhcp_start:
            try:
                security_manager.input_sanitizer.validate_ip_address(dhcp_start)
            except ValueError:
                raise ValueError("Invalid DHCP range start IP")

        if dhcp_end:
            try:
                security_manager.input_sanitizer.validate_ip_address(dhcp_end)
            except ValueError:
                raise ValueError("Invalid DHCP range end IP")

    return True


def validate_network_interface_data(interface_data: Dict[str, Any]) -> Dict[str, Any]:
    """Comprehensive network interface data validation"""
    validated_data = {}

    # Interface name validation
    if 'interface_name' in interface_data:
        validated_data['interface_name'] = validate_interface_name(interface_data['interface_name'])

    # Display name validation
    if 'display_name' in interface_data and interface_data['display_name']:
        validated_data['display_name'] = security_manager.input_sanitizer.sanitize_string(
            interface_data['display_name'], 100
        )

    # IP configuration validation
    ip_mode = interface_data.get('ip_mode', 'static')
    validated_data['ip_mode'] = ip_mode

    ip_fields = ['ip_address', 'subnet_mask', 'gateway', 'dns_primary', 'dns_secondary']
    ip_data = {field: interface_data.get(field) for field in ip_fields}

    if validate_ip_configuration(ip_mode, ip_data):
        validated_data.update(ip_data)

    # ICS configuration validation
    ics_fields = ['ics_enabled', 'ics_source_interface', 'ics_dhcp_range_start', 'ics_dhcp_range_end']
    ics_data = {field: interface_data.get(field) for field in ics_fields}

    if validate_ics_configuration(ics_data):
        validated_data.update(ics_data)

    # Numeric validations
    if 'mtu' in interface_data and interface_data['mtu']:
        mtu = int(interface_data['mtu'])
        if not 576 <= mtu <= 9000:
            raise ValueError("MTU must be between 576 and 9000")
        validated_data['mtu'] = mtu

    if 'vlan_id' in interface_data and interface_data['vlan_id']:
        vlan_id = int(interface_data['vlan_id'])
        if not 0 <= vlan_id <= 4094:
            raise ValueError("VLAN ID must be between 0 and 4094")
        validated_data['vlan_id'] = vlan_id

    # Description validation
    if 'description' in interface_data and interface_data['description']:
        validated_data['description'] = security_manager.input_sanitizer.sanitize_string(
            interface_data['description'], 500
        )

    # Boolean fields
    boolean_fields = ['admin_enabled', 'ics_enabled']
    for field in boolean_fields:
        if field in interface_data:
            validated_data[field] = bool(interface_data[field])

    return validated_data


async def validate_interface_access(
    interface_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Validate interface access permissions"""
    # Admin her zaman erişebilir
    if current_user.get('role') == 'admin':
        return current_user

    # Diğer kullanıcılar için ek kontroller
    user_permissions = current_user.get('permissions', [])
    if 'network_interface_manage' not in user_permissions:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Network interface management permission required"
        )

    return current_user


# Network interface specific rate limiting
def network_rate_limit():
    """Network operations rate limiting"""
    return rate_limit(requests_per_minute=50)  # Daha kısıtlı limit


# Password utilities (enhanced for backward compatibility)
async def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Enhanced password verification"""
    return security_manager.password_manager.verify_password(plain_password, hashed_password)


async def hash_password(password: str) -> str:
    """Enhanced password hashing"""
    return security_manager.password_manager.hash_password(password)


async def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Enhanced access token creation"""
    return token_manager.create_access_token(data, expires_delta)


async def create_refresh_token(data: Dict[str, Any]) -> str:
    """Enhanced refresh token creation"""
    return token_manager.create_refresh_token(data)


async def verify_token(token: str, token_type: str = "access") -> Dict[str, Any]:
    """Enhanced token verification"""
    return token_manager.verify_token(token, token_type)


# Security monitoring dependencies
async def get_security_status():
    """Get current security status"""
    return security_manager.get_security_summary()


async def log_security_event(event_type: str, details: Dict[str, Any], user: Optional[dict] = None):
    """Log security events"""
    username = user.get('username', 'system') if user else 'system'
    logger.warning(f"🔒 Security event: {event_type} by {username} - {details}")


# Export all dependencies
__all__ = [
    'get_database', 'get_current_user', 'get_current_active_user', 'require_admin',
    'require_super_admin', 'get_current_user_optional', 'check_user_permissions',
    'require_permissions', 'rate_limit', 'rate_limit_check', 'validate_settings_input',
    'sanitize_settings_data', 'verify_password', 'hash_password', 'create_access_token',
    'create_refresh_token', 'verify_token', 'validate_system_action',
    'validate_settings_section', 'log_settings_change', 'get_security_status',
    'log_security_event', 'security_manager', 'token_manager', 'SecurityError',
    'InputSanitizer', 'PasswordManager', 'SecurityManager', 'TokenManager',
    # Network interface validations - YENİ
    'validate_interface_name', 'validate_ip_configuration', 'validate_ics_configuration',
    'validate_network_interface_data', 'validate_interface_access', 'network_rate_limit'
]