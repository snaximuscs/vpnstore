/**
 * QPay v2 API integration
 * Docs: https://merchant.qpay.mn
 */
import axios from 'axios'

const BASE_URL = process.env.QPAY_BASE_URL || 'https://merchant.qpay.mn/v2'
const USERNAME = process.env.QPAY_USERNAME || ''
const PASSWORD = process.env.QPAY_PASSWORD || ''
const INVOICE_CODE = process.env.QPAY_INVOICE_CODE || ''
const APP_URL = process.env.APP_URL || 'https://vpn.1stcs.gg'

interface QPayToken {
  access_token: string
  expires_in: number
  token_type: string
}

interface QPayInvoice {
  invoice_id: string
  qr_text: string
  qr_image: string
  urls: Array<{ name: string; description: string; logo: string; link: string }>
}

interface QPayPaymentCheck {
  count: number
  paid_amount: number
  rows: Array<{
    payment_id: string
    payment_status: string
    payment_amount: number
    payment_currency: string
    payment_date: string
  }>
}

let cachedToken: { token: string; expiresAt: number } | null = null

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.token
  }

  const credentials = Buffer.from(`${USERNAME}:${PASSWORD}`).toString('base64')
  const response = await axios.post<QPayToken>(
    `${BASE_URL}/auth/token`,
    {},
    {
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/json',
      },
    }
  )

  cachedToken = {
    token: response.data.access_token,
    expiresAt: Date.now() + response.data.expires_in * 1000,
  }

  return cachedToken.token
}

export async function createInvoice(params: {
  invoiceId: string    // your internal order id
  amount: number       // amount in MNT
  description: string
  callbackUrl: string
}): Promise<QPayInvoice> {
  const token = await getAccessToken()

  const body = {
    invoice_code: INVOICE_CODE,
    sender_invoice_no: params.invoiceId,
    invoice_receiver_code: 'terminal',
    invoice_description: params.description,
    amount: params.amount,
    callback_url: params.callbackUrl,
  }

  const response = await axios.post<QPayInvoice>(`${BASE_URL}/invoice`, body, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  })

  return response.data
}

export async function checkPayment(invoiceId: string): Promise<QPayPaymentCheck> {
  const token = await getAccessToken()

  const response = await axios.post<QPayPaymentCheck>(
    `${BASE_URL}/payment/check`,
    { object_type: 'INVOICE', object_id: invoiceId },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  )

  return response.data
}

export function buildCallbackUrl(paymentId: number): string {
  return `${APP_URL}/api/payment/webhook?pid=${paymentId}`
}
