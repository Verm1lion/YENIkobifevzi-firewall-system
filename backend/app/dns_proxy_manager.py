import asyncio
import platform
import subprocess
import socket
from typing import Optional, Set
from app.dns_proxy import DNSProxyServer

class DNSProxyManager:
    """DNS Proxy sunucusunu yöneten sınıf"""
    
    def __init__(self):
        self.proxy_server: Optional[DNSProxyServer] = None
        self.server_task: Optional[asyncio.Task] = None
        self._running = False
        
    def get_local_ip(self) -> str:
        """Lokal IP adresini al"""
        try:
            # Dış bir adrese bağlanmaya çalış (gerçekten bağlanmaz)
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect(("8.8.8.8", 80))
            local_ip = s.getsockname()[0]
            s.close()
            return local_ip
        except:
            return "127.0.0.1"
            
    async def start_proxy(self, blocked_domains: Set[str], port: int = 53):
        """DNS proxy sunucusunu başlat"""
        if self._running:
            print("DNS proxy already running")
            return
            
        # Proxy sunucusu oluştur
        self.proxy_server = DNSProxyServer(listen_ip='0.0.0.0', listen_port=port)
        
        # Kendi IP'mizi allowed listesine ekle
        local_ip = self.get_local_ip()
        self.proxy_server.add_allowed_client(local_ip)
        self.proxy_server.add_allowed_client('127.0.0.1')
        self.proxy_server.add_allowed_client('::1')  # IPv6 localhost
        
        # Engellenen domainleri ayarla
        self.proxy_server.update_blocked_domains(blocked_domains)
        
        # Sunucuyu başlat
        try:
            await self.proxy_server.start_server()
            self._running = True
        except Exception as e:
            print(f"Failed to start DNS proxy: {e}")
            raise
        
    def stop_proxy(self):
        """DNS proxy sunucusunu durdur"""
        if self.proxy_server:
            self.proxy_server.stop_server()
            self.proxy_server = None
            
        if self.server_task:
            self.server_task.cancel()
            
        self._running = False
            
    def update_blocked_domains(self, domains: Set[str]):
        """Engellenen domain listesini güncelle"""
        if self.proxy_server:
            self.proxy_server.update_blocked_domains(domains)
            
    def is_running(self) -> bool:
        """Proxy'nin çalışıp çalışmadığını kontrol et"""
        return self._running
            
    def configure_windows_dns(self, interface_name: str) -> bool:
        """Windows'ta belirli bir interface için DNS ayarla"""
        if platform.system().lower() != "windows":
            return False
            
        local_ip = self.get_local_ip()
        
        try:
            # DNS'i bizim proxy'ye yönlendir
            cmd = [
                "netsh", "interface", "ip", "set", "dns",
                f"name={interface_name}",
                "static", local_ip, "primary"
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True)
            if result.returncode != 0:
                print(f"DNS configuration failed: {result.stderr}")
                return False
                
            # İkincil DNS olarak Google DNS ekle (fallback)
            cmd2 = [
                "netsh", "interface", "ip", "add", "dns",
                f"name={interface_name}",
                "8.8.8.8", "index=2"
            ]
            subprocess.run(cmd2, capture_output=True, text=True)
            
            # DNS önbelleğini temizle
            subprocess.run(["ipconfig", "/flushdns"], capture_output=True, text=True)
            
            print(f"DNS configured for {interface_name}: {local_ip}")
            return True
            
        except Exception as e:
            print(f"Error configuring DNS: {e}")
            return False
        
    def restore_windows_dns(self, interface_name: str) -> bool:
        """DNS ayarlarını eski haline getir"""
        if platform.system().lower() != "windows":
            return False
            
        try:
            cmd = [
                "netsh", "interface", "ip", "set", "dns",
                f"name={interface_name}",
                "dhcp"
            ]
            result = subprocess.run(cmd, capture_output=True, text=True)
            
            # DNS önbelleğini temizle
            subprocess.run(["ipconfig", "/flushdns"], capture_output=True, text=True)
            
            print(f"DNS restored to DHCP for {interface_name}")
            return result.returncode == 0
            
        except Exception as e:
            print(f"Error restoring DNS: {e}")
            return False
        
        
# Global proxy manager instance
dns_proxy_manager = DNSProxyManager()