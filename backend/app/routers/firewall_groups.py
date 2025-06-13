import platform
import subprocess
from datetime import datetime
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional

from app.database import db
from app.dependencies import require_admin
from app.routers.firewall import remove_firewall_rule_os, add_firewall_rule_os

firewall_groups_router = APIRouter(
    prefix="/firewall/groups",
    tags=["firewall-groups"]
)

class FirewallGroupModel(BaseModel):
    group_name: str
    description: Optional[str] = None

@firewall_groups_router.get("/")
async def list_groups(admin=Depends(require_admin)):
    cursor = db["firewall_groups"].find({})
    groups = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        groups.append(doc)
    return groups

@firewall_groups_router.post("/")
async def create_group(data: FirewallGroupModel, admin=Depends(require_admin)):
    group_doc = {
        "group_name": data.group_name,
        "description": data.description or "",
        "created_at": datetime.utcnow()
    }
    result = await db["firewall_groups"].insert_one(group_doc)
    return {"message": "Grup oluşturuldu", "group_id": str(result.inserted_id)}

@firewall_groups_router.delete("/{group_id}")
async def delete_group(group_id: str, admin=Depends(require_admin)):
    try:
        obj_id = ObjectId(group_id)
    except:
        raise HTTPException(400, "Geçersiz group_id (ObjectId değil)")

    group_doc = await db["firewall_groups"].find_one({"_id": obj_id})
    if not group_doc:
        raise HTTPException(404, "Grup bulunamadı")

    await db["firewall_groups"].delete_one({"_id": obj_id})
    return {"message": f"Grup '{group_doc['group_name']}' silindi."}

@firewall_groups_router.patch("/{group_id}/enable")
async def enable_disable_group(group_id: str, enable: bool, admin=Depends(require_admin)):
    try:
        obj_id = ObjectId(group_id)
    except:
        raise HTTPException(400, "Geçersiz group_id (ObjectId değil)")

    group_doc = await db["firewall_groups"].find_one({"_id": obj_id})
    if not group_doc:
        raise HTTPException(404, "Grup kaydı yok")

    cursor = db["firewall_rules"].find({"group_id": group_id})
    rules_in_group = []
    async for rule_doc in cursor:
        rules_in_group.append(rule_doc)

    for rdoc in rules_in_group:
        remove_firewall_rule_os(rdoc["rule_name"])

        await db["firewall_rules"].update_one(
            {"_id": rdoc["_id"]},
            {"$set": {"enabled": enable}}
        )

        if enable:
            tmp_rule = {
                "rule_name": rdoc["rule_name"],
                "source_ips": rdoc.get("source_ips", []),
                "port": rdoc.get("port"),
                "protocol": rdoc.get("protocol", "TCP"),
                "action": rdoc.get("action", "ALLOW"),
                "direction": rdoc.get("direction", "IN"),
                "profile": rdoc.get("profile", "Any"),
                "description": rdoc.get("description", ""),
                "enabled": True
            }
            add_firewall_rule_os(tmp_rule)

    msg = "Grup kuralları etkinleştirildi." if enable else "Grup kuralları pasifleştirildi."
    return {"message": msg}

@firewall_groups_router.get("/{group_id}/rules")
async def list_group_rules(group_id: str, admin=Depends(require_admin)):
    try:
        obj_id = ObjectId(group_id)
    except:
        raise HTTPException(400, "Geçersiz group_id")

    group_doc = await db["firewall_groups"].find_one({"_id": obj_id})
    if not group_doc:
        raise HTTPException(404, "Grup bulunamadı.")

    cursor = db["firewall_rules"].find({"group_id": group_id})
    arr = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        arr.append(doc)
    return arr
