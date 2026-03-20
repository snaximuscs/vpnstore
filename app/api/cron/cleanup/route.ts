/**
 * Cron endpoint — called by a cron job or external scheduler every hour.
 * Removes expired subscriptions and cleans up WireGuard peers.
 *
 * Secure with CRON_SECRET env variable.
 * Example cron call:
 *   curl -H "Authorization: Bearer $CRON_SECRET" https://vpn.1stcs.gg/api/cron/cleanup
 */
import { NextRequest, NextResponse } from 'next/server'
import { cleanupExpiredSubscriptions } from '@/lib/wireguard'

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const removed = await cleanupExpiredSubscriptions()
    return NextResponse.json({
      message: `Cleanup complete`,
      removed,
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    console.error('[cron/cleanup]', err)
    return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 })
  }
}

// Also allow GET for convenience with cron services that use GET
export async function GET(req: NextRequest) {
  return POST(req)
}
