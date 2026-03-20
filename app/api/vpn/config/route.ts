import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { queryOne } from '@/lib/db'
import { provisionVpnClient } from '@/lib/wireguard'

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ error: 'Нэвтрээгүй' }, { status: 401 })

    const userId = Number(user.sub)

    // Subscription шалгах
    const sub = await queryOne<any>(
      `SELECT * FROM subscriptions WHERE user_id=? AND active=1 AND expires_at > NOW()`,
      [userId]
    )

    if (!sub) {
      return NextResponse.json({ error: 'Идэвхтэй захиалга байхгүй' }, { status: 404 })
    }

    // Config байгаа эсэх шалгах
    let client = await queryOne<any>(
      `SELECT * FROM vpn_clients WHERE user_id=?`, [userId]
    )

    // Config байхгүй бол автоматаар үүсгэх
    if (!client) {
      console.log(`[vpn/config] Auto-provisioning user ${userId}...`)
      try {
        const provisioned = await provisionVpnClient(userId)
        client = await queryOne<any>(
          `SELECT * FROM vpn_clients WHERE user_id=?`, [userId]
        )
        console.log(`[vpn/config] ✓ User ${userId} — ${provisioned.ip}`)
      } catch (e: any) {
        console.error(`[vpn/config] Provision алдаа:`, e)
        return NextResponse.json(
          { error: 'Config үүсгэхэд алдаа гарлаа', provisioning: true },
          { status: 503 }
        )
      }
    }

    if (!client) {
      return NextResponse.json({ provisioning: true }, { status: 202 })
    }

    return NextResponse.json({
      ok:         true,
      config:     client.config,
      ip_address: client.ip_address,
      created_at: client.created_at,
      expires_at: sub.expires_at,
      plan:       sub.plan,
    })

  } catch (err: any) {
    console.error('[vpn/config]', err)
    return NextResponse.json({ error: 'Серверийн алдаа' }, { status: 500 })
  }
}
