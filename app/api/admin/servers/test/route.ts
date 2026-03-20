import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { queryOne, execute } from '@/lib/db'
import { writeLog } from '@/lib/logger'
import { Client } from 'ssh2'

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (auth instanceof NextResponse) return auth

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'id шаардлагатай' }, { status: 400 })

  const server = await queryOne<any>(
    `SELECT * FROM servers WHERE id=?`, [id]
  )
  if (!server) return NextResponse.json({ error: 'Сервер олдсонгүй' }, { status: 404 })

  const online = await testSSH(server)
  await execute(
    `UPDATE servers SET status=? WHERE id=?`,
    [online ? 'online' : 'offline', id]
  )
  await writeLog('admin', `Сервер SSH шалгалт: ${server.ip} — ${online ? 'online' : 'offline'}`, {
    userId: Number(auth.user.sub),
  })

  return NextResponse.json({ ok: true, status: online ? 'online' : 'offline' })
}

function testSSH(server: any): Promise<boolean> {
  return new Promise(resolve => {
    const conn = new Client()
    const timeout = setTimeout(() => { conn.end(); resolve(false) }, 10_000)

    conn.on('ready', () => {
      clearTimeout(timeout)
      conn.exec('echo ok', (err, stream) => {
        stream?.on('close', () => { conn.end(); resolve(true) })
        stream?.on('data',  () => {})
        if (err) { conn.end(); resolve(false) }
      })
    })

    conn.on('error', () => { clearTimeout(timeout); resolve(false) })

    const cfg: any = {
      host:     server.ip,
      port:     server.ssh_port || 22,
      username: server.username,
      readyTimeout: 8000,
    }
    if (server.auth_type === 'key' && server.ssh_key) {
      cfg.privateKey = server.ssh_key
    } else {
      cfg.password = server.ssh_pass
    }
    conn.connect(cfg)
  })
}
