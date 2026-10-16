#!/bin/sh
set -eu
/usr/sbin/sshd -D &
/usr/sbin/vsftpd /etc/vsftpd.conf &
while true; do printf 'Password audit lab. Session marker: %s\n' "${FLAG_PASSWORD:-range}" | nc -l -p 2323; done
