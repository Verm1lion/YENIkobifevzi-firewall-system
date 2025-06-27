from fastapi import APIRouter

router = APIRouter(prefix="/api/v1/routes", tags=["Routes"])

@router.get("/")
async def get_routes():
    """Get network routes"""
    return {
        "success": True,
        "data": []
    }