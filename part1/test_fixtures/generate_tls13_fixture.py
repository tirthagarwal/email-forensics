import datetime
import binascii
import os
import struct
from pathlib import Path

from cryptography import x509
from cryptography.x509.oid import NameOID
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa

from scapy.all import Ether, IP, TCP, wrpcap
from scapy.layers.tls.all import TLS, TLSClientHello, TLSServerHello
from scapy.layers.tls.handshake import TLS13Certificate, _ASN1CertAndExt, Cert
from scapy.layers.tls.session import tlsSession, load_nss_keys

def generate_tls13_fixtures():
    out_dir = Path("part1/test_fixtures")
    out_dir.mkdir(parents=True, exist_ok=True)

    # 1. Generate RSA 2048 certificate
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    subject = issuer = x509.Name([
        x509.NameAttribute(NameOID.COMMON_NAME, "mail.example.local"),
        x509.NameAttribute(NameOID.ORGANIZATION_NAME, "Email Forensics Test CA"),
    ])
    cert = x509.CertificateBuilder().subject_name(
        subject
    ).issuer_name(
        issuer
    ).public_key(
        key.public_key()
    ).serial_number(
        987654321
    ).not_valid_before(
        datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=10)
    ).not_valid_after(
        datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=355)
    ).add_extension(
        x509.SubjectAlternativeName([x509.DNSName("mail.example.local")]),
        critical=False
    ).sign(key, hashes.SHA256())

    der_bytes = cert.public_bytes(serialization.Encoding.DER)
    cert_obj = Cert(der_bytes)

    # 2. Fixed client random bytes & dummy secrets for keylog
    gmt = 0x00112233
    rand28 = binascii.unhexlify("445566778899aabbccddeeff00112233445566778899aabbccddeeff")[:28]
    full_client_random = struct.pack("!I", gmt) + rand28
    client_random_hex = full_client_random.hex()

    shts = os.urandom(32)
    chts = os.urandom(32)
    shts_hex = shts.hex()
    chts_hex = chts.hex()

    # Write valid keylog
    keylog_file = out_dir / "tls13_keylog_real.txt"
    keylog_content = (
        f"# SSL/TLS secrets log file for TLS 1.3 decryption testing\n"
        f"CLIENT_HANDSHAKE_TRAFFIC_SECRET {client_random_hex} {chts_hex}\n"
        f"SERVER_HANDSHAKE_TRAFFIC_SECRET {client_random_hex} {shts_hex}\n"
    )
    keylog_file.write_text(keylog_content, encoding="utf-8")

    # Write invalid / non-matching keylog
    invalid_keylog_file = out_dir / "tls13_keylog_invalid.txt"
    invalid_client_random = os.urandom(32).hex()
    invalid_shts = os.urandom(32).hex()
    invalid_keylog_content = (
        f"# Mismatched keylog file\n"
        f"SERVER_HANDSHAKE_TRAFFIC_SECRET {invalid_client_random} {invalid_shts}\n"
    )
    invalid_keylog_file.write_text(invalid_keylog_content, encoding="utf-8")

    # 3. Create raw TLS records
    base_ether = Ether(src="00:11:22:33:44:55", dst="66:77:88:99:aa:bb")
    base_ip_c2s = IP(src="192.168.1.100", dst="192.168.1.200")
    base_ip_s2c = IP(src="192.168.1.200", dst="192.168.1.100")
    base_tcp_c2s = TCP(sport=54321, dport=25, seq=1000, ack=2000, flags="PA")
    base_tcp_s2c = TCP(sport=25, dport=54321, seq=2000, ack=1000, flags="PA")

    pkts = []

    # ClientHello packet
    ch = TLSClientHello(gmt_unix_time=gmt, random_bytes=rand28)
    tls_ch_bytes = bytes(TLS(msg=[ch]))
    pkt_ch = base_ether / base_ip_c2s / base_tcp_c2s / tls_ch_bytes
    pkts.append(pkt_ch)

    # ServerHello packet
    sh = TLSServerHello(version=0x0303, random_bytes=os.urandom(28))
    tls_sh_bytes = bytes(TLS(msg=[sh]))
    pkt_sh = base_ether / base_ip_s2c / base_tcp_s2c / tls_sh_bytes
    pkts.append(pkt_sh)

    # Certificate packet (TLS13 Certificate message)
    asn1_cert = _ASN1CertAndExt(cert=cert_obj)
    cert_msg = TLS13Certificate(certs=[asn1_cert])
    tls_cert_bytes = bytes(TLS(msg=[cert_msg]))
    pkt_cert = base_ether / base_ip_s2c / base_tcp_s2c / tls_cert_bytes
    pkts.append(pkt_cert)

    pcap_file = out_dir / "tls13_keylog_real.pcap"
    wrpcap(str(pcap_file), pkts)
    print(f"Generated test fixtures:")
    print(f"  PCAP: {pcap_file} ({len(pkts)} packets)")
    print(f"  Valid Keylog: {keylog_file}")
    print(f"  Invalid Keylog: {invalid_keylog_file}")

if __name__ == "__main__":
    generate_tls13_fixtures()
