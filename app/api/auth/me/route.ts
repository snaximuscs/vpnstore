import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { queryOne } from '@/lib/db'
import type { User } from '@/types'

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const row = await queryOne<User>(
    'SELECT id, email, is_admin, created_at FROM users WHERE id = ?',
    [user.sub]
  )
  if (!row) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  return NextResponse.json({ user: row })
}
