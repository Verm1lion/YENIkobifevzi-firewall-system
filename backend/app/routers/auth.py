"""
Legacy auth router with enhanced JWT support and bcrypt compatibility
"""
from fastapi import APIRouter, HTTPException, status, Request
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timedelta
import hashlib
import logging
import bcrypt

# JWT paketini doğru import - Sessiz import
try:
    from jose import jwt

    JWT_AVAILABLE = True
    JWT_LIBRARY = "python-jose"
except ImportError:
    try:
        import jwt

        JWT_AVAILABLE = True
        JWT_LIBRARY = "PyJWT"
    except ImportError:
        JWT_AVAILABLE = False
        JWT_LIBRARY = "none"

from ..database import get_database
from ..config import get_settings

# Logger
logger = logging.getLogger(__name__)


# Models
class LoginRequest(BaseModel):
    username: str
    password: str
    remember_me: Optional[bool] = False


class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    user: dict


# Router
router = APIRouter(prefix="/api/auth", tags=["Authentication (Legacy)"])
settings = get_settings()


def hash_password_sha256(password: str) -> str:
    """Hash password using SHA-256 (legacy support)"""
    return hashlib.sha256(password.encode()).hexdigest()


def verify_password_sha256(plain_password: str, hashed_password: str) -> bool:
    """Verify password against SHA-256 hash"""
    return hash_password_sha256(plain_password) == hashed_password


def verify_password_bcrypt(plain_password: str, hashed_password: str) -> bool:
    """Verify password against bcrypt hash"""
    try:
        return bcrypt.checkpw(
            plain_password.encode('utf-8'),
            hashed_password.encode('utf-8')
        )
    except Exception as e:
        logger.warning(f"BCrypt verification failed: {e}")
        return False


def verify_password_smart(plain_password: str, hashed_password: str) -> bool:
    """Smart password verification - detects hash type automatically"""
    # BCrypt hashes start with $2a$, $2b$, $2x$, $2y$
    if hashed_password.startswith(('$2a$', '$2b$', '$2x$', '$2y$')):
        return verify_password_bcrypt(plain_password, hashed_password)
    else:
        # Assume SHA-256 for legacy compatibility
        return verify_password_sha256(plain_password, hashed_password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create JWT access token with fallback"""
    if not JWT_AVAILABLE:
        # Simple token without JWT
        import time
        return f"simple_token_{data.get('username', 'user')}_{int(time.time())}"

    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(hours=24)

    to_encode.update({
        "exp": expire,
        "iat": datetime.utcnow(),
        "type": "access"
    })

    try:
        if JWT_LIBRARY == "python-jose":
            encoded_jwt = jwt.encode(to_encode, settings.jwt_secret, algorithm="HS256")
        else:  # PyJWT
            encoded_jwt = jwt.encode(to_encode, settings.jwt_secret, algorithm="HS256")
        return encoded_jwt
    except Exception as e:
        logger.warning(f"JWT encode failed: {e}, using simple token")
        import time
        return f"simple_token_{data.get('username', 'user')}_{int(time.time())}"


@router.post("/login", response_model=LoginResponse)
async def login_user(request: LoginRequest, client_request: Request):
    """Authenticate user and return JWT token"""
    try:
        client_ip = client_request.client.host if client_request.client else "unknown"
        logger.info(f"🔐 [LEGACY AUTH] Login attempt from {client_ip}: {request.username}")

        db = await get_database()
        users_collection = db.users

        # Find user by username
        user = await users_collection.find_one({"username": request.username})
        if not user:
            logger.warning(f"❌ [LEGACY AUTH] User not found: {request.username}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid username or password"
            )

        # Smart password verification (supports both bcrypt and SHA-256)
        password_field = user.get("password") or user.get("hashed_password")
        if not password_field:
            logger.error(f"❌ [LEGACY AUTH] No password field for user: {request.username}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid username or password"
            )

        if not verify_password_smart(request.password, password_field):
            logger.warning(f"❌ [LEGACY AUTH] Invalid password for user: {request.username}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid username or password"
            )

        logger.info(f"✅ [LEGACY AUTH] Login successful for user: {request.username}")

        # Update last login
        try:
            await users_collection.update_one(
                {"_id": user["_id"]},
                {"$set": {"last_login": datetime.utcnow()}}
            )
        except Exception as e:
            logger.warning(f"⚠️ [LEGACY AUTH] Failed to update last login: {e}")

        # Create access token
        access_token_expires = timedelta(hours=24 if request.remember_me else 8)
        access_token = create_access_token(
            data={
                "sub": str(user["_id"]),
                "username": user["username"],
                "user_id": str(user["_id"])
            },
            expires_delta=access_token_expires
        )

        # Prepare user data for response - safe defaults
        user_data = {
            "id": str(user["_id"]),
            "username": user["username"],
            "email": user.get("email", "admin@netgate.local"),
            "full_name": user.get("full_name", "System Administrator"),
            "role": user.get("role", "admin"),
            "is_active": user.get("is_active", True),
            "created_at": _format_datetime(user.get("created_at")),
            "last_login": _format_datetime(user.get("last_login")) or datetime.utcnow().isoformat()
        }

        return LoginResponse(
            access_token=access_token,
            token_type="bearer",
            user=user_data
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ [LEGACY AUTH] Login error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error during login"
        )


@router.post("/logout")
async def logout_user():
    """Logout user"""
    logger.info("🚪 [LEGACY AUTH] User logged out")
    return {
        "success": True,
        "message": "Successfully logged out"
    }


@router.get("/health")
async def auth_health():
    """Auth service health check"""
    return {
        "status": "healthy",
        "service": "Auth (Legacy)",
        "jwt_available": JWT_AVAILABLE,
        "jwt_library": JWT_LIBRARY,
        "password_support": ["bcrypt", "sha256"],
        "features": {
            "smart_password_detection": True,
            "bcrypt_support": True,
            "legacy_compatibility": True
        },
        "timestamp": datetime.utcnow().isoformat()
    }


@router.get("/verify")
async def verify_token_endpoint():
    """Simple token verification endpoint"""
    return {
        "status": "healthy",
        "service": "Legacy Auth Verification",
        "message": "Token verification available",
        "timestamp": datetime.utcnow().isoformat()
    }


# Helper function
def _format_datetime(dt_value) -> Optional[str]:
    """Safely format datetime values"""
    if dt_value is None:
        return None

    if isinstance(dt_value, datetime):
        return dt_value.isoformat()

    if isinstance(dt_value, str):
        return dt_value

    try:
        return str(dt_value)
    except:
        return None


# Legacy alias for backward compatibility
auth_router = router