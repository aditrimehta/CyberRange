## Prototype note

This local college prototype uses a simulated workspace. It does not launch security tools or target systems. Treat command examples as discussion prompts and complete the exercise by answering the questions in the app.

# Network reconnaissance with Nmap

## Learning objectives

By the end of this exercise, you can identify a target's reachable TCP services, distinguish a port number from the service actually speaking there, and collect useful version and banner evidence.

## The idea

Reconnaissance is the first measurement step in an authorized assessment. A port scan reports which network endpoints responded; service detection sends additional probes to infer what software is listening. These observations are evidence, not proof of a vulnerability. Scope matters: this private range contains only the lab target.

## Tasks

1. Open a terminal in the attacker desktop. Confirm your own interface and route with `ip addr` and `ip route`.
2. Discover the target with `nmap -sn target1`. The lab's private DNS resolves `target1` only inside this session.
3. Run a basic TCP scan: `nmap target1`. Record which ports are open and compare the result with the complete lab scope.
4. Scan every TCP port and identify services: `nmap -p- -sV target1`. Use the service names and versions as hypotheses; do not assume a port's number determines its protocol.
5. Read a service greeting with `nc target1 9001`. Submit the unique flag displayed in the greeting.
6. Compare `-sV` results with a direct banner connection. Note where the scanner identifies a service and where the service's text supplies extra context.

## Hints

- Nmap's default port list is a useful quick check, but a high port will not appear unless you scan it.
- `-p-` asks Nmap to scan TCP ports 1 through 65535. It is slower than a default scan.
- A banner is input from the service. In a real assessment, validate it and avoid treating it as guaranteed truth.

## What you learned

You mapped four exposed TCP services, used service detection, and collected a per-session banner. In a real engagement, write down the approved scope, scan rate, timestamp, and evidence so another analyst can reproduce the result.
