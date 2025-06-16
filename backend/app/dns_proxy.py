import asyncio
import socket
import struct
from datetime import datetime
from typing import Set, Dict
import dns.message
import dns.query
import dns.resolver
import dns.rcode

class DNSProxyServer:
    """Seçici DNS engelleme için proxy sunucusu"""
    
    def __init__(self, listen_ip='0.0.0.0', listen_port=53):
        self.listen_ip = listen_ip
        self.listen_port = listen_port
        self.blocked_domains: Set[str] = set()
        self.upstream_dns = ['8.8.8.8', '8.8.4.4']  # Google DNS
        self.allowed_clients: Set[str] = set()  # İzin verilen IP'ler
        self.running = False
        self.transport = None
        
    def update_blocked_domains(self, domains: Set[str]):
        """Engellenen domain listesini güncelle"""
        self.blocked_domains = domains
        print(f"Blocked domains updated: {len(domains)} domains")
        
    def add_allowed_client(self, ip: str):
        """İzin verilen client IP'si ekle (sizin PC'niz)"""
        self.allowed_clients.add(ip)
        print(f"Added allowed client: {ip}")
        
    def is_domain_blocked(self, domain: str, client_ip: str) -> bool:
        """Domain'in client için engellenip engellenmediğini kontrol et"""
        # Eğer client izin verilenler listesindeyse (sizin PC'niz), engelleme
        if client_ip in self.allowed_clients:
            return False
            
        # Diğer clientler için (arkadaşınızın PC'si) kontrol et
        domain_lower = domain.lower().rstrip('.')
        
        # Tam eşleşme kontrolü
        if domain_lower in self.blocked_domains:
            return True
            
        # Subdomain kontrolü
        parts = domain_lower.split('.')
        for i in range(len(parts)):
            parent = '.'.join(parts[i:])
            if parent in self.blocked_domains:
                return True
                
        return False
        
    async def handle_dns_query(self, data: bytes, addr):
        """DNS sorgusunu işle"""
        client_ip = addr[0]
        
        try:
            # DNS mesajını parse et
            query = dns.message.from_wire(data)
            
            # Sorguyu logla
            for question in query.question:
                domain = str(question.name)
                print(f"DNS query from {client_ip}: {domain}")
                
                # Domain engellenmiş mi kontrol et
                if self.is_domain_blocked(domain, client_ip):
                    print(f"BLOCKED: {domain} for {client_ip}")
                    # Engelleme cevabı gönder (NXDOMAIN)
                    response = dns.message.make_response(query)
                    response.set_rcode(dns.rcode.NXDOMAIN)
                    return response.to_wire()
            
            # Engellenmediyse, upstream DNS'e yönlendir
            response_data = await self.forward_to_upstream(data)
            return response_data
            
        except Exception as e:
            print(f"Error handling DNS query: {e}")
            return None
            
    async def forward_to_upstream(self, query_data: bytes) -> bytes:
        """Sorguyu upstream DNS sunucusuna yönlendir"""
        for dns_server in self.upstream_dns:
            try:
                # UDP üzerinden upstream DNS'e gönder
                response = await asyncio.wait_for(
                    self._udp_query(query_data, dns_server, 53),
                    timeout=2.0
                )
                return response
            except asyncio.TimeoutError:
                continue
            except Exception as e:
                print(f"Error forwarding to {dns_server}: {e}")
                continue
        return None
        
    async def _udp_query(self, data: bytes, server: str, port: int) -> bytes:
        """UDP DNS sorgusu gönder"""
        loop = asyncio.get_event_loop()
        
        # Socket oluştur
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        sock.setblocking(False)
        
        try:
            # Sorguyu gönder
            await loop.sock_sendto(sock, data, (server, port))
            
            # Cevabı bekle
            response_data, _ = await loop.sock_recvfrom(sock, 512)
            return response_data
        finally:
            sock.close()
            
    async def start_server(self):
        """DNS proxy sunucusunu başlat"""
        print(f"Starting DNS proxy on {self.listen_ip}:{self.listen_port}")
        
        # UDP sunucu oluştur
        loop = asyncio.get_event_loop()
        transport, protocol = await loop.create_datagram_endpoint(
            lambda: DNSProtocol(self),
            local_addr=(self.listen_ip, self.listen_port)
        )
        
        self.running = True
        self.transport = transport
        
        print("DNS proxy server started")
        
    def stop_server(self):
        """Sunucuyu durdur"""
        self.running = False
        if self.transport:
            self.transport.close()
            self.transport = None
        print("DNS proxy server stopped")
            

class DNSProtocol(asyncio.DatagramProtocol):
    """DNS UDP protokol handler"""
    
    def __init__(self, server: DNSProxyServer):
        self.server = server
        self.transport = None
        
    def connection_made(self, transport):
        self.transport = transport
        
    def datagram_received(self, data, addr):
        """DNS paketi alındığında"""
        asyncio.create_task(self._handle_query(data, addr))
        
    async def _handle_query(self, data, addr):
        """Sorguyu işle ve cevapla"""
        response = await self.server.handle_dns_query(data, addr)
        if response and self.transport:
            self.transport.sendto(response, addr)