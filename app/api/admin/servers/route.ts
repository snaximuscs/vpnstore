import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin }  from '@/lib/admin-auth'
import { query, execute, queryOne } from '@/lib/db'
import { writeLog }      from '@/lib/logger'

/* GET /api/admin/servers */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (auth instanceof NextResponse) return auth

  const servers = await query<any[]>(
    `SELECT id, name, ip, ssh_port, username, auth_type,
            status, vpn_status, domain, ssl_status, notes, created_at
     FROM servers ORDER BY created_at DESC`
  )
  // Нууц үг / key хэзээ ч буцаахгүй
  return NextResponse.json({ servers })
}

/* POST /api/admin/servers — шинэ сервер нэмэх */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (auth instanceof NextResponse) return auth

  const {
    name, ip, ssh_port = 22, username = 'root',
    auth_type = 'password', ssh_pass, ssh_key,
    domain, notes,
  } = await req.json()

  if (!name || !ip) {
    return NextResponse.json({ error: 'name, ip шаардлагатай' }, { status: 400 })
  }

  const result = await execute(
    `INSERT INTO servers
       (name, ip, ssh_port, username, auth_type, ssh_pass, ssh_key, domain, notes)
     VALUES (?,?,?,?,?,?,?,?,?)`,
    [name, ip, ssh_port, username, auth_type,
     ssh_pass || null, ssh_key || null, domain || null, notes || null]
  )

  await writeLog('admin', `Сервер нэмэгдлээ: ${name} (${ip})`, {
    userId: Number(auth.user.sub),
  })

  return NextResponse.json({ ok: true, id: result.insertId })
}

/* PATCH /api/admin/servers — засах / устгах */
export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (auth instanceof NextResponse) return auth

  const { id, action, ...fields } = await req.json()
  if (!id || !action) {
    return NextResponse.json({ error: 'id, action шаардлагатай' }, { status: 400 })
  }

  if (action === 'delete') {
    await execute(`DELETE FROM servers WHERE id=?`, [id])
    return NextResponse.json({ ok: true })
  }

  if (action === 'update') {
    const allowed = ['name','ip','ssh_port','username','domain','notes','ssl_status']
    const sets    = Object.keys(fields).filter(k => allowed.includes(k))
    if (!sets.length) return NextResponse.json({ error: 'Засах талбар байхгүй' }, { status: 400 })
    const sql = `UPDATE servers SET ${sets.map(k => `${k}=?`).join(',')} WHERE id=?`
    await execute(sql, [...sets.map(k => fields[k]), id])
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Тодорхойгүй action' }, { status: 400 })
}
