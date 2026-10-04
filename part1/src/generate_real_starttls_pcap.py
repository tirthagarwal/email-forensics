import ssl
import time
from scapy.all import Ether, IP, TCP, wrpcap

CLIENT_IP = "192.168.1.50"
SERVER_IP = "192.168.1.20"
CLIENT_PORT = 54321
SERVER_PORT = 25

CERTFILE = "part1/test_tls/server.crt"
KEYFILE = "part1/test_tls/server.key"

def create_real_starttls_pcap(pcap_path):
    client_ctx = ssl.create_default_context(ssl.Purpose.SERVER_AUTH)
    client_ctx.check_hostname = False
    client_ctx.verify_mode = ssl.CERT_NONE
    client_ctx.maximum_version = ssl.TLSVersion.TLSv1_2

    server_ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    server_ctx.load_cert_chain(certfile=CERTFILE, keyfile=KEYFILE)
    server_ctx.maximum_version = ssl.TLSVersion.TLSv1_2

    client_in = ssl.MemoryBIO()
    client_out = ssl.MemoryBIO()
    server_in = ssl.MemoryBIO()
    server_out = ssl.MemoryBIO()

    client_ssl = client_ctx.wrap_bio(client_in, client_out, server_side=False, server_hostname="mail.example.local")
    server_ssl = server_ctx.wrap_bio(server_in, server_out, server_side=True)

    packets = []
    timestamp = time.time() - 100

    client_seq = 1000
    server_seq = 2000

    def add_packet(src_ip, dst_ip, src_p, dst_p, flags, seq, ack, payload=b""):
        nonlocal timestamp
        timestamp += 0.01
        pkt = Ether()/IP(src=src_ip, dst=dst_ip)/TCP(sport=src_p, dport=dst_p, flags=flags, seq=seq, ack=ack)
        if payload:
            pkt = pkt / payload
        pkt.time = timestamp
        packets.append(pkt)

    # 1. TCP 3-Way Handshake
    add_packet(CLIENT_IP, SERVER_IP, CLIENT_PORT, SERVER_PORT, "S", client_seq, 0)
    add_packet(SERVER_IP, CLIENT_IP, SERVER_PORT, CLIENT_PORT, "SA", server_seq, client_seq + 1)
    client_seq += 1
    server_seq += 1
    add_packet(CLIENT_IP, SERVER_IP, CLIENT_PORT, SERVER_PORT, "A", client_seq, server_seq)

    def client_send(data):
        nonlocal client_seq, server_seq
        add_packet(CLIENT_IP, SERVER_IP, CLIENT_PORT, SERVER_PORT, "PA", client_seq, server_seq, data)
        client_seq += len(data)
        add_packet(SERVER_IP, CLIENT_IP, SERVER_PORT, CLIENT_PORT, "A", server_seq, client_seq)

    def server_send(data):
        nonlocal client_seq, server_seq
        add_packet(SERVER_IP, CLIENT_IP, SERVER_PORT, CLIENT_PORT, "PA", server_seq, client_seq, data)
        server_seq += len(data)
        add_packet(CLIENT_IP, SERVER_IP, CLIENT_PORT, SERVER_PORT, "A", client_seq, server_seq)

    # 2. Cleartext SMTP Session
    server_send(b"220 mail.example.local ESMTP ready\r\n")
    client_send(b"EHLO client.example.local\r\n")
    server_send(b"250-mail.example.local Hello\r\n250-STARTTLS\r\n250 OK\r\n")
    client_send(b"STARTTLS\r\n")
    server_send(b"220 2.0.0 Ready to start TLS\r\n")

    # 3. Real OpenSSL TLS 1.2 Handshake
    # Step A: Client ClientHello
    try:
        client_ssl.do_handshake()
    except ssl.SSLWantReadError:
        pass
    client_hello = client_out.read()
    client_send(client_hello)

    # Step B: Server ServerHello + Certificate + ServerKeyExchange + ServerHelloDone
    server_in.write(client_hello)
    try:
        server_ssl.do_handshake()
    except ssl.SSLWantReadError:
        pass
    server_hello = server_out.read()
    server_send(server_hello)

    # Step C: Client ClientKeyExchange + ChangeCipherSpec + Finished
    client_in.write(server_hello)
    try:
        client_ssl.do_handshake()
    except ssl.SSLWantReadError:
        pass
    client_fin = client_out.read()
    if client_fin:
        client_send(client_fin)

    # Step D: Server ChangeCipherSpec + Finished ACK
    server_in.write(client_fin)
    try:
        server_ssl.do_handshake()
    except ssl.SSLWantReadError:
        pass
    server_fin = server_out.read()
    if server_fin:
        server_send(server_fin)
        client_in.write(server_fin)

    print(f"Handshake Established! Version: {client_ssl.version()}, Cipher: {client_ssl.cipher()}")

    # 4. Real Encrypted Application Data over TLS 1.2
    def send_encrypted(client_msg, server_resp):
        client_ssl.write(client_msg)
        enc_c = client_out.read()
        client_send(enc_c)

        server_in.write(enc_c)
        dec_c = server_ssl.read(1024)

        server_ssl.write(server_resp)
        enc_s = server_out.read()
        server_send(enc_s)

        client_in.write(enc_s)
        dec_s = client_ssl.read(1024)

    send_encrypted(b"EHLO client.example.local\r\n", b"250-mail.example.local\r\n250 HELP\r\n")
    send_encrypted(b"MAIL FROM:<sender@example.local>\r\n", b"250 2.1.0 Sender OK\r\n")
    send_encrypted(b"RCPT TO:<recipient@example.local>\r\n", b"250 2.1.5 Recipient OK\r\n")
    send_encrypted(b"QUIT\r\n", b"221 2.0.0 Bye\r\n")

    # 5. TCP Teardown
    add_packet(CLIENT_IP, SERVER_IP, CLIENT_PORT, SERVER_PORT, "FA", client_seq, server_seq)
    client_seq += 1
    add_packet(SERVER_IP, CLIENT_IP, SERVER_PORT, CLIENT_PORT, "FA", server_seq, client_seq)
    server_seq += 1
    add_packet(CLIENT_IP, SERVER_IP, CLIENT_PORT, SERVER_PORT, "A", client_seq, server_seq)

    wrpcap(pcap_path, packets)
    print(f"Successfully generated {len(packets)} real TLS 1.2 packets into {pcap_path}")

if __name__ == "__main__":
    create_real_starttls_pcap("part1/pcaps/smtp_starttls_real.pcap")
