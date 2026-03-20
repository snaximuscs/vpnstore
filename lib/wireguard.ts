import { execute, queryOne }  from '@/lib/db'

const AGENT_URL   = process.env.WG_AGENT_URL    || ''
const AGENT_TOKEN = process.env.WG_AGENT_TOKEN  || ''
const SERVER_PUB  = process.env.WG_SERVER_PUBKEY || ''
const SERVER_EP   = process.env.WG_ENDPOINT      || '202.179.6.18:51820'
const ALLOWED     = process.env.WG_ALLOWED_IPS   || '103.165.46.0/24'
const DNS         = '1.1.1.1'

/* ── Agent-г дуудах ── */
async function agentCall(path: string, body: object): Promise<any> {
  const res = await fetch(`${AGENT_URL}${path}`, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${AGENT_TOKEN}`,
    },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || `Agent алдаа: ${res.status}`)
  return data
}

/* ── Key pair үүсгэх (Node.js crypto — wg binary шаардлагагүй) ── */
function generateKeyPair(): { privateKey: string; publicKey: string } {
  const { generateKeyPairSync } = require('crypto')
  const { privateKey: priv, publicKey: pub } = generateKeyPairSync('x25519', {
    publicKeyEncoding:  { type: 'spki',  format: 'der' },
    privateKeyEncoding: { type: 'pkcs8', format: 'der' },
  })
  // Raw 32 bytes: SPKI header=12 bytes, PKCS8 header=16 bytes
  const privateKey = (priv as unknown as Buffer).subarray(16).toString('base64')
  const publicKey  = (pub  as unknown as Buffer).subarray(12).toString('base64')
  return { privateKey, publicKey }
}

/* ── IP олгох (ip_pool-с) ── */
async function allocateIp(userId: number): Promise<string> {
  const conn = await (await import('./db')).getConnection()
  try {
    await conn.beginTransaction()
    const [rows]: any = await conn.execute(
      `SELECT ip_address FROM ip_pool WHERE assigned=0
       ORDER BY INET_ATON(ip_address) LIMIT 1 FOR UPDATE`
    )
    if (!rows?.length) throw new Error('IP pool дууссан')
    const ip = rows[0].ip_address
    await conn.execute(
      `UPDATE ip_pool SET assigned=1, user_id=? WHERE ip_address=?`,
      [userId, ip]
    )
    await conn.commit()
    return ip
  } catch (e) {
    await conn.rollback(); throw e
  } finally {
    conn.release()
  }
}

/* ── Client config текст ── */
function buildConfig(privateKey: string, ip: string): string {
  return `[Interface]
PrivateKey = ${privateKey}
Address    = ${ip}/32
DNS        = ${DNS}

[Peer]
PublicKey  = ${SERVER_PUB}
Endpoint   = ${SERVER_EP}
AllowedIPs = ${ALLOWED}
PersistentKeepalive = 25`
}

/* ═══════════════════════════════════════════════════════════════
   Provision — төлбөр хийгдсэний дараа дуудагдана
   ═══════════════════════════════════════════════════════════════ */
export async function provisionVpnClient(userId: number): Promise<{
  ip: string; publicKey: string; config: string
}> {
  // Аль хэдийн үүссэн эсэх
  const existing = await queryOne<any>(
    `SELECT * FROM vpn_clients WHERE user_id=?`, [userId]
  )
  if (existing) {
    // VPN серверт дахин нэмэх (restart хийгдсэн байж болно)
    try {
      await agentCall('/provision', {
        public_key: existing.public_key,
        ip:         existing.ip_address,
      })
    } catch {}
    return {
      ip:        existing.ip_address,
      publicKey: existing.public_key,
      config:    existing.config,
    }
  }

  const { privateKey, publicKey } = generateKeyPair()
  const ip     = await allocateIp(userId)
  const config = buildConfig(privateKey, ip)

  // VPN серверт peer нэмэх
  await agentCall('/provision', { public_key: publicKey, ip })

  // DB-д хадгалах
  await execute(
    `INSERT INTO vpn_clients
       (user_id, public_key, private_key, ip_address, config, created_at)
     VALUES (?,?,?,?,?,NOW())`,
    [userId, publicKey, privateKey, ip, config]
  )

  console.log(`[wireguard] ✓ User ${userId} — ${ip}`)
  return { ip, publicKey, config }
}

/* ═══════════════════════════════════════════════════════════════
   Deprovision — захиалга дуусахад дуудагдана
   ═══════════════════════════════════════════════════════════════ */
export async function deprovisionVpnClient(userId: number): Promise<void> {
  const client = await queryOne<any>(
    `SELECT * FROM vpn_clients WHERE user_id=?`, [userId]
  )
  if (!client) return

  try {
    await agentCall('/deprovision', { public_key: client.public_key })
  } catch (e) {
    console.warn(`[wireguard] deprovision алдаа user ${userId}:`, e)
  }

  await execute(`UPDATE ip_pool SET assigned=0, user_id=NULL WHERE user_id=?`, [userId])
  await execute(`DELETE FROM vpn_clients WHERE user_id=?`, [userId])
}

/* ═══════════════════════════════════════════════════════════════
   Cleanup — хугацаа дууссан subscriptions устгах (cron)
   ═══════════════════════════════════════════════════════════════ */
export async function cleanupExpiredSubscriptions(): Promise<void> {
  const expired = await (await import('./db')).query<any[]>(
    `SELECT s.user_id, v.public_key
     FROM subscriptions s
     LEFT JOIN vpn_clients v ON v.user_id = s.user_id
     WHERE s.active = 1 AND s.expires_at < NOW()`
  )

  for (const row of expired) {
    try {
      await deprovisionVpnClient(row.user_id)
    } catch (e) {
      console.warn(`[cleanup] user ${row.user_id} deprovision алдаа:`, e)
    }

    await (await import('./db')).execute(
      `UPDATE subscriptions SET active=0 WHERE user_id=? AND expires_at < NOW()`,
      [row.user_id]
    )
    console.log(`[cleanup] ✓ User ${row.user_id} хугацаа дуусч устгагдлаа`)
  }

  if (expired.length === 0) {
    console.log('[cleanup] Хугацаа дууссан subscription байхгүй')
  }
}
