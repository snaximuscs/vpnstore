'use client'

import { useEffect, useState, useCallback, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'

interface Subscription {
  id: number
  plan: string
  active: boolean
  expires_at: string
}

interface VpnConfig {
  config: string
  ip_address: string
  created_at: string
  expires_at: string
}

interface PaymentSession {
  payment_id: number
  qr_image: string
  qr_text: string
  urls: Array<{ name: string; link: string; logo: string }>
  amount: number
  label: string
}

const PLANS = [
  { id: '1m', name: '1 Сар', price: '9,900₮', highlight: false },
  { id: '3m', name: '3 Сар', price: '25,900₮', highlight: true, badge: 'Алдартай' },
  { id: '6m', name: '6 Сар', price: '45,900₮', highlight: false },
]

function authHeaders(): HeadersInit {
  const token = localStorage.getItem('vpn_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('mn-MN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function daysLeft(expiresAt: string | null): number {
  if (!expiresAt) return 0
  const diff = new Date(expiresAt).getTime() - Date.now()
  return Math.max(0, Math.ceil(diff / 86_400_000))
}

// ─── Config Display ───────────────────────────────────────────────────────────
function ConfigDisplay({ config, ip }: { config: string; ip: string }) {
  const [copied, setCopied] = useState(false)
  const [qrUrl, setQrUrl] = useState<string | null>(null)

  useEffect(() => {
    // Generate QR code via browser-side import
    ;(async () => {
      try {
        const QRCode = (await import('qrcode')).default
        const url = await QRCode.toDataURL(config, { width: 300, margin: 2 })
        setQrUrl(url)
      } catch {
        // qrcode not available in browser context, skip
      }
    })()
  }, [config])

  function copyConfig() {
    navigator.clipboard.writeText(config).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function downloadConfig() {
    // Use the secure server-side download endpoint
    const token = localStorage.getItem('vpn_token')
    const a = document.createElement('a')
    a.href = `/api/vpn/download`
    // Pass token via query param since we can't set headers on <a> clicks
    if (token) a.href += `?token=${encodeURIComponent(token)}`
    a.download = `1stcs-vpn-${ip}.conf`
    a.click()
  }

  return (
    <div className="space-y-4">
      {/* Config text */}
      <div className="relative">
        <pre className="bg-gray-950 rounded-xl p-4 text-sm text-emerald-300 font-mono overflow-x-auto border border-gray-800 whitespace-pre-wrap break-all">
          {config}
        </pre>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3">
        <button onClick={copyConfig} className="btn-primary text-sm py-2 px-4">
          {copied ? '✓ Хуулагдлаа' : 'Хуулах'}
        </button>
        <button onClick={downloadConfig} className="btn-secondary text-sm py-2 px-4">
          .conf татах
        </button>
      </div>

      {/* QR Code */}
      {qrUrl && (
        <div className="mt-4">
          <p className="text-sm text-gray-400 mb-3">
            Утасны WireGuard апп-д скан хийнэ:
          </p>
          <div className="inline-block bg-white p-3 rounded-xl">
            <img src={qrUrl} alt="VPN QR Code" width={200} height={200} />
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-brand-950/40 border border-brand-900/50 rounded-xl p-4 text-sm text-brand-300 space-y-1">
        <p className="font-semibold text-brand-200 mb-2">Хэрхэн холбох:</p>
        <p>1. WireGuard апп татах (iOS / Android / Windows / Mac)</p>
        <p>2. &ldquo;.conf татах&rdquo; дарж файлыг импортлох <strong>эсвэл</strong> QR скан хийх</p>
        <p>3. Холболтыг идэвхжүүлэх — дууслаа!</p>
      </div>
    </div>
  )
}

// ─── Payment Modal ────────────────────────────────────────────────────────────
function PaymentModal({
  session,
  onClose,
  onPaid,
}: {
  session: PaymentSession
  onClose: () => void
  onPaid: () => void
}) {
  const [status, setStatus] = useState<'waiting' | 'paid' | 'failed'>('waiting')
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // Poll every 5 seconds
    intervalRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/payment/webhook?pid=${session.payment_id}`)
        const data = await res.json()
        if (data.status === 'paid') {
          setStatus('paid')
          clearInterval(intervalRef.current!)
          setTimeout(onPaid, 1500)
        }
      } catch {
        // ignore poll errors
      }
    }, 5000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [session.payment_id, onPaid])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-gray-900 rounded-2xl border border-gray-800 w-full max-w-md p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-bold text-lg text-white">QPay Төлбөр</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">✕</button>
        </div>

        {status === 'paid' ? (
          <div className="text-center py-8">
            <div className="text-5xl mb-4">🎉</div>
            <h3 className="text-xl font-bold text-emerald-400 mb-2">Төлбөр амжилттай!</h3>
            <p className="text-gray-400">VPN тохиргоо бэлтгэгдэж байна...</p>
          </div>
        ) : (
          <>
            <div className="text-center mb-4">
              <p className="text-gray-400 text-sm mb-1">Дүн</p>
              <p className="text-3xl font-bold text-white">{session.amount.toLocaleString()}₮</p>
              <p className="text-gray-500 text-sm mt-1">{session.label}</p>
            </div>

            {/* QR */}
            <div className="flex justify-center mb-4">
              <div className="bg-white p-3 rounded-xl">
                <img
                  src={`data:image/png;base64,${session.qr_image}`}
                  alt="QPay QR"
                  width={200}
                  height={200}
                />
              </div>
            </div>

            <p className="text-center text-sm text-gray-400 mb-4">
              Утасны QPay апп нээж дээрх QR кодыг скан хийнэ үү
            </p>

            <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
              <span className="w-3 h-3 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
              Төлбөр хүлээж байна...
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
function DashboardPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [user, setUser] = useState<{ email: string; is_admin: boolean } | null>(null)
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [vpnConfig, setVpnConfig] = useState<VpnConfig | null>(null)
  const [paymentSession, setPaymentSession] = useState<PaymentSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [paymentLoading, setPaymentLoading] = useState<string | null>(null)
  const [error, setError] = useState('')

  const loadData = useCallback(async () => {
    const token = localStorage.getItem('vpn_token')
    if (!token) {
      router.push('/login')
      return
    }

    const storedUser = localStorage.getItem('vpn_user')
    if (storedUser) setUser(JSON.parse(storedUser))

    try {
      // Load subscription
      const subRes = await fetch('/api/subscription', { headers: authHeaders() })
      if (subRes.status === 401) {
        router.push('/login')
        return
      }
      const subData = await subRes.json()
      setSubscription(subData.subscription)

      // If subscribed, load VPN config
      if (subData.subscription?.active) {
        const cfgRes = await fetch('/api/vpn/config', { headers: authHeaders() })
        if (cfgRes.ok) {
          const cfgData = await cfgRes.json()
          setVpnConfig(cfgData)
        }
      }
    } catch {
      setError('Мэдээлэл татахад алдаа гарлаа')
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    loadData()
    // Auto-poll every 10 seconds if subscription is not yet active
    const interval = setInterval(() => {
      if (!subscription?.active) loadData()
    }, 10_000)
    return () => clearInterval(interval)
  }, [loadData, subscription?.active])

  // Auto-open payment if plan passed via URL
  useEffect(() => {
    const plan = searchParams.get('plan')
    if (plan && !loading && !subscription?.active) {
      handlePurchase(plan)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading])

  async function handlePurchase(plan: string) {
    setPaymentLoading(plan)
    setError('')
    try {
      const res = await fetch('/api/payment/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ plan }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setPaymentSession(data)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Нэхэмжлэл үүсгэхэд алдаа гарлаа'
      setError(msg)
    } finally {
      setPaymentLoading(null)
    }
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    localStorage.removeItem('vpn_token')
    localStorage.removeItem('vpn_user')
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-3 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400">Ачааллаж байна...</p>
        </div>
      </div>
    )
  }

  const days = daysLeft(subscription?.expires_at || null)

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Payment Modal */}
      {paymentSession && (
        <PaymentModal
          session={paymentSession}
          onClose={() => setPaymentSession(null)}
          onPaid={() => {
            setPaymentSession(null)
            loadData()
          }}
        />
      )}

      {/* Nav */}
      <nav className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white font-bold text-sm">V</div>
            <span className="font-bold text-lg text-white">1stCS VPN</span>
          </div>
          <div className="flex items-center gap-3">
            {user?.is_admin && (
              <>
                <a href="/admin" className="text-xs text-brand-400 hover:text-brand-300 font-medium">
                  Админ
                </a>
                <a href="/vpn-logs" className="text-xs text-brand-400 hover:text-brand-300 font-medium">
                  Логууд
                </a>
              </>
            )}
            <span className="text-sm text-gray-400 hidden sm:block">{user?.email}</span>
            <button onClick={handleLogout} className="btn-secondary text-sm py-1.5 px-3">
              Гарах
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {error && (
          <div className="bg-red-950/60 border border-red-800 text-red-300 px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}

        {/* Subscription Status */}
        <div className="card">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <h2 className="font-bold text-lg text-white mb-1">Эрхийн мэдээлэл</h2>
              {subscription?.active ? (
                <>
                  <div className="badge-active mb-3">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse-slow" />
                    Идэвхтэй
                  </div>
                  <div className="space-y-1 text-sm text-gray-400">
                    <p>Тарифын төрөл: <span className="text-white font-medium">
                      {subscription.plan === '1m' ? '1 Сар' : subscription.plan === '3m' ? '3 Сар' : '6 Сар'}
                    </span></p>
                    <p>Дуусах огноо: <span className="text-white">{formatDate(subscription.expires_at)}</span></p>
                    <p>Үлдсэн хоног: <span className={`font-semibold ${days <= 7 ? 'text-orange-400' : 'text-emerald-400'}`}>
                      {days} өдөр
                    </span></p>
                  </div>
                </>
              ) : (
                <>
                  <div className="badge-inactive mb-3">Идэвхгүй</div>
                  <p className="text-gray-400 text-sm">Одоогоор идэвхтэй эрх байхгүй байна.</p>
                </>
              )}
            </div>

            {subscription?.active && days <= 14 && (
              <div className="bg-orange-950/40 border border-orange-800/50 rounded-xl px-4 py-2 text-orange-300 text-sm">
                Эрх удахгүй дуусна. Сунгахыг санал болгож байна.
              </div>
            )}
          </div>
        </div>

        {/* VPN Config */}
        {subscription?.active && (
          <div className="card">
            <h2 className="font-bold text-lg text-white mb-4">VPN Тохиргоо</h2>
            {vpnConfig ? (
              <ConfigDisplay config={vpnConfig.config} ip={vpnConfig.ip_address} />
            ) : (
              <div className="flex items-center gap-3 text-gray-400">
                <span className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                <div>
                  <p className="text-white font-medium">Тохиргоо бэлтгэгдэж байна...</p>
                  <p className="text-sm mt-0.5">1–5 минутад автоматаар бэлэн болно. Хуудас дахин ачаалах шаардлагагүй.</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Purchase Plans */}
        {(!subscription?.active || days <= 14) && (
          <div className="card">
            <h2 className="font-bold text-lg text-white mb-2">
              {subscription?.active ? 'Эрх сунгах' : 'Эрх авах'}
            </h2>
            <p className="text-gray-400 text-sm mb-6">QPay дэмжсэн бүх банкны апп-р төлнө</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {PLANS.map((plan) => (
                <div
                  key={plan.id}
                  className={`relative rounded-xl border p-4 flex flex-col gap-3 ${
                    plan.highlight
                      ? 'border-brand-600 bg-brand-950/30'
                      : 'border-gray-700 bg-gray-800/40'
                  }`}
                >
                  {plan.badge && (
                    <span className="absolute -top-2.5 left-4 bg-brand-600 text-white text-xs font-bold px-2.5 py-0.5 rounded-full">
                      {plan.badge}
                    </span>
                  )}
                  <div>
                    <p className="font-semibold text-white">{plan.name}</p>
                    <p className="text-2xl font-bold text-white mt-1">{plan.price}</p>
                  </div>
                  <button
                    onClick={() => handlePurchase(plan.id)}
                    disabled={paymentLoading === plan.id}
                    className={plan.highlight ? 'btn-primary text-sm py-2' : 'btn-secondary text-sm py-2'}
                  >
                    {paymentLoading === plan.id ? (
                      <span className="flex items-center gap-2 justify-center">
                        <span className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                        Үүсгэж байна...
                      </span>
                    ) : 'QPay-р төлөх'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-3 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400">Ачааллаж байна...</p>
        </div>
      </div>
    }>
      <DashboardPageInner />
    </Suspense>
  )
}
