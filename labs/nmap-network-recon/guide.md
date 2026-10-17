# Network Reconnaissance with Nmap

This lab starts a disposable target on a private Docker network. The workspace runs one fixed TCP service scan against that target; it does not accept custom commands or scan your host or external networks.

## Tasks

1. Select **Scan the host** in the interactive panel.
2. Read the output and count the ports marked `open`.
3. Read the service/version and banner output. Your session may include an additional status listener, and its unnecessary service name and port can differ from another student's.
4. Read your session briefing, then select **Close unnecessary service**. This stops the listener on the port specified for your session.
5. Select **Rescan and verify**. The selected port should be closed; the other services stay open.
6. Answer the questions and submit. Use the baseline scan when asked about the initial services.

The target exposes three or four small training services and has no published host ports. Banners are collected explicitly so you can identify the service even when Nmap's guessed service name differs. Use your own baseline for the open-port count and banner question. Submit below the answers. Reach 80% to pass; otherwise review feedback and reattempt.
