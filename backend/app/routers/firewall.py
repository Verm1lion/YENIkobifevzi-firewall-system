"""
Enhanced firewall rules management with modern async patterns
"""

import asyncio
from datetime import datetime
from typing import List, Optional, Dict, Any

from fastapi import APIRouter, HTTPException, status, Depends, BackgroundTasks, Query
from bson import ObjectId

from ..database import get_database
from ..dependencies import require_admin, get_current_user
from ..schemas import (
    FirewallRuleCreate,
    FirewallRuleUpdate,
    FirewallRuleResponse,
    PaginatedResponse,
    ResponseModel
)
from ..services.firewall_service import FirewallService
from ..tasks.firewall_sync import sync_rule_to_os, remove_rule_from_os

firewall_router = APIRouter()
firewall_service = FirewallService()


@firewall_router.get("/rules", response_model=PaginatedResponse)
async def list_firewall_rules(
        page: int = Query(1, ge=1),
        per_page: int = Query(50, ge=1, le=100),
        search: Optional[str] = Query(None),
        enabled: Optional[bool] = Query(None),
        action: Optional[str] = Query(None),
        group_id: Optional[str] = Query(None),
        sort_by: str = Query("priority"),
        sort_order: str = Query("asc"),
        current_user=Depends(get_current_user),
        db=Depends(get_database)
):
    """Get paginated list of firewall rules with filtering"""

    # Build query
    query = {}

    if search:
        query["$or"] = [
            {"rule_name": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}}
        ]

    if enabled is not None:
        query["enabled"] = enabled

    if action:
        query["action"] = action.upper()

    if group_id:
        query["group_id"] = group_id

    # Count total documents
    total = await db.firewall_rules.count_documents(query)

    # Calculate pagination
    pages = (total + per_page - 1) // per_page
    skip = (page - 1) * per_page

    # Build sort
    sort_direction = 1 if sort_order == "asc" else -1
    sort_spec = [(sort_by, sort_direction)]

    # Get paginated results
    cursor = db.firewall_rules.find(query).sort(sort_spec).skip(skip).limit(per_page)

    rules = []
    async for rule_doc in cursor:
        rule_doc["id"] = str(rule_doc["_id"])
        rules.append(FirewallRuleResponse(**rule_doc))

    return PaginatedResponse(
        data=rules,
        total=total,
        page=page,
        per_page=per_page,
        pages=pages,
        has_next=page < pages,
        has_prev=page > 1
    )


@firewall_router.get("/rules/{rule_id}", response_model=FirewallRuleResponse)
async def get_firewall_rule(
        rule_id: str,
        current_user=Depends(get_current_user),
        db=Depends(get_database)
):
    """Get specific firewall rule by ID"""

    try:
        object_id = ObjectId(rule_id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid rule ID format"
        )

    rule_doc = await db.firewall_rules.find_one({"_id": object_id})

    if not rule_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Firewall rule not found"
        )

    rule_doc["id"] = str(rule_doc["_id"])
    return FirewallRuleResponse(**rule_doc)


@firewall_router.post("/rules", response_model=FirewallRuleResponse)
async def create_firewall_rule(
        rule_data: FirewallRuleCreate,
        background_tasks: BackgroundTasks,
        current_user=Depends(require_admin),
        db=Depends(get_database)
):
    """Create a new firewall rule"""

    # Check for duplicate rule name
    existing_rule = await db.firewall_rules.find_one({"rule_name": rule_data.rule_name})
    if existing_rule:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Rule name already exists"
        )

    # Validate rule data
    await firewall_service.validate_rule_data(rule_data.dict())

    # Create rule document
    rule_doc = {
        **rule_data.dict(),
        "created_at": datetime.utcnow(),
        "created_by": str(current_user["_id"]),
        "hit_count": 0,
        "last_hit": None
    }

    # Insert rule
    result = await db.firewall_rules.insert_one(rule_doc)
    rule_doc["_id"] = result.inserted_id

    # Sync to OS in background if enabled
    if rule_data.enabled:
        background_tasks.add_task(sync_rule_to_os, rule_doc)

    # Log rule creation
    await db.system_logs.insert_one({
        "timestamp": datetime.utcnow(),
        "level": "INFO",
        "source": "firewall",
        "message": f"Firewall rule created: {rule_data.rule_name}",
        "user_id": str(current_user["_id"]),
        "rule_id": str(result.inserted_id),
        "action": "rule_created"
    })

    rule_doc["id"] = str(rule_doc["_id"])
    return FirewallRuleResponse(**rule_doc)


@firewall_router.put("/rules/{rule_id}", response_model=FirewallRuleResponse)
async def update_firewall_rule(
        rule_id: str,
        rule_data: FirewallRuleUpdate,
        background_tasks: BackgroundTasks,
        current_user=Depends(require_admin),
        db=Depends(get_database)
):
    """Update an existing firewall rule"""

    try:
        object_id = ObjectId(rule_id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid rule ID format"
        )

    # Get existing rule
    existing_rule = await db.firewall_rules.find_one({"_id": object_id})
    if not existing_rule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Firewall rule not found"
        )

    # Check for rule name conflicts (if name is being changed)
    if rule_data.rule_name and rule_data.rule_name != existing_rule["rule_name"]:
        name_conflict = await db.firewall_rules.find_one({
            "rule_name": rule_data.rule_name,
            "_id": {"$ne": object_id}
        })
        if name_conflict:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Rule name already exists"
            )

    # Prepare update data
    update_data = {k: v for k, v in rule_data.dict().items() if v is not None}
    update_data["updated_at"] = datetime.utcnow()
    update_data["updated_by"] = str(current_user["_id"])

    # Validate updated rule data
    merged_data = {**existing_rule, **update_data}
    await firewall_service.validate_rule_data(merged_data)

    # Remove old rule from OS if it was enabled
    if existing_rule.get("enabled"):
        background_tasks.add_task(remove_rule_from_os, existing_rule)

    # Update rule
    await db.firewall_rules.update_one(
        {"_id": object_id},
        {"$set": update_data}
    )

    # Get updated rule
    updated_rule = await db.firewall_rules.find_one({"_id": object_id})

    # Sync to OS if enabled
    if updated_rule.get("enabled"):
        background_tasks.add_task(sync_rule_to_os, updated_rule)

    # Log rule update
    await db.system_logs.insert_one({
        "timestamp": datetime.utcnow(),
        "level": "INFO",
        "source": "firewall",
        "message": f"Firewall rule updated: {updated_rule['rule_name']}",
        "user_id": str(current_user["_id"]),
        "rule_id": rule_id,
        "action": "rule_updated",
        "changes": update_data
    })

    updated_rule["id"] = str(updated_rule["_id"])
    return FirewallRuleResponse(**updated_rule)


@firewall_router.delete("/rules/{rule_id}", response_model=ResponseModel)
async def delete_firewall_rule(
        rule_id: str,
        background_tasks: BackgroundTasks,
        current_user=Depends(require_admin),
        db=Depends(get_database)
):
    """Delete a firewall rule"""

    try:
        object_id = ObjectId(rule_id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid rule ID format"
        )

    # Get rule to delete
    rule_doc = await db.firewall_rules.find_one({"_id": object_id})
    if not rule_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Firewall rule not found"
        )

    # Remove from OS if enabled
    if rule_doc.get("enabled"):
        background_tasks.add_task(remove_rule_from_os, rule_doc)

    # Delete rule
    await db.firewall_rules.delete_one({"_id": object_id})

    # Log rule deletion
    await db.system_logs.insert_one({
        "timestamp": datetime.utcnow(),
        "level": "INFO",
        "source": "firewall",
        "message": f"Firewall rule deleted: {rule_doc['rule_name']}",
        "user_id": str(current_user["_id"]),
        "rule_id": rule_id,
        "action": "rule_deleted"
    })

    return ResponseModel(message="Firewall rule deleted successfully")


@firewall_router.post("/rules/{rule_id}/enable", response_model=ResponseModel)
async def enable_firewall_rule(
        rule_id: str,
        background_tasks: BackgroundTasks,
        current_user=Depends(require_admin),
        db=Depends(get_database)
):
    """Enable a firewall rule"""

    try:
        object_id = ObjectId(rule_id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid rule ID format"
        )

    # Get rule
    rule_doc = await db.firewall_rules.find_one({"_id": object_id})
    if not rule_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Firewall rule not found"
        )

    if rule_doc.get("enabled"):
        return ResponseModel(message="Rule is already enabled")

    # Enable rule
    await db.firewall_rules.update_one(
        {"_id": object_id},
        {
            "$set": {
                "enabled": True,
                "updated_at": datetime.utcnow(),
                "updated_by": str(current_user["_id"])
            }
        }
    )

    # Get updated rule
    updated_rule = await db.firewall_rules.find_one({"_id": object_id})

    # Sync to OS
    background_tasks.add_task(sync_rule_to_os, updated_rule)

    # Log action
    await db.system_logs.insert_one({
        "timestamp": datetime.utcnow(),
        "level": "INFO",
        "source": "firewall",
        "message": f"Firewall rule enabled: {rule_doc['rule_name']}",
        "user_id": str(current_user["_id"]),
        "rule_id": rule_id,
        "action": "rule_enabled"
    })

    return ResponseModel(message="Firewall rule enabled successfully")


@firewall_router.post("/rules/{rule_id}/disable", response_model=ResponseModel)
async def disable_firewall_rule(
        rule_id: str,
        background_tasks: BackgroundTasks,
        current_user=Depends(require_admin),
        db=Depends(get_database)
):
    """Disable a firewall rule"""

    try:
        object_id = ObjectId(rule_id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid rule ID format"
        )

    # Get rule
    rule_doc = await db.firewall_rules.find_one({"_id": object_id})
    if not rule_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Firewall rule not found"
        )

    if not rule_doc.get("enabled"):
        return ResponseModel(message="Rule is already disabled")

    # Remove from OS
    background_tasks.add_task(remove_rule_from_os, rule_doc)

    # Disable rule
    await db.firewall_rules.update_one(
        {"_id": object_id},
        {
            "$set": {
                "enabled": False,
                "updated_at": datetime.utcnow(),
                "updated_by": str(current_user["_id"])
            }
        }
    )

    # Log action
    await db.system_logs.insert_one({
        "timestamp": datetime.utcnow(),
        "level": "INFO",
        "source": "firewall",
        "message": f"Firewall rule disabled: {rule_doc['rule_name']}",
        "user_id": str(current_user["_id"]),
        "rule_id": rule_id,
        "action": "rule_disabled"
    })

    return ResponseModel(message="Firewall rule disabled successfully")


@firewall_router.post("/rules/bulk-enable", response_model=ResponseModel)
async def bulk_enable_rules(
        rule_ids: List[str],
        background_tasks: BackgroundTasks,
        current_user=Depends(require_admin),
        db=Depends(get_database)
):
    """Enable multiple firewall rules"""

    if not rule_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No rule IDs provided"
        )

    try:
        object_ids = [ObjectId(rule_id) for rule_id in rule_ids]
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid rule ID format"
        )

    # Update rules
    result = await db.firewall_rules.update_many(
        {"_id": {"$in": object_ids}},
        {
            "$set": {
                "enabled": True,
                "updated_at": datetime.utcnow(),
                "updated_by": str(current_user["_id"])
            }
        }
    )

    # Get updated rules for OS sync
    cursor = db.firewall_rules.find({"_id": {"$in": object_ids}, "enabled": True})
    async for rule_doc in cursor:
        background_tasks.add_task(sync_rule_to_os, rule_doc)

    # Log action
    await db.system_logs.insert_one({
        "timestamp": datetime.utcnow(),
        "level": "INFO",
        "source": "firewall",
        "message": f"Bulk enable: {result.modified_count} rules enabled",
        "user_id": str(current_user["_id"]),
        "action": "bulk_enable",
        "rule_count": result.modified_count
    })

    return ResponseModel(
        message=f"Successfully enabled {result.modified_count} rules"
    )


@firewall_router.post("/rules/bulk-disable", response_model=ResponseModel)
async def bulk_disable_rules(
        rule_ids: List[str],
        background_tasks: BackgroundTasks,
        current_user=Depends(require_admin),
        db=Depends(get_database)
):
    """Disable multiple firewall rules"""

    if not rule_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No rule IDs provided"
        )

    try:
        object_ids = [ObjectId(rule_id) for rule_id in rule_ids]
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid rule ID format"
        )

    # Get rules before disabling (for OS removal)
    cursor = db.firewall_rules.find({"_id": {"$in": object_ids}, "enabled": True})
    enabled_rules = []
    async for rule_doc in cursor:
        enabled_rules.append(rule_doc)

    # Remove from OS
    for rule_doc in enabled_rules:
        background_tasks.add_task(remove_rule_from_os, rule_doc)

    # Update rules
    result = await db.firewall_rules.update_many(
        {"_id": {"$in": object_ids}},
        {
            "$set": {
                "enabled": False,
                "updated_at": datetime.utcnow(),
                "updated_by": str(current_user["_id"])
            }
        }
    )

    # Log action
    await db.system_logs.insert_one({
        "timestamp": datetime.utcnow(),
        "level": "INFO",
        "source": "firewall",
        "message": f"Bulk disable: {result.modified_count} rules disabled",
        "user_id": str(current_user["_id"]),
        "action": "bulk_disable",
        "rule_count": result.modified_count
    })

    return ResponseModel(
        message=f"Successfully disabled {result.modified_count} rules"
    )


@firewall_router.get("/rules/stats", response_model=Dict[str, Any])
async def get_firewall_stats(
        current_user=Depends(get_current_user),
        db=Depends(get_database)
):
    """Get firewall rules statistics"""

    # Aggregate statistics
    pipeline = [
        {
            "$group": {
                "_id": None,
                "total_rules": {"$sum": 1},
                "enabled_rules": {
                    "$sum": {"$cond": [{"$eq": ["$enabled", True]}, 1, 0]}
                },
                "allow_rules": {
                    "$sum": {"$cond": [{"$eq": ["$action", "ALLOW"]}, 1, 0]}
                },
                "deny_rules": {
                    "$sum": {"$cond": [{"$eq": ["$action", "DENY"]}, 1, 0]}
                },
                "total_hits": {"$sum": "$hit_count"}
            }
        }
    ]

    result = await db.firewall_rules.aggregate(pipeline).to_list(1)

    if result:
        stats = result[0]
        del stats["_id"]
    else:
        stats = {
            "total_rules": 0,
            "enabled_rules": 0,
            "allow_rules": 0,
            "deny_rules": 0,
            "total_hits": 0
        }

    # Add calculated fields
    stats["disabled_rules"] = stats["total_rules"] - stats["enabled_rules"]
    stats["drop_rules"] = stats["total_rules"] - stats["allow_rules"] - stats["deny_rules"]

    return stats


@firewall_router.post("/sync-all", response_model=ResponseModel)
async def sync_all_rules(
        background_tasks: BackgroundTasks,
        current_user=Depends(require_admin),
        db=Depends(get_database)
):
    """Sync all enabled firewall rules to the operating system"""

    # Get all enabled rules
    cursor = db.firewall_rules.find({"enabled": True})
    rule_count = 0

    async for rule_doc in cursor:
        background_tasks.add_task(sync_rule_to_os, rule_doc)
        rule_count += 1

    # Log action
    await db.system_logs.insert_one({
        "timestamp": datetime.utcnow(),
        "level": "INFO",
        "source": "firewall",
        "message": f"Full firewall sync initiated: {rule_count} rules",
        "user_id": str(current_user["_id"]),
        "action": "full_sync",
        "rule_count": rule_count
    })

    return ResponseModel(
        message=f"Firewall sync initiated for {rule_count} enabled rules"
    )