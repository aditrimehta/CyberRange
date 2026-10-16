#!/bin/sh
set -eu
if [ -z "${VNC_PASSWORD:-}" ]; then
  echo "VNC_PASSWORD is required" >&2
  exit 1
fi
umask 077
printf '%s\n' "$VNC_PASSWORD" | vncpasswd -f > /home/student/.vnc/passwd
chmod 0600 /home/student/.vnc/passwd
unset VNC_PASSWORD
if [ -n "${FLAG_PCAP:-}" ]; then
  python3 /opt/cyberrange/pcap_generator.py --output /home/student/range/traffic.pcap --flag "$FLAG_PCAP"
  chmod 0600 /home/student/range/traffic.pcap
fi
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisor.conf
