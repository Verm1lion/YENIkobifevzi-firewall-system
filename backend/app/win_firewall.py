# File: app/win_firewall.py

import subprocess
from fastapi import HTTPException
from app.firewall_driver import FirewallDriver

class WinFirewall(FirewallDriver):
    def add_rule(self, rule):
        """
        Windows PowerShell kullanarak firewall kuralı ekler.
        Birden fazla port veya ANY protokol desteğini ekledik.
        """

        # Action: ALLOW veya DENY -> PS karşılığı "Allow" veya "Block"
        ps_action = "Allow" if rule.get("action", "").upper() == "ALLOW" else "Block"

        # Yön: IN / OUT -> PS karşılığı "Inbound" / "Outbound"
        direction_map = {"IN": "Inbound", "OUT": "Outbound"}
        ps_dir = direction_map.get(rule.get("direction", "").upper(), "Inbound")

        # Kural ismi
        rule_name = rule.get("rule_name", "UnnamedRule")

        # Komutu oluştur
        cmd = f"New-NetFirewallRule -Name '{rule_name}' -DisplayName '{rule_name}'"
        cmd += f" -Direction {ps_dir} -Action {ps_action}"

        # Protokol: TCP / UDP / ANY
        # -Protocol ANY, Windows'ta çalışır (bazı versiyonlarda ANY verince “All” sayılır).
        protocol = rule.get("protocol", "ANY").upper()
        if protocol != "ANY":
            cmd += f" -Protocol {protocol}"
        else:
            # ANY seçilince -Protocol ANY diyebiliriz.
            cmd += " -Protocol ANY"

        # Port bilgisi (birden fazla port girilmiş olabilir, örn: "80,443")
        # AMA "ANY" protokol seçildiyse, Windows'ta port parametresi genelde geçersizdir.
        port_str = rule.get("port")
        if port_str and protocol != "ANY":
            # Kullanıcı virgülle ayırmış olabilir (ör: "80,443").
            # Aradaki boşlukları silelim:
            port_str = str(port_str).replace(" ", "")
            if ps_dir == "Inbound":
                cmd += f" -LocalPort {port_str}"
            else:
                cmd += f" -RemotePort {port_str}"
            # Eğer range girilecekse ("80-90") da bu şekilde geçerli olur.

        # Source IP adres(ler)i (ör: ["10.36.130.28"])
        source_ips = rule.get("source_ips", [])
        if source_ips:
            # virgülle birleştirelim
            ip_list = ",".join(source_ips)
            cmd += f" -RemoteAddress {ip_list}"

        # Profile: "Any" / "Domain" / "Private" / "Public"
        # eğer "Any" girilmişse parametre eklemeye gerek yok diyebiliriz. (Ama biz yine de ekleyebiliriz)
        profile_val = rule.get("profile", "Any")
        if profile_val.lower() != "any":
            # ilk harfi büyük geri kalanı küçük
            cmd += f" -Profile {profile_val.capitalize()}"

        # Açıklama varsa
        description = rule.get("description")
        if description:
            cmd += f" -Description '{description}'"

        # PowerShell komutunu çalıştıralım
        ps_cmd = ["powershell", "-Command", cmd]
        res = subprocess.run(ps_cmd, capture_output=True, text=True)

        if res.returncode != 0:
            # Windows firewall komutundan gelen stderr'i kullanıcıya gösteriyoruz
            error_msg = res.stderr.strip()
            raise HTTPException(400, f"Windows firewall add rule error: {error_msg}")

        # Kural eklendikten sonra "enabled": false ise devre dışı bırakalım
        if rule.get("enabled", True) is False:
            dc_cmd = [
                "powershell",
                "-Command",
                f"Disable-NetFirewallRule -Name '{rule_name}'"
            ]
            subprocess.run(dc_cmd, capture_output=True, text=True)

    def remove_rule(self, rule_name):
        """
        Kuralı isme göre siler.
        """
        ps_cmd = ["powershell", "-Command", f"Remove-NetFirewallRule -Name '{rule_name}'"]
        subprocess.run(ps_cmd, capture_output=True, text=True)

    def update_rule(self, old_rule, new_rule):
        """
        Önce eski kuralı silip sonra yenisini ekliyoruz.
        """
        self.remove_rule(old_rule.get("rule_name", ""))
        self.add_rule(new_rule)
