import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { queryOne, execute } from '@/lib/db'
import { writeLog } from '@/lib/logger'
import { Client } from 'ssh2'

const VPN_INSTALL_CMD = `
  apt-get update -qq &&
  apt-get install -y -qq wireguard wireguard-tools nftables &&
  echo "VPN_INSTALLED"
`
const VPN_START_CMD  = `systemctl enable wg-quick@wg0 && systemctl start wg-quick@wg0 && echo "VPN_STARTED"`
const VPN_STATUS_CMD = `systemctl is-active wg-quick@wg0 && echo "VPN_STATUS"`

/* POST /api/admin/servers/vpn — action: install | start | stop | status */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (auth instanceof NextResponse) return auth

  const { id, action } = await req.json()
  if (!id || !['install','start','stop','status'].includes(action)) {
    return NextResponse.json({ error: 'id, action шаардлагатай' }, { status: 400 })
  }

  const server = await queryOne<any>(`SELECT * FROM servers WHERE id=?`, [id])
  if (!server) return NextResponse.json({ error: 'Сервер олдсонгүй' }, { status: 404 })

  const cmds: Record<string, string> = {
    install: VPN_INSTALL_CMD,
    start:   VPN_START_CMD,
    stop:    `systemctl stop wg-quick@wg0 && echo "VPN_STOPPED"`,
    status:  VPN_STATUS_CMD,
  }

  try {
    const output = await runSSH(server, cmds[action])

    let vpn_status: string | null = null
    if (action === 'install') vpn_status = 'installed'
    if (action === 'start')   vpn_status = 'running'
    if (action === 'stop')    vpn_status = 'stopped'
    if (vpn_status) {
      await execute(`UPDATE servers SET vpn_status=? WHERE id=?`, [vpn_status, id])
    }

    await writeLog('admin', `Сервер VPN ${action}: ${server.ip}`, {
      userId: Number(auth.user.sub),
    })

    return NextResponse.json({ ok: true, output, vpn_status })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

function runSSH(server: any, cmd: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const conn   = new Client()
    let   output = ''

    conn.on('ready', () => {
      conn.exec(cmd, (err, stream) => {
        if (err) { conn.end(); reject(err); return }
        stream.on('data',   (d: Buffer) => { output += d.toString() })
        stream.stderr.on('data', (d: Buffer) => { output += d.toString() })
        stream.on('close',  () => { conn.end(); resolve(output.trim()) })
      })
    })

    conn.on('error', reject)

    const cfg: any = {
      host: server.ip, port: server.ssh_port || 22,
      username: server.username, readyTimeout: 15_000,
    }
    if (server.auth_type === 'key' && server.ssh_key) cfg.privateKey = server.ssh_key
    else cfg.password = server.ssh_pass

    conn.connect(cfg)
  })
}
