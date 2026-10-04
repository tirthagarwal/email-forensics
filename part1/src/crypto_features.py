import time
import json
from pathlib import Path

DEPRECATED_TLS_VERSIONS = {"SSLv2", "SSLv3", "TLSv10", "TLSv1.0", "TLSv11", "TLSv1.1"}
WEAK_CIPHER_KEYWORDS = {"RC4", "3DES", "DES", "EXPORT", "NULL", "MD5", "ANON", "CBC_SHA", "RC2"}
WEAK_KEY_EXCHANGE_KEYWORDS = {"ANON", "EXPORT", "NULL", "RSA"} # Cipher suites using plain RSA key exchange without DHE/ECDHE
FORWARD_SECRECY_KEYWORDS = {"ECDHE", "DHE", "EDH"}
WEAK_SIG_ALGS = {"MD5", "MD2", "SHA1", "SHA1WITHRSA", "MD5WITHRSA"}

def extract_crypto_features(session_data, current_timestamp=None):
    if current_timestamp is None:
        current_timestamp = time.time()

    conn = session_data.get("connection", {})
    email_proto = session_data.get("email_protocol", {})
    tls = session_data.get("tls", {})
    cert = session_data.get("certificate") or {}
    notices = session_data.get("zeek_notices", [])

    protocol = email_proto.get("protocol") or "UNKNOWN"
    starttls_detected = email_proto.get("starttls_attempted", False)
    starttls_accepted = email_proto.get("starttls_accepted", False)
    implicit_tls = email_proto.get("implicit_tls", False)
    tls_established = email_proto.get("tls_established", False)
    auth_observed = email_proto.get("authentication_observed", False)
    plaintext_auth_risk = email_proto.get("plaintext_auth_risk", False)

    tls_version = tls.get("version")
    cipher_suite = tls.get("cipher")
    curve = tls.get("curve")
    server_name = tls.get("server_name")

    # Derived TLS Indicators
    weak_tls_version = None
    if tls_version:
        weak_tls_version = tls_version in DEPRECATED_TLS_VERSIONS

    weak_cipher = None
    forward_secrecy = None
    weak_key_exchange = None

    if cipher_suite:
        cipher_upper = cipher_suite.upper()
        weak_cipher = any(kw in cipher_upper for kw in WEAK_CIPHER_KEYWORDS)
        forward_secrecy = any(kw in cipher_upper for kw in FORWARD_SECRECY_KEYWORDS)
        # If cipher uses plain RSA without ECDHE/DHE, flag key exchange as weak / non-PFS
        if not forward_secrecy:
            weak_key_exchange = True
        else:
            weak_key_exchange = False

    weak_curve = None
    if curve:
        # e.g., secp192r1 or weak curves
        if "192" in curve or "160" in curve:
            weak_curve = True
        else:
            weak_curve = False

    # Certificate Features
    cert_self_signed = None
    cert_expired = None
    cert_not_yet_valid = None
    cert_days_remaining = None
    cert_hostname_match = tls.get("sni_matches_cert")
    cert_key_size = cert.get("key_length")
    key_alg = cert.get("key_algorithm")
    sig_alg = cert.get("signature_algorithm")

    weak_key_size = None
    weak_signature_algorithm = None

    if cert:
        not_before = cert.get("not_valid_before")
        not_after = cert.get("not_valid_after")
        subject = cert.get("subject")
        issuer = cert.get("issuer")

        if not_before is not None:
            cert_not_yet_valid = current_timestamp < not_before

        if not_after is not None:
            cert_expired = current_timestamp > not_after
            seconds_remaining = not_after - current_timestamp
            cert_days_remaining = round(seconds_remaining / 86400.0, 2)

        if subject and issuer:
            cert_self_signed = (subject == issuer)

        if cert_key_size is not None:
            key_type = (cert.get("key_type") or "").lower()
            if "rsa" in key_type or "dsa" in key_type:
                weak_key_size = cert_key_size < 2048
            elif "ec" in key_type or "ecdsa" in key_type:
                weak_key_size = cert_key_size < 256

        if sig_alg:
            sig_upper = sig_alg.upper()
            weak_signature_algorithm = any(kw in sig_upper for kw in WEAK_SIG_ALGS)

    val_status = tls.get("validation_status") or ""
    cert_problem = (
        cert_expired is True or
        cert_not_yet_valid is True or
        cert_self_signed is True or
        cert_hostname_match is False or
        weak_key_size is True or
        weak_signature_algorithm is True or
        "failed" in val_status.lower() or
        "self signed" in val_status.lower() or
        any(n.get("note") == "SSL::Invalid_Server_Cert" for n in notices)
    )

    missing_starttls = (protocol in ["SMTP", "IMAP", "POP3"]) and (not starttls_detected) and (not implicit_tls)
    failed_starttls = starttls_detected and (not starttls_accepted)
    deprecated_crypto = (weak_tls_version is True) or (weak_cipher is True) or (weak_signature_algorithm is True)

    # Certificate Visibility Status
    has_cert_data = any(
        x is not None
        for x in (cert_key_size, sig_alg, cert_self_signed, cert_days_remaining, key_alg, cert_hostname_match)
    )

    if has_cert_data:
        cert_visibility_status = "OBSERVED"
        if tls.get("decryption_status") == "DECRYPTED":
            cert_visibility_reason = "Certificate fields extracted from decrypted TLS 1.3 handshake"
        else:
            cert_visibility_reason = "Certificate fields extracted from X.509 evidence"
    elif tls_version in ("TLSv13", "TLSv1.3"):
        cert_visibility_status = "VISIBILITY_LIMITED"
        dec_status = tls.get("decryption_status")
        if dec_status and dec_status != "NOT_APPLICABLE":
            cert_visibility_reason = f"TLS 1.3 certificate limited in passive capture (Authorized Keylog Decryption Status: {dec_status})"
        else:
            cert_visibility_reason = "TLS 1.3 handshake certificate not available in passive capture"
    else:
        cert_visibility_status = "NOT_OBSERVED"
        cert_visibility_reason = "No certificate evidence associated with TLS session"

    feature_vector = {
        "uid": session_data.get("uid"),
        "protocol": protocol,
        "starttls_detected": starttls_detected,
        "starttls_accepted": starttls_accepted,
        "implicit_tls": implicit_tls,
        "tls_established": tls_established,
        "authentication_observed": auth_observed,
        "plaintext_auth_risk": plaintext_auth_risk,
        "server_name": server_name,
        "tls_version": tls_version,
        "cipher_suite": cipher_suite,
        "elliptic_curve": curve,
        "key_exchange": "ECDHE/DHE" if forward_secrecy else ("RSA" if cipher_suite else None),
        "forward_secrecy_indicator": forward_secrecy,
        "weak_tls_version": weak_tls_version,
        "weak_cipher": weak_cipher,
        "weak_key_exchange": weak_key_exchange,
        "weak_curve": weak_curve,
        "certificate_visibility_status": cert_visibility_status,
        "certificate_visibility_reason": cert_visibility_reason,
        "certificate_public_key_algorithm": key_alg,
        "certificate_signature_algorithm": sig_alg,
        "certificate_key_size": cert_key_size,
        "weak_key_size": weak_key_size,
        "weak_signature_algorithm": weak_signature_algorithm,
        "certificate_self_signed": cert_self_signed,
        "certificate_expired": cert_expired,
        "certificate_not_yet_valid": cert_not_yet_valid,
        "certificate_days_remaining": cert_days_remaining,
        "certificate_hostname_match": cert_hostname_match,
        "certificate_problem": cert_problem,
        "missing_starttls": missing_starttls,
        "failed_starttls": failed_starttls,
        "deprecated_crypto": deprecated_crypto,
        "ja3": tls.get("ja3"),
        "ja3s": tls.get("ja3s"),
        "ja4": tls.get("ja4"),
        "ja4s": tls.get("ja4s")
    }

    return feature_vector

def main():
    input_file = Path("part1/output/tls_analysis.json")
    if not input_file.exists():
        print(f"Error: {input_file} not found.")
        return

    with open(input_file, "r") as f:
        data = json.load(f)

    sessions = data.get("sessions", [])
    extracted_features = [extract_crypto_features(s) for s in sessions]

    print("Extracted Cryptographic Features:")
    print(json.dumps(extracted_features, indent=2))

if __name__ == "__main__":
    main()
