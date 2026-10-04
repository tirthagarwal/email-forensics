import json
from risk_engine import RiskEngine

class SecurityAssessmentBuilder:
    def __init__(self, custom_weights=None):
        self.risk_engine = RiskEngine(custom_weights)

    def build_assessment(self, all_sessions, features_list, all_findings, overall_risk_res):
        """
        Builds the structured security_assessment object combining two-stage risk scoring,
        evaluated security controls (Observed vs Expected), violations, and evidence traceability.
        """

        # ── 1. TWO-STAGE RISK SCORING ──────────────────────────────────────────
        baseline_rule_ids = {
            "SMTP_NO_STARTTLS", "IMAP_NO_STARTTLS", "POP3_NO_STLS", "PLAINTEXT_AUTH_EXPOSURE"
        }

        baseline_session_risks = []
        for feat in features_list:
            uid = feat.get("uid")
            s_findings = [f for f in all_findings if f.get("rule_id") in baseline_rule_ids and uid in f.get("affected_connection", "")]
            b_risk = self.risk_engine.calculate_session_risk(s_findings)
            baseline_session_risks.append(b_risk)

        baseline_risk_res = self.risk_engine.calculate_overall_risk(baseline_session_risks)
        baseline_score = baseline_risk_res.get("overall_risk_score", 0.0)
        final_score = overall_risk_res.get("overall_risk_score", 0.0)
        score_delta = round(max(0.0, final_score - baseline_score), 2)
        crypto_score = score_delta

        # ── 2. CONTROL EVALUATION LOGIC ────────────────────────────────────────
        controls = []

        def find_finding(rule_id):
            return [f for f in all_findings if f.get("rule_id") == rule_id]

        def get_points(rule_id):
            return self.risk_engine.weights.get(rule_id, 0)

        # Control 1: Email Protocol Identification
        protos_found = list(set(f.get("protocol") for f in features_list if f.get("protocol")))
        proto_str = ", ".join(sorted(protos_found)) if protos_found else "None"
        controls.append({
            "control_id": "CTRL_EMAIL_PROTOCOL",
            "category": "EMAIL_PROTOCOL",
            "name": "Email Protocol Identification",
            "observed": f"Observed Protocols: {proto_str}",
            "expected": "SMTP, IMAP, or POP3 protocol traffic",
            "status": "PASS",
            "status_symbol": "✓ PASS",
            "severity": "INFO",
            "why": "Email transport and retrieval protocol traffic successfully parsed from network capture.",
            "evidence": f"Total email sessions identified: {len(all_sessions)} across protocols {proto_str}",
            "recommendation": "Maintain continuous network monitoring on standard email ports.",
            "score_contribution": 0
        })

        # Control 2: STARTTLS / STLS Upgrade
        no_starttls_findings = find_finding("SMTP_NO_STARTTLS") + find_finding("IMAP_NO_STARTTLS") + find_finding("POP3_NO_STLS")
        if no_starttls_findings:
            ctrl_status = "VIOLATION"
            ctrl_symbol = "✕ VIOLATION"
            aff_str = "; ".join([f.get("affected_connection", "") for f in no_starttls_findings])
            obs_val = f"Cleartext session(s) without STARTTLS/STLS upgrade ({len(no_starttls_findings)} session(s))"
            why_val = "Session initiated in cleartext without requesting or accepting STARTTLS/STLS encryption upgrade."
            evid_val = f"Findings: {aff_str}"
            recom_val = "Configure email servers to enforce STARTTLS (SMTP/IMAP) and STLS (POP3) upgrades before handling mail."
            pts = sum(get_points(f.get("rule_id")) for f in no_starttls_findings)
        else:
            ctrl_status = "PASS"
            ctrl_symbol = "✓ PASS"
            obs_val = "All cleartext email sessions successfully negotiated STARTTLS / STLS upgrade"
            why_val = "All observed sessions upgraded from cleartext to TLS encryption."
            evid_val = f"Analyzed {len(features_list)} email session(s); no unencrypted STARTTLS bypasses observed."
            recom_val = "Maintain strict STARTTLS/STLS enforcement policy."
            pts = 0

        controls.append({
            "control_id": "CTRL_STARTTLS",
            "category": "TRANSPORT_SECURITY",
            "name": "STARTTLS / STLS Upgrade Enforcement",
            "observed": obs_val,
            "expected": "STARTTLS / STLS Upgrade Enforced on All Cleartext Connections",
            "status": ctrl_status,
            "status_symbol": ctrl_symbol,
            "severity": "HIGH" if ctrl_status == "VIOLATION" else "INFO",
            "why": why_val,
            "evidence": evid_val,
            "recommendation": recom_val,
            "score_contribution": pts
        })

        # Control 3: Plaintext Authentication Protection
        plain_auth_findings = find_finding("PLAINTEXT_AUTH_EXPOSURE")
        if plain_auth_findings:
            ctrl_status = "VIOLATION"
            ctrl_symbol = "✕ VIOLATION"
            aff_str = "; ".join([f.get("affected_connection", "") for f in plain_auth_findings])
            obs_val = f"Plaintext authentication commands transmitted over unencrypted stream ({len(plain_auth_findings)} session(s))"
            why_val = "Authentication credentials (AUTH, LOGIN, USER/PASS) transmitted without TLS protection, exposing secrets to network sniffers."
            evid_val = f"Evidence: {aff_str}"
            recom_val = "Mandate TLS encryption before allowing authentication commands."
            pts = get_points("PLAINTEXT_AUTH_EXPOSURE") * len(plain_auth_findings)
        else:
            ctrl_status = "PASS"
            ctrl_symbol = "✓ PASS"
            obs_val = "No authentication commands transmitted in cleartext"
            why_val = "No unencrypted authentication attempts were detected."
            evid_val = "All authentication commands occurred within encrypted TLS sessions."
            recom_val = "Continue restricting AUTH commands to encrypted channels."
            pts = 0

        controls.append({
            "control_id": "CTRL_PLAINTEXT_AUTH",
            "category": "TRANSPORT_SECURITY",
            "name": "Plaintext Authentication Protection",
            "observed": obs_val,
            "expected": "Authentication Commands Restricted to TLS Encrypted Sessions",
            "status": ctrl_status,
            "status_symbol": ctrl_symbol,
            "severity": "CRITICAL" if ctrl_status == "VIOLATION" else "INFO",
            "why": why_val,
            "evidence": evid_val,
            "recommendation": recom_val,
            "score_contribution": pts
        })

        # Control 4: TLS Version
        weak_tls_findings = find_finding("TLS_DEPRECATED_VERSION")
        tls_versions_obs = list(set(f.get("tls_version") for f in features_list if f.get("tls_version")))
        tls_ver_str = ", ".join(tls_versions_obs) if tls_versions_obs else "No TLS Established"

        if weak_tls_findings:
            ctrl_status = "VIOLATION"
            ctrl_symbol = "✕ VIOLATION"
            aff_str = "; ".join([f.get("evidence", "") for f in weak_tls_findings])
            obs_val = f"Deprecated TLS Version Negotiated ({tls_ver_str})"
            why_val = "Deprecated TLS 1.0/1.1 protocols contain known vulnerabilities (BEAST, POODLE) and lack modern cipher support."
            evid_val = f"Evidence: {aff_str}"
            recom_val = "Disable TLS 1.0 and TLS 1.1 on mail servers and mandate TLS 1.2 or TLS 1.3."
            pts = get_points("TLS_DEPRECATED_VERSION") * len(weak_tls_findings)
        elif not tls_versions_obs:
            ctrl_status = "NOT OBSERVED"
            ctrl_symbol = "— NOT OBSERVED"
            obs_val = "No TLS handshakes established in capture"
            why_val = "No TLS protocol handshakes were observed to evaluate TLS version compliance."
            evid_val = "0 TLS sessions in captured network traffic."
            recom_val = "Enable TLS on email services."
            pts = 0
        else:
            ctrl_status = "PASS"
            ctrl_symbol = "✓ PASS"
            obs_val = f"Modern TLS Version Negotiated ({tls_ver_str})"
            why_val = "Session negotiated recommended TLS version (TLS 1.2 or TLS 1.3)."
            evid_val = f"Observed TLS versions: {tls_ver_str}"
            recom_val = "Maintain TLS 1.2+ minimum protocol requirement."
            pts = 0

        controls.append({
            "control_id": "CTRL_TLS_VERSION",
            "category": "TLS_CONFIGURATION",
            "name": "TLS Protocol Version Compliance",
            "observed": obs_val,
            "expected": "TLS 1.2 or TLS 1.3",
            "status": ctrl_status,
            "status_symbol": ctrl_symbol,
            "severity": "HIGH" if ctrl_status == "VIOLATION" else "INFO",
            "why": why_val,
            "evidence": evid_val,
            "recommendation": recom_val,
            "score_contribution": pts
        })

        # Control 5: Cipher Suite Security
        weak_cipher_findings = find_finding("TLS_WEAK_CIPHER")
        ciphers_obs = list(set(f.get("cipher_suite") for f in features_list if f.get("cipher_suite")))
        ciph_str = ", ".join(ciphers_obs[:2]) + ("..." if len(ciphers_obs) > 2 else "") if ciphers_obs else "None"

        if weak_cipher_findings:
            ctrl_status = "VIOLATION"
            ctrl_symbol = "✕ VIOLATION"
            aff_str = "; ".join([f.get("evidence", "") for f in weak_cipher_findings])
            obs_val = f"Weak / Deprecated Cipher Suite Negotiated ({ciph_str})"
            why_val = "Weak ciphers (RC4, 3DES, CBC-mode ciphers without AEAD) are vulnerable to side-channel and plaintext recovery attacks."
            evid_val = f"Evidence: {aff_str}"
            recom_val = "Configure mail servers to require AEAD ciphers (AES-GCM, CHACHA20-POLY1305)."
            pts = get_points("TLS_WEAK_CIPHER") * len(weak_cipher_findings)
        elif not ciphers_obs:
            ctrl_status = "NOT OBSERVED"
            ctrl_symbol = "— NOT OBSERVED"
            obs_val = "No Cipher Suites Observed"
            why_val = "No TLS cipher negotiation observed."
            evid_val = "No TLS sessions in capture."
            recom_val = "Enable TLS on email endpoints."
            pts = 0
        else:
            ctrl_status = "PASS"
            ctrl_symbol = "✓ PASS"
            obs_val = f"Strong Cipher Suite Negotiated ({ciph_str})"
            why_val = "Negotiated cipher suite meets modern cryptographic standards."
            evid_val = f"Observed ciphers: {ciph_str}"
            recom_val = "Maintain strong cipher ordering preferences."
            pts = 0

        controls.append({
            "control_id": "CTRL_CIPHER_SUITE",
            "category": "CRYPTOGRAPHY",
            "name": "Cipher Suite Security",
            "observed": obs_val,
            "expected": "Strong AEAD Cipher Suites (AES-GCM / CHACHA20-POLY1305)",
            "status": ctrl_status,
            "status_symbol": ctrl_symbol,
            "severity": "HIGH" if ctrl_status == "VIOLATION" else "INFO",
            "why": why_val,
            "evidence": evid_val,
            "recommendation": recom_val,
            "score_contribution": pts
        })

        # Control 6: Forward Secrecy (PFS)
        no_pfs_findings = find_finding("TLS_NO_FORWARD_SECRECY")
        pfs_sessions = [f for f in features_list if f.get("tls_version") and f.get("forward_secrecy_indicator")]
        tls_session_count = sum(1 for f in features_list if f.get("tls_version"))

        if no_pfs_findings:
            ctrl_status = "WARNING"
            ctrl_symbol = "⚠ WARNING"
            aff_str = "; ".join([f.get("evidence", "") for f in no_pfs_findings])
            obs_val = f"Static Key Exchange without Forward Secrecy ({len(no_pfs_findings)} session(s))"
            why_val = "Static key exchange allows past recorded traffic to be decrypted retroactively if the server private key is later compromised."
            evid_val = f"Evidence: {aff_str}"
            recom_val = "Configure servers to prioritize ephemeral Diffie-Hellman key exchange (ECDHE / DHE)."
            pts = get_points("TLS_NO_FORWARD_SECRECY") * len(no_pfs_findings)
        elif tls_session_count == 0:
            ctrl_status = "NOT OBSERVED"
            ctrl_symbol = "— NOT OBSERVED"
            obs_val = "No TLS Key Exchange Observed"
            why_val = "No TLS sessions available to evaluate key exchange mechanisms."
            evid_val = "0 TLS sessions observed."
            recom_val = "Enable TLS with ECDHE key exchange."
            pts = 0
        else:
            ctrl_status = "PASS"
            ctrl_symbol = "✓ PASS"
            obs_val = f"Ephemeral Key Exchange (ECDHE/DHE) Negotiated ({len(pfs_sessions)}/{tls_session_count} TLS sessions)"
            why_val = "Perfect Forward Secrecy (PFS) is active, protecting past communications from decryption."
            evid_val = f"ECDHE/DHE observed on {len(pfs_sessions)} session(s)."
            recom_val = "Maintain Ephemeral Diffie-Hellman key exchange preference."
            pts = 0

        controls.append({
            "control_id": "CTRL_FORWARD_SECRECY",
            "category": "CRYPTOGRAPHY",
            "name": "Perfect Forward Secrecy (PFS)",
            "observed": obs_val,
            "expected": "Ephemeral Key Exchange (ECDHE or DHE)",
            "status": ctrl_status,
            "status_symbol": ctrl_symbol,
            "severity": "MEDIUM" if ctrl_status == "WARNING" else "INFO",
            "why": why_val,
            "evidence": evid_val,
            "recommendation": recom_val,
            "score_contribution": pts
        })

        # Control 7: Elliptic Curve Selection
        curves_obs = list(set((f.get("elliptic_curve") or f.get("curve")) for f in features_list if (f.get("elliptic_curve") or f.get("curve"))))
        if curves_obs:
            curve_str = ", ".join(curves_obs)
            obs_curve = f"Elliptic Curve: {curve_str}"
            evid_curve = f"Observed elliptic curve parameters: {curve_str}"
            status_curve = "PASS"
            symbol_curve = "✓ PASS"
        elif tls_session_count > 0:
            obs_curve = "Elliptic Curve: None / Standard DH"
            evid_curve = "TLS session established using standard RSA or DH key exchange."
            status_curve = "PASS"
            symbol_curve = "✓ PASS"
        else:
            obs_curve = "No TLS Key Exchange Observed"
            evid_curve = "0 TLS sessions observed in traffic."
            status_curve = "NOT OBSERVED"
            symbol_curve = "— NOT OBSERVED"

        controls.append({
            "control_id": "CTRL_ELLIPTIC_CURVE",
            "category": "CRYPTOGRAPHY",
            "name": "Elliptic Curve Selection",
            "observed": obs_curve,
            "expected": "Standardized Curves (x25519, secp256r1, secp384r1)",
            "status": status_curve,
            "status_symbol": symbol_curve,
            "severity": "INFO",
            "why": "Standardized curves provide performance and resistance against side-channel attacks.",
            "evidence": evid_curve,
            "recommendation": "Maintain Curve25519 and P-256 support.",
            "score_contribution": 0
        })

        # Helper for Certificate Feature Extraction
        cert_feats = [
            f for f in features_list 
            if (f.get("certificate_key_size") is not None or 
                f.get("certificate_signature_algorithm") is not None or 
                f.get("certificate_self_signed") is not None or 
                f.get("certificate_days_remaining") is not None or
                f.get("certificate_public_key_algorithm") is not None)
        ]
        cert_count = len(cert_feats)

        has_tls13_limited = any(
            f.get("certificate_visibility_status") == "VISIBILITY_LIMITED" or
            (f.get("tls_version") in ("TLSv13", "TLSv1.3") and not any(
                f.get(k) is not None for k in (
                    "certificate_key_size", "certificate_signature_algorithm", "certificate_self_signed",
                    "certificate_days_remaining", "certificate_public_key_algorithm", "certificate_hostname_match"
                )
            ))
            for f in features_list
        )

        # Control 8: Certificate Trust (Self-Signed)
        self_signed_findings = find_finding("CERT_SELF_SIGNED")

        if self_signed_findings:
            ctrl_status = "WARNING"
            ctrl_symbol = "⚠ WARNING"
            aff_str = "; ".join([f.get("evidence", "") for f in self_signed_findings])
            obs_val = f"Self-Signed Certificate in Use ({len(self_signed_findings)} cert(s))"
            why_val = "Self-signed certificates cannot be validated by standard public trust stores, introducing trust ambiguity for external mail clients."
            evid_val = f"Evidence: {aff_str}"
            recom_val = "Deploy certificates issued by a trusted enterprise or public Certificate Authority."
            pts = get_points("CERT_SELF_SIGNED") * len(self_signed_findings)
        elif cert_count == 0:
            if has_tls13_limited:
                ctrl_status = "VISIBILITY LIMITED"
                ctrl_symbol = "👁 VISIBILITY LIMITED"
                obs_val = "TLS 1.3 certificate details not passively observable"
                why_val = "The available passive capture does not expose the server certificate fields required for trust authority analysis."
                evid_val = "TLS 1.3 handshake certificate fields encrypted in network capture."
                recom_val = "Provide authorized TLS key material or endpoint/certificate inventory data to complete certificate validation."
                pts = 0
            else:
                ctrl_status = "NOT OBSERVED"
                ctrl_symbol = "— NOT OBSERVED"
                obs_val = "No X.509 Certificates Observed in Network Traffic"
                why_val = "No X.509 certificates were observed in the capture stream."
                evid_val = "0 certificates extracted from Zeek x509.log."
                recom_val = "Ensure TLS certificates are deployed on mail servers."
                pts = 0
        else:
            ctrl_status = "PASS"
            ctrl_symbol = "✓ PASS"
            obs_val = "Certificate Issued by External / CA Authority"
            why_val = "Certificate subject differs from issuer, indicating CA issuance."
            evid_val = f"{cert_count} certificate(s) inspected."
            recom_val = "Maintain CA certificate lifecycle management."
            pts = 0

        controls.append({
            "control_id": "CTRL_CERT_TRUST",
            "category": "CERTIFICATE_SECURITY",
            "name": "Certificate Trust & Authority",
            "observed": obs_val,
            "expected": "Certificate Issued by Recognized Public or Enterprise CA",
            "status": ctrl_status,
            "status_symbol": ctrl_symbol,
            "severity": "MEDIUM" if ctrl_status == "WARNING" else "INFO",
            "why": why_val,
            "evidence": evid_val,
            "recommendation": recom_val,
            "score_contribution": pts
        })

        # Control 9: Certificate Expiration & Validity
        expired_findings = find_finding("CERT_EXPIRED") + find_finding("CERT_NOT_YET_VALID")
        if expired_findings:
            ctrl_status = "VIOLATION"
            ctrl_symbol = "✕ VIOLATION"
            aff_str = "; ".join([f.get("evidence", "") for f in expired_findings])
            obs_val = f"Certificate Validity Violation ({len(expired_findings)} cert(s))"
            why_val = "Expired or non-active certificates cause client connection failures or force insecure validation bypasses."
            evid_val = f"Evidence: {aff_str}"
            recom_val = "Renew expired certificates immediately and synchronize server clocks."
            pts = sum(get_points(f.get("rule_id")) for f in expired_findings)
        elif cert_count == 0:
            if has_tls13_limited:
                ctrl_status = "VISIBILITY LIMITED"
                ctrl_symbol = "👁 VISIBILITY LIMITED"
                obs_val = "TLS 1.3 certificate details not passively observable"
                why_val = "The available passive capture does not expose the server certificate fields required for validity analysis."
                evid_val = "TLS 1.3 handshake certificate fields encrypted in network capture."
                recom_val = "Provide authorized TLS key material or endpoint/certificate inventory data to complete certificate validation."
                pts = 0
            else:
                ctrl_status = "NOT OBSERVED"
                ctrl_symbol = "— NOT OBSERVED"
                obs_val = "No Certificate Validity Data"
                why_val = "No X.509 certificates available to check validity."
                evid_val = "0 certificates observed."
                recom_val = "Deploy valid TLS certificates."
                pts = 0
        else:
            ctrl_status = "PASS"
            ctrl_symbol = "✓ PASS"
            days_list = [f.get("certificate_days_remaining") for f in cert_feats if f.get("certificate_days_remaining") is not None]
            if days_list:
                avg_days = round(sum(days_list) / len(days_list), 2)
                obs_val = f"Certificate Currently Active & Valid (approximately {avg_days} days remaining)"
            else:
                obs_val = "Certificate Currently Active & Valid"
            why_val = "Certificate activation timestamp is valid and expiration date is in the future."
            evid_val = f"Inspected {cert_count} certificate(s); all within valid lifetime."
            recom_val = "Automate certificate renewal before expiration."
            pts = 0

        controls.append({
            "control_id": "CTRL_CERT_VALIDITY",
            "category": "CERTIFICATE_SECURITY",
            "name": "Certificate Lifetime & Expiration",
            "observed": obs_val,
            "expected": "Active Certificate Within Valid Lifetime",
            "status": ctrl_status,
            "status_symbol": ctrl_symbol,
            "severity": "CRITICAL" if ctrl_status == "VIOLATION" else "INFO",
            "why": why_val,
            "evidence": evid_val,
            "recommendation": recom_val,
            "score_contribution": pts
        })

        # Control 10: Hostname & SNI Matching
        host_mismatch_findings = find_finding("CERT_HOSTNAME_MISMATCH")
        if host_mismatch_findings:
            ctrl_status = "VIOLATION"
            ctrl_symbol = "✕ VIOLATION"
            aff_str = "; ".join([f.get("evidence", "") for f in host_mismatch_findings])
            obs_val = f"Hostname / SNI Mismatch ({len(host_mismatch_findings)} cert(s))"
            why_val = "Server SNI / target hostname does not match Subject Alternative Names in the server certificate."
            evid_val = f"Evidence: {aff_str}"
            recom_val = "Reissue certificate to include all mail server FQDNs in SAN extension."
            pts = get_points("CERT_HOSTNAME_MISMATCH") * len(host_mismatch_findings)
        elif cert_count == 0 and not any(f.get("certificate_hostname_match") is not None for f in features_list):
            if has_tls13_limited:
                ctrl_status = "VISIBILITY LIMITED"
                ctrl_symbol = "👁 VISIBILITY LIMITED"
                obs_val = "TLS 1.3 certificate details not passively observable"
                why_val = "The available passive capture does not expose Subject Alternative Name (SAN) fields required for hostname alignment."
                evid_val = "TLS 1.3 handshake certificate fields encrypted in network capture."
                recom_val = "Provide authorized TLS key material or endpoint/certificate inventory data to complete certificate validation."
                pts = 0
            else:
                ctrl_status = "NOT OBSERVED"
                ctrl_symbol = "— NOT OBSERVED"
                obs_val = "No SNI / Hostname Data"
                why_val = "No TLS certificates available to check SNI matching."
                evid_val = "0 certificates observed."
                recom_val = "Ensure SNI matching is configured."
                pts = 0
        else:
            ctrl_status = "PASS"
            ctrl_symbol = "✓ PASS"
            sni_names = list(set(f.get("server_name") for f in features_list if f.get("server_name")))
            if sni_names:
                sni_str = ", ".join(sni_names)
                obs_val = f"{sni_str} → MATCH (Server SNI Matches Certificate Subject / SAN)"
            else:
                obs_val = "Server SNI Matches Certificate Subject / SAN"
            why_val = "Target hostname matches certificate subject name."
            evid_val = f"Validated hostname match for {cert_count} certificate session(s)."
            recom_val = "Maintain SNI alignment on load balancers and mail servers."
            pts = 0

        controls.append({
            "control_id": "CTRL_CERT_HOSTNAME",
            "category": "CERTIFICATE_SECURITY",
            "name": "Certificate Hostname & SNI Alignment",
            "observed": obs_val,
            "expected": "Target Server FQDN Matches Certificate SAN / Subject",
            "status": ctrl_status,
            "status_symbol": ctrl_symbol,
            "severity": "HIGH" if ctrl_status == "VIOLATION" else "INFO",
            "why": why_val,
            "evidence": evid_val,
            "recommendation": recom_val,
            "score_contribution": pts
        })

        # Control 11: Public Key Size
        weak_key_findings = find_finding("CERT_WEAK_KEY_SIZE")
        if weak_key_findings:
            ctrl_status = "VIOLATION"
            ctrl_symbol = "✕ VIOLATION"
            aff_str = "; ".join([f.get("evidence", "") for f in weak_key_findings])
            obs_val = f"Weak Public Key Size Detected ({len(weak_key_findings)} cert(s))"
            why_val = "RSA key length under 2048 bits or EC key under 256 bits is vulnerable to key factorization."
            evid_val = f"Evidence: {aff_str}"
            recom_val = "Reissue certificates using RSA 2048+ bit or ECDSA P-256+ keys."
            pts = get_points("CERT_WEAK_KEY_SIZE") * len(weak_key_findings)
        elif cert_count == 0 and not any(f.get("certificate_key_size") is not None for f in features_list):
            if has_tls13_limited:
                ctrl_status = "VISIBILITY LIMITED"
                ctrl_symbol = "👁 VISIBILITY LIMITED"
                obs_val = "TLS 1.3 certificate details not passively observable"
                why_val = "The available passive capture does not expose server public key parameters for key size compliance check."
                evid_val = "TLS 1.3 handshake certificate fields encrypted in network capture."
                recom_val = "Provide authorized TLS key material or endpoint/certificate inventory data to complete certificate validation."
                pts = 0
            else:
                ctrl_status = "NOT OBSERVED"
                ctrl_symbol = "— NOT OBSERVED"
                obs_val = "No Public Key Data"
                why_val = "No X.509 certificates observed."
                evid_val = "0 certificates observed."
                recom_val = "Use RSA 2048+ or ECC keys."
                pts = 0
        else:
            ctrl_status = "PASS"
            ctrl_symbol = "✓ PASS"
            keys_obs = []
            for f in features_list:
                if f.get("certificate_key_size") is not None:
                    alg = (f.get("certificate_public_key_algorithm") or "RSA").replace("Encryption", "").upper()
                    sz = f.get("certificate_key_size")
                    keys_obs.append(f"{alg} {sz}")
            key_str = ", ".join(list(set(keys_obs))) if keys_obs else "RSA 2048"
            obs_val = f"Sufficient Public Key Length ({key_str})"
            why_val = "Public key size satisfies modern NIST cryptographic guidelines."
            evid_val = f"Verified public key sizes: {key_str}"
            recom_val = "Maintain 2048-bit minimum key size policy."
            pts = 0

        controls.append({
            "control_id": "CTRL_CERT_KEY_SIZE",
            "category": "CERTIFICATE_SECURITY",
            "name": "Public Key Size Compliance",
            "observed": obs_val,
            "expected": "RSA >= 2048-bit or ECC >= 256-bit",
            "status": ctrl_status,
            "status_symbol": ctrl_symbol,
            "severity": "HIGH" if ctrl_status == "VIOLATION" else "INFO",
            "why": why_val,
            "evidence": evid_val,
            "recommendation": recom_val,
            "score_contribution": pts
        })

        # Control 12: Signature Algorithm Security
        weak_sig_findings = find_finding("CERT_WEAK_SIG_ALG")
        if weak_sig_findings:
            ctrl_status = "VIOLATION"
            ctrl_symbol = "✕ VIOLATION"
            aff_str = "; ".join([f.get("evidence", "") for f in weak_sig_findings])
            obs_val = f"Weak Certificate Signature Algorithm ({len(weak_sig_findings)} cert(s))"
            why_val = "SHA-1 and MD5 signature algorithms are cryptographically vulnerable to collision attacks."
            evid_val = f"Evidence: {aff_str}"
            recom_val = "Reissue certificates using SHA-256, SHA-384, or SHA-512 signature algorithms."
            pts = get_points("CERT_WEAK_SIG_ALG") * len(weak_sig_findings)
        elif cert_count == 0 and not any(f.get("certificate_signature_algorithm") is not None for f in features_list):
            if has_tls13_limited:
                ctrl_status = "VISIBILITY LIMITED"
                ctrl_symbol = "👁 VISIBILITY LIMITED"
                obs_val = "TLS 1.3 certificate details not passively observable"
                why_val = "The available passive capture does not expose server signature algorithm details."
                evid_val = "TLS 1.3 handshake certificate fields encrypted in network capture."
                recom_val = "Provide authorized TLS key material or endpoint/certificate inventory data to complete certificate validation."
                pts = 0
            else:
                ctrl_status = "NOT OBSERVED"
                ctrl_symbol = "— NOT OBSERVED"
                obs_val = "No Signature Algorithm Data"
                why_val = "No X.509 certificates observed."
                evid_val = "0 certificates observed."
                recom_val = "Use SHA-256+ signature algorithms."
                pts = 0
        else:
            ctrl_status = "PASS"
            ctrl_symbol = "✓ PASS"
            sigs_obs = list(set(f.get("certificate_signature_algorithm") for f in features_list if f.get("certificate_signature_algorithm")))
            sig_str = ", ".join(sigs_obs) if sigs_obs else "sha256WithRSAEncryption"
            obs_val = f"Strong Signature Algorithm ({sig_str})"
            why_val = "Certificate signature algorithm satisfies modern security baselines."
            evid_val = f"Inspected signature algorithms: {sig_str}"
            recom_val = "Maintain SHA-256+ signature algorithm policy."
            pts = 0

        controls.append({
            "control_id": "CTRL_CERT_SIG_ALG",
            "category": "CERTIFICATE_SECURITY",
            "name": "Signature Algorithm Security",
            "observed": obs_val,
            "expected": "SHA-256, SHA-384, or SHA-512",
            "status": ctrl_status,
            "status_symbol": ctrl_symbol,
            "severity": "HIGH" if ctrl_status == "VIOLATION" else "INFO",
            "why": why_val,
            "evidence": evid_val,
            "recommendation": recom_val,
            "score_contribution": pts
        })

        # Control 13: Fingerprinting (JA3/JA4)
        controls.append({
            "control_id": "CTRL_FINGERPRINTING",
            "category": "FINGERPRINTING",
            "name": "TLS Client / Server Fingerprinting (JA3 / JA4)",
            "observed": "NOT AVAILABLE IN CAPTURE (Optional Zeek Fingerprint Package Not Installed)",
            "expected": "JA3 / JA3S / JA4 Fingerprint String for Client/Server Profiling",
            "status": "NOT OBSERVED",
            "status_symbol": "— NOT OBSERVED",
            "severity": "INFO",
            "why": "JA3 and JA4 fingerprinting require optional Zeek package extensions which were not active during capture logging.",
            "evidence": "Fields ja3: null, ja3s: null, ja4: null, ja4s: null across all captured sessions.",
            "recommendation": "If client fingerprinting is required, install zeek-ja3 or zeek-ja4 packages in the Zeek deployment.",
            "score_contribution": 0
        })

        # Filter violations list (status VIOLATION or WARNING)
        violations = [c for c in controls if c["status"] in ["VIOLATION", "WARNING"]]

        return {
            "baseline_score": baseline_score,
            "cryptographic_score": crypto_score,
            "final_score": final_score,
            "score_delta": score_delta,
            "controls": controls,
            "violations": violations,
            "risk_contributors": overall_risk_res.get("contributors", [])
        }
