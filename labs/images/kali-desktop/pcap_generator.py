#!/usr/bin/env python3
"""Build a deterministic teaching capture from synthetic packets only."""
import argparse

from scapy.all import IP, DNS, DNSQR, DNSRR, Ether, TCP, UDP, Raw, wrpcap

def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True)
    parser.add_argument("--flag", required=True)
    args = parser.parse_args()
    packets = []
    client, server = "10.77.0.10", "10.77.0.20"
    def tcp(src: str, dst: str, sport: int, dport: int, payload: bytes, seq: int) -> None:
        packets.append(Ether()/IP(src=src, dst=dst)/TCP(sport=sport,dport=dport,flags="PA",seq=seq,ack=1)/Raw(payload))
    tcp(client, server, 51500, 80, b"POST /login HTTP/1.1\r\nHost: portal.example.test\r\nContent-Type: application/x-www-form-urlencoded\r\nContent-Length: 25\r\n\r\nuser=student&pass=demo", 100)
    tcp(client, server, 51501, 21, b"USER training\r\nPASS synthetic-demo-only\r\n", 200)
    for index, name in enumerate(["updates.example.test", "updates.example.test", "portal.example.test"], start=1):
        packets.append(Ether()/IP(src=client,dst="10.77.0.1")/UDP(sport=53000+index,dport=53)/DNS(rd=1,qd=DNSQR(qname=name)))
    tcp(client, server, 51502, 80, f"POST /upload HTTP/1.1\r\nHost: portal.example.test\r\nContent-Length: 28\r\n\r\ndata={args.flag}&chunk=0001".encode(), 300)
    for number, packet in enumerate(packets, start=1):
        packet.time = 1735689600 + number * 2
    wrpcap(args.output, packets)

if __name__ == "__main__":
    main()
