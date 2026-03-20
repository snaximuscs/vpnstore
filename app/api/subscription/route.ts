import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { queryOne } from '@/lib/db'
import type { Subscription } from '@/types'

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sub = await queryOne<Subscription>(
    `SELECT * FROM subscriptions WHERE user_id = ? AND active = 1 ORDER BY expires_at DESC LIMIT 1`,
    [user.sub]
  )

  return NextResponse.json({ subscription: sub || null })
}
