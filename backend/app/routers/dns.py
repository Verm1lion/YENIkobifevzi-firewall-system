# File: app/routers/dns.py
import os
import platform
import subprocess
import requests
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

from app.dependencies import require_admin
from app.database import db

dns_router = APIRouter(prefix="/dns", tags=["dns"])


class DomainBlock(BaseModel):
    domain: str
    note: Optional[str] = None
    use_wildcard: bool = True

class AdblockList(BaseModel):
    url: str


def get_conf_path() -> str:
    if platform.system().lower().startswith("win"):
        return r"C:\temp\blocked-domains.conf"
    else:
        return "/tmp/blocked-domains.conf"


def ensure_config_dir():
    conf_path = get_conf_path()
    dir_path = os.path.dirname(conf_path)
    if dir_path and not os.path.exists(dir_path):
        os.makedirs(dir_path, exist_ok=True)


def reload_dns_service():
    sysname = platform.system().lower()
    if sysname.startswith("linux"):
        subprocess.run(["sudo", "systemctl", "reload", "dnsmasq"], capture_output=True, text=True)
    elif sysname.startswith("win"):
        subprocess.run(["ipconfig", "/flushdns"], capture_output=True, text=True)
    else:
        pass


@dns_router.get("/domains")
async def list_blocked_domains(admin=Depends(require_admin)):
    cursor = db["blocked_domains"].find({})
    result = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])  # convert ObjectId to string
        result.append(doc)
    return result


@dns_router.post("/domains")
async def add_blocked_domain(domain_in: DomainBlock, admin=Depends(require_admin)):
    domain_lower = domain_in.domain.strip().lower()
    existing = await db["blocked_domains"].find_one({"domain": domain_lower})
    if existing:
        raise HTTPException(400, detail="Bu domain zaten engelli.")

    doc = {
        "domain": domain_lower,
        "note": domain_in.note or "",
        "use_wildcard": domain_in.use_wildcard,
        "created_at": datetime.utcnow()
    }
    await db["blocked_domains"].insert_one(doc)
    await rewrite_dns_config()
    return {"message": f"Domain engellendi: {domain_lower}"}


@dns_router.delete("/domains/{domain}")
async def remove_blocked_domain(domain: str, admin=Depends(require_admin)):
    domain_lower = domain.strip().lower()
    result = await db["blocked_domains"].delete_one({"domain": domain_lower})
    if result.deleted_count == 0:
        raise HTTPException(404, detail="Bu domain kayıtlı değil.")
    await rewrite_dns_config()
    return {"message": f"Domain silindi: {domain_lower}"}


@dns_router.post("/adblocklist")
async def import_adblock_list(data: AdblockList, admin=Depends(require_admin)):
    """
    Basit bir Adblock liste import örneği.
    """
    try:
        resp = requests.get(data.url, timeout=10)
        if resp.status_code != 200:
            raise HTTPException(400, detail=f"Liste indirilemedi: HTTP {resp.status_code}")
        lines = resp.text.splitlines()
        count_added = 0
        for line in lines:
            line = line.strip().lower()
            if not line or line.startswith("#"):
                continue
            parts = line.split()
            dom = parts[-1]
            # Bazı listelerde '0.0.0.0 example.com' formatı olabilir
            if dom.startswith("0.0.0.0") or dom.startswith("127."):
                if len(parts) > 1:
                    dom = parts[1]
            existing = await db["blocked_domains"].find_one({"domain": dom})
            if not existing:
                doc = {
                    "domain": dom,
                    "use_wildcard": False,
                    "note": "Adblock imported",
                    "created_at": datetime.utcnow()
                }
                await db["blocked_domains"].insert_one(doc)
                count_added += 1

        await rewrite_dns_config()
        return {"message": f"Adblock listesi indirildi. {count_added} domain eklendi."}
    except Exception as e:
        raise HTTPException(500, detail=f"Liste indirme hatası: {str(e)}")


@dns_router.post("/doh-block")
async def doh_block(admin=Depends(require_admin)):
    """
    DNS Over HTTPS engellemek için endpoint.
    Şimdilik basit bir mock: "Henüz implemente edilmedi" ya da
    basit firewall kural ekleme vb.
    """
    sysname = platform.system().lower()
    # Örnek: ufak bir mesaj döndürelim
    return {"message": "DNS over HTTPS Engelleme işlemi (örnek). Daha fazla IP ekleme vs. yapılabilir."}


async def rewrite_dns_config():
    ensure_config_dir()
    conf_path = get_conf_path()

    cursor = db["blocked_domains"].find({})
    lines = []
    async for item in cursor:
        d = item["domain"]
        use_wc = item.get("use_wildcard", True)
        lines.append(f"127.0.0.1 {d}\n")
        if use_wc:
            lines.append(f"127.0.0.1 www.{d}\n")
            lines.append(f"127.0.0.1 sub.{d}\n")

    try:
        with open(conf_path, "w", encoding="utf-8") as f:
            f.writelines(lines)
    except Exception as e:
        raise HTTPException(500, detail=f"Config dosyası yazılamadı: {str(e)}")

    reload_dns_service()
