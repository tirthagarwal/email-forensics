from scapy.all import Ether, IP, TCP, wrpcap

packets = []

client_ip = "192.168.1.10"
server_ip = "192.168.1.20"
client_port = 50000
server_port = 25

# TCP handshake
packets.append(Ether()/IP(src=client_ip, dst=server_ip)/TCP(
    sport=client_port, dport=server_port, flags="S", seq=1000
))

packets.append(Ether()/IP(src=server_ip, dst=client_ip)/TCP(
    sport=server_port, dport=client_port, flags="SA", seq=2000, ack=1001
))

packets.append(Ether()/IP(src=client_ip, dst=server_ip)/TCP(
    sport=client_port, dport=server_port, flags="A", seq=1001, ack=2001
))

# SMTP server greeting
packets.append(Ether()/IP(src=server_ip, dst=client_ip)/TCP(
    sport=server_port, dport=client_port, flags="PA",
    seq=2001, ack=1001
)/b"220 mail.example.com ESMTP\r\n")

# EHLO
packets.append(Ether()/IP(src=client_ip, dst=server_ip)/TCP(
    sport=client_port, dport=server_port, flags="PA",
    seq=1001, ack=2028
)/b"EHLO client.example.com\r\n")

# STARTTLS
packets.append(Ether()/IP(src=client_ip, dst=server_ip)/TCP(
    sport=client_port, dport=server_port, flags="PA",
    seq=1027, ack=2028
)/b"STARTTLS\r\n")

# Server response
packets.append(Ether()/IP(src=server_ip, dst=client_ip)/TCP(
    sport=server_port, dport=client_port, flags="PA",
    seq=2028, ack=1037
)/b"220 2.0.0 Ready to start TLS\r\n")

wrpcap("part1/pcaps/smtp_test.pcap", packets)

print("Created part1/pcaps/smtp_test.pcap")
print(f"Packets: {len(packets)}")
