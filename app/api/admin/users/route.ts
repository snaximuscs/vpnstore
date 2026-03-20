import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { query, execute } from '@/lib/db'
import { writeLog } from '@/lib/logger'

/* GET /api/admin/users?search=&page=1&limit=20 */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (auth instanceof NextResponse) return auth

  const { searchParams } = req.nextUrl
  const search = searchParams.get('search') || ''
  const page   = Math.max(1, Number(searchParams.get('page')  || 1))
  const limit  = Math.min(100, Number(searchParams.get('limit') || 20))
  const offset = (page - 1) * limit

  const like = `%${search}%`

  const [users, total] = await Promise.all([
    query<any[]>(
      `SELECT
         u.id, u.email, u.username, u.is_admin,
         u.email_verified, u.created_at,
         s.plan, s.active AS sub_active, s.expires_at,
         v.ip_address AS vpn_ip
       FROM users u
       LEFT JOIN subscriptions s ON s.user_id = u.id
       LEFT JOIN vpn_clients   v ON v.user_id = u.id
       WHERE u.email LIKE ? OR u.username LIKE ?
       ORDER BY u.created_at DESC
       LIMIT ? OFFSET ?`,
      [like, like, limit, offset]
    ),
    query<any[]>(
      `SELECT COUNT(*) AS cnt FROM users
       WHERE email LIKE ? OR username LIKE ?`,
      [like, like]
    ),
  ])

  return NextResponse.json({
    users,
    total:    total[0]?.cnt ?? 0,
    page,
    limit,
  })
}

/* PATCH /api/admin/users — идэвхжүүлэх/цуцлах */
export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (auth instanceof NextResponse) return auth

  const { userId, action } = await req.json()
  if (!userId || !['activate','deactivate','make_admin','remove_admin'].includes(action)) {
    return NextResponse.json({ error: 'userId, action шаардлагатай' }, { status: 400 })
  }

  const updates: Record<string, string> = {
    activate:     'UPDATE users SET email_verified=1 WHERE id=?',
    deactivate:   'UPDATE users SET email_verified=0 WHERE id=?',
    make_admin:   'UPDATE users SET is_admin=1 WHERE id=?',
    remove_admin: 'UPDATE users SET is_admin=0 WHERE id=?',
  }

  await execute(updates[action], [userId])
  await writeLog('admin', `User ${userId} — ${action}`, {
    userId: Number(auth.user.sub),
    ip:     req.headers.get('x-real-ip') || undefined,
  })

  return NextResponse.json({ ok: true })
}
