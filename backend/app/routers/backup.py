from fastapi import APIRouter, Depends
from ..dependencies import require_admin
from ..database import db

backup_router = APIRouter(prefix="/backup", tags=["backup"])

@backup_router.get("/export")
async def export_config(admin=Depends(require_admin)):
    data = {}
    data["interfaces"] = await db["interfaces"].find({}).to_list(None)
    data["firewall_rules"] = await db["firewall_rules"].find({}).to_list(None)
    data["routes"] = await db["routes"].find({}).to_list(None)
    return data

@backup_router.post("/import")
async def import_config(config_data: dict, admin=Depends(require_admin)):
    await db["interfaces"].delete_many({})
    await db["firewall_rules"].delete_many({})
    await db["routes"].delete_many({})

    if "interfaces" in config_data:
        await db["interfaces"].insert_many(config_data["interfaces"])
    if "firewall_rules" in config_data:
        await db["firewall_rules"].insert_many(config_data["firewall_rules"])
    if "routes" in config_data:
        await db["routes"].insert_many(config_data["routes"])

    return {"message": "Config imported successfully (OS sync not implemented)."}
