import re
import json

SMTP_PORTS = {25, 465, 587}
IMAP_PORTS = {143, 993}
POP3_PORTS = {110, 995}

IMPLICIT_TLS_PORTS = {465, 993, 995}

class EmailProtocolParser:
    def __init__(self):
        pass

    def analyze_session(self, conn_record, smtp_record=None, ssl_record=None, raw_payloads=None):
        if raw_payloads is None:
            raw_payloads = []

        src_port = int(conn_record.get("id.orig_p") or 0)
        dst_port = int(conn_record.get("id.resp_p") or 0)
        service = (conn_record.get("service") or "").lower()

        # 1. Determine Protocol
        protocol = "UNKNOWN"
        if "smtp" in service or src_port in SMTP_PORTS or dst_port in SMTP_PORTS:
            protocol = "SMTP"
        elif "imap" in service or src_port in IMAP_PORTS or dst_port in IMAP_PORTS:
            protocol = "IMAP"
        elif "pop" in service or src_port in POP3_PORTS or dst_port in POP3_PORTS:
            protocol = "POP3"

        # Check raw payloads if available for deeper protocol inference
        full_text = "\n".join(raw_payloads).upper()
        if protocol == "UNKNOWN":
            if any(cmd in full_text for cmd in ["EHLO", "HELO", "MAIL FROM:", "RCPT TO:", "220 ", "250-STARTTLS"]):
                protocol = "SMTP"
            elif any(cmd in full_text for cmd in ["* OK", "CAPABILITY", "A1 LOGIN", "SELECT INBOX"]):
                protocol = "IMAP"
            elif any(cmd in full_text for cmd in ["+OK", "USER ", "PASS ", "STLS"]):
                protocol = "POP3"

        # 2. STARTTLS / STLS / Implicit TLS Analysis
        starttls_attempted = False
        starttls_accepted = False
        implicit_tls = dst_port in IMPLICIT_TLS_PORTS or src_port in IMPLICIT_TLS_PORTS
        tls_established = bool(ssl_record and ssl_record.get("established") is True) or ("ssl" in service and implicit_tls)

        if protocol == "SMTP":
            if smtp_record:
                if smtp_record.get("tls") is True or (smtp_record.get("last_reply") and "220" in smtp_record.get("last_reply")):
                    starttls_attempted = True
                    starttls_accepted = True
            if "STARTTLS" in full_text:
                starttls_attempted = True
                if "220" in full_text:
                    starttls_accepted = True

        elif protocol == "IMAP":
            if "STARTTLS" in full_text:
                starttls_attempted = True
                if "OK" in full_text:
                    starttls_accepted = True

        elif protocol == "POP3":
            if "STLS" in full_text:
                starttls_attempted = True
                if "+OK" in full_text:
                    starttls_accepted = True

        # Encryption Mode Classification
        if implicit_tls and tls_established:
            encryption_mode = "IMPLICIT_TLS"
        elif starttls_accepted and tls_established:
            encryption_mode = "STARTTLS_ACCEPTED"
        elif starttls_attempted:
            encryption_mode = "STARTTLS_OFFERED"
        elif tls_established:
            encryption_mode = "ENCRYPTED_TLS"
        else:
            encryption_mode = "PLAINTEXT"

        # 3. Authentication Observation
        auth_observed = False
        plaintext_auth_risk = False

        if protocol == "SMTP":
            if smtp_record and (smtp_record.get("auth") or smtp_record.get("user")):
                auth_observed = True
            if "AUTH LOGIN" in full_text or "AUTH PLAIN" in full_text or "AUTH " in full_text:
                auth_observed = True

        elif protocol == "IMAP":
            if "LOGIN " in full_text or "AUTHENTICATE " in full_text:
                auth_observed = True

        elif protocol == "POP3":
            if "USER " in full_text or "PASS " in full_text or "AUTH " in full_text:
                auth_observed = True

        if auth_observed and encryption_mode == "PLAINTEXT":
            plaintext_auth_risk = True

        # 4. Commands Extracted
        extracted_commands = []
        if protocol == "SMTP":
            for cmd in ["EHLO", "HELO", "STARTTLS", "AUTH", "MAIL FROM", "RCPT TO", "DATA", "QUIT"]:
                if cmd in full_text:
                    extracted_commands.append(cmd)
        elif protocol == "IMAP":
            for cmd in ["CAPABILITY", "STARTTLS", "LOGIN", "AUTHENTICATE", "SELECT", "LOGOUT"]:
                if cmd in full_text:
                    extracted_commands.append(cmd)
        elif protocol == "POP3":
            for cmd in ["STLS", "USER", "PASS", "AUTH", "LIST", "RETR", "QUIT"]:
                if cmd in full_text:
                    extracted_commands.append(cmd)

        return {
            "protocol": protocol,
            "encryption_mode": encryption_mode,
            "starttls_attempted": starttls_attempted,
            "starttls_accepted": starttls_accepted,
            "implicit_tls": implicit_tls,
            "tls_established": tls_established,
            "authentication_observed": auth_observed,
            "plaintext_auth_risk": plaintext_auth_risk,
            "extracted_commands": extracted_commands,
            "helo": smtp_record.get("helo") if smtp_record else None,
            "last_reply": smtp_record.get("last_reply") if smtp_record else None
        }

def main():
    parser = EmailProtocolParser()

    # Test SMTP session mock
    sample_conn = {"id.orig_h": "192.168.1.50", "id.orig_p": 54321, "id.resp_h": "192.168.1.20", "id.resp_p": 25, "service": "smtp,ssl"}
    sample_smtp = {"helo": "client.example.local", "tls": True, "last_reply": "220 2.0.0 Ready to start TLS"}
    sample_ssl = {"established": True}
    sample_raw = ["220 mail.example.local ESMTP ready", "EHLO client.example.local", "STARTTLS", "220 2.0.0 Ready to start TLS"]

    result = parser.analyze_session(sample_conn, sample_smtp, sample_ssl, sample_raw)
    print("Email Protocol Parser Test Result:")
    print(json.dumps(result, indent=2))

if __name__ == "__main__":
    main()
