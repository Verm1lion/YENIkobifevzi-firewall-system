import threading
from scapy.all import sniff, TCP

def packet_callback(pkt):
    if pkt.haslayer(TCP):
        payload = bytes(pkt[TCP].payload)
        # Örnek: HTTP flood tespiti, SSH brute force vs.
        # Uygun bulursak DB'ye log, firewall rule ekleme vs.

def start_sniffer():
    sniff(filter="tcp", prn=packet_callback, store=0)

def start_layer7_inspect():
    t = threading.Thread(target=start_sniffer, daemon=True)
    t.start()
