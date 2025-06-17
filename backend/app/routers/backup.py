import json
import zipfile
import io
from datetime import datetime, timedelta
from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from ..dependencies import require_admin
from ..database import get_database
from ..schemas import ResponseModel

backup_router = APIRouter()


@backup_router.get("/export")
async def export_config(admin=Depends(require_admin), db=Depends(get_database)):
    """Export system configuration as JSON"""
    try:
        data = {}

        # Export collections
        collections_to_export = [
            "interfaces",
            "firewall_rules",
            "firewall_groups",
            "routes",
            "blocked_domains",
            "nat_config",
            "dns_proxy_config",
            "system_config"
        ]

        for collection_name in collections_to_export:
            try:
                cursor = db[collection_name].find({})
                items = []
                async for doc in cursor:
                    # Convert ObjectId to string
                    if "_id" in doc:
                        doc["_id"] = str(doc["_id"])
                    items.append(doc)
                data[collection_name] = items
            except Exception as e:
                print(f"Warning: Failed to export {collection_name}: {e}")
                data[collection_name] = []

        # Add metadata
        data["_metadata"] = {
            "export_date": datetime.utcnow().isoformat(),
            "version": "2.0.0",
            "exported_by": str(admin["_id"])
        }

        return data

    except Exception as e:
        raise HTTPException(500, f"Export failed: {str(e)}")


@backup_router.get("/export/download")
async def download_backup(admin=Depends(require_admin), db=Depends(get_database)):
    """Download backup as ZIP file"""
    try:
        # Get configuration data
        config_data = await export_config(admin, db)

        # Create ZIP file in memory
        zip_buffer = io.BytesIO()

        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            # Add configuration JSON
            config_json = json.dumps(config_data, indent=2, default=str)
            zip_file.writestr("kobi_firewall_config.json", config_json)

            # Add individual collection files
            for collection_name, items in config_data.items():
                if collection_name != "_metadata" and items:
                    collection_json = json.dumps(items, indent=2, default=str)
                    zip_file.writestr(f"{collection_name}.json", collection_json)

        zip_buffer.seek(0)

        # Generate filename with timestamp
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        filename = f"kobi_firewall_backup_{timestamp}.zip"

        return StreamingResponse(
            io.BytesIO(zip_buffer.read()),
            media_type="application/zip",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )

    except Exception as e:
        raise HTTPException(500, f"Backup download failed: {str(e)}")


@backup_router.post("/import", response_model=ResponseModel)
async def import_config(
        config_data: Dict[str, Any],
        overwrite: bool = False,
        admin=Depends(require_admin),
        db=Depends(get_database)
):
    """Import system configuration from JSON data"""
    try:
        imported_collections = []
        skipped_collections = []

        # Collections that can be imported
        importable_collections = [
            "interfaces",
            "firewall_rules",
            "firewall_groups",
            "routes",
            "blocked_domains",
            "nat_config",
            "dns_proxy_config",
            "system_config"
        ]

        for collection_name in importable_collections:
            if collection_name not in config_data:
                continue

            collection_data = config_data[collection_name]
            if not collection_data:
                continue

            try:
                if overwrite:
                    # Clear existing data
                    await db[collection_name].delete_many({})

                # Import new data
                if isinstance(collection_data, list) and collection_data:
                    # Remove _id fields to avoid conflicts
                    for item in collection_data:
                        if "_id" in item:
                            del item["_id"]
                        # Add import timestamp
                        item["imported_at"] = datetime.utcnow()

                    await db[collection_name].insert_many(collection_data)
                    imported_collections.append(collection_name)
                elif isinstance(collection_data, dict):
                    # Handle single document collections (configs)
                    if "_id" in collection_data:
                        config_id = collection_data["_id"]
                        del collection_data["_id"]
                    else:
                        config_id = "main"

                    collection_data["imported_at"] = datetime.utcnow()

                    await db[collection_name].update_one(
                        {"_id": config_id},
                        {"$set": collection_data},
                        upsert=True
                    )
                    imported_collections.append(collection_name)

            except Exception as e:
                print(f"Failed to import {collection_name}: {e}")
                skipped_collections.append(collection_name)

        # Log import activity
        await db.system_logs.insert_one({
            "timestamp": datetime.utcnow(),
            "level": "INFO",
            "source": "backup",
            "message": f"Configuration imported by {admin['username']}",
            "user_id": str(admin["_id"]),
            "details": {
                "imported_collections": imported_collections,
                "skipped_collections": skipped_collections,
                "overwrite": overwrite
            }
        })

        return ResponseModel(
            message=f"Configuration imported successfully. "
                    f"Imported: {len(imported_collections)} collections, "
                    f"Skipped: {len(skipped_collections)} collections",
            details={
                "imported": imported_collections,
                "skipped": skipped_collections
            }
        )

    except Exception as e:
        raise HTTPException(500, f"Import failed: {str(e)}")


@backup_router.post("/import/upload", response_model=ResponseModel)
async def upload_backup(
        file: UploadFile = File(...),
        overwrite: bool = False,
        admin=Depends(require_admin),
        db=Depends(get_database)
):
    """Upload and import backup file"""
    try:
        if not file.filename or not file.filename.endswith(('.json', '.zip')):
            raise HTTPException(400, "Only JSON and ZIP files are supported")

        content = await file.read()

        if file.filename.endswith('.zip'):
            # Handle ZIP file
            try:
                with zipfile.ZipFile(io.BytesIO(content)) as zip_file:
                    # Look for main config file
                    config_filename = None
                    for filename in zip_file.namelist():
                        if filename.endswith('config.json') or filename == 'kobi_firewall_config.json':
                            config_filename = filename
                            break

                    if not config_filename:
                        raise HTTPException(400, "No configuration file found in ZIP")

                    config_content = zip_file.read(config_filename)
                    config_data = json.loads(config_content.decode('utf-8'))

            except zipfile.BadZipFile:
                raise HTTPException(400, "Invalid ZIP file")

        else:
            # Handle JSON file
            try:
                config_data = json.loads(content.decode('utf-8'))
            except json.JSONDecodeError:
                raise HTTPException(400, "Invalid JSON format")

        # Import the configuration
        return await import_config(config_data, overwrite, admin, db)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Upload failed: {str(e)}")


@backup_router.get("/history")
async def get_backup_history(admin=Depends(require_admin), db=Depends(get_database)):
    """Get backup/import history"""
    try:
        cursor = db.system_logs.find({
            "source": "backup",
            "level": "INFO"
        }).sort("timestamp", -1).limit(50)

        history = []
        async for log in cursor:
            log["_id"] = str(log["_id"])
            history.append(log)

        return history

    except Exception as e:
        raise HTTPException(500, f"Failed to get backup history: {str(e)}")


@backup_router.delete("/cleanup")
async def cleanup_old_backups(
        days: int = 30,
        admin=Depends(require_admin),
        db=Depends(get_database)
):
    """Clean up old backup logs"""
    try:
        cutoff_date = datetime.utcnow() - timedelta(days=days)

        result = await db.system_logs.delete_many({
            "source": "backup",
            "timestamp": {"$lt": cutoff_date}
        })

        return ResponseModel(
            message=f"Cleaned up {result.deleted_count} old backup logs"
        )

    except Exception as e:
        raise HTTPException(500, f"Cleanup failed: {str(e)}")