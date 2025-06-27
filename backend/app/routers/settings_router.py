from fastapi import APIRouter

router = APIRouter(prefix="/api/v1/settings", tags=["Settings"])

@router.get("/")
async def get_settings():
    """Get system settings"""
    return {
        "success": True,
        "data": {
            "timezone": "Türkiye (UTC+3)",
            "language": "Türkçe",
            "session_timeout": 60
        }
    }

@router.patch("/{section}")
async def update_settings(section: str, data: dict):
    """Update settings section"""
    return {
        "success": True,
        "message": f"Settings section '{section}' updated successfully"
    }