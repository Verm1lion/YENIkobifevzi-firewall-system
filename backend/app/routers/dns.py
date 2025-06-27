from fastapi import APIRouter

router = APIRouter(prefix="/api/v1/dns", tags=["DNS"])

@router.get("/")
async def get_dns_settings():
    """Get DNS settings"""
    return {
        "success": True,
        "data": {
            "primary": "8.8.8.8",
            "secondary": "8.8.4.4"
        }
    }