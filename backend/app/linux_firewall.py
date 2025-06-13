import subprocess
from fastapi import HTTPException
from app.firewall_driver import FirewallDriver

day_mapping = ["MO","TU","WE","TH","FR","SA","SU"]

def build_time_params(rule):
    time_params = []
    if rule.get("schedule_start") and rule.get("schedule_end"):
        start_str = rule["schedule_start"]
        end_str = rule["schedule_end"]
        time_params = ["-m", "time", "--timestart", start_str, "--timestop", end_str]

        if rule.get("days_of_week"):
            valid_days = []
            for d in rule["days_of_week"]:
                if 0 <= d <= 6:
                    valid_days.append(day_mapping[d])
            if valid_days:
                day_str = ",".join(valid_days)
                time_params += ["--days", day_str]
    return time_params

class LinuxFirewall(FirewallDriver):
    def add_rule(self, rule):
        chain = "INPUT" if rule["direction"].upper() == "IN" else "OUTPUT"
        if rule["action"].upper() == "ALLOW":
            target = "ACCEPT"
            log_prefix = None
        else:
            target = "DROP"
            log_prefix = "FWDROP: "

        proto = rule.get("protocol","tcp").lower()
        src_ip = "0.0.0.0/0"
        if rule.get("source_ips"):
            src_ip = rule["source_ips"][0]

        # 1) LOG kuralı (DENY ise)
        if log_prefix:
            log_cmd = [
                "iptables", "-A", chain,
                "-p", proto,
                "-s", src_ip
            ]
            if rule.get("port"):
                if chain == "INPUT":
                    log_cmd += ["--dport", str(rule["port"])]
                else:
                    log_cmd += ["--sport", str(rule["port"])]
            log_cmd += build_time_params(rule)
            log_cmd += [
                "-m", "comment", "--comment", rule["rule_name"],
                "-j", "LOG", "--log-prefix", log_prefix
            ]
            res_log = subprocess.run(log_cmd, capture_output=True, text=True)
            if res_log.returncode != 0:
                raise HTTPException(400, f"Linux firewall add rule LOG error: {res_log.stderr.strip()}")

        # 2) Asıl kural
        ip_cmd = [
            "iptables", "-A", chain,
            "-p", proto,
            "-s", src_ip
        ]
        if rule.get("port"):
            if chain == "INPUT":
                ip_cmd += ["--dport", str(rule["port"])]
            else:
                ip_cmd += ["--sport", str(rule["port"])]

        ip_cmd += build_time_params(rule)
        ip_cmd += [
            "-m", "comment", "--comment", rule["rule_name"],
            "-j", target
        ]

        res = subprocess.run(ip_cmd, capture_output=True, text=True)
        if res.returncode != 0:
            raise HTTPException(400, f"Linux firewall add rule error: {res.stderr.strip()}")

    def remove_rule(self, rule_name):
        # iptables -D ... vs. (henüz tam uygulanmadı)
        pass

    def update_rule(self, old_rule, new_rule):
        self.remove_rule(old_rule["rule_name"])
        self.add_rule(new_rule)
