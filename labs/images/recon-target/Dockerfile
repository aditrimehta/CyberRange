FROM alpine:3.21.0
RUN apk add --no-cache openssh-server vsftpd busybox-extras python3 && \
    adduser -D -s /bin/sh range && echo 'range:LabRangeOnly!26' | chpasswd && \
    ssh-keygen -A && mkdir -p /var/ftp/pub /www && \
    printf 'Welcome to the isolated Cyber Range FTP service.\n' > /var/ftp/pub/readme.txt && \
    printf '<h1>Cyber Range recon target</h1><p>Service inventory exercise.</p>\n' > /www/index.html && \
    printf 'Listen 21\nAnonymous_enable=YES\nLocal_enable=YES\nWrite_enable=NO\nAnon_root=/var/ftp\n' > /etc/vsftpd/vsftpd.conf
COPY start.sh /usr/local/bin/start-lab
RUN chmod 0755 /usr/local/bin/start-lab
CMD ["/usr/local/bin/start-lab"]
