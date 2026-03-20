/**
 * GET /api/vpn/qr
 * Returns a base64 PNG QR code of the user's WireGuard config.
 * Only accessible by the config owner with an active subscription.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { queryOne } from '@/lib/db'
import QRCode from 'qrcode'
import type { VpnClient, Subscription } from '@/types'

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const sub = await queryOne<Subscription>(
      'SELECT id FROM subscriptions WHERE user_id = ? AND active = 1 AND expires_at > NOW() LIMIT 1',
      [user.sub]
    )
    if (!sub) return NextResponse.json({ error: 'No active subscription' }, { status: 403 })

    const client = await queryOne<VpnClient>(
      'SELECT config FROM vpn_clients WHERE user_id = ? LIMIT 1',
      [user.sub]
    )
    if (!client) return NextResponse.json({ error: 'Config not ready' }, { status: 404 })

    const dataUrl = await QRCode.toDataURL(client.config, { width: 400, margin: 2 })
    // Strip the data URL prefix and return just the base64
    const base64 = dataUrl.replace('data:image/png;base64,', '')

    return NextResponse.json({ qr_base64: base64 })
  } catch (err) {
    console.error('[vpn/qr]', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
