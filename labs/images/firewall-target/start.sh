#!/bin/sh
set -eu
printf '<h1>Firewall target</h1><p>Status marker: %s</p>\n' "${FLAG_FIREWALL:-range-training}" > /www/index.html
/usr/sbin/sshd -D &
/usr/bin/python3 -m http.server 80 --directory /www &
while true; do printf 'Unneeded service: %s\n' "${FLAG_FIREWALL:-range-training}" | nc -l -p 8080; done
