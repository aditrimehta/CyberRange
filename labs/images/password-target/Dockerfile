FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends openssh-server vsftpd netcat-openbsd && rm -rf /var/lib/apt/lists/* && \
    useradd -m -s /bin/bash student && echo 'student:RangeStudent!26' | chpasswd && \
    mkdir -p /run/sshd /var/ftp && ssh-keygen -A && \
    sed -i 's/^#PasswordAuthentication yes/PasswordAuthentication yes/' /etc/ssh/sshd_config && \
    printf 'listen=YES\nanonymous_enable=NO\nlocal_enable=YES\nwrite_enable=NO\n' > /etc/vsftpd.conf
COPY start.sh /usr/local/bin/start-lab
RUN chmod 0755 /usr/local/bin/start-lab
CMD ["/usr/local/bin/start-lab"]
