# File: app/routers/network.py
import subprocess
import platform
import ctypes
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional

from app.dependencies import require_admin
from app.database import db

network_router = APIRouter(prefix="/network", tags=["network"])

# ----------------------------- MODELS --------------------------------- #
class InterfaceConfig(BaseModel):
    interface_name: str
    ip_mode: str = "static"          # "static" | "dhcp"
    ip_address: Optional[str] = None
    subnet_mask: Optional[str] = None
    gateway: Optional[str] = None
    dns_primary: Optional[str] = None
    dns_secondary: Optional[str] = None
    admin_enabled: bool = True
    mtu: Optional[int] = None
    vlan_id: Optional[int] = None
# ---------------------------------------------------------------------- #

# ----------------------------- HELPERS -------------------------------- #
def is_windows_admin() -> bool:
    if platform.system().lower() != "windows":
        return True            # Linux’ta sudo ile çalıştırıldığı varsay.
    try:
        return ctypes.windll.shell32.IsUserAnAdmin() != 0
    except Exception:          # noqa: S110
        return False

def run(cmd: list[str]) -> subprocess.CompletedProcess:         # küçük yardımcı
    return subprocess.run(cmd, capture_output=True, text=True)

def get_interface_admin_state(name: str) -> str:
    """
    netsh ile arayüzün Enabled/Disabled bilgisini getirir.
    "" dönerse bilinmiyor.
    """
    res = run(["netsh", "interface", "show", "interface", f"name={name}"])
    if res.returncode != 0:
        return ""
    for line in res.stdout.splitlines():
        parts = line.split(None, 3)
        # Expected format: Admin  State  Type  Interface Name
        if len(parts) == 4 and parts[3].strip() == name:
            return parts[0].strip()       # Enabled | Disabled
    return ""

def parse_netsh_error(stderr_text: str) -> str:
    msg_lower = (stderr_text or "").lower()
    if "access is denied" in msg_lower:
        return "Yönetici izni gerekli (Run as Administrator)."
    if "not found" in msg_lower or "no matching interface" in msg_lower:
        return "Arayüz ismi bulunamadı ('netsh interface show interface' ile kontrol edin)."
    if "media disconnected" in msg_lower:
        return "Arayüz bağlantısız (kablo/Wi-Fi kapalı?)."
    if "object is already in use" in msg_lower or "duplicate" in msg_lower:
        return "IP adresi başka bir cihazda kullanımda (IP çakışması)."
    if "dhcp" in msg_lower and "fail" in msg_lower:
        return "DHCP sunucusuna ulaşılamadı veya zaman aşımı."
    if msg_lower.strip() == "":
        # netsh bazen stderr’i boş, exit code’u 1 döndürür
        return "Netsh komutu başarısız; ayrıntı yok – büyük olasılıkla Yönetici izni gerekir."
    return stderr_text.strip()
# ---------------------------------------------------------------------- #

# ============================= ENDPOINTS ============================== #
@network_router.get("/interfaces")
async def list_interfaces(admin=Depends(require_admin)):
    docs = await db["interfaces"].find({}).to_list(None)
    for d in docs:
        d["_id"] = str(d["_id"])

    if platform.system().lower().startswith("win"):
        res = run(["netsh", "interface", "show", "interface"])
        lines = res.stdout.splitlines()
        for doc in docs:
            doc["link_state"] = "unknown"
            doc["admin_state"] = "unknown"
            for line in lines:
                parts = line.split(None, 3)
                if len(parts) == 4 and parts[3] == doc["interface_name"]:
                    doc["admin_state"] = parts[0]
                    doc["link_state"] = parts[1]
                    break
    else:
        for d in docs:
            d["link_state"] = "unknown"
            d["admin_state"] = "unknown"

    return docs


@network_router.post("/interfaces")
async def create_interface(config: InterfaceConfig, admin=Depends(require_admin)):
    if platform.system().lower() != "windows":
        raise HTTPException(400, "Bu endpoint yalnızca Windows altında kullanılabilir.")

    if not is_windows_admin():
        raise HTTPException(
            400,
            "Bu işlemi yapmak için uygulamayı **Yönetici (Run as Administrator)** olarak çalıştırın."
        )

    try:
        # -------- 1) admin up/down (yalnızca gerekliyse) -------- #
        current_state = get_interface_admin_state(config.interface_name)
        desired_state = "Enabled" if config.admin_enabled else "Disabled"
        if current_state and current_state.lower() == desired_state.lower():
            pass  # zaten istenen durumda, netsh çağırmaya gerek yok
        else:
            adm_cmd = [
                "netsh", "interface", "set", "interface",
                f"name={config.interface_name}",
                f"admin={'enabled' if config.admin_enabled else 'disabled'}"
            ]
            res_adm = run(adm_cmd)
            if res_adm.returncode != 0:
                raise HTTPException(400, f"Admin up/down hatası: {parse_netsh_error(res_adm.stderr)}")

        # -------- 2) IP MODE -------- #
        if config.ip_mode.lower() == "dhcp":
            res_ip = run([
                "netsh", "interface", "ip", "set", "address",
                f"name={config.interface_name}", "source=dhcp"
            ])
            if res_ip.returncode != 0:
                raise HTTPException(400, f"DHCP hatası: {parse_netsh_error(res_ip.stderr)}")

            res_dns = run([
                "netsh", "interface", "ip", "set", "dns",
                f"name={config.interface_name}", "source=dhcp"
            ])
            if res_dns.returncode != 0:
                raise HTTPException(400, f"DHCP-DNS hatası: {parse_netsh_error(res_dns.stderr)}")

        else:  # STATIC
            if not config.ip_address or not config.subnet_mask:
                raise HTTPException(400, "Statik modda IP ve Subnet zorunludur.")

            res_static = run([
                "netsh", "interface", "ip", "set", "address",
                f"name={config.interface_name}", "static",
                config.ip_address, config.subnet_mask,
                config.gateway if config.gateway else "none"
            ])
            if res_static.returncode != 0:
                raise HTTPException(400, f"IP ayarı hatası: {parse_netsh_error(res_static.stderr)}")

            # DNS birincil / ikincil
            if config.dns_primary:
                res_dns1 = run([
                    "netsh", "interface", "ip", "set", "dns",
                    f"name={config.interface_name}", "static", config.dns_primary
                ])
                if res_dns1.returncode != 0:
                    raise HTTPException(400, f"DNS-1 hatası: {parse_netsh_error(res_dns1.stderr)}")

            if config.dns_secondary:
                res_dns2 = run([
                    "netsh", "interface", "ip", "add", "dns",
                    f"name={config.interface_name}", config.dns_secondary, "index=2"
                ])
                if res_dns2.returncode != 0:
                    raise HTTPException(400, f"DNS-2 hatası: {parse_netsh_error(res_dns2.stderr)}")

        # -------- 3) MTU -------- #
        if config.mtu:
            res_mtu = run([
                "netsh", "interface", "ipv4", "set", "subinterface",
                config.interface_name, f"mtu={config.mtu}", "store=persistent"
            ])
            if res_mtu.returncode != 0:
                raise HTTPException(400, f"MTU hatası: {parse_netsh_error(res_mtu.stderr)}")

        # -------- 4) DB kayıt / response -------- #
        doc = {
            "interface_name": config.interface_name,
            "ip_mode": config.ip_mode.lower(),
            "ip_address": config.ip_address,
            "subnet_mask": config.subnet_mask,
            "gateway": config.gateway,
            "dns_primary": config.dns_primary,
            "dns_secondary": config.dns_secondary,
            "admin_enabled": config.admin_enabled,
            "mtu": config.mtu,
            "vlan_id": config.vlan_id,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        await db["interfaces"].update_one(
            {"interface_name": config.interface_name},
            {"$set": doc},
            upsert=True
        )
        return {"message": "Interface kaydedildi", "data": doc}

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(500, str(exc)) from exc


@network_router.put("/interfaces/{iface_name}")
async def update_interface(iface_name: str, config: InterfaceConfig, admin=Depends(require_admin)):
    # PUT endpoint mantığı POST ile neredeyse aynı; tekrar yazmamak için
    # küçük farklarla aynı fonksiyonu kullanmak da mümkündü.
    return await create_interface(config, admin)   # noqa: WPS331


@network_router.delete("/interfaces/{iface_name}")
async def delete_interface(iface_name: str, admin=Depends(require_admin)):
    doc = await db["interfaces"].find_one({"interface_name": iface_name})
    if not doc:
        raise HTTPException(404, "Arayüz kaydı bulunamadı")

    await db["interfaces"].delete_one({"interface_name": iface_name})
    return {"message": f"{iface_name} arayüzü DB kaydından silindi."}
