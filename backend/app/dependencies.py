""" Modern dependency injection with enhanced security and async support """
from typing import Optional, Any, Dict
from datetime import datetime, timedelta
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer, HTTPBearer
from jose import jwt, JWTError
from passlib.context import CryptContext

# Security schemes
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/auth/login")
bearer_scheme = HTTPBearer(auto_error=False)

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class SecurityManager:
    """Enhanced security manager with rate limiting and session management"""

    def __init__(self):
        self.failed_attempts: Dict[str, int] = {}
        self.blocked_ips: Dict[str, datetime] = {}
        self.active_sessions: Dict[str, Dict[str, Any]] = {}

    def is_ip_blocked(self, ip: str) -> bool:
        """Check if IP is temporarily blocked"""
        if ip in self.blocked_ips:
            if datetime.utcnow() - self.blocked_ips[ip] > timedelta(minutes=15):
                del self.blocked_ips[ip]
                return False
            return True
        return False

    def record_failed_attempt(self, ip: str):
        """Record failed authentication attempt"""
        self.failed_attempts[ip] = self.failed_attempts.get(ip, 0) + 1
        if self.failed_attempts[ip] >= 5:
            self.blocked_ips[ip] = datetime.utcnow()

    def clear_failed_attempts(self, ip: str):
        """Clear failed attempts for successful login"""
        self.failed_attempts.pop(ip, None)

    def add_session(self, user_id: str, session_data: Dict[str, Any]):
        """Add active session"""
        self.active_sessions[user_id] = {
            **session_data,
            "last_activity": datetime.utcnow()
        }

    def remove_session(self, user_id: str):
        """Remove active session"""
        self.active_sessions.pop(user_id, None)

    def is_session_valid(self, user_id: str) -> bool:
        """Check if session is still valid"""
        if user_id not in self.active_sessions:
            return False

        last_activity = self.active_sessions[user_id]["last_activity"]
        if datetime.utcnow() - last_activity > timedelta(hours=8):
            self.remove_session(user_id)
            return False
        return True

# Global security manager
security_manager = SecurityManager()

async def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against hash"""
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception as e:
        print(f"Password verification error: {e}")
        return False

async def hash_password(password: str) -> str:
    """Hash password"""
    return pwd_context.hash(password)

async def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Create JWT access token"""
    from .settings import get_settings
    settings = get_settings()

    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.access_token_expire_minutes)

    to_encode.update({"exp": expire, "iat": datetime.utcnow()})
    encoded_jwt = jwt.encode(to_encode, settings.jwt_secret, algorithm=settings.jwt_algorithm)
    return encoded_jwt

async def verify_token(token: str) -> Dict[str, Any]:
    """Verify and decode JWT token"""
    from .settings import get_settings
    settings = get_settings()

    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        return payload
    except JWTError as e:
        print(f"Token verification error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

def get_database():
    """Get database instance (dependency injection)"""
    from .database import db_manager
    return db_manager.get_database()

async def get_current_user(
    request: Request,
    token: str = Depends(oauth2_scheme),
    db = Depends(get_database)
):
    """Get current authenticated user with enhanced security checks"""
    # Check if IP is blocked
    client_ip = request.client.host if request.client else "unknown"
    if security_manager.is_ip_blocked(client_ip):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="IP temporarily blocked due to failed authentication attempts"
        )

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = await verify_token(token)
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception

        # Get user from database
        user = await db.users.find_one({"username": username})
        if user is None:
            raise credentials_exception

        # Check if user is active
        if not user.get("is_active", True):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is disabled"
            )

        # Update last activity in session (optional check)
        user_id = str(user["_id"])
        if user_id in security_manager.active_sessions:
            security_manager.active_sessions[user_id]["last_activity"] = datetime.utcnow()

        # Update user's last seen
        try:
            await db.users.update_one(
                {"_id": user["_id"]},
                {"$set": {"last_seen": datetime.utcnow()}}
            )
        except Exception as e:
            print(f"Failed to update user last seen: {e}")

        return user

    except HTTPException:
        raise
    except Exception as e:
        print(f"Get current user error: {e}")
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
    """Require admin privileges"""
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required"
        )
    return current_user

async def require_permissions(permissions: list):
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

# Rate limiting dependency
async def rate_limit_check(request: Request):
    """Basic rate limiting check"""
    client_ip = request.client.host if request.client else "unknown"

    # Simple rate limiting
    if security_manager.is_ip_blocked(client_ip):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded"
        )
    return client_ip