"""
Firewall service layer with business logic and validation
"""

import ipaddress
import re
from typing import Dict, Any, List
from fastapi import HTTPException, status


class FirewallService:
    """Service class for firewall rule management"""

    def __init__(self):
        self.valid_protocols = ["TCP", "UDP", "ICMP", "ANY"]
        self.valid_actions = ["ALLOW", "DENY", "DROP", "REJECT"]
        self.valid_directions = ["IN", "OUT", "BOTH"]
        self.valid_profiles = ["Any", "Domain", "Private", "Public"]

    async def validate_rule_data(self, rule_data: Dict[str, Any]) -> None:
        """Validate firewall rule data"""

        # Validate required fields
        if not rule_data.get("rule_name"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Rule name is required"
            )

        # Validate rule name format
        if not re.match(r'^[a-zA-Z0-9_\-\s]+$', rule_data["rule_name"]):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Rule name contains invalid characters"
            )

        # Validate protocol
        if rule_data.get("protocol") and rule_data["protocol"] not in self.valid_protocols:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid protocol. Must be one of: {', '.join(self.valid_protocols)}"
            )

        # Validate action
        if rule_data.get("action") and rule_data["action"] not in self.valid_actions:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid action. Must be one of: {', '.join(self.valid_actions)}"
            )

        # Validate direction
        if rule_data.get("direction") and rule_data["direction"] not in self.valid_directions:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid direction. Must be one of: {', '.join(self.valid_directions)}"
            )

        # Validate profile
        if rule_data.get("profile") and rule_data["profile"] not in self.valid_profiles:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid profile. Must be one of: {', '.join(self.valid_profiles)}"
            )

        # Validate IP addresses
        for ip_field in ["source_ips", "destination_ips"]:
            if rule_data.get(ip_field):
                self._validate_ip_list(rule_data[ip_field], ip_field)

        # Validate ports
        for port_field in ["source_ports", "destination_ports"]:
            if rule_data.get(port_field):
                self._validate_port_list(rule_data[port_field], port_field)

        # Validate priority
        if rule_data.get("priority"):
            priority = rule_data["priority"]
            if not isinstance(priority, int) or priority < 1 or priority > 1000:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Priority must be an integer between 1 and 1000"
                )

        # Validate schedule
        if rule_data.get("schedule_start") or rule_data.get("schedule_end"):
            self._validate_schedule(rule_data)

        # Validate days of week
        if rule_data.get("days_of_week"):
            self._validate_days_of_week(rule_data["days_of_week"])

    def _validate_ip_list(self, ip_list: List[str], field_name: str) -> None:
        """Validate list of IP addresses or networks"""
        if not isinstance(ip_list, list):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"{field_name} must be a list"
            )

        for ip_str in ip_list:
            try:
                # Try to parse as IP network (supports CIDR notation)
                ipaddress.ip_network(ip_str, strict=False)
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid IP address or network in {field_name}: {ip_str}"
                )

    def _validate_port_list(self, port_list: List[str], field_name: str) -> None:
        """Validate list of ports or port ranges"""
        if not isinstance(port_list, list):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"{field_name} must be a list"
            )

        for port_str in port_list:
            if not isinstance(port_str, str):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Port values in {field_name} must be strings"
                )

            # Check for port range (e.g., "80-443")
            if "-" in port_str:
                try:
                    start_port, end_port = port_str.split("-", 1)
                    start_port = int(start_port.strip())
                    end_port = int(end_port.strip())

                    if not (1 <= start_port <= 65535) or not (1 <= end_port <= 65535):
                        raise ValueError()

                    if start_port >= end_port:
                        raise ValueError("Invalid port range")

                except ValueError:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Invalid port range in {field_name}: {port_str}"
                    )
            else:
                # Single port
                try:
                    port = int(port_str.strip())
                    if not (1 <= port <= 65535):
                        raise ValueError()
                except ValueError:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Invalid port in {field_name}: {port_str}"
                    )

    def _validate_schedule(self, rule_data: Dict[str, Any]) -> None:
        """Validate schedule configuration"""
        schedule_start = rule_data.get("schedule_start")
        schedule_end = rule_data.get("schedule_end")

        time_pattern = re.compile(r'^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$')

        if schedule_start and not time_pattern.match(schedule_start):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid schedule start time format. Use HH:MM"
            )

        if schedule_end and not time_pattern.match(schedule_end):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid schedule end time format. Use HH:MM"
            )

        # If both times are provided, validate the range
        if schedule_start and schedule_end:
            start_minutes = self._time_to_minutes(schedule_start)
            end_minutes = self._time_to_minutes(schedule_end)

            if start_minutes >= end_minutes:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Schedule start time must be before end time"
                )

    def _validate_days_of_week(self, days: List[int]) -> None:
        """Validate days of week list"""
        if not isinstance(days, list):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Days of week must be a list"
            )

        for day in days:
            if not isinstance(day, int) or day < 0 or day > 6:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Days of week must be integers between 0 (Monday) and 6 (Sunday)"
                )

    def _time_to_minutes(self, time_str: str) -> int:
        """Convert time string (HH:MM) to minutes since midnight"""
        hours, minutes = map(int, time_str.split(':'))
        return hours * 60 + minutes

    def format_rule_for_os(self, rule_data: Dict[str, Any]) -> Dict[str, Any]:
        """Format rule data for operating system firewall"""

        formatted_rule = {
            "rule_name": rule_data.get("rule_name", ""),
            "action": rule_data.get("action", "ALLOW"),
            "direction": rule_data.get("direction", "IN"),
            "protocol": rule_data.get("protocol", "ANY"),
            "enabled": rule_data.get("enabled", True),
            "priority": rule_data.get("priority", 100),
            "description": rule_data.get("description", "")
        }

        # Format IP addresses
        if rule_data.get("source_ips"):
            formatted_rule["source_ips"] = rule_data["source_ips"]

        if rule_data.get("destination_ips"):
            formatted_rule["destination_ips"] = rule_data["destination_ips"]

        # Format ports
        if rule_data.get("source_ports"):
            formatted_rule["source_ports"] = ",".join(rule_data["source_ports"])

        if rule_data.get("destination_ports"):
            formatted_rule["destination_ports"] = ",".join(rule_data["destination_ports"])

        # Add schedule if present
        if rule_data.get("schedule_start") and rule_data.get("schedule_end"):
            formatted_rule["schedule_start"] = rule_data["schedule_start"]
            formatted_rule["schedule_end"] = rule_data["schedule_end"]

            if rule_data.get("days_of_week"):
                formatted_rule["days_of_week"] = rule_data["days_of_week"]

        return formatted_rule

    def check_rule_conflicts(self, rule_data: Dict[str, Any], existing_rules: List[Dict[str, Any]]) -> List[str]:
        """Check for potential conflicts with existing rules"""
        conflicts = []

        # Check for exact duplicates
        for existing_rule in existing_rules:
            if self._rules_overlap(rule_data, existing_rule):
                conflicts.append(f"Rule overlaps with existing rule: {existing_rule.get('rule_name', 'Unknown')}")

        return conflicts

    def _rules_overlap(self, rule1: Dict[str, Any], rule2: Dict[str, Any]) -> bool:
        """Check if two rules overlap in their network scope"""
        # This is a simplified check - in production, you'd want more sophisticated overlap detection

        # Check if protocols overlap
        proto1 = rule1.get("protocol", "ANY")
        proto2 = rule2.get("protocol", "ANY")

        if proto1 != "ANY" and proto2 != "ANY" and proto1 != proto2:
            return False

        # Check if directions overlap
        dir1 = rule1.get("direction", "IN")
        dir2 = rule2.get("direction", "IN")

        if dir1 != dir2 and "BOTH" not in [dir1, dir2]:
            return False

        # Check IP address overlap (simplified)
        src_ips1 = rule1.get("source_ips", ["0.0.0.0/0"])
        src_ips2 = rule2.get("source_ips", ["0.0.0.0/0"])

        # If both rules have any-source or overlap in source IPs
        if "0.0.0.0/0" in src_ips1 or "0.0.0.0/0" in src_ips2:
            return True

        # Check for actual IP overlap (simplified - check if any IPs are the same)
        for ip1 in src_ips1:
            for ip2 in src_ips2:
                if ip1 == ip2:
                    return True

        return False