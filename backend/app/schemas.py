from pydantic import BaseModel
from typing import Optional

class UserCreate(BaseModel):
    username: str
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class FirewallRuleCreate(BaseModel):
    rule_name: str
    source_ip: str
    action: str  # "ALLOW" / "DENY"

class FirewallRuleOut(BaseModel):
    id: str
    rule_name: str
    source_ip: str
    action: str
