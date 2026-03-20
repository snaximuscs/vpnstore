/**
 * GET /api/vpn/download
 * Returns the .conf file as a downloadable attachment.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, verifyToken } from '@/lib/auth'
import { queryOne } from '@/lib/db'
import type { VpnClient, Subscription } from '@/types'

export async function GET(req: NextRequest) {
  try {
    // Support token via query param (for direct <a href> downloads)
    const { searchParams } = new URL(req.url)
    const qToken = searchParams.get('token')
    const user = qToken ? await verifyToken(qToken) : await getAuthUser(req)
    if (!user) return new NextResponse('Unauthorized', { status: 401 })

    const sub = await queryOne<Subscription>(
      'SELECT id FROM subscriptions WHERE user_id = ? AND active = 1 AND expires_at > NOW() LIMIT 1',
      [user.sub]
    )
    if (!sub) return new NextResponse('No active subscription', { status: 403 })

    const client = await queryOne<VpnClient>(
      'SELECT config, ip_address FROM vpn_clients WHERE user_id = ? LIMIT 1',
      [user.sub]
    )
    if (!client) return new NextResponse('Config not ready', { status: 404 })

    const filename = `1stcs-vpn-${client.ip_address.replace(/\./g, '-')}.conf`

    return new NextResponse(client.config, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error('[vpn/download]', err)
    return new NextResponse('Server error', { status: 500 })
  }
}
