/**
 * QPay webhook — called by QPay when a payment is completed.
 * Also used as a polling endpoint (GET) from the frontend.
 */
import { NextRequest, NextResponse } from 'next/server'
import { queryOne, execute } from '@/lib/db'
import { checkPayment } from '@/lib/qpay'
import { provisionVpnClient } from '@/lib/wireguard'
import { PLAN_MONTHS } from '@/types'

interface PaymentRow {
  id: number
  user_id: number
  invoice_id: string
  amount_mnt: number
  plan: '1m' | '3m' | '6m'
  status: string
}

async function activateSubscription(payment: PaymentRow) {
  // Create/extend subscription
  const months = PLAN_MONTHS[payment.plan]
  const expiresAt = new Date()
  expiresAt.setMonth(expiresAt.getMonth() + months)
  const expiresStr = expiresAt.toISOString().slice(0, 19).replace('T', ' ')

  // Deactivate any previous subscription
  await execute('UPDATE subscriptions SET active = 0 WHERE user_id = ?', [payment.user_id])

  const subResult = await execute(
    `INSERT INTO subscriptions (user_id, plan, price_mnt, active, expires_at)
     VALUES (?, ?, ?, 1, ?)`,
    [payment.user_id, payment.plan, payment.amount_mnt, expiresStr]
  )
  const subscriptionId = subResult.insertId

  // Link payment → subscription
  await execute(
    'UPDATE payments SET status = ?, subscription_id = ? WHERE id = ?',
    ['paid', subscriptionId, payment.id]
  )

  // Provision WireGuard config
  await provisionVpnClient(payment.user_id)
}

/** QPay calls this endpoint (POST) when payment is confirmed */
export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const paymentId = searchParams.get('pid')

    if (!paymentId) {
      return NextResponse.json({ error: 'Missing pid' }, { status: 400 })
    }

    const payment = await queryOne<PaymentRow>(
      'SELECT * FROM payments WHERE id = ?',
      [paymentId]
    )

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    if (payment.status === 'paid') {
      return NextResponse.json({ message: 'Already processed' })
    }

    // Verify with QPay API
    const check = await checkPayment(payment.invoice_id)

    if (check.count > 0 && check.paid_amount >= payment.amount_mnt) {
      await activateSubscription(payment)
      return NextResponse.json({ message: 'Payment confirmed, VPN provisioned' })
    }

    return NextResponse.json({ message: 'Payment pending' })
  } catch (err) {
    console.error('[webhook]', err)
    return NextResponse.json({ error: 'Webhook error' }, { status: 500 })
  }
}

/** Frontend polls this (GET) to check payment status */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const paymentId = searchParams.get('pid')

    if (!paymentId) {
      return NextResponse.json({ error: 'Missing pid' }, { status: 400 })
    }

    const payment = await queryOne<PaymentRow>(
      'SELECT id, user_id, invoice_id, amount_mnt, plan, status FROM payments WHERE id = ?',
      [paymentId]
    )

    if (!payment) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // If still pending, actively check with QPay
    if (payment.status === 'pending') {
      try {
        const check = await checkPayment(payment.invoice_id)
        if (check.count > 0 && check.paid_amount >= payment.amount_mnt) {
          await activateSubscription(payment)
          return NextResponse.json({ status: 'paid' })
        }
      } catch {
        // QPay check failed — return current DB status
      }
    }

    return NextResponse.json({ status: payment.status })
  } catch (err) {
    console.error('[webhook GET]', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
