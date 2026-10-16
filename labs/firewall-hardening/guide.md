## Prototype note

This local college prototype uses a simulated workspace. It does not launch security tools or target systems. Treat command examples as discussion prompts and complete the exercise by answering the questions in the app.

# Linux firewall hardening

## Learning objectives

Identify the services a lab server actually needs, install a default-deny inbound policy, and verify the policy from a separate container.

## The idea

A host firewall limits which network paths can reach local services. Start with an explicit policy, allow only the required sources and ports, and preserve established connections so administrators do not lock themselves out. In this disposable target, the required inbound services are SSH on TCP 22 and the training HTTP status page on TCP 80. TCP 8080 is an intentionally unnecessary listener.

## Tasks

1. From the attacker desktop, scan only `target-fw` with `nmap -Pn -p 22,80,8080 target-fw`. Record its initial state.
2. Connect to the target shell with the disposable lab-only credentials `student` / `RangeStudent!26`.
3. Inspect the current rules with `sudo nft list ruleset` or `sudo iptables -S`. Keep an established-connection rule and loopback traffic available.
4. Set the inbound default to drop. Allow established traffic, loopback, TCP 22, and TCP 80. Do not add an allow rule for TCP 8080.
5. Return to the attacker desktop and rescan the three ports. Confirm SSH and HTTP remain open while 8080 is closed.
6. Read the target's status page and submit the unique flag. The platform performs its own scan from the attacker container as an independent graded check.

## Hints

- Keep a second terminal ready before changing firewall rules. A mistaken policy can disconnect remote access.
- For nftables, build and inspect the complete ruleset before applying it. For iptables, add the established rule before changing the default policy.
- The `check` answer is run by the platform from the attacker container; the command is fixed in the manifest and cannot be supplied by a student.

## What you learned

Firewall policy should match an explicit service requirement and be verified from the network path that matters. In production, make changes through a reviewed change plan, preserve recovery access, log changes, and test persistence after reboot.
