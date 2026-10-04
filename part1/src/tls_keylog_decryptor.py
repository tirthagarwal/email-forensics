import os
import json
import binascii
import hashlib
from collections import defaultdict
from pathlib import Path

from cryptography import x509
from cryptography.hazmat.primitives.asymmetric import rsa, ec, dsa
from scapy.all import PcapReader, TCP
from scapy.layers.tls.all import TLS
from scapy.layers.tls.session import tlsSession

def parse_nss_keylog(keylog_path):
    """
    Parses an NSS Keylog file into a dictionary mapping labels to {client_random: secret}.
    Handles empty lines, comments, tabs, and hex parsing errors gracefully.
    Does NOT log or print sensitive secret bytes.
    """
    keys = defaultdict(dict)
    keylog_path = Path(keylog_path)
    if not keylog_path.exists():
        return {}

    try:
        with open(keylog_path, "r", encoding="utf-8", errors="ignore") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                parts = line.split()
                if len(parts) != 3:
                    continue
                label, client_rand_hex, secret_hex = parts
                label = label.upper()
                try:
                    client_random = binascii.unhexlify(client_rand_hex)
                    secret = binascii.unhexlify(secret_hex)
                    keys[label][client_random] = secret
                except (ValueError, binascii.Error):
                    continue
        return dict(keys)
    except Exception:
        return {}

def extract_certificate_from_x509_bytes(der_bytes):
    """
    Converts raw DER bytes of an X.509 certificate into a normalized dictionary
    compatible with the forensic pipeline's certificate features.
    """
    try:
        cert = x509.load_der_x509_certificate(der_bytes)
        fp = hashlib.sha256(der_bytes).hexdigest()
        subject = cert.subject.rfc4514_string()
        issuer = cert.issuer.rfc4514_string()
        serial = str(cert.serial_number)

        not_before = cert.not_valid_before_utc.timestamp()
        not_after = cert.not_valid_after_utc.timestamp()

        sig_alg = getattr(cert.signature_algorithm_oid, "_name", str(cert.signature_algorithm_oid))

        pub_key = cert.public_key()
        key_length = pub_key.key_size
        exponent = None

        if isinstance(pub_key, rsa.RSAPublicKey):
            key_type = "rsa"
            key_alg = "rsaEncryption"
            exponent = pub_key.public_numbers().e
        elif isinstance(pub_key, ec.EllipticCurvePublicKey):
            key_type = "ec"
            key_alg = "id-ecPublicKey"
        elif isinstance(pub_key, dsa.DSAPublicKey):
            key_type = "dsa"
            key_alg = "dsaEncryption"
        else:
            key_type = "unknown"
            key_alg = str(pub_key.__class__.__name__)

        return {
            "fingerprint_sha256": fp,
            "subject": subject,
            "issuer": issuer,
            "serial": serial,
            "not_valid_before": not_before,
            "not_valid_after": not_after,
            "key_algorithm": key_alg,
            "signature_algorithm": sig_alg,
            "key_type": key_type,
            "key_length": key_length,
            "exponent": str(exponent) if exponent is not None else None
        }
    except Exception as e:
        return None

def decrypt_tls13_pcap_certificates(pcap_path, keylog_path):
    """
    Attempts authorized TLS 1.3 decryption on a PCAP file using an NSS Keylog file.
    Returns a dictionary summarizing decryption status and extracted certificates.
    """
    keylog_path = Path(keylog_path) if keylog_path else None
    if not keylog_path or not keylog_path.exists():
        return {
            "success": False,
            "decryption_status": "KEYLOG_NOT_FOUND",
            "certificates": [],
            "reason": "Authorized TLS keylog file not found or not provided."
        }

    nss_keys = parse_nss_keylog(keylog_path)
    if not nss_keys:
        return {
            "success": False,
            "decryption_status": "KEYLOG_INVALID",
            "certificates": [],
            "reason": "NSS keylog file exists but contains no valid key entries."
        }

    pcap_path = Path(pcap_path)
    if not pcap_path.exists():
        return {
            "success": False,
            "decryption_status": "PCAP_NOT_FOUND",
            "certificates": [],
            "reason": f"PCAP file {pcap_path} not found."
        }

    try:
        sess = tlsSession(connection_end="client")
        sess.nss_keys = nss_keys
        sess.tls_version = 0x0304

        with PcapReader(str(pcap_path)) as pcap:
            for pkt in pcap:
                if TCP in pkt and pkt[TCP].payload:
                    payload = bytes(pkt[TCP].payload)
                    if len(payload) >= 5 and payload[0] in (0x16, 0x14, 0x17, 0x15):
                        try:
                            TLS(payload, tls_session=sess)
                        except Exception:
                            pass

        parsed_certs = []
        if hasattr(sess, "server_certs") and sess.server_certs:
            for cert_obj in sess.server_certs:
                der_bytes = getattr(cert_obj, "der", None)
                if der_bytes:
                    cert_data = extract_certificate_from_x509_bytes(der_bytes)
                    if cert_data:
                        parsed_certs.append(cert_data)

        if parsed_certs:
            return {
                "success": True,
                "decryption_status": "DECRYPTED",
                "certificates": parsed_certs,
                "reason": f"Successfully decrypted TLS 1.3 handshake and extracted {len(parsed_certs)} certificate(s)."
            }
        else:
            return {
                "success": False,
                "decryption_status": "NO_MATCH",
                "certificates": [],
                "reason": "TLS keylog supplied, but session keys did not match PCAP or no certificates were recovered."
            }
    except Exception as e:
        return {
            "success": False,
            "decryption_status": "DECRYPTION_ERROR",
            "certificates": [],
            "reason": f"TLS decryption error: {str(e)}"
        }

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 2:
        res = decrypt_tls13_pcap_certificates(sys.argv[1], sys.argv[2])
        print(f"Decryption result status: {res['decryption_status']}")
        print(f"Reason: {res['reason']}")
        print(f"Extracted certificates count: {len(res['certificates'])}")
