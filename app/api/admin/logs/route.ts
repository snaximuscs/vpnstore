import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { query } from '@/lib/db'

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (auth instanceof NextResponse) return auth

  const { searchParams } = req.nextUrl
  const type   = searchParams.get('type')   || ''
  const search = searchParams.get('search') || ''
  const limit  = Math.min(200, Number(searchParams.get('limit') || 100))

  const conditions: string[] = []
  const params:     any[]    = []

  if (type)   { conditions.push('l.type = ?');       params.push(type) }
  if (search) { conditions.push('(l.message LIKE ? OR u.email LIKE ? OR u.username LIKE ? OR l.ip LIKE ?)');
                params.push(`%${search}%`,`%${search}%`,`%${search}%`,`%${search}%`) }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

  const rows = await query<any[]>(
    `SELECT
       l.id, l.type, l.message, l.ip, l.meta, l.created_at,
       u.email    AS user_email,
       u.username AS user_name,
       v.ip_address AS vpn_ip,
       s.plan, s.active AS sub_active, s.expires_at
     FROM logs l
     LEFT JOIN users u ON u.id = l.user_id
     LEFT JOIN vpn_clients v ON v.user_id = l.user_id
     LEFT JOIN subscriptions s ON s.user_id = l.user_id
     ${where}
     ORDER BY l.created_at DESC
     LIMIT ?`,
    [...params, limit]
  )

  // DB rows → VPNLog format
  const logs = rows.map(r => {
    const meta    = r.meta ? (typeof r.meta === 'string' ? JSON.parse(r.meta) : r.meta) : {}
    const username = r.user_name || r.user_email?.split('@')[0] || 'system'
    const ip       = r.vpn_ip   || r.ip || '—'

    // Status тодорхойлох
    let status: 'active' | 'inactive' | 'expired' | 'error' = 'inactive'
    if (r.type === 'error')                              status = 'error'
    else if (r.sub_active === 1 && r.expires_at && new Date(r.expires_at) > new Date()) status = 'active'
    else if (r.sub_active === 0 && r.expires_at)        status = 'expired'
    else if (r.type === 'vpn')                          status = 'active'
    else if (r.type === 'auth')                         status = 'inactive'

    // Tags үүсгэх
    const tags: string[] = []
    if (r.type)       tags.push(r.type)
    if (r.plan)       tags.push(r.plan)
    if (meta.action)  tags.push(meta.action)
    if (meta.device)  tags.push(meta.device)

    // Duration
    const duration = meta.duration || (r.sub_active ? calcDuration(r.created_at) : '—')

    return {
      id:        String(r.id),
      timestamp: r.created_at,
      username,
      ip,
      status,
      duration,
      message:   r.message,
      tags:      tags.filter(Boolean),
    }
  })

  return NextResponse.json({ logs, total: logs.length })
}

function calcDuration(from: string): string {
  const ms      = Date.now() - new Date(from).getTime()
  const minutes = Math.floor(ms / 60000)
  const hours   = Math.floor(minutes / 60)
  if (hours > 0) return `${hours}г ${minutes % 60}м`
  return `${minutes}м`
}
