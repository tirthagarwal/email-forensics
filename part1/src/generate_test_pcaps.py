import ssl
import time
from scapy.all import Ether, IP, TCP, wrpcap

CERTFILE = "part1/test_tls/server.crt"
KEYFILE = "part1/test_tls/server.key"

def create_email_tls_pcap(pcap_path, proto_type="SMTP"):
    client_ctx = ssl.create_default_context(ssl.Purpose.SERVER_AUTH)
    client_ctx.check_hostname = False
    client_ctx.verify_mode = ssl.CERT_NONE
    client_ctx.maximum_version = ssl.TLSVersion.TLSv1_2

    server_ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    server_ctx.load_cert_chain(certfile=CERTFILE, keyfile=KEYFILE)
    server_ctx.maximum_version = ssl.TLSVersion.TLSv1_2

    client_in, client_out = ssl.MemoryBIO(), ssl.MemoryBIO()
    server_in, server_out = ssl.MemoryBIO(), ssl.MemoryBIO()

    client_ssl = client_ctx.wrap_bio(client_in, client_out, server_side=False, server_hostname="mail.example.local")
    server_ssl = server_ctx.wrap_bio(server_in, server_out, server_side=True)

    packets = []
    timestamp = time.time() - 100

    client_ip = "192.168.1.50"
    server_ip = "192.168.1.20"

    if proto_type == "IMAP":
        client_port = 54322
        server_port = 143
    elif proto_type == "POP3":
        client_port = 54323
        server_port = 110
    else:
        client_port = 54321
        server_port = 25

    client_seq = 1000
    server_seq = 2000

    def add_pkt(src_i, dst_i, src_p, dst_p, flags, seq, ack, payload=b""):
        nonlocal timestamp
        timestamp += 0.01
        pkt = Ether()/IP(src=src_i, dst=dst_i)/TCP(sport=src_p, dport=dst_p, flags=flags, seq=seq, ack=ack)
        if payload:
            pkt = pkt / payload
        pkt.time = timestamp
        packets.append(pkt)

    def client_send(data):
        nonlocal client_seq, server_seq
        add_pkt(client_ip, server_ip, client_port, server_port, "PA", client_seq, server_seq, data)
        client_seq += len(data)
        add_pkt(server_ip, client_ip, server_port, client_port, "A", server_seq, client_seq)

    def server_send(data):
        nonlocal client_seq, server_seq
        add_pkt(server_ip, client_ip, server_port, client_port, "PA", server_seq, client_seq, data)
        server_seq += len(data)
        add_pkt(client_ip, server_ip, client_port, server_port, "A", client_seq, server_seq)

    # 1. TCP 3-Way Handshake
    add_pkt(client_ip, server_ip, client_port, server_port, "S", client_seq, 0)
    add_pkt(server_ip, client_ip, server_port, client_port, "SA", server_seq, client_seq + 1)
    client_seq += 1
    server_seq += 1
    add_pkt(client_ip, server_ip, client_port, server_port, "A", client_seq, server_seq)

    # 2. Cleartext Session Pre-TLS
    if proto_type == "SMTP":
        server_send(b"220 mail.example.local ESMTP ready\r\n")
        client_send(b"EHLO client.example.local\r\n")
        server_send(b"250-mail.example.local Hello\r\n250-STARTTLS\r\n250 OK\r\n")
        client_send(b"STARTTLS\r\n")
        server_send(b"220 2.0.0 Ready to start TLS\r\n")
    elif proto_type == "IMAP":
        server_send(b"* OK [CAPABILITY IMAP4rev1 STARTTLS] MailServer Ready\r\n")
        client_send(b"A001 CAPABILITY\r\n")
        server_send(b"* CAPABILITY IMAP4rev1 STARTTLS\r\nA001 OK Completed\r\n")
        client_send(b"A002 STARTTLS\r\n")
        server_send(b"A002 OK Begin TLS negotiation now\r\n")
    elif proto_type == "POP3":
        server_send(b"+OK POP3 server ready <12345.6789@example.local>\r\n")
        client_send(b"STLS\r\n")
        server_send(b"+OK Begin TLS negotiation\r\n")

    # 3. Real OpenSSL TLS 1.2 Handshake
    try:
        client_ssl.do_handshake()
    except ssl.SSLWantReadError:
        pass
    client_hello = client_out.read()
    client_send(client_hello)

    server_in.write(client_hello)
    try:
        server_ssl.do_handshake()
    except ssl.SSLWantReadError:
        pass
    server_hello = server_out.read()
    server_send(server_hello)

    client_in.write(server_hello)
    try:
        client_ssl.do_handshake()
    except ssl.SSLWantReadError:
        pass
    client_fin = client_out.read()
    if client_fin:
        client_send(client_fin)

    server_in.write(client_fin)
    try:
        server_ssl.do_handshake()
    except ssl.SSLWantReadError:
        pass
    server_fin = server_out.read()
    if server_fin:
        server_send(server_fin)
        client_in.write(server_fin)

    # 4. Encrypted Post-TLS Commands
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

    if proto_type == "SMTP":
        send_encrypted(b"EHLO client.example.local\r\n", b"250-mail.example.local\r\n250 HELP\r\n")
        send_encrypted(b"QUIT\r\n", b"221 2.0.0 Bye\r\n")
    elif proto_type == "IMAP":
        send_encrypted(b"A003 LOGIN user secretpass\r\n", b"A003 OK LOGIN completed\r\n")
        send_encrypted(b"A004 LOGOUT\r\n", b"* BYE IMAP4rev1 Server logging out\r\nA004 OK LOGOUT completed\r\n")
    elif proto_type == "POP3":
        send_encrypted(b"USER user\r\n", b"+OK User accepted\r\n")
        send_encrypted(b"PASS secretpass\r\n", b"+OK Pass accepted\r\n")
        send_encrypted(b"QUIT\r\n", b"+OK Signing off\r\n")

    # 5. TCP Teardown
    add_pkt(client_ip, server_ip, client_port, server_port, "FA", client_seq, server_seq)
    client_seq += 1
    add_pkt(server_ip, client_ip, server_port, client_port, "FA", server_seq, client_seq)
    server_seq += 1
    add_pkt(client_ip, server_ip, client_port, server_port, "A", client_seq, server_seq)

    wrpcap(pcap_path, packets)
    print(f"Generated {proto_type} PCAP ({len(packets)} packets) -> {pcap_path}")

if __name__ == "__main__":
    create_email_tls_pcap("part1/pcaps/smtp_starttls_real.pcap", "SMTP")
    create_email_tls_pcap("part1/pcaps/imap_starttls_real.pcap", "IMAP")
    create_email_tls_pcap("part1/pcaps/pop3_stls_real.pcap", "POP3")
