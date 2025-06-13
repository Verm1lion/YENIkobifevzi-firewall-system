from fastapi import APIRouter, HTTPException, status, Depends
from datetime import datetime, timedelta
from passlib.hash import bcrypt
from jose import jwt
from ..config import settings
from ..database import db
from ..schemas import UserCreate, UserLogin, Token
from ..dependencies import get_current_user

auth_router = APIRouter(prefix="/auth", tags=["auth"])

@auth_router.post("/register")
async def register_user(user_in: UserCreate):
    existing = await db["users"].find_one({"username": user_in.username})
    if existing:
        raise HTTPException(status_code=400, detail="Username already taken")

    hashed_pass = bcrypt.hash(user_in.password)
    new_user = {
        "username": user_in.username,
        "hashed_password": hashed_pass,
        "role": "admin",
        "created_at": datetime.utcnow()
    }
    result = await db["users"].insert_one(new_user)
    return {"message": "User created", "user_id": str(result.inserted_id)}

@auth_router.post("/login", response_model=Token)
async def login_user(user_in: UserLogin):
    user = await db["users"].find_one({"username": user_in.username})
    if not user or not bcrypt.verify(user_in.password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {"sub": user["username"], "exp": expire}
    token = jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
    return {"access_token": token, "token_type": "bearer"}

@auth_router.get("/me")
async def get_me(current_user=Depends(get_current_user)):
    return {
        "username": current_user["username"],
        "role": current_user["role"],
        "created_at": current_user["created_at"]
    }
