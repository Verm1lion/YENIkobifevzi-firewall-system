""" Enhanced authentication router with modern security features """
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from fastapi import APIRouter, HTTPException, status, Depends, Request, BackgroundTasks
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from bson import ObjectId

from ..database import get_database
from ..dependencies import (
    get_current_user,
    verify_password,
    hash_password,
    create_access_token,
    security_manager
)
from ..schemas import (
    UserRegister,
    TokenResponse,
    UserResponse,
    PasswordChange,
    ResponseModel
)
from ..settings import get_settings

settings = get_settings()
auth_router = APIRouter()

# JSON Login Schema
class UserLoginJSON(BaseModel):
    username: str
    password: str
    remember_me: bool = False

async def log_auth_event(db, user_id: str, event: str, details: Dict[str, Any]):
    """Log authentication events"""
    try:
        await db.system_logs.insert_one({
            "timestamp": datetime.utcnow(),
            "level": "INFO",
            "source": "auth",
            "message": f"Authentication event: {event}",
            "user_id": user_id,
            "event_type": event,
            "details": details
        })
    except Exception as e:
        print(f"Failed to log auth event: {e}")

@auth_router.post("/register", response_model=ResponseModel)
async def register_user(
    user_data: UserRegister,
    request: Request,
    background_tasks: BackgroundTasks,
    db = Depends(get_database)
):
    """Register a new user account"""
    # Check if registration is enabled
    if settings.is_production:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User registration is disabled in production"
        )

    # Check if username already exists
    existing_user = await db.users.find_one({"username": user_data.username.lower()})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )

    # Check if email already exists
    if user_data.email:
        existing_email = await db.users.find_one({"email": user_data.email.lower()})
        if existing_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )

    # Hash password
    hashed_password = await hash_password(user_data.password)

    # Create user document
    user_doc = {
        "username": user_data.username.lower(),
        "email": user_data.email.lower() if user_data.email else None,
        "hashed_password": hashed_password,
        "role": "viewer",  # Default role
        "is_active": True,
        "is_verified": False,
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

    # Insert user
    result = await db.users.insert_one(user_doc)

    # Log registration
    background_tasks.add_task(
        log_auth_event,
        db,
        str(result.inserted_id),
        "user_registered",
        {
            "username": user_data.username,
            "email": user_data.email,
            "ip_address": request.client.host if request.client else "unknown"
        }
    )

    return ResponseModel(
        message="User registered successfully",
        details={"user_id": str(result.inserted_id)}
    )

@auth_router.post("/login", response_model=TokenResponse)
async def login_user(
    request: Request,
    background_tasks: BackgroundTasks,
    login_data: UserLoginJSON,
    db = Depends(get_database)
):
    """Authenticate user and return access token - JSON version"""
    client_ip = request.client.host if request.client else "unknown"

    print(f"Login attempt from {client_ip}: {login_data.username}")

    # Check if IP is blocked
    if security_manager.is_ip_blocked(client_ip):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="IP temporarily blocked due to failed authentication attempts"
        )

    # Find user
    user = await db.users.find_one({"username": login_data.username.lower()})
    if not user:
        print(f"User not found: {login_data.username}")
        security_manager.record_failed_attempt(client_ip)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )

    # Verify password
    if not await verify_password(login_data.password, user["hashed_password"]):
        print(f"Invalid password for user: {login_data.username}")
        security_manager.record_failed_attempt(client_ip)
        await db.users.update_one(
            {"_id": user["_id"]},
            {
                "$inc": {"failed_login_attempts": 1},
                "$set": {"last_failed_login": datetime.utcnow()}
            }
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )

    # Check if user is active
    if not user.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is disabled"
        )

    # Check if user is locked
    if user.get("locked_until") and user["locked_until"] > datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_423_LOCKED,
            detail="Account is temporarily locked"
        )

    print(f"Login successful for user: {login_data.username}")

    # Clear failed attempts on successful login
    security_manager.clear_failed_attempts(client_ip)

    # Create access token
    token_data = {
        "sub": user["username"],
        "user_id": str(user["_id"]),
        "role": user["role"],
        "permissions": user.get("permissions", [])
    }
    expires_delta = timedelta(minutes=settings.access_token_expire_minutes)
    access_token = await create_access_token(token_data, expires_delta)

    # Update user login info
    await db.users.update_one(
        {"_id": user["_id"]},
        {
            "$set": {
                "last_login": datetime.utcnow(),
                "failed_login_attempts": 0,
                "locked_until": None
            }
        }
    )

    # Add session
    security_manager.add_session(str(user["_id"]), {
        "username": user["username"],
        "ip_address": client_ip,
        "user_agent": request.headers.get("user-agent", "")
    })

    # Log successful login
    background_tasks.add_task(
        log_auth_event,
        db,
        str(user["_id"]),
        "user_login",
        {
            "username": user["username"],
            "ip_address": client_ip,
            "user_agent": request.headers.get("user-agent", "")
        }
    )

    # Prepare user response
    user_response = UserResponse(
        id=str(user["_id"]),
        username=user["username"],
        email=user.get("email"),
        role=user["role"],
        is_active=user["is_active"],
        created_at=user["created_at"],
        last_login=user.get("last_login"),
        last_seen=user.get("last_seen")
    )

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=settings.access_token_expire_minutes * 60,
        user=user_response
    )

# Form-data login endpoint for compatibility
@auth_router.post("/login-form", response_model=TokenResponse)
async def login_user_form(
    request: Request,
    background_tasks: BackgroundTasks,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db = Depends(get_database)
):
    """Authenticate user and return access token - Form data version"""
    # Convert form data to JSON format and call main login function
    login_data = UserLoginJSON(
        username=form_data.username,
        password=form_data.password,
        remember_me=False
    )
    return await login_user(request, background_tasks, login_data, db)

@auth_router.post("/logout", response_model=ResponseModel)
async def logout_user(
    request: Request,
    background_tasks: BackgroundTasks,
    current_user = Depends(get_current_user),
    db = Depends(get_database)
):
    """Logout user and invalidate session"""
    # Remove session
    security_manager.remove_session(str(current_user["_id"]))

    # Log logout
    background_tasks.add_task(
        log_auth_event,
        db,
        str(current_user["_id"]),
        "user_logout",
        {
            "username": current_user["username"],
            "ip_address": request.client.host if request.client else "unknown"
        }
    )

    return ResponseModel(message="Logged out successfully")

@auth_router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user = Depends(get_current_user)):
    """Get current user information"""
    return UserResponse(
        id=str(current_user["_id"]),
        username=current_user["username"],
        email=current_user.get("email"),
        role=current_user["role"],
        is_active=current_user["is_active"],
        created_at=current_user["created_at"],
        last_login=current_user.get("last_login"),
        last_seen=current_user.get("last_seen")
    )

@auth_router.put("/change-password", response_model=ResponseModel)
async def change_password(
    password_data: PasswordChange,
    request: Request,
    background_tasks: BackgroundTasks,
    current_user = Depends(get_current_user),
    db = Depends(get_database)
):
    """Change user password"""
    # Verify current password
    if not await verify_password(password_data.current_password, current_user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )

    # Hash new password
    new_hashed_password = await hash_password(password_data.new_password)

    # Update password
    await db.users.update_one(
        {"_id": current_user["_id"]},
        {
            "$set": {
                "hashed_password": new_hashed_password,
                "password_changed_at": datetime.utcnow()
            }
        }
    )

    # Log password change
    background_tasks.add_task(
        log_auth_event,
        db,
        str(current_user["_id"]),
        "password_changed",
        {
            "username": current_user["username"],
            "ip_address": request.client.host if request.client else "unknown"
        }
    )

    return ResponseModel(message="Password changed successfully")

@auth_router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    current_user = Depends(get_current_user),
    db = Depends(get_database)
):
    """Refresh access token"""
    # Create new access token
    token_data = {
        "sub": current_user["username"],
        "user_id": str(current_user["_id"]),
        "role": current_user["role"],
        "permissions": current_user.get("permissions", [])
    }
    expires_delta = timedelta(minutes=settings.access_token_expire_minutes)
    access_token = await create_access_token(token_data, expires_delta)

    # Prepare user response
    user_response = UserResponse(
        id=str(current_user["_id"]),
        username=current_user["username"],
        email=current_user.get("email"),
        role=current_user["role"],
        is_active=current_user["is_active"],
        created_at=current_user["created_at"],
        last_login=current_user.get("last_login"),
        last_seen=current_user.get("last_seen")
    )

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=settings.access_token_expire_minutes * 60,
        user=user_response
    )