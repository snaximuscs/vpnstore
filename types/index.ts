export interface User {
  id: number
  email: string
  is_admin: boolean
  created_at: string
}

export interface Subscription {
  id: number
  user_id: number
  plan: '1m' | '3m' | '6m'
  price_mnt: number
  active: boolean
  expires_at: string | null
  created_at: string
}

export interface VpnClient {
  id: number
  user_id: number
  public_key: string
  private_key: string
  ip_address: string
  config: string
  peer_added: boolean
  created_at: string
}

export interface Payment {
  id: number
  user_id: number
  subscription_id: number | null
  invoice_id: string
  amount_mnt: number
  plan: '1m' | '3m' | '6m'
  status: 'pending' | 'paid' | 'failed' | 'expired'
  qpay_data: Record<string, unknown> | null
  created_at: string
}

export interface JwtPayload {
  sub: number        // user id
  email: string
  is_admin: boolean
  iat: number
  exp: number
}

export const PLAN_PRICES: Record<string, number> = {
  '1m': 9900,
  '3m': 25900,
  '6m': 45900,
}

export const PLAN_LABELS: Record<string, string> = {
  '1m': '1 сар',
  '3m': '3 сар',
  '6m': '6 сар',
}

export const PLAN_MONTHS: Record<string, number> = {
  '1m': 1,
  '3m': 3,
  '6m': 6,
}
