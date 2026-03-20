import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'

export async function requireAdmin(req: NextRequest): Promise<
  { user: { sub: string; email: string; is_admin: boolean } } |
  NextResponse
> {
  const user = await getAuthUser(req)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!user.is_admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  return { user }
}
