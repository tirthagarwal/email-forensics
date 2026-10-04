from scapy.all import rdpcap, IP, TCP, Raw
import json

PCAP_FILE = "part1/pcaps/smtp_test.pcap"
OUTPUT_FILE = "part1/output/protocol_analysis.json"

SMTP_PORTS = {25, 465, 587}
IMAP_PORTS = {143, 993}
POP3_PORTS = {110, 995}

protocols = set()
starttls_detected = False
connections = set()

packets = rdpcap(PCAP_FILE)

for packet in packets:

    if IP not in packet or TCP not in packet:
        continue

    src = packet[IP].src
    dst = packet[IP].dst
    sport = packet[TCP].sport
    dport = packet[TCP].dport

    connections.add(
        (src, sport, dst, dport)
    )

    # Port-based detection
    if sport in SMTP_PORTS or dport in SMTP_PORTS:
        protocols.add("SMTP")

    elif sport in IMAP_PORTS or dport in IMAP_PORTS:
        protocols.add("IMAP")

    elif sport in POP3_PORTS or dport in POP3_PORTS:
        protocols.add("POP3")

    # Payload-based detection
    if Raw in packet:

        payload = bytes(packet[Raw].load).decode(
            "utf-8",
            errors="ignore"
        ).upper()

        if (
            "EHLO" in payload
            or "HELO" in payload
            or "MAIL FROM:" in payload
            or "RCPT TO:" in payload
            or "ESMTP" in payload
        ):
            protocols.add("SMTP")

        if (
            "* OK" in payload
            or "CAPABILITY" in payload
            or "SELECT " in payload
        ):
            protocols.add("IMAP")

        if (
            "+OK" in payload
            or "USER " in payload
            or "PASS " in payload
        ):
            protocols.add("POP3")

        if "STARTTLS" in payload or "STLS" in payload:
            starttls_detected = True


result = {
    "pcap_file": PCAP_FILE,
    "total_packets": len(packets),
    "detected_protocols": sorted(protocols),
    "starttls_detected": starttls_detected,
    "connections": [
        {
            "source": src,
            "source_port": sport,
            "destination": dst,
            "destination_port": dport
        }
        for src, sport, dst, dport in sorted(connections)
    ]
}

with open(OUTPUT_FILE, "w") as f:
    json.dump(result, f, indent=4)

print("========== EMAIL TRAFFIC ANALYSIS ==========")
print(f"Packets analyzed: {len(packets)}")
print("Detected protocols:")

for protocol in sorted(protocols):
    print(f"  - {protocol}")

print(f"STARTTLS detected: {starttls_detected}")
print(f"\nJSON report saved to: {OUTPUT_FILE}")
