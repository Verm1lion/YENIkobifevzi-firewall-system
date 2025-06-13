# File: app/routers/firewall.py

from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
from datetime import datetime
from app.database import db
from app.dependencies import require_admin
from app.firewall_os import add_firewall_rule_os, remove_firewall_rule_os, update_firewall_rule_os

firewall_router = APIRouter(prefix="/firewall", tags=["firewall"])


@firewall_router.get("/rules")
async def list_rules(admin=Depends(require_admin)):
    cursor = db["firewall_rules"].find({})
    results = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        results.append(doc)
    return results


@firewall_router.post("/rules")
async def create_rule(rule_in: dict, admin=Depends(require_admin)):
    """
    Yeni kural ekleme.
    rule_in => {
      "rule_name": str,
      "source_ips": [...],
      "port": int,
      "protocol": "TCP"/"UDP",
      "action": "ALLOW"/"DENY",
      "direction": "IN"/"OUT",
      "profile": "Any"/"Private"/"Public",
      "description": str,
      "enabled": bool,
      ...
    }
    """
    try:
        add_firewall_rule_os(rule_in)  # Windows -> WinFirewall, Linux -> LinuxFirewall
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    doc = rule_in
    doc["created_at"] = datetime.utcnow()
    result = await db["firewall_rules"].insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    return {"message": "Kural eklendi", "data": doc}


@firewall_router.put("/rules/{rule_id}")
async def update_rule(rule_id: str, rule_in: dict, admin=Depends(require_admin)):
    try:
        obj_id = ObjectId(rule_id)
    except:
        raise HTTPException(400, "Geçersiz rule_id")

    old_doc = await db["firewall_rules"].find_one({"_id": obj_id})
    if not old_doc:
        raise HTTPException(404, "Kural bulunamadı")

    try:
        update_firewall_rule_os(old_doc, rule_in)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    rule_in["updated_at"] = datetime.utcnow()
    await db["firewall_rules"].update_one({"_id": obj_id}, {"$set": rule_in})

    return {"message": "Kural güncellendi"}


@firewall_router.delete("/rules/{rule_id}")
async def delete_rule(rule_id: str, admin=Depends(require_admin)):
    try:
        obj_id = ObjectId(rule_id)
    except:
        raise HTTPException(400, "Geçersiz rule_id")

    old_doc = await db["firewall_rules"].find_one({"_id": obj_id})
    if not old_doc:
        raise HTTPException(404, "Kural yok")

    remove_firewall_rule_os(old_doc["rule_name"])
    await db["firewall_rules"].delete_one({"_id": obj_id})

    return {"message": "Kural silindi."}
