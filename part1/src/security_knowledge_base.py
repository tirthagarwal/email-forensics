KNOWLEDGE_BASE = {
    "SMTP_NO_STARTTLS": {
        "title": "Cleartext SMTP Connection without STARTTLS",
        "description": "The SMTP session was established over plain TCP on port 25 or 587 without negotiating STARTTLS encryption.",
        "security_impact": "Eavesdroppers and active network adversaries can read, modify, or inject email messages, credentials, and headers in transit.",
        "references": ["RFC 7590 (Use of TLS in Email Applications)", "NIST SP 800-45 Rev 2 (Guidelines on Electronic Mail Security)"],
        "technical_remediation": "Reconfigure SMTP MTA (PostFix, Exim, Sendmail) to mandate STARTTLS: `smtpd_tls_security_level = encrypt`."
    },
    "IMAP_NO_STARTTLS": {
        "title": "Cleartext IMAP Session",
        "description": "IMAP session established on port 143 without STARTTLS or implicit TLS.",
        "security_impact": "Mailbox contents and user authentication credentials are exposed to passive eavesdropping.",
        "references": ["RFC 8314 (Use of TLS for Email Submission and Access)"],
        "technical_remediation": "Disable plaintext port 143 or enforce STARTTLS / implicit TLS on port 993."
    },
    "POP3_NO_STLS": {
        "title": "Cleartext POP3 Session",
        "description": "POP3 session established on port 110 without STLS or implicit TLS.",
        "security_impact": "Email downloads and user credentials transmitted unencrypted.",
        "references": ["RFC 8314 (Use of TLS for Email Submission and Access)"],
        "technical_remediation": "Disable plaintext port 110 or enforce STLS / implicit TLS on port 995."
    },
    "PLAINTEXT_AUTH_EXPOSURE": {
        "title": "Plaintext Authentication Observed",
        "description": "User authentication credentials (AUTH PLAIN/LOGIN, USER/PASS) were transmitted prior to TLS encryption.",
        "security_impact": "Immediate exposure of user passwords to network sniffing and credential harvesting attacks.",
        "references": ["RFC 8314 Section 3.3", "CWE-319 (Cleartext Transmission of Sensitive Information)"],
        "technical_remediation": "Disable AUTH commands over unencrypted channels until TLS handshake successfully completes."
    },
    "TLS_DEPRECATED_VERSION": {
        "title": "Deprecated TLS Protocol Version Negotiated",
        "description": "Session negotiated SSLv2, SSLv3, TLS 1.0, or TLS 1.1.",
        "security_impact": "Vulnerable to cryptographic attacks including BEAST, POODLE, and downgrade attacks.",
        "references": ["RFC 8996 (Deprecating TLS 1.0 and TLS 1.1)", "NIST SP 800-52 Rev 2"],
        "technical_remediation": "Configure TLS server engine to mandate minimum TLS protocol version 1.2 or 1.3."
    },
    "TLS_WEAK_CIPHER": {
        "title": "Weak or Insecure Cipher Suite",
        "description": "Session negotiated a cipher suite utilizing RC4, 3DES, NULL, EXPORT, or unauthenticated ciphers.",
        "security_impact": "Exposes traffic to brute-force decryption, Sweet32 attacks, and MITM tampering.",
        "references": ["RFC 7457 (Summarizing Known Attacks on TLS)", "NIST SP 800-52 Rev 2"],
        "technical_remediation": "Update cipher configuration string to: `ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384`."
    },
    "TLS_NO_FORWARD_SECRECY": {
        "title": "Lack of Perfect Forward Secrecy (PFS)",
        "description": "Cipher suite uses static RSA key exchange instead of ephemeral Diffie-Hellman (ECDHE/DHE).",
        "security_impact": "If the server's private key is compromised in the future, past recorded encrypted network sessions can be retroactively decrypted.",
        "references": ["RFC 7590 Section 4", "NIST SP 800-52 Rev 2 Section 3.3.1"],
        "technical_remediation": "Prioritize ECDHE key exchange cipher suites in server TLS configuration."
    },
    "CERT_SELF_SIGNED": {
        "title": "Self-Signed Certificate in Use",
        "description": "Server certificate subject matches issuer and is not signed by a trusted Certificate Authority.",
        "security_impact": "Clients cannot verify server identity, exposing connections to Man-in-the-Middle (MITM) spoofing.",
        "references": ["RFC 5280 (X.509 PKI Profile)", "CWE-295 (Improper Certificate Validation)"],
        "technical_remediation": "Replace self-signed certificate with an X.509 certificate issued by a trusted public CA (e.g. Let's Encrypt) or internal enterprise PKI."
    },
    "CERT_EXPIRED": {
        "title": "Expired X.509 Certificate",
        "description": "Server certificate valid-until timestamp is in the past.",
        "security_impact": "Causes client connection failures, security warnings, and potential MITM risks.",
        "references": ["RFC 5280 Section 4.1.2.5"],
        "technical_remediation": "Renew and deploy an updated certificate immediately."
    },
    "CERT_WEAK_KEY_SIZE": {
        "title": "Weak Certificate Public Key Length",
        "description": "Server certificate public key length (e.g. RSA < 2048 bits) is below cryptographic security requirements.",
        "security_impact": "Vulnerable to key factorization and signature forgery attacks.",
        "references": ["NIST SP 800-57 Part 1 Rev 5"],
        "technical_remediation": "Re-issue certificate with RSA key length >= 2048 bits or ECDSA key length >= 256 bits."
    },
    "CERT_WEAK_SIG_ALG": {
        "title": "Weak Certificate Signature Algorithm",
        "description": "Certificate was signed using SHA-1 or MD5 hashing algorithms.",
        "security_impact": "Vulnerable to cryptographic collision attacks enabling certificate forgery.",
        "references": ["RFC 6151", "NIST SP 800-131A Rev 2"],
        "technical_remediation": "Re-issue certificate using SHA-256 or SHA-384 signature digest algorithms."
    },
    "CERT_HOSTNAME_MISMATCH": {
        "title": "Certificate Hostname Mismatch",
        "description": "SNI or requested FQDN does not match the certificate Subject Common Name or Subject Alternative Names (SAN).",
        "security_impact": "Exposes clients to server impersonation or misconfigured virtual hosting risks.",
        "references": ["RFC 6125 (Representation and Verification of Domain-Based Application Service Identity)"],
        "technical_remediation": "Ensure Subject Alternative Name (SAN) extension includes all valid server hostnames."
    }
}

def get_rule_knowledge(rule_id):
    return KNOWLEDGE_BASE.get(rule_id, {
        "title": rule_id,
        "description": "Security anomaly detected.",
        "security_impact": "General cryptographic posture risk.",
        "references": ["NIST SP 800-52 Rev 2"],
        "technical_remediation": "Review server TLS/SSL and protocol configurations."
    })
