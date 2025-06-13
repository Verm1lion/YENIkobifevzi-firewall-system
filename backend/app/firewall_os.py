import platform
from app.linux_firewall import LinuxFirewall
from app.win_firewall import WinFirewall

def remove_firewall_rule_os(rule_name: str):
    sysname = platform.system().lower()
    if sysname.startswith("win"):
        fw = WinFirewall()
        fw.remove_rule(rule_name)
    else:
        fw = LinuxFirewall()
        fw.remove_rule(rule_name)

def add_firewall_rule_os(rule):
    sysname = platform.system().lower()
    if sysname.startswith("win"):
        fw = WinFirewall()
    else:
        fw = LinuxFirewall()
    fw.add_rule(rule)

def update_firewall_rule_os(old_rule, new_rule):
    sysname = platform.system().lower()
    if sysname.startswith("win"):
        fw = WinFirewall()
    else:
        fw = LinuxFirewall()
    fw.update_rule(old_rule, new_rule)
