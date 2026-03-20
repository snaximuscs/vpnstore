# 1stCS VPN — Deployment Guide

## Prerequisites
- Ubuntu 22.04 VPS (min 1 CPU, 1 GB RAM)
- Domain pointing to server IP (vpn.1stcs.gg → your server IP)
- QPay merchant account

---

## Step 1 — Server Setup

```bash
# SSH into server as root
ssh root@your.server.ip

# Clone / upload the project
git clone <your-repo> /opt/vpn
cd /opt/vpn

# Run the setup script (installs WireGuard, Docker, Nginx)
bash scripts/setup-server.sh
```

The script will output your **WireGuard server public key** and **endpoint** — save these.

---

## Step 2 — Environment Variables

```bash
cp .env.example .env
nano .env
```

Fill in all values:

| Variable | Description |
|---|---|
| `DB_PASSWORD` | MySQL password (choose strong) |
| `JWT_SECRET` | Random 32+ char string |
| `QPAY_USERNAME` | QPay merchant username |
| `QPAY_PASSWORD` | QPay merchant password |
| `QPAY_INVOICE_CODE` | From QPay dashboard |
| `WG_SERVER_PUBLIC_KEY` | From setup script output |
| `WG_SERVER_ENDPOINT` | `your.server.ip:51820` |
| `CRON_SECRET` | From setup script output |
| `ADMIN_EMAIL` | First user with this email becomes admin |

---

## Step 3 — Start Application

```bash
docker compose up -d --build
```

Check logs:
```bash
docker compose logs -f app
docker compose logs -f db
```

---

## Step 4 — SSL Certificate

```bash
# Copy nginx config
cp nginx.conf /etc/nginx/sites-available/vpn.1stcs.gg
ln -s /etc/nginx/sites-available/vpn.1stcs.gg /etc/nginx/sites-enabled/

# Test and reload nginx
nginx -t && systemctl reload nginx

# Get SSL certificate
certbot --nginx -d vpn.1stcs.gg
```

---

## Step 5 — Verify WireGuard

```bash
# Check WireGuard is running
wg show wg0

# Check peers (should be empty at first)
wg show wg0 peers
```

---

## QPay Webhook URL

Register this URL in your QPay merchant dashboard:
```
https://vpn.1stcs.gg/api/payment/webhook
```

---

## Cron Job (subscription cleanup)

The setup script adds a cron job automatically. Verify with:
```bash
crontab -l
```

Expected:
```
0 * * * * curl -s -X POST -H 'Authorization: Bearer <secret>' http://localhost:3000/api/cron/cleanup
```

---

## Useful Commands

```bash
# View active VPN peers
sudo wg show wg0

# Restart app
docker compose restart app

# View app logs
docker compose logs -f app

# Database shell
docker compose exec db mysql -u vpnuser -p vpndb

# Backup database
docker compose exec db mysqldump -u root -p vpndb > backup.sql
```

---

## Architecture

```
Internet
   │
   ▼
Nginx (443/80)  ←── SSL termination, rate limiting
   │
   ▼
Next.js App (:3000)
   │           │
   ▼           ▼
MySQL      WireGuard wg0
(vpndb)    (peer management via `wg set`)
```

## WireGuard Peer Flow

1. User pays via QPay
2. QPay calls webhook `POST /api/payment/webhook?pid=<id>`
3. Webhook verifies payment with QPay API
4. Backend runs: `wg genkey | wg pubkey` → generates key pair
5. Backend runs: `wg set wg0 peer <pubkey> allowed-ips <ip>/32`
6. Config stored in DB, user sees it on dashboard
7. Cron job hourly: removes expired peers via `wg set wg0 peer <pubkey> remove`
