from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from typing import List, Dict, Optional
import logging
from datetime import datetime
from bson import ObjectId

from ..schemas import (
    NetworkInterfaceCreate, NetworkInterfaceUpdate, NetworkInterfaceResponse,
    PhysicalInterfacesResponse, InterfaceToggleRequest, ICSSetupRequest,
    InterfaceStatsResponse, ResponseModel, NetworkInterfaceListResponse
)
from ..database import get_database
from ..dependencies import get_current_user, require_admin
from ..services.network_service import network_service

router = APIRouter(prefix="/api/v1/network", tags=["Network"])
logger = logging.getLogger(__name__)


@router.get("/interfaces/physical", response_model=PhysicalInterfacesResponse)
async def get_physical_interfaces():
    """Fiziksel network interface'lerini listele"""
    try:
        interfaces = await network_service.get_physical_interfaces()
        return PhysicalInterfacesResponse(
            success=True,
            data=interfaces,
            message="Physical interfaces retrieved successfully"
        )
    except Exception as e:
        logger.error(f"Failed to get physical interfaces: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve physical interfaces")


@router.get("/interfaces")
async def get_interfaces(db=Depends(get_database), current_user=Depends(get_current_user)):
    """Yapılandırılmış interface'leri listele"""
    try:
        collection = db.network_interfaces
        interfaces = list(collection.find({}))

        # Her interface için ObjectId'yi string'e çevir
        for interface in interfaces:
            interface['id'] = str(interface['_id'])
            del interface['_id']

            # Gerçek zamanlı durum bilgilerini al
            physical_device = interface.get('physical_device', interface.get('interface_name'))
            if physical_device:
                stats = await network_service.get_interface_statistics(physical_device)
                interface.update(stats)

        return {
            "success": True,
            "data": interfaces,
            "message": "Interfaces retrieved successfully"
        }
    except Exception as e:
        logger.error(f"Failed to get interfaces: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve interfaces")


@router.post("/interfaces")
async def create_interface(
        interface_data: NetworkInterfaceCreate,
        background_tasks: BackgroundTasks,
        db=Depends(get_database),
        current_user=Depends(require_admin)
):
    """Yeni interface yapılandırması oluştur"""
    try:
        # Fiziksel interface kontrolü
        physical_interfaces = await network_service.get_physical_interfaces()

        # Physical device'ı belirle
        physical_device = None
        for p_iface in physical_interfaces:
            if (p_iface['name'] == interface_data.interface_name or
                    p_iface['display_name'] == interface_data.interface_name):
                physical_device = p_iface['name']
                break

        if not physical_device:
            # Fallback - interface name'i physical device olarak kullan
            physical_device = interface_data.interface_name

        # Interface document oluştur
        interface_doc = {
            "interface_name": interface_data.interface_name,
            "display_name": interface_data.display_name or interface_data.interface_name,
            "physical_device": physical_device,
            "interface_type": interface_data.interface_type,
            "ip_mode": interface_data.ip_mode,
            "ip_address": interface_data.ip_address,
            "subnet_mask": interface_data.subnet_mask,
            "gateway": interface_data.gateway,
            "dns_primary": interface_data.dns_primary,
            "dns_secondary": interface_data.dns_secondary,
            "admin_enabled": interface_data.admin_enabled,
            "mtu": interface_data.mtu or 1500,
            "vlan_id": interface_data.vlan_id,
            "metric": interface_data.metric,
            "description": interface_data.description,
            # ICS Settings
            "ics_enabled": interface_data.ics_enabled,
            "ics_source_interface": interface_data.ics_source_interface,
            "ics_dhcp_range_start": interface_data.ics_dhcp_range_start,
            "ics_dhcp_range_end": interface_data.ics_dhcp_range_end,
            # Status
            "operational_status": "down",
            "link_state": None,
            "admin_state": None,
            "mac_address": None,
            "speed": None,
            "duplex": None,
            # Statistics
            "bytes_received": 0,
            "bytes_transmitted": 0,
            "packets_received": 0,
            "packets_transmitted": 0,
            "errors": 0,
            "drops": 0,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }

        # Database'e kaydet
        collection = db.network_interfaces
        result = collection.insert_one(interface_doc)
        interface_doc['id'] = str(result.inserted_id)
        del interface_doc['_id']

        # Background task olarak network yapılandırmasını uygula
        background_tasks.add_task(apply_interface_configuration, interface_doc)

        return {
            "success": True,
            "data": interface_doc,
            "message": "Interface configuration created successfully"
        }

    except Exception as e:
        logger.error(f"Failed to create interface: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/interfaces/{interface_id}")
async def update_interface(
        interface_id: str,
        interface_data: NetworkInterfaceUpdate,
        background_tasks: BackgroundTasks,
        db=Depends(get_database),
        current_user=Depends(require_admin)
):
    """Interface yapılandırmasını güncelle"""
    try:
        collection = db.network_interfaces

        # Mevcut interface'i bul
        existing = collection.find_one({"_id": ObjectId(interface_id)})
        if not existing:
            raise HTTPException(status_code=404, detail="Interface not found")

        # Güncelleme verilerini hazırla
        update_data = {k: v for k, v in interface_data.dict().items() if v is not None}
        update_data['updated_at'] = datetime.utcnow()

        # Database'de güncelle
        collection.update_one(
            {"_id": ObjectId(interface_id)},
            {"$set": update_data}
        )

        # Güncellenmiş kaydı al
        updated_interface = collection.find_one({"_id": ObjectId(interface_id)})
        updated_interface['id'] = str(updated_interface['_id'])
        del updated_interface['_id']

        # Background task olarak yeni yapılandırmayı uygula
        background_tasks.add_task(apply_interface_configuration, updated_interface)

        return {
            "success": True,
            "data": updated_interface,
            "message": "Interface configuration updated successfully"
        }

    except Exception as e:
        logger.error(f"Failed to update interface: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/interfaces/{interface_id}")
async def delete_interface(
        interface_id: str,
        db=Depends(get_database),
        current_user=Depends(require_admin)
):
    """Interface yapılandırmasını sil"""
    try:
        collection = db.network_interfaces

        # Interface'i bul
        interface = collection.find_one({"_id": ObjectId(interface_id)})
        if not interface:
            raise HTTPException(status_code=404, detail="Interface not found")

        # Interface'i disable et
        physical_device = interface.get('physical_device', interface.get('interface_name'))
        if physical_device:
            await network_service.disable_interface(physical_device)

        # Database'den sil
        collection.delete_one({"_id": ObjectId(interface_id)})

        return {
            "success": True,
            "message": "Interface configuration deleted successfully"
        }

    except Exception as e:
        logger.error(f"Failed to delete interface: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/interfaces/{interface_id}/toggle")
async def toggle_interface(
        interface_id: str,
        toggle_data: InterfaceToggleRequest,
        background_tasks: BackgroundTasks,
        db=Depends(get_database),
        current_user=Depends(require_admin)
):
    """Interface'i aktif/deaktif et"""
    try:
        collection = db.network_interfaces

        # Interface'i bul
        interface = collection.find_one({"_id": ObjectId(interface_id)})
        if not interface:
            raise HTTPException(status_code=404, detail="Interface not found")

        # Database'de güncelle
        collection.update_one(
            {"_id": ObjectId(interface_id)},
            {"$set": {
                "admin_enabled": toggle_data.enabled,
                "updated_at": datetime.utcnow()
            }}
        )

        # Background task olarak interface durumunu değiştir
        physical_device = interface.get('physical_device', interface.get('interface_name'))
        background_tasks.add_task(toggle_interface_status, physical_device, toggle_data.enabled)

        return {
            "success": True,
            "message": f"Interface {'enabled' if toggle_data.enabled else 'disabled'} successfully"
        }

    except Exception as e:
        logger.error(f"Failed to toggle interface: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/interfaces/{interface_id}/stats")
async def get_interface_stats(
        interface_id: str,
        db=Depends(get_database),
        current_user=Depends(get_current_user)
):
    """Interface istatistiklerini al"""
    try:
        collection = db.network_interfaces
        interface = collection.find_one({"_id": ObjectId(interface_id)})

        if not interface:
            raise HTTPException(status_code=404, detail="Interface not found")

        # Gerçek zamanlı istatistikleri al
        physical_device = interface.get('physical_device', interface.get('interface_name'))
        stats = await network_service.get_interface_statistics(physical_device)

        return {
            "success": True,
            "data": stats,
            "message": "Interface statistics retrieved successfully"
        }

    except Exception as e:
        logger.error(f"Failed to get interface stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/interfaces/ics/setup")
async def setup_internet_sharing(
        ics_data: ICSSetupRequest,
        current_user=Depends(require_admin)
):
    """Internet Connection Sharing kurulumu"""
    try:
        success = await network_service.setup_internet_sharing(
            ics_data.source_interface,
            ics_data.target_interface,
            ics_data.dhcp_range_start,
            ics_data.dhcp_range_end
        )

        if success:
            return {
                "success": True,
                "message": "Internet sharing configured successfully"
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to setup internet sharing")

    except Exception as e:
        logger.error(f"Failed to setup ICS: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Background Tasks
async def apply_interface_configuration(interface_config: dict):
    """Interface yapılandırmasını sisteme uygula"""
    try:
        physical_device = interface_config.get('physical_device', interface_config.get('interface_name'))

        if not interface_config.get('admin_enabled', True):
            await network_service.disable_interface(physical_device)
            return

        # IP yapılandırması
        if interface_config['ip_mode'] == 'static':
            config = {
                'ip_address': interface_config.get('ip_address'),
                'subnet_mask': interface_config.get('subnet_mask'),
                'gateway': interface_config.get('gateway'),
                'dns_primary': interface_config.get('dns_primary'),
                'dns_secondary': interface_config.get('dns_secondary'),
                'mtu_size': interface_config.get('mtu', 1500)
            }
            await network_service.configure_static_ip(physical_device, config)

        elif interface_config['ip_mode'] == 'dhcp':
            await network_service.configure_dhcp(physical_device)

        # ICS yapılandırması
        if (interface_config.get('ics_enabled') and
                interface_config.get('ics_source_interface')):
            await network_service.setup_internet_sharing(
                interface_config['ics_source_interface'],
                physical_device,
                interface_config.get('ics_dhcp_range_start', '192.168.100.100'),
                interface_config.get('ics_dhcp_range_end', '192.168.100.200')
            )

        logger.info(f"Interface configuration applied: {physical_device}")

    except Exception as e:
        logger.error(f"Failed to apply interface configuration: {e}")


async def toggle_interface_status(physical_device: str, enabled: bool):
    """Interface durumunu değiştir"""
    try:
        if enabled:
            await network_service.enable_interface(physical_device)
        else:
            await network_service.disable_interface(physical_device)

        logger.info(f"Interface {physical_device} {'enabled' if enabled else 'disabled'}")

    except Exception as e:
        logger.error(f"Failed to toggle interface status: {e}")