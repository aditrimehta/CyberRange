FROM kalilinux/kali-rolling:latest
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends \
    kali-desktop-xfce xfce4-session dbus-x11 tigervnc-standalone-server novnc websockify supervisor \
    nmap netcat-openbsd hydra john sqlmap nikto gobuster metasploit-framework wireshark tshark tcpdump curl \
    firefox-esr wordlists unzip python3-scapy iproute2 dnsutils openssh-client && \
    if [ -f /usr/share/wordlists/rockyou.txt.gz ]; then gunzip /usr/share/wordlists/rockyou.txt.gz; fi && \
    apt-get clean && rm -rf /var/lib/apt/lists/*
RUN groupadd --system student && useradd --create-home --shell /bin/bash --gid student student && \
    mkdir -p /home/student/.vnc /home/student/range && chown -R student:student /home/student
COPY supervisor.conf /etc/supervisor/conf.d/supervisor.conf
COPY entrypoint.sh /usr/local/bin/cyberrange-entrypoint
COPY pcap_generator.py /opt/cyberrange/pcap_generator.py
RUN chmod 0755 /usr/local/bin/cyberrange-entrypoint && chmod 0644 /opt/cyberrange/pcap_generator.py
EXPOSE 6080
USER student
WORKDIR /home/student
HEALTHCHECK --interval=15s --timeout=5s --start-period=45s --retries=5 CMD curl -fsS http://127.0.0.1:6080/vnc.html >/dev/null || exit 1
ENTRYPOINT ["/usr/local/bin/cyberrange-entrypoint"]
