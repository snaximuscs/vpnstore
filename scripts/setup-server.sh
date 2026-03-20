#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# 1stCS VPN — Ubuntu Server Setup Script
# Run as root on a fresh Ubuntu 22.04 server
# Usage: bash setup-server.sh
# ─────────────────────────────────────────────────────────────────────────────
set -e

SERVER_IP=$(curl -s ifconfig.me)
WG_PORT=51820
WG_SUBNET=10.0.0.0/24
WG_SERVER_IP=10.0.0.1

echo "======================================================"
echo "  1stCS VPN Server Setup"
echo "  Server IP: $SERVER_IP"
echo "======================================================"

# ─── Update system ────────────────────────────────────────────────────────────
apt-get update -y && apt-get upgrade -y

# ─── Install WireGuard ────────────────────────────────────────────────────────
apt-get install -y wireguard wireguard-tools

# ─── Enable IP forwarding ─────────────────────────────────────────────────────
echo "net.ipv4.ip_forward=1" >> /etc/sysctl.conf
echo "net.ipv6.conf.all.forwarding=1" >> /etc/sysctl.conf
sysctl -p

# ─── Generate server keys ─────────────────────────────────────────────────────
mkdir -p /etc/wireguard
umask 077
SERVER_PRIVATE_KEY=$(wg genkey)
SERVER_PUBLIC_KEY=$(echo "$SERVER_PRIVATE_KEY" | wg pubkey)

echo "Server private key: $SERVER_PRIVATE_KEY"
echo "Server public key:  $SERVER_PUBLIC_KEY"
echo ""
echo "IMPORTANT: Save WG_SERVER_PUBLIC_KEY=$SERVER_PUBLIC_KEY in your .env"

# ─── Detect default network interface ────────────────────────────────────────
DEFAULT_IFACE=$(ip route | grep default | awk '{print $5}' | head -1)
echo "Default interface: $DEFAULT_IFACE"

# ─── Create WireGuard server config ──────────────────────────────────────────
cat > /etc/wireguard/wg0.conf << EOF
[Interface]
PrivateKey = $SERVER_PRIVATE_KEY
Address = $WG_SERVER_IP/24
ListenPort = $WG_PORT

# NAT / IP masquerade
PostUp   = iptables -A FORWARD -i %i -j ACCEPT; iptables -A FORWARD -o %i -j ACCEPT; iptables -t nat -A POSTROUTING -o $DEFAULT_IFACE -j MASQUERADE
PostDown = iptables -D FORWARD -i %i -j ACCEPT; iptables -D FORWARD -o %i -j ACCEPT; iptables -t nat -D POSTROUTING -o $DEFAULT_IFACE -j MASQUERADE
EOF

chmod 600 /etc/wireguard/wg0.conf

# ─── Start and enable WireGuard ──────────────────────────────────────────────
systemctl enable wg-quick@wg0
systemctl start wg-quick@wg0

echo "WireGuard started: $(wg show wg0)"

# ─── Install Docker ───────────────────────────────────────────────────────────
if ! command -v docker &> /dev/null; then
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker
  systemctl start docker
fi

# ─── Install Docker Compose ───────────────────────────────────────────────────
if ! command -v docker compose &> /dev/null; then
  apt-get install -y docker-compose-plugin
fi

# ─── Install Nginx ────────────────────────────────────────────────────────────
apt-get install -y nginx certbot python3-certbot-nginx

# ─── Configure sudoers for wg commands (for Next.js app) ─────────────────────
# This allows the node process to run wg without a password
cat > /etc/sudoers.d/wireguard << 'SUDO'
nextjs ALL=(ALL) NOPASSWD: /usr/bin/wg, /usr/bin/wg-quick
SUDO
chmod 440 /etc/sudoers.d/wireguard

# ─── Firewall ─────────────────────────────────────────────────────────────────
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow ${WG_PORT}/udp
ufw --force enable

# ─── Hourly cron for subscription cleanup ─────────────────────────────────────
CRON_SECRET_VAL=$(openssl rand -hex 32)
echo "Generated CRON_SECRET: $CRON_SECRET_VAL"
(crontab -l 2>/dev/null; echo "0 * * * * curl -s -X POST -H 'Authorization: Bearer $CRON_SECRET_VAL' http://localhost:3000/api/cron/cleanup >> /var/log/vpn-cron.log 2>&1") | crontab -

echo ""
echo "======================================================"
echo "  Setup complete!"
echo "  Server public key: $SERVER_PUBLIC_KEY"
echo "  Server endpoint:   $SERVER_IP:$WG_PORT"
echo ""
echo "  Next steps:"
echo "  1. Copy .env.example to .env and fill in values"
echo "  2. Set WG_SERVER_PUBLIC_KEY=$SERVER_PUBLIC_KEY"
echo "  3. Set WG_SERVER_ENDPOINT=$SERVER_IP:$WG_PORT"
echo "  4. Set CRON_SECRET=$CRON_SECRET_VAL"
echo "  5. docker compose up -d"
echo "  6. certbot --nginx -d vpn.1stcs.gg"
echo "======================================================"
