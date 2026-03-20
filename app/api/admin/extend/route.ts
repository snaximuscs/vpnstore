import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { queryOne, execute } from '@/lib/db'
import { provisionVpnClient } from '@/lib/wireguard'
import { PLAN_MONTHS } from '@/types'

export async function POST(req: NextRequest) {
  const admin = await getAuthUser(req)
  if (!admin?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { user_id, plan } = await req.json()
  if (!user_id || !['1m', '3m', '6m'].includes(plan)) {
    return NextResponse.json({ error: 'Invalid params' }, { status: 400 })
  }

  const months = PLAN_MONTHS[plan as '1m' | '3m' | '6m']

  // Deactivate old subscription
  await execute('UPDATE subscriptions SET active = 0 WHERE user_id = ?', [user_id])

  const expiresAt = new Date()
  expiresAt.setMonth(expiresAt.getMonth() + months)
  const expiresStr = expiresAt.toISOString().slice(0, 19).replace('T', ' ')

  await execute(
    `INSERT INTO subscriptions (user_id, plan, price_mnt, active, expires_at)
     VALUES (?, ?, 0, 1, ?)`,
    [user_id, plan, expiresStr]
  )

  // Ensure VPN client exists
  await provisionVpnClient(user_id)

  return NextResponse.json({ message: `Subscription extended for user ${user_id}` })
}
