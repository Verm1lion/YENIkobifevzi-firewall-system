# File: app/routers/routes.py
# Path: app/routers/routes.py

import subprocess
import platform
import re
import asyncio
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional

from ..dependencies import require_admin
from ..database import db

route_router = APIRouter(prefix="/routes", tags=["routes"])

# =========== MODEL / SCHEMA ===========
class RouteConfig(BaseModel):
    destination: str
    mask: str
    gateway: str
    metric: int = Field(1, ge=1, le=9999)
    enabled: bool = True
    interface_name: Optional[str] = None  # Windows "Ethernet", Linux "eth0" vb.
    mode: str = "static"  # "dhcp" veya "static"
    failover: bool = False  # opsiyonel

# Basit IP kontrolü (regex)
ip_pattern = re.compile(r"^((25[0-5]|2[0-4]\d|[01]?\d?\d)\.){3}(25[0-5]|2[0-4]\d|[01]?\d?\d)$")

def is_valid_ip(ip: str) -> bool:
    return bool(ip_pattern.match(ip))

def validate_route_fields(route: RouteConfig):
    if not is_valid_ip(route.destination):
        raise HTTPException(400, detail="Hedef IP formatı geçersiz.")
    if not is_valid_ip(route.mask):
        raise HTTPException(400, detail="Subnet Mask formatı geçersiz.")
    if not is_valid_ip(route.gateway):
        raise HTTPException(400, detail="Gateway IP formatı geçersiz.")

def parse_netsh_error(stderr_text: str) -> str:
    text_lower = stderr_text.lower()
    if "already in use" in text_lower or "duplicate" in text_lower:
        return "IP çakışması veya rota çakışması tespit edildi."
    if "dhcp" in text_lower and "fail" in text_lower:
        return "DHCP sunucusuna ulaşılamadı (DHCP config hatası)."
    return stderr_text.strip()

async def failover_watchdog_task():
    """
    Asenkron failover senaryosu (opsiyonel).
    failover=true, enabled=true olan rotalara gateway ping atar,
    yanıt yoksa remove_route ile siler.
    """
    while True:
        cursor = db["routes"].find({"failover": True, "enabled": True})
        async for rt in cursor:
            gw_ip = rt.get("gateway")
            if not gw_ip:
                continue
            # Ping
            if platform.system().lower().startswith("win"):
                cmd_ping = ["ping", "-n", "1", "-w", "200", gw_ip]
            else:
                cmd_ping = ["ping", "-c", "1", "-W", "1", gw_ip]

            result = subprocess.run(cmd_ping, capture_output=True, text=True)
            if result.returncode != 0:
                try:
                    remove_route(rt)
                    print(f"[Failover] Gateway yanıt vermiyor, rota silindi: {rt['_id']}")
                except Exception as exc:
                    print(f"[Failover] remove_route hatası: {exc}")

        await asyncio.sleep(10)  # 10 saniyede bir kontrol

@route_router.on_event("startup")
async def start_failover_watchdog():
    asyncio.create_task(failover_watchdog_task())

@route_router.get("/")
async def list_routes(admin=Depends(require_admin)):
    routes_list = []
    cursor = db["routes"].find({})
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        routes_list.append(doc)
    return routes_list

@route_router.post("/")
async def create_route(route_in: RouteConfig, admin=Depends(require_admin)):
    validate_route_fields(route_in)
    add_route_os(route_in)

    doc = route_in.dict()
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    result = await db["routes"].insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    return {"message": "Rota eklendi", "data": doc}

@route_router.delete("/{route_id}")
async def delete_route(route_id: str, admin=Depends(require_admin)):
    old_doc = await db["routes"].find_one({"_id": route_id})
    if not old_doc:
        raise HTTPException(404, "Rota bulunamadı")

    remove_route(old_doc)
    await db["routes"].delete_one({"_id": route_id})
    return {"message": "Rota silindi"}

@route_router.put("/{route_id}")
async def update_route(route_id: str, route_in: RouteConfig, admin=Depends(require_admin)):
    old_doc = await db["routes"].find_one({"_id": route_id})
    if not old_doc:
        raise HTTPException(404, "Rota bulunamadı")

    # Eskiyi sil
    remove_route(old_doc)
    # Yeni ekle
    validate_route_fields(route_in)
    add_route_os(route_in)

    updated_doc = route_in.dict()
    updated_doc["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db["routes"].update_one({"_id": route_id}, {"$set": updated_doc})
    return {"message": "Rota güncellendi", "data": updated_doc}

def mask_to_cidr(mask_str: str) -> int:
    return sum(bin(int(octet)).count("1") for octet in mask_str.split("."))

def remove_route(rt_doc):
    if not rt_doc.get("destination") or not rt_doc.get("mask"):
        return
    sysname = platform.system().lower()
    if sysname.startswith("win"):
        cmd = [
            "netsh","interface","ipv4","delete","route",
            rt_doc["destination"], rt_doc["mask"]
        ]
        if rt_doc.get("interface_name"):
            cmd.append(rt_doc["interface_name"])
        subprocess.run(cmd, capture_output=True, text=True)
    else:
        cidr = mask_to_cidr(rt_doc["mask"])
        ip_cmd = [
            "ip","route","del",
            f"{rt_doc['destination']}/{cidr}",
            "via", rt_doc["gateway"]
        ]
        if rt_doc.get("interface_name"):
            ip_cmd.extend(["dev", rt_doc["interface_name"]])
        subprocess.run(ip_cmd, capture_output=True, text=True)

def add_route_os(route_in: RouteConfig):
    if route_in.mode.lower() == "dhcp":
        # Gelecekte DHCP route vs.
        raise HTTPException(501, "DHCP route henüz implemente edilmedi.")

    sysname = platform.system().lower()
    if sysname.startswith("win"):
        netsh_cmd = [
            "netsh","interface","ipv4","add","route",
            route_in.destination, route_in.mask
        ]
        if route_in.interface_name:
            netsh_cmd.append(route_in.interface_name)
        netsh_cmd.extend([
            route_in.gateway,
            f"metric={route_in.metric}",
            "store=persistent"
        ])
        res = subprocess.run(netsh_cmd, capture_output=True, text=True)
        if res.returncode != 0:
            raise HTTPException(
                400,
                detail=f"Windows route ekleme hatası: {parse_netsh_error(res.stderr)}"
            )
    else:
        cidr = mask_to_cidr(route_in.mask)
        ip_cmd = [
            "ip","route","add",
            f"{route_in.destination}/{cidr}",
            "via", route_in.gateway,
            "metric", str(route_in.metric)
        ]
        if route_in.interface_name:
            ip_cmd.extend(["dev", route_in.interface_name])
        res = subprocess.run(ip_cmd, capture_output=True, text=True)
        if res.returncode != 0:
            raise HTTPException(
                400,
                detail=f"Linux route ekleme hatası: {res.stderr.strip()}"
            )
