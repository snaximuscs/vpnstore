import { NextRequest, NextResponse } from 'next/server'
import { execute, queryOne, query } from '@/lib/db'
import { provisionVpnClient } from '@/lib/wireguard'

const QPAY_URL  = 'https://merchant.qpay.mn/v2'
const QPAY_USER = process.env.QPAY_USERNAME || ''
const QPAY_PASS = process.env.QPAY_PASSWORD || ''

const PLAN_MONTHS: Record<string, number> = {
  '1m': 1, '3m': 3, '6m': 6
}

/* ── QPay token авах ── */
async function getQPayToken(): Promise<string> {
  const res = await fetch(`${QPAY_URL}/auth/token`, {
    method:  'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${QPAY_USER}:${QPAY_PASS}`).toString('base64')}`,
    },
  })
  const data = await res.json()
  return data.access_token
}

/* ── Нэхэмжлэл шалгах ── */
async function checkInvoice(invoiceId: string, token: string): Promise<boolean> {
  const res = await fetch(`${QPAY_URL}/payment/check`, {
    method:  'POST',
    headers: {
      Authorization:  `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ object_type: 'INVOICE', object_id: invoiceId }),
  })
  const data = await res.json()
  // rows[0].payment_status === 'PAID'
  return data?.rows?.some((r: any) => r.payment_status === 'PAID') ?? false
}

/* ════════════════════════════════════════════════════════
   POST /api/payment/qpay  — QPay callback webhook
   ════════════════════════════════════════════════════════ */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    console.log('[qpay webhook]', JSON.stringify(body))

    const { payment_id, qpay_payment_id } = body

    if (!payment_id) {
      return NextResponse.json({ error: 'payment_id байхгүй' }, { status: 400 })
    }

    // DB-с payment олох
    const payment = await queryOne<any>(
      `SELECT * FROM payments WHERE id=? OR invoice_id=?`,
      [payment_id, payment_id]
    )

    if (!payment) {
      return NextResponse.json({ error: 'Payment олдсонгүй' }, { status: 404 })
    }

    if (payment.status === 'PAID') {
      return NextResponse.json({ ok: true, message: 'Аль хэдийн төлөгдсөн' })
    }

    // QPay-аас төлбөр баталгаажуулах
    const token  = await getQPayToken()
    const isPaid = await checkInvoice(payment.invoice_id || payment_id, token)

    if (!isPaid) {
      return NextResponse.json({ error: 'Төлбөр баталгаажаагүй' }, { status: 402 })
    }

    // Payment шинэчлэх
    await execute(
      `UPDATE payments SET status='PAID', updated_at=NOW() WHERE id=?`,
      [payment.id]
    )

    // Subscription идэвхжүүлэх
    const months = PLAN_MONTHS[payment.plan] || 1
    const existing = await queryOne<any>(
      `SELECT id FROM subscriptions WHERE user_id=?`, [payment.user_id]
    )

    if (existing) {
      await execute(
        `UPDATE subscriptions
         SET plan=?, active=1,
             expires_at = DATE_ADD(GREATEST(NOW(), expires_at), INTERVAL ? MONTH),
             updated_at = NOW()
         WHERE user_id=?`,
        [payment.plan, months, payment.user_id]
      )
    } else {
      await execute(
        `INSERT INTO subscriptions (user_id, plan, active, expires_at, created_at)
         VALUES (?, ?, 1, DATE_ADD(NOW(), INTERVAL ? MONTH), NOW())`,
        [payment.user_id, payment.plan, months]
      )
    }

    // VPN config автоматаар үүсгэх
    const vpn = await provisionVpnClient(payment.user_id)

    console.log(`[qpay] ✓ User ${payment.user_id} — ${payment.plan} — VPN: ${vpn.ip}`)

    return NextResponse.json({ ok: true, ip: vpn.ip })

  } catch (err: any) {
    console.error('[qpay webhook] алдаа:', err)
    return NextResponse.json({ error: 'Серверийн алдаа' }, { status: 500 })
  }
}

/* ════════════════════════════════════════════════════════
   GET /api/payment/qpay/create  — нэхэмжлэл үүсгэх
   ════════════════════════════════════════════════════════ */
export async function GET(req: NextRequest) {
  return NextResponse.json({ error: 'POST ашиглана уу' }, { status: 405 })
}
