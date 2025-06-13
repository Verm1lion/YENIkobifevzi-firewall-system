import subprocess
import platform
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from app.dependencies import require_admin
from app.database import db

nat_router = APIRouter(prefix="/nat", tags=["nat"])

class NatConfig(BaseModel):
    enabled: bool
    wan: Optional[str] = None  # WAN interface ismi (internet aldığı)
    lan: Optional[str] = None  # LAN interface ismi (ICS paylaştırılacak ağ)

@nat_router.get("")
async def get_nat_config(admin=Depends(require_admin)):
    """
    NAT (ICS) ayarlarını DB'den okur.
    Örnek dönüş:
    {
      "enabled": false,
      "wan": "",
      "lan": ""
    }
    """
    doc = await db["nat_config"].find_one({"_id": "main"})
    if not doc:
        return {"enabled": False, "wan": "", "lan": ""}
    return {
        "enabled": doc.get("enabled", False),
        "wan": doc.get("wan", ""),
        "lan": doc.get("lan", "")
    }

@nat_router.patch("")
async def update_nat_config(cfg: NatConfig, admin=Depends(require_admin)):
    """
    NAT ICS ayarlarını günceller (yalnızca Windows'ta).
    1) DB'ye kaydeder
    2) Mevcut tüm ICS paylaşımını disable eder
    3) enabled=True ise WAN->Internet, LAN->Home ICS aktif etmeye çalışır
    """
    # 1) Windows değilse hata
    if platform.system().lower() != "windows":
        raise HTTPException(
            status_code=400,
            detail="NAT ICS sadece Windows ortamında uygulanır."
        )

    # 2) WAN ve LAN farklı olmalı
    if cfg.enabled and cfg.wan == cfg.lan:
        raise HTTPException(
            status_code=400,
            detail="WAN ve LAN aynı arayüz olamaz. Lütfen farklı arayüzler seçin."
        )

    # 3) DB'ye kaydet
    await db["nat_config"].update_one(
        {"_id": "main"},
        {
            "$set": {
                "enabled": cfg.enabled,
                "wan": cfg.wan or "",
                "lan": cfg.lan or ""
            }
        },
        upsert=True
    )

    # 4) ICS devre dışı
    try:
        _disable_ics_powershell()  # Önce PowerShell ICS kapatma dene
    except ICSCmdletNotFound:
        # Eğer cmdlet yoksa netsh/servis fallback
        _disable_ics_netsh()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    # 5) ICS etkinleştirme (cfg.enabled=True ise)
    if cfg.enabled:
        try:
            _enable_ics(cfg.wan, cfg.lan)  # PowerShell ICS
        except ICSCmdletNotFound:
            # Tekrar fallback netsh ICS
            try:
                _enable_ics_netsh(cfg.wan, cfg.lan)
            except Exception as e2:
                raise HTTPException(status_code=500, detail=str(e2))
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    return {"message": "ICS NAT yapılandırması güncellendi."}

# ------------------------------------------------
# Yardımcı sınıf ve fonksiyonlar
# ------------------------------------------------

class ICSCmdletNotFound(Exception):
    """
    PowerShell ICS cmdlet'lerinin (Get-NetConnectionSharing / Enable-NetConnectionSharing)
    bulunmadığını belirten özel exception.
    """

def _disable_ics_powershell():
    """
    PowerShell ICS cmdlet'leriyle ICS paylaşımını kapatır.
    Eğer 'Get-NetConnectionSharing' / 'Disable-NetConnectionSharing' yoksa ICSCmdletNotFound fırlatır.
    """
    ps_script = r"""
    try {
      Get-NetConnectionSharing | ForEach-Object {
        Disable-NetConnectionSharing -ConnectionName $_.ConnectionName
      }
    }
    catch {
      throw $_
    }
    """
    cmd = ["powershell", "-Command", ps_script]
    res = subprocess.run(cmd, capture_output=True, text=True)
    # stderr'i None gelirse boş string verelim:
    stderr_text = res.stderr or ""

    if res.returncode != 0:
        if "CommandNotFoundException" in stderr_text:
            # Bu, ICS cmdletlerinin bulunmadığına işaret
            raise ICSCmdletNotFound("PowerShell ICS cmdlet'leri bulunamadı.")
        else:
            # Diğer hata
            raise RuntimeError(stderr_text.strip())

def _disable_ics_netsh():
    """
    Netsh ile ICS kapatma.
    Windows ICS servisi 'SharedAccess' adıyla bilinir.
    Aşağıdaki komutlar sırasıyla:
      - "sc config SharedAccess start= disabled"
      - "net stop SharedAccess"
    ile servisi durdurup devre dışı bırakmaya çalışır.
    """
    cmds = [
        ["sc", "config", "SharedAccess", "start=", "disabled"],
        ["net", "stop", "SharedAccess"]
    ]
    for c in cmds:
        proc = subprocess.run(c, capture_output=True, text=True)
        stderr_text = proc.stderr or ""
        # Hata çıkarsa, loglama yapmak isteyebilirsiniz.
        # Ama burada "already stopped" vb. durumlar normal sayılabilir.

def _enable_ics(wan_iface: str, lan_iface: str):
    """
    PowerShell ICS cmdlet'leriyle WAN->Internet, LAN->Home paylaşımı.
    1) WAN arayüzünü "Internet" modunda paylaşma
    2) LAN arayüzünü "Home" modunda paylaşma
    """
    # 1) WAN -> Internet
    ps_script_wan = f"""
    try {{
      Enable-NetConnectionSharing -ConnectionName '{wan_iface}' -SharingMode Internet
    }}
    catch {{
      throw $_
    }}
    """
    cmd_wan = ["powershell", "-Command", ps_script_wan]
    res_wan = subprocess.run(cmd_wan, capture_output=True, text=True)
    stderr_wan = res_wan.stderr or ""
    if res_wan.returncode != 0:
        if "CommandNotFoundException" in stderr_wan:
            # ICS cmdleti yok
            raise ICSCmdletNotFound("Enable-NetConnectionSharing bulunamadı.")
        else:
            raise RuntimeError(stderr_wan.strip())

    # 2) LAN -> Home
    ps_script_lan = f"""
    try {{
      Enable-NetConnectionSharing -ConnectionName '{lan_iface}' -SharingMode Home
    }}
    catch {{
      throw $_
    }}
    """
    cmd_lan = ["powershell", "-Command", ps_script_lan]
    res_lan = subprocess.run(cmd_lan, capture_output=True, text=True)
    stderr_lan = res_lan.stderr or ""
    if res_lan.returncode != 0:
        if "CommandNotFoundException" in stderr_lan:
            raise ICSCmdletNotFound("Enable-NetConnectionSharing yok.")
        else:
            raise RuntimeError(stderr_lan.strip())

def _enable_ics_netsh(wan_iface: str, lan_iface: str):
    """
    Netsh fallback (basit ICS):
      1) SharedAccess servisini 'auto' yap
      2) 'net start SharedAccess' ile servisi başlat
      3) netsh ICS parametreleri ile tam paylaştırma (bazı sürümlerde kısıtlı)
    """
    # 1) 'SharedAccess' servisini otomatik ve start
    cmds = [
        ["sc", "config", "SharedAccess", "start=", "auto"],
        ["net", "start", "SharedAccess"]
    ]
    for c in cmds:
        p = subprocess.run(c, capture_output=True, text=True)
        stderr_text = p.stderr or ""
        if p.returncode != 0:
            # "already running" vb. olabilir, normal sayabiliriz
            # ama gene de hata fırlatalım ki log görülsün
            if "already been started" in stderr_text.lower():
                # bu hata normal
                continue
            raise RuntimeError(f"Command '{' '.join(c)}' failed: {stderr_text.strip()}")

    # 2) ICS'yi netsh parametreleriyle tam ayarlamak zordur.
    # Burada opsiyonel ek ayarlar yazabilirsiniz.
    #
    # Örneğin:
    # netsh routing ip install
    # netsh routing ip nat install
    # netsh routing ip nat add interface "WAN" full
    # netsh routing ip nat add interface "LAN" private
    #
    # Fakat ICS devreye girdiğinde bu NAT ayarları conflict yaratabilir.
    # Deneysel olarak ekleyebilirsiniz.
    # Yine de ICS devredeyken 'routing ip nat' komutları her zaman çalışmayabiliyor.
