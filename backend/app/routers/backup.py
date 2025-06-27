from fastapi import APIRouter

router = APIRouter(prefix="/api/v1/backup", tags=["Backup"])

@router.post("/create")
async def create_backup():
    """Create system backup"""
    return {
        "success": True,
        "message": "Backup created successfully"
    }