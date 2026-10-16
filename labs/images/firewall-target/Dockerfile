FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends iptables nftables openssh-server sudo netcat-openbsd python3 && rm -rf /var/lib/apt/lists/* && \
    useradd -m -s /bin/bash student && echo 'student:RangeStudent!26' | chpasswd && \
    echo 'student ALL=(ALL) NOPASSWD: /usr/sbin/iptables, /usr/sbin/nft' > /etc/sudoers.d/student && chmod 0440 /etc/sudoers.d/student && \
    mkdir -p /run/sshd /www && ssh-keygen -A && \
    sed -i 's/^#PasswordAuthentication yes/PasswordAuthentication yes/' /etc/ssh/sshd_config
COPY start.sh /usr/local/bin/start-lab
RUN chmod 0755 /usr/local/bin/start-lab
CMD ["/usr/local/bin/start-lab"]
