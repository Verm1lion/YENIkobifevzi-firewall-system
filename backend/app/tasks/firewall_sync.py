"""
Firewall synchronization tasks
"""
import asyncio
import platform
from typing import Dict, Any
from ..firewall_os import add_firewall_rule_os, remove_firewall_rule_os, update_firewall_rule_os


async def sync_rule_to_os(rule_doc: Dict[str, Any]) -> bool:
    """
    Sync firewall rule to operating system
    """
    try:
        # Format rule for OS
        formatted_rule = {
            "rule_name": rule_doc.get("rule_name", ""),
            "source_ips": rule_doc.get("source_ips", []),
            "destination_ips": rule_doc.get("destination_ips", []),
            "source_ports": rule_doc.get("source_ports", []),
            "destination_ports": rule_doc.get("destination_ports", []),
            "protocol": rule_doc.get("protocol", "ANY"),
            "action": rule_doc.get("action", "ALLOW"),
            "direction": rule_doc.get("direction", "IN"),
            "enabled": rule_doc.get("enabled", True),
            "priority": rule_doc.get("priority", 100),
            "profile": rule_doc.get("profile", "Any"),
            "description": rule_doc.get("description", ""),
            "port": rule_doc.get("destination_ports", [None])[0] if rule_doc.get("destination_ports") else None
        }

        # Run in thread pool to avoid blocking
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, add_firewall_rule_os, formatted_rule)

        print(f"✅ Rule synced to OS: {rule_doc.get('rule_name')}")
        return True

    except Exception as e:
        print(f"❌ Failed to sync rule to OS: {rule_doc.get('rule_name')} - {e}")
        return False


async def remove_rule_from_os(rule_doc: Dict[str, Any]) -> bool:
    """
    Remove firewall rule from operating system
    """
    try:
        rule_name = rule_doc.get("rule_name", "")
        if not rule_name:
            return False

        # Run in thread pool to avoid blocking
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, remove_firewall_rule_os, rule_name)

        print(f"✅ Rule removed from OS: {rule_name}")
        return True

    except Exception as e:
        print(f"❌ Failed to remove rule from OS: {rule_doc.get('rule_name')} - {e}")
        return False


async def update_rule_in_os(old_rule: Dict[str, Any], new_rule: Dict[str, Any]) -> bool:
    """
    Update firewall rule in operating system
    """
    try:
        # Format old rule
        old_formatted = {
            "rule_name": old_rule.get("rule_name", ""),
            "source_ips": old_rule.get("source_ips", []),
            "port": old_rule.get("destination_ports", [None])[0] if old_rule.get("destination_ports") else None,
            "protocol": old_rule.get("protocol", "ANY"),
            "action": old_rule.get("action", "ALLOW"),
            "direction": old_rule.get("direction", "IN")
        }

        # Format new rule
        new_formatted = {
            "rule_name": new_rule.get("rule_name", ""),
            "source_ips": new_rule.get("source_ips", []),
            "destination_ips": new_rule.get("destination_ips", []),
            "source_ports": new_rule.get("source_ports", []),
            "destination_ports": new_rule.get("destination_ports", []),
            "protocol": new_rule.get("protocol", "ANY"),
            "action": new_rule.get("action", "ALLOW"),
            "direction": new_rule.get("direction", "IN"),
            "enabled": new_rule.get("enabled", True),
            "priority": new_rule.get("priority", 100),
            "profile": new_rule.get("profile", "Any"),
            "description": new_rule.get("description", ""),
            "port": new_rule.get("destination_ports", [None])[0] if new_rule.get("destination_ports") else None
        }

        # Run in thread pool to avoid blocking
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, update_firewall_rule_os, old_formatted, new_formatted)

        print(f"✅ Rule updated in OS: {new_rule.get('rule_name')}")
        return True

    except Exception as e:
        print(f"❌ Failed to update rule in OS: {new_rule.get('rule_name')} - {e}")
        return False