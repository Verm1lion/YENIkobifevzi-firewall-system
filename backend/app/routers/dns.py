# File: app/routers/dns.py
import asyncio
import platform
import subprocess
import requests
from datetime import datetime
from typing import Optional, Set

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

from app.dependencies import require_admin
from app.database import db
from app.dns_proxy_manager import dns_proxy_manager

dns_router = APIRouter(prefix="/dns", tags=["dns"])

class DomainBlock(BaseModel):
    domain: str
    note: Optional[str] = None
    use_wildcard: bool = True

class AdblockList(BaseModel):
    url: str

class DNSProxyConfig(BaseModel):
    enabled: bool
    lan_interface: str
    port: int = 53

@dns_router.get("/domains")
async def list_blocked_domains(admin=Depends(require_admin)):
    cursor = db["blocked_domains"].find({})
    result = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        result.append(doc)
    return result

@dns_router.post("/domains")
async def add_blocked_domain(domain_in: DomainBlock, admin=Depends(require_admin)):
    domain_lower = domain_in.domain.strip().lower()
    
    # Domain formatını kontrol et
    if not domain_lower or '/' in domain_lower or ':' in domain_lower:
        raise HTTPException(400, detail="Geçersiz domain formatı. Örnek: youtube.com")
    
    # www. prefix'ini kaldır
    if domain_lower.startswith('www.'):
        domain_lower = domain_lower[4:]
    
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
    
    # DNS proxy'yi güncelle
    await update_dns_proxy()
    
    return {"message": f"Domain engellendi: {domain_lower}"}

@dns_router.delete("/domains/{domain}")
async def remove_blocked_domain(domain: str, admin=Depends(require_admin)):
    domain_lower = domain.strip().lower()
    result = await db["blocked_domains"].delete_one({"domain": domain_lower})
    if result.deleted_count == 0:
        raise HTTPException(404, detail="Bu domain kayıtlı değil.")
    
    # DNS proxy'yi güncelle
    await update_dns_proxy()
    
    return {"message": f"Domain silindi: {domain_lower}"}

@dns_router.post("/adblocklist")
async def import_adblock_list(data: AdblockList, admin=Depends(require_admin)):
    """Adblock listesinden toplu domain ekleme"""
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
            
            # Farklı format desteği
            domain = None
            if line.startswith("0.0.0.0 "):
                domain = line.replace("0.0.0.0 ", "").strip()
            elif line.startswith("127.0.0.1 "):
                domain = line.replace("127.0.0.1 ", "").strip()
            elif "||" in line and "^" in line:  # Adblock format
                domain = line.replace("||", "").replace("^", "").strip()
            else:
                parts = line.split()
                if len(parts) > 0:
                    domain = parts[-1]
            
            # Domain temizleme
            if domain:
                domain = domain.strip()
                if domain.startswith('www.'):
                    domain = domain[4:]
                    
            if domain and '.' in domain and not domain.startswith('.'):
                existing = await db["blocked_domains"].find_one({"domain": domain})
                if not existing:
                    doc = {
                        "domain": domain,
                        "use_wildcard": True,
                        "note": "Adblock imported",
                        "created_at": datetime.utcnow()
                    }
                    await db["blocked_domains"].insert_one(doc)
                    count_added += 1

        # DNS proxy'yi güncelle
        await update_dns_proxy()
        
        return {"message": f"Adblock listesi indirildi. {count_added} domain eklendi."}
    except Exception as e:
        raise HTTPException(500, detail=f"Liste indirme hatası: {str(e)}")

@dns_router.post("/proxy/start")
async def start_dns_proxy(config: DNSProxyConfig, admin=Depends(require_admin)):
    """DNS Proxy'yi başlat"""
    try:
        # Config'i kaydet
        await db["dns_proxy_config"].update_one(
            {"_id": "main"},
            {"$set": {
                "enabled": config.enabled,
                "lan_interface": config.lan_interface,
                "port": config.port,
                "updated_at": datetime.utcnow()
            }},
            upsert=True
        )
        
        if not config.enabled:
            # Proxy'yi durdur
            dns_proxy_manager.stop_proxy()
            # DNS ayarlarını eski haline getir
            dns_proxy_manager.restore_windows_dns(config.lan_interface)
            return {"message": "DNS Proxy durduruldu ve DNS ayarları eski haline getirildi"}
        
        # Engellenen domainleri al
        domains = await get_blocked_domains()
        
        # Proxy'yi başlat
        await dns_proxy_manager.start_proxy(domains, config.port)
        
        # LAN interface'inde DNS'i ayarla
        success = dns_proxy_manager.configure_windows_dns(config.lan_interface)
        if not success:
            dns_proxy_manager.stop_proxy()
            raise HTTPException(500, detail="DNS ayarları yapılandırılamadı")
        
        return {"message": f"DNS Proxy port {config.port}'de başlatıldı ve {config.lan_interface} için DNS ayarlandı"}
        
    except Exception as e:
        raise HTTPException(500, detail=f"DNS Proxy başlatma hatası: {str(e)}")

@dns_router.get("/proxy/status")
async def get_proxy_status(admin=Depends(require_admin)):
    """DNS Proxy durumunu kontrol et"""
    try:
        # Config'i al
        config = await db["dns_proxy_config"].find_one({"_id": "main"})
        
        # Engelli domain sayısı
        blocked_count = await db["blocked_domains"].count_documents({})
        
        # NAT durumu
        nat_doc = await db["nat_config"].find_one({"_id": "main"})
        nat_enabled = nat_doc.get("enabled", False) if nat_doc else False
        
        return {
            "proxy_running": dns_proxy_manager.is_running(),
            "proxy_enabled": config.get("enabled", False) if config else False,
            "lan_interface": config.get("lan_interface", "") if config else "",
            "proxy_port": config.get("port", 53) if config else 53,
            "blocked_domains_count": blocked_count,
            "nat_enabled": nat_enabled,
            "local_ip": dns_proxy_manager.get_local_ip()
        }
    except Exception as e:
        raise HTTPException(500, detail=str(e))

@dns_router.post("/apply-changes")
async def apply_dns_changes(admin=Depends(require_admin)):
    """DNS değişikliklerini uygula"""
    try:
        await update_dns_proxy()
        
        # DNS önbelleğini temizle
        if platform.system().lower() == "windows":
            subprocess.run(["ipconfig", "/flushdns"], capture_output=True, text=True)
        
        return {"message": "DNS değişiklikleri uygulandı ve DNS önbelleği temizlendi."}
    except Exception as e:
        raise HTTPException(500, detail=f"Uygulama hatası: {str(e)}")

async def get_blocked_domains() -> Set[str]:
    """MongoDB'den engelli domainleri çek"""
    domains = set()
    cursor = db["blocked_domains"].find({})
    async for doc in cursor:
        domains.add(doc["domain"])
    return domains

async def update_dns_proxy():
    """DNS proxy'deki domain listesini güncelle"""
    if dns_proxy_manager.is_running():
        domains = await get_blocked_domains()
        dns_proxy_manager.update_blocked_domains(domains)
    
# Uygulama başladığında DNS proxy'yi kontrol et
@dns_router.on_event("startup")
async def check_dns_proxy():
    """Uygulama başladığında proxy durumunu kontrol et"""
    config = await db["dns_proxy_config"].find_one({"_id": "main"})
    if config and config.get("enabled"):
        try:
            domains = await get_blocked_domains()
            port = config.get("port", 53)
            await dns_proxy_manager.start_proxy(domains, port)
            print(f"DNS Proxy auto-started on port {port}")
        except Exception as e:
            print(f"Failed to auto-start DNS proxy: {e}")