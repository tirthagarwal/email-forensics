import os
import json
from pathlib import Path
from email_protocol_parser import EmailProtocolParser

ZEEK_LOG_DIR = Path("part1/output/zeek_real_tls")
OUTPUT_FILE = Path("part1/output/tls_analysis.json")

def parse_zeek_tsv(log_path):
    if not os.path.exists(log_path):
        return []

    records = []
    fields = []

    with open(log_path, "r", encoding="utf-8", errors="replace") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue

            if line.startswith("#fields"):
                fields = line.split("\t")[1:]
                continue

            if line.startswith("#"):
                continue

            if not fields:
                continue

            values = line.split("\t")
            record = {}

            for field, val in zip(fields, values):
                if val == "-" or val == "(empty)":
                    record[field] = None
                elif val == "T":
                    record[field] = True
                elif val == "F":
                    record[field] = False
                else:
                    record[field] = val

            records.append(record)

    return records

def analyze_zeek_logs(log_dir):
    conn_records = parse_zeek_tsv(log_dir / "conn.log")
    smtp_records = parse_zeek_tsv(log_dir / "smtp.log")
    ssl_records = parse_zeek_tsv(log_dir / "ssl.log")
    x509_records = parse_zeek_tsv(log_dir / "x509.log")
    notice_records = parse_zeek_tsv(log_dir / "notice.log")

    smtp_by_uid = {r["uid"]: r for r in smtp_records if "uid" in r and r["uid"]}
    ssl_by_uid = {r["uid"]: r for r in ssl_records if "uid" in r and r["uid"]}
    x509_by_fp = {r["fingerprint"]: r for r in x509_records if "fingerprint" in r and r["fingerprint"]}

    notices_by_uid = {}
    for n in notice_records:
        uid = n.get("uid")
        if uid:
            if uid not in notices_by_uid:
                notices_by_uid[uid] = []
            notices_by_uid[uid].append({
                "note": n.get("note"),
                "msg": n.get("msg"),
                "sub": n.get("sub")
            })

    protocol_parser = EmailProtocolParser()
    normalized_sessions = []

    for conn in conn_records:
        uid = conn.get("uid")
        smtp = smtp_by_uid.get(uid, {})
        ssl_info = ssl_by_uid.get(uid, {})
        notices = notices_by_uid.get(uid, [])

        proto_analysis = protocol_parser.analyze_session(conn, smtp, ssl_info)

        cert_fps = ssl_info.get("cert_chain_fps")
        cert_data = None

        if cert_fps:
            fps_list = cert_fps.split(",") if isinstance(cert_fps, str) else cert_fps
            if isinstance(fps_list, list) and len(fps_list) > 0:
                first_fp = fps_list[0]
                cert_data = x509_by_fp.get(first_fp)

        session = {
            "uid": uid,
            "timestamp": conn.get("ts"),
            "connection": {
                "source_ip": conn.get("id.orig_h"),
                "source_port": int(conn.get("id.orig_p")) if conn.get("id.orig_p") else None,
                "destination_ip": conn.get("id.resp_h"),
                "destination_port": int(conn.get("id.resp_p")) if conn.get("id.resp_p") else None,
                "transport_protocol": conn.get("proto"),
                "service": conn.get("service"),
                "duration": float(conn.get("duration")) if conn.get("duration") else None,
                "client_bytes": int(conn.get("orig_bytes")) if conn.get("orig_bytes") else 0,
                "server_bytes": int(conn.get("resp_bytes")) if conn.get("resp_bytes") else 0,
                "client_packets": int(conn.get("orig_pkts")) if conn.get("orig_pkts") else 0,
                "server_packets": int(conn.get("resp_pkts")) if conn.get("resp_pkts") else 0,
                "conn_state": conn.get("conn_state")
            },
            "email_protocol": proto_analysis,
            "tls": {
                "version": ssl_info.get("version"),
                "cipher": ssl_info.get("cipher"),
                "curve": ssl_info.get("curve"),
                "server_name": ssl_info.get("server_name"),
                "established": ssl_info.get("established"),
                "validation_status": ssl_info.get("validation_status"),
                "sni_matches_cert": ssl_info.get("sni_matches_cert"),
                "ja3": None,
                "ja3s": None,
                "ja4": None,
                "ja4s": None
            },
            "certificate": {
                "fingerprint_sha256": cert_data.get("fingerprint") if cert_data else None,
                "subject": cert_data.get("certificate.subject") if cert_data else None,
                "issuer": cert_data.get("certificate.issuer") if cert_data else None,
                "serial": cert_data.get("certificate.serial") if cert_data else None,
                "not_valid_before": float(cert_data.get("certificate.not_valid_before")) if cert_data and cert_data.get("certificate.not_valid_before") else None,
                "not_valid_after": float(cert_data.get("certificate.not_valid_after")) if cert_data and cert_data.get("certificate.not_valid_after") else None,
                "key_algorithm": cert_data.get("certificate.key_alg") if cert_data else None,
                "signature_algorithm": cert_data.get("certificate.sig_alg") if cert_data else None,
                "key_type": cert_data.get("certificate.key_type") if cert_data else None,
                "key_length": int(cert_data.get("certificate.key_length")) if cert_data and cert_data.get("certificate.key_length") else None,
                "exponent": cert_data.get("certificate.exponent") if cert_data else None
            } if cert_data else None,
            "zeek_notices": notices
        }

        normalized_sessions.append(session)

    report = {
        "log_directory": str(log_dir),
        "total_sessions": len(normalized_sessions),
        "sessions": normalized_sessions
    }

    return report

def main():
    print(f"[TLS Analyzer] Reading Zeek logs from {ZEEK_LOG_DIR}...")
    report = analyze_zeek_logs(ZEEK_LOG_DIR)
    
    os.makedirs(OUTPUT_FILE.parent, exist_ok=True)
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=4)

    print(f"[TLS Analyzer] Successfully saved normalized analysis to {OUTPUT_FILE}")
    print(f"Parsed {report['total_sessions']} session(s).")

if __name__ == "__main__":
    main()
