#!/bin/sh
set -eu
/usr/sbin/sshd -D &
/usr/sbin/vsftpd /etc/vsftpd/vsftpd.conf &
/bin/busybox httpd -f -p 80 -h /www &
while true; do printf 'Cyber Range service banner | %s\n' "${FLAG_RECON:-range-lab}" | nc -l -p 9001; done
