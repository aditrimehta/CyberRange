# Network Reconnaissance with Nmap

This lab starts a disposable target on a private Docker network. The workspace runs one fixed TCP service scan against that target; it does not accept custom commands or scan your host or external networks.

## Tasks

1. Select **Run service scan** in the interactive panel.
2. Read the output and count the ports marked `open`.
3. Compare the service/version banner on ports 2222, 8080, and 9001.
4. Answer the questions using the scan evidence.
5. Submit your answers to receive a score and explanations.

The target exposes only three small training services and has no published host ports. The lab network has no route to external networks. Stop the session when finished; its containers are removed automatically.
