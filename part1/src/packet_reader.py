from scapy.all import rdpcap, IP, TCP, Raw

PCAP_FILE = "part1/pcaps/smtp_test.pcap"

packets = rdpcap(PCAP_FILE)

print(f"Total packets: {len(packets)}")

for i, packet in enumerate(packets, 1):

    if IP in packet and TCP in packet:
        src = packet[IP].src
        dst = packet[IP].dst
        sport = packet[TCP].sport
        dport = packet[TCP].dport

        print(f"\nPacket {i}")
        print(f"  {src}:{sport} -> {dst}:{dport}")
        print(f"  TCP flags: {packet[TCP].flags}")

        if Raw in packet:
            payload = bytes(packet[Raw].load)

            print(
                f"  Payload: "
                f"{payload.decode('utf-8', errors='replace').strip()}"
            )
