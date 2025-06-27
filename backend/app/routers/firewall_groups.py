from fastapi import APIRouter

router = APIRouter(prefix="/api/v1/firewall-groups", tags=["Firewall Groups"])

@router.get("/")
async def get_firewall_groups():
    """Get firewall groups"""
    return {
        "success": True,
        "data": []
    }