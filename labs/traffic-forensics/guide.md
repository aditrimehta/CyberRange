## Prototype note

This local college prototype simulates the lab workspace. It does not run security tools or contact target systems. Any tools, hosts, credentials, commands, or attack steps below are fictional case-study material; do not execute them. Use the written scenario to answer the questions, then select Start demo session to reveal synthetic flag evidence when a lesson asks for it.

# Traffic analysis and forensics

## Learning objectives

Use display filters to find HTTP, FTP, and DNS conversations, recognize sensitive cleartext data, and record observations as a small evidence timeline.

## The idea

A packet capture preserves network evidence. Classic FTP sends authentication commands in clear text, and ordinary DNS queries reveal requested names. A PCAP can contain credentials and personal information, so handle it like sensitive data. This file is generated deterministically from synthetic events and does not contact the internet.

## Tasks

1. Open `~/range/traffic.pcap` with Wireshark or `tshark -r ~/range/traffic.pcap`.
2. Filter for `http.request.method == "POST"`. Follow the stream and record the synthetic form submission timestamp and path.
3. Filter for `ftp.request.command`. Locate USER and PASS commands. Do not reuse the synthetic values; explain why they are visible.
4. Filter for `dns.qry.name`. Find the repeated training-domain lookup and note its destination and timestamp.
5. Follow the final HTTP stream to inspect the small exfiltration-shaped request. Submit its generated marker and explain what made the behavior suspicious.
6. Write a short timeline with packet times, protocol, and observation. Separate facts seen in the capture from your interpretation.

## Hints

- In tshark, `-Y 'ftp.request.command'` applies a display filter and `-T fields` can extract selected fields.
- TCP stream reconstruction can show application messages in context.
- Capture files should be access-controlled and retained only as long as required by the investigation.

## What you learned

Application-layer inspection exposes what transport protection does or does not encrypt. Prefer encrypted protocols, minimize sensitive data in requests, and preserve chain-of-custody details when analyzing real evidence.
