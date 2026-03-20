import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { execute, queryOne } from '@/lib/db'

const QPAY_URL       = 'https://merchant.qpay.mn/v2'
const QPAY_USER      = process.env.QPAY_USERNAME     || ''
const QPAY_PASS      = process.env.QPAY_PASSWORD     || ''
const QPAY_INV_CODE  = process.env.QPAY_INVOICE_CODE || ''
const APP_URL        = process.env.NEXT_PUBLIC_APP_URL || 'https://vpnstore.1stcs.gg'

const PLANS: Record<string, { price: number; label: string; months: number }> = {
  '1m': { price: 9900, label: '1 сарын VPN эрх',  months: 1 },
  '3m': { price: 25900, label: '3 сарын VPN эрх',  months: 3 },
  '6m': { price: 45900, label: '6 сарын VPN эрх',  months: 6 },
}

async function getQPayToken(): Promise<string> {
  const res = await fetch(`${QPAY_URL}/auth/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${QPAY_USER}:${QPAY_PASS}`).toString('base64')}`,
    },
  })
  const data = await res.json()
  if (!data.access_token) throw new Error('QPay token авахад алдаа')
  return data.access_token
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ error: 'Нэвтрээгүй' }, { status: 401 })

    const { plan } = await req.json()
    if (!PLANS[plan]) return NextResponse.json({ error: 'Буруу тариф' }, { status: 400 })

    const { price, label, months } = PLANS[plan]
    const userId = Number(user.sub)

    // QPay token авах
    const token = await getQPayToken()

    // Нэхэмжлэл үүсгэх
    const invoiceRes = await fetch(`${QPAY_URL}/invoice`, {
      method:  'POST',
      headers: {
        Authorization:  `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        invoice_code:        QPAY_INV_CODE,
        sender_invoice_no:   `VPN-${userId}-${Date.now()}`,
        invoice_receiver_code: String(userId),
        invoice_description: label,
        amount:              price,
        callback_url:        `${APP_URL}/api/payment/qpay`,
      }),
    })
    const invoice = await invoiceRes.json()

    if (!invoice.invoice_id) {
      console.error('[create] QPay response:', invoice)
      throw new Error('Нэхэмжлэл үүсгэхэд алдаа')
    }

    // DB-д хадгалах
    const result = await execute(
      `INSERT INTO payments (user_id, invoice_id, amount, plan, status, created_at)
       VALUES (?, ?, ?, ?, 'PENDING', NOW())`,
      [userId, invoice.invoice_id, price, plan]
    )

    return NextResponse.json({
      ok:         true,
      payment_id: (result as any).insertId,
      invoice_id: invoice.invoice_id,
      amount:     price,
      label,
      qr_image:   invoice.qr_image,
      qr_text:    invoice.qr_text,
      urls:       invoice.urls || [],
    })

  } catch (err: any) {
    console.error('[payment/create]', err)
    return NextResponse.json({ error: err.message || 'Серверийн алдаа' }, { status: 500 })
  }
}
