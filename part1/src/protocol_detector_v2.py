from scapy.all import rdpcap, IP, TCP, Raw
import json

PCAP_FILE = "part1/pcaps/smtp_test.pcap"
OUTPUT_FILE = "part1/output/protocol_analysis.json"

SMTP_PORTS = {25, 465, 587}
IMAP_PORTS = {143, 993}
POP3_PORTS = {110, 995}

protocols = set()
starttls_detected = False
connections = {}

packets = rdpcap(PCAP_FILE)

for packet in packets:

    if IP not in packet or TCP not in packet:
        continue

    src = packet[IP].src
    dst = packet[IP].dst
    sport = packet[TCP].sport
    dport = packet[TCP].dport

    endpoints = sorted([
        (src, sport),
        (dst, dport)
    ])

    connection_key = (
        endpoints[0][0],
        endpoints[0][1],
        endpoints[1][0],
        endpoints[1][1]
    )

    if connection_key not in connections:
        connections[connection_key] = {
            "source": src,
            "source_port": sport,
            "destination": dst,
            "destination_port": dport,
            "protocol": None,
            "commands": [],
            "session_messages": [],
            "packet_count": 0,
            "bytes": 0,
            "starttls_detected": False
        }

    connection = connections[connection_key]
    connection["packet_count"] += 1

    payload = ""

    if Raw in packet:
        raw_data = bytes(packet[Raw].load)
        connection["bytes"] += len(raw_data)

        payload = raw_data.decode(
            "utf-8",
            errors="ignore"
        )

    payload_upper = payload.upper()

    # Record application-layer session message
    if payload:
        if src == connection["source"] and sport == connection["source_port"]:
            direction = "client_to_server"
        else:
            direction = "server_to_client"

        connection["session_messages"].append({
            "direction": direction,
            "payload": payload.strip()
        })

    # Protocol detection
    if sport in SMTP_PORTS or dport in SMTP_PORTS:
        protocols.add("SMTP")
        connection["protocol"] = "SMTP"

    elif sport in IMAP_PORTS or dport in IMAP_PORTS:
        protocols.add("IMAP")
        connection["protocol"] = "IMAP"

    elif sport in POP3_PORTS or dport in POP3_PORTS:
        protocols.add("POP3")
        connection["protocol"] = "POP3"

    # SMTP commands
    if "EHLO" in payload_upper:
        protocols.add("SMTP")
        connection["protocol"] = "SMTP"
        connection["commands"].append("EHLO")

    if "HELO" in payload_upper:
        protocols.add("SMTP")
        connection["protocol"] = "SMTP"
        connection["commands"].append("HELO")

    if "MAIL FROM:" in payload_upper:
        protocols.add("SMTP")
        connection["protocol"] = "SMTP"
        connection["commands"].append("MAIL FROM")

    if "RCPT TO:" in payload_upper:
        protocols.add("SMTP")
        connection["protocol"] = "SMTP"
        connection["commands"].append("RCPT TO")

    if "STARTTLS" in payload_upper:
        protocols.add("SMTP")
        connection["protocol"] = "SMTP"
        connection["commands"].append("STARTTLS")
        connection["starttls_detected"] = True
        starttls_detected = True

    # IMAP
    if "* OK" in payload_upper or "CAPABILITY" in payload_upper:
        protocols.add("IMAP")
        connection["protocol"] = "IMAP"

    # POP3
    if "+OK" in payload_upper:
        protocols.add("POP3")
        connection["protocol"] = "POP3"

    if "STLS" in payload_upper:
        connection["commands"].append("STLS")
        connection["starttls_detected"] = True
        starttls_detected = True


# Remove duplicate commands
for connection in connections.values():
    connection["commands"] = list(
        dict.fromkeys(connection["commands"])
    )


result = {
    "pcap_file": PCAP_FILE,
    "total_packets": len(packets),
    "detected_protocols": sorted(protocols),
    "starttls_detected": starttls_detected,
    "connections": list(connections.values())
}


with open(OUTPUT_FILE, "w") as f:
    json.dump(result, f, indent=4)


print("========== EMAIL TRAFFIC ANALYSIS ==========")
print(f"Packets analyzed: {len(packets)}")

print("\nDetected protocols:")
for protocol in sorted(protocols):
    print(f"  - {protocol}")

print(f"\nSTARTTLS detected: {starttls_detected}")

print("\nConnections:")

for connection in connections.values():

    print(
        f"  {connection['source']}:{connection['source_port']} "
        f"-> "
        f"{connection['destination']}:{connection['destination_port']}"
    )

    print(f"    Protocol: {connection['protocol']}")
    print(f"    Packets: {connection['packet_count']}")
    print(f"    Bytes: {connection['bytes']}")
    print(f"    Commands: {connection['commands']}")
    print(f"    Session messages: {len(connection['session_messages'])}")
    print(f"    STARTTLS: {connection['starttls_detected']}")

print(f"\nJSON report saved to: {OUTPUT_FILE}")
