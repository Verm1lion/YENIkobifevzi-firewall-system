from pydantic import BaseModel, Field
from typing import Optional
import datetime

class UserDB(BaseModel):
    id: str = Field(..., alias="_id")
    username: str
    hashed_password: str
    role: str
    created_at: datetime.datetime

class FirewallRuleDB(BaseModel):
    id: str = Field(..., alias="_id")
    rule_name: str
    source_ip: str
    action: str
    created_at: datetime.datetime

class LogEntryDB(BaseModel):
    id: str = Field(..., alias="_id")
    timestamp: datetime.datetime
    level: str
    message: str
    source_ip: Optional[str] = None
