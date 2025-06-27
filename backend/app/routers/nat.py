"""
NAT (Network Address Translation) Router
PC-to-PC Internet Sharing ve NAT konfigürasyonu endpoint'leri
"""
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from typing import Dict, Any
import logging
from datetime import datetime

# Import dependencies
from ..dependencies import get_current_user, require_admin, get_database
from ..schemas import (
    NATConfigRequest, NATConfigResponse, NATStatusResponse,
    PCToPCSharingRequest, InterfaceListResponse, ValidationResponse,
    ResponseModel
)
from ..services.nat_service import nat_service

# Setup logging
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/api/v1/nat", tags=["NAT"])


@router.get("/", response_model=NATConfigResponse)
async def get_nat_config(current_user=Depends(get_current_user)):
    """
    Get current NAT configuration
    Returns current NAT settings from database
    """
    try:
        logger.info(f"NAT config requested by user: {current_user.get('username', 'unknown')}")

        config = await nat_service.get_nat_configuration()
        if config is None:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve NAT configuration"
            )

        return NATConfigResponse(
            success=True,
            data=config,
            message="NAT configuration retrieved successfully"
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get NAT config: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )


@router.put("/", response_model=NATConfigResponse)
async def update_nat_config(
        config: NATConfigRequest,
        background_tasks: BackgroundTasks,
        current_user=Depends(require_admin),
        db=Depends(get_database)
):
    """
    Update NAT configuration
    Saves configuration to database and applies to system if enabled
    """
    try:
        username = current_user.get('username', 'admin')
        user_id = str(current_user.get('_id', current_user.get('userId', 'unknown')))

        logger.info(
            f"NAT config update by {username}: WAN={config.wan_interface}, LAN={config.lan_interface}, Enabled={config.enabled}")

        # Validate interfaces if NAT is being enabled
        if config.enabled:
            validation = await nat_service.validate_interfaces(config.wan_interface, config.lan_interface)
            if not validation['valid']:
                return NATConfigResponse(
                    success=False,
                    data=None,
                    message="Interface validation failed",
                    errors=validation['errors'],
                    warnings=validation['warnings']
                )

        # Prepare configuration data
        config_data = {
            "enabled": config.enabled,
            "wan_interface": config.wan_interface,
            "lan_interface": config.lan_interface,
            "dhcp_range_start": config.dhcp_range_start,
            "dhcp_range_end": config.dhcp_range_end,
            "gateway_ip": config.gateway_ip,
            "masquerade_enabled": config.masquerade_enabled
        }

        # Save to database
        save_success = await nat_service.save_nat_configuration(config_data, user_id)
        if not save_success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to save NAT configuration"
            )

        # Apply configuration if enabled
        if config.enabled:
            # Run NAT setup in background
            background_tasks.add_task(
                apply_nat_configuration,
                config.wan_interface,
                config.lan_interface,
                config.dhcp_range_start,
                config.dhcp_range_end,
                user_id
            )
            message = "NAT configuration saved and being applied"
        else:
            # Disable NAT in background
            background_tasks.add_task(disable_nat_configuration, user_id)
            message = "NAT configuration saved and being disabled"

        return NATConfigResponse(
            success=True,
            data=config_data,
            message=message
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update NAT config: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update NAT configuration: {str(e)}"
        )


@router.patch("/", response_model=NATConfigResponse)
async def patch_nat_config(
        config: dict,
        background_tasks: BackgroundTasks,
        current_user=Depends(require_admin)
):
    """
    Partial update NAT configuration (backward compatibility)
    Supports the existing PATCH endpoint for compatibility
    """
    try:
        username = current_user.get('username', 'admin')
        user_id = str(current_user.get('_id', current_user.get('userId', 'unknown')))

        logger.info(f"NAT config PATCH by {username}: {config}")

        # Get current configuration
        current_config = await nat_service.get_nat_configuration()
        if not current_config:
            current_config = {
                "enabled": False,
                "wan_interface": "",
                "lan_interface": "",
                "dhcp_range_start": "192.168.100.100",
                "dhcp_range_end": "192.168.100.200",
                "gateway_ip": "192.168.100.1",
                "masquerade_enabled": True
            }

        # Update only provided fields
        updated_config = {**current_config}
        for key, value in config.items():
            if key in updated_config:
                updated_config[key] = value

        # Validate if enabling NAT
        if updated_config.get("enabled") and updated_config.get("wan_interface") and updated_config.get(
                "lan_interface"):
            validation = await nat_service.validate_interfaces(
                updated_config["wan_interface"],
                updated_config["lan_interface"]
            )
            if not validation['valid']:
                return NATConfigResponse(
                    success=False,
                    data=None,
                    message="Interface validation failed",
                    errors=validation['errors'],
                    warnings=validation['warnings']
                )

        # Save configuration
        save_success = await nat_service.save_nat_configuration(updated_config, user_id)
        if not save_success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to save NAT configuration"
            )

        # Apply changes if enabled
        if updated_config.get("enabled"):
            background_tasks.add_task(
                apply_nat_configuration,
                updated_config["wan_interface"],
                updated_config["lan_interface"],
                updated_config.get("dhcp_range_start", "192.168.100.100"),
                updated_config.get("dhcp_range_end", "192.168.100.200"),
                user_id
            )
        else:
            background_tasks.add_task(disable_nat_configuration, user_id)

        return NATConfigResponse(
            success=True,
            data=updated_config,
            message="NAT configuration updated successfully"
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to patch NAT config: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update NAT configuration: {str(e)}"
        )


@router.get("/interfaces", response_model=InterfaceListResponse)
async def get_nat_interfaces(current_user=Depends(get_current_user)):
    """
    Get available network interfaces for NAT configuration
    Returns WAN candidates (Wi-Fi) and LAN candidates (Ethernet)
    """
    try:
        logger.info(f"NAT interfaces requested by user: {current_user.get('username', 'unknown')}")

        interfaces = await nat_service.get_available_interfaces()

        return InterfaceListResponse(
            success=True,
            data=interfaces,
            message="Available interfaces retrieved successfully"
        )

    except Exception as e:
        logger.error(f"Failed to get NAT interfaces: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve interfaces: {str(e)}"
        )


@router.get("/status", response_model=NATStatusResponse)
async def get_nat_status(current_user=Depends(get_current_user)):
    """
    Get current NAT status
    Returns NAT configuration status and system status
    """
    try:
        logger.info(f"NAT status requested by user: {current_user.get('username', 'unknown')}")

        status_info = await nat_service.get_nat_status()

        return NATStatusResponse(
            success=True,
            data=status_info,
            message="NAT status retrieved successfully"
        )

    except Exception as e:
        logger.error(f"Failed to get NAT status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get NAT status: {str(e)}"
        )


@router.post("/setup-pc-sharing", response_model=NATConfigResponse)
async def setup_pc_sharing(
        sharing_config: PCToPCSharingRequest,
        background_tasks: BackgroundTasks,
        current_user=Depends(require_admin)
):
    """
    Setup PC-to-PC internet sharing
    Specialized endpoint for PC-to-PC sharing scenario
    """
    try:
        username = current_user.get('username', 'admin')
        user_id = str(current_user.get('_id', current_user.get('userId', 'unknown')))

        logger.info(
            f"PC-to-PC sharing setup by {username}: WAN={sharing_config.wan_interface}, LAN={sharing_config.lan_interface}")

        # Validate interfaces
        validation = await nat_service.validate_interfaces(
            sharing_config.wan_interface,
            sharing_config.lan_interface
        )
        if not validation['valid']:
            return NATConfigResponse(
                success=False,
                data=None,
                message="Interface validation failed for PC-to-PC sharing",
                errors=validation['errors'],
                warnings=validation['warnings']
            )

        # Setup PC-to-PC sharing
        result = await nat_service.setup_pc_to_pc_sharing(
            wan_interface=sharing_config.wan_interface,
            lan_interface=sharing_config.lan_interface,
            dhcp_range_start=sharing_config.dhcp_range_start,
            dhcp_range_end=sharing_config.dhcp_range_end
        )

        if result['success']:
            # Save configuration to database
            config_data = {
                "enabled": True,
                "wan_interface": sharing_config.wan_interface,
                "lan_interface": sharing_config.lan_interface,
                "dhcp_range_start": sharing_config.dhcp_range_start,
                "dhcp_range_end": sharing_config.dhcp_range_end,
                "gateway_ip": "192.168.100.1",
                "masquerade_enabled": True
            }
            await nat_service.save_nat_configuration(config_data, user_id)

            return NATConfigResponse(
                success=True,
                data=result,
                message="PC-to-PC internet sharing configured successfully",
                warnings=validation.get('warnings', [])
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"PC-to-PC sharing setup failed: {result.get('error', 'Unknown error')}"
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to setup PC-to-PC sharing: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to setup PC-to-PC sharing: {str(e)}"
        )


@router.post("/enable", response_model=NATConfigResponse)
async def enable_nat(
        background_tasks: BackgroundTasks,
        current_user=Depends(require_admin)
):
    """
    Enable NAT with current configuration
    Uses stored configuration from database
    """
    try:
        username = current_user.get('username', 'admin')
        user_id = str(current_user.get('_id', current_user.get('userId', 'unknown')))

        logger.info(f"NAT enable requested by {username}")

        # Get current configuration
        config = await nat_service.get_nat_configuration()
        if not config or not config.get('wan_interface') or not config.get('lan_interface'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="NAT configuration not found or incomplete. Please configure NAT first."
            )

        # Validate current configuration
        validation = await nat_service.validate_interfaces(
            config['wan_interface'],
            config['lan_interface']
        )
        if not validation['valid']:
            return NATConfigResponse(
                success=False,
                data=None,
                message="Current NAT configuration is invalid",
                errors=validation['errors'],
                warnings=validation['warnings']
            )

        # Enable NAT in background
        background_tasks.add_task(
            apply_nat_configuration,
            config['wan_interface'],
            config['lan_interface'],
            config.get('dhcp_range_start', '192.168.100.100'),
            config.get('dhcp_range_end', '192.168.100.200'),
            user_id
        )

        # Update configuration to enabled
        config['enabled'] = True
        await nat_service.save_nat_configuration(config, user_id)

        return NATConfigResponse(
            success=True,
            data=config,
            message="NAT is being enabled with current configuration"
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to enable NAT: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to enable NAT: {str(e)}"
        )


@router.post("/disable", response_model=NATConfigResponse)
async def disable_nat(
        background_tasks: BackgroundTasks,
        current_user=Depends(require_admin)
):
    """
    Disable NAT configuration
    Stops NAT and cleans up iptables rules
    """
    try:
        username = current_user.get('username', 'admin')
        user_id = str(current_user.get('_id', current_user.get('userId', 'unknown')))

        logger.info(f"NAT disable requested by {username}")

        # Get current configuration for cleanup
        config = await nat_service.get_nat_configuration()

        # Disable NAT in background
        background_tasks.add_task(disable_nat_configuration, user_id)

        # Update configuration to disabled
        if config:
            config['enabled'] = False
            await nat_service.save_nat_configuration(config, user_id)

        return NATConfigResponse(
            success=True,
            data={"enabled": False},
            message="NAT is being disabled"
        )

    except Exception as e:
        logger.error(f"Failed to disable NAT: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to disable NAT: {str(e)}"
        )


@router.post("/validate-interfaces", response_model=ValidationResponse)
async def validate_interfaces(
        wan_interface: str,
        lan_interface: str,
        current_user=Depends(get_current_user)
):
    """
    Validate selected WAN and LAN interfaces
    Returns validation results with errors and warnings
    """
    try:
        logger.info(f"Interface validation requested: WAN={wan_interface}, LAN={lan_interface}")

        validation = await nat_service.validate_interfaces(wan_interface, lan_interface)

        return ValidationResponse(
            valid=validation['valid'],
            errors=validation['errors'],
            warnings=validation['warnings']
        )

    except Exception as e:
        logger.error(f"Interface validation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Interface validation failed: {str(e)}"
        )


# Backward Compatibility Endpoints
@router.get("/config", response_model=ResponseModel)
async def get_nat_config_legacy(current_user=Depends(get_current_user)):
    """
    Legacy endpoint for NAT configuration (backward compatibility)
    Redirects to main config endpoint
    """
    try:
        config = await nat_service.get_nat_configuration()
        return ResponseModel(
            success=True,
            message="NAT configuration retrieved (legacy endpoint)",
            details=config
        )
    except Exception as e:
        logger.error(f"Legacy NAT config failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get NAT configuration: {str(e)}"
        )


# Background Tasks
async def apply_nat_configuration(wan_interface: str, lan_interface: str,
                                  dhcp_start: str, dhcp_end: str, user_id: str):
    """Background task to apply NAT configuration"""
    try:
        logger.info(f"Applying NAT configuration: WAN={wan_interface}, LAN={lan_interface}")

        result = await nat_service.setup_pc_to_pc_sharing(
            wan_interface=wan_interface,
            lan_interface=lan_interface,
            dhcp_range_start=dhcp_start,
            dhcp_range_end=dhcp_end
        )

        if result['success']:
            logger.info("NAT configuration applied successfully")
        else:
            logger.error(f"NAT configuration failed: {result.get('error', 'Unknown error')}")

    except Exception as e:
        logger.error(f"Background NAT configuration failed: {e}")


async def disable_nat_configuration(user_id: str):
    """Background task to disable NAT configuration"""
    try:
        logger.info("Disabling NAT configuration")

        # Get current config for interface info
        config = await nat_service.get_nat_configuration()
        wan_interface = config.get('wan_interface') if config else None
        lan_interface = config.get('lan_interface') if config else None

        success = await nat_service.disable_nat(wan_interface, lan_interface)

        if success:
            logger.info("NAT configuration disabled successfully")
        else:
            logger.error("Failed to disable NAT configuration")

    except Exception as e:
        logger.error(f"Background NAT disable failed: {e}")