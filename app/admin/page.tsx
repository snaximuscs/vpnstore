'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface UserRow {
  id: number
  email: string
  is_admin: number
  created_at: string
  plan: string | null
  active: number | null
  expires_at: string | null
}

function authHeaders(): HeadersInit {
  const token = localStorage.getItem('vpn_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('mn-MN', { year: 'numeric', month: 'short', day: 'numeric' })
}

export default function AdminPage() {
  const router = useRouter()
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [extending, setExtending] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const loadUsers = useCallback(async () => {
    const res = await fetch('/api/admin/users', { headers: authHeaders(), credentials: 'include' })
    if (res.status === 401 || res.status === 403) {
      router.push('/login?next=/admin')
      return
    }
    const text = await res.text()
    const data = text ? JSON.parse(text) : {}
    setUsers(data.users || [])
    setLoading(false)
  }, [router])

  useEffect(() => { loadUsers() }, [loadUsers])

  async function extendUser(userId: number, plan: string) {
    setExtending(userId)
    setError('')
    setSuccess('')
    try {
      const res = await fetch('/api/admin/extend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() }, credentials: 'include',
        body: JSON.stringify({ user_id: userId, plan }),
      })
      const text = await res.text()
    const data = text ? JSON.parse(text) : {}
      if (!res.ok) throw new Error(data.error)
      setSuccess(`Хэрэглэгч #${userId} эрхийг амжилттай сунгалаа`)
      loadUsers()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Алдаа гарлаа')
    } finally {
      setExtending(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <nav className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white font-bold text-sm">V</div>
            <span className="font-bold text-white">Админ Панел</span>
          </div>
          <a href="/dashboard" className="btn-secondary text-sm py-1.5 px-3">← Дашборд</a>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-white mb-6">
          Хэрэглэгчийн жагсаалт
          <span className="ml-3 text-base font-normal text-gray-400">({users.length} нийт)</span>
        </h1>

        {error && (
          <div className="bg-red-950/60 border border-red-800 text-red-300 px-4 py-3 rounded-xl text-sm mb-4">{error}</div>
        )}
        {success && (
          <div className="bg-emerald-950/60 border border-emerald-800 text-emerald-300 px-4 py-3 rounded-xl text-sm mb-4">{success}</div>
        )}

        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400">
                <th className="text-left py-3 pr-4">ID</th>
                <th className="text-left py-3 pr-4">Имэйл</th>
                <th className="text-left py-3 pr-4">Эрх</th>
                <th className="text-left py-3 pr-4">Дуусах</th>
                <th className="text-left py-3 pr-4">Бүртгэсэн</th>
                <th className="text-left py-3">Үйлдэл</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-800/40 transition-colors">
                  <td className="py-3 pr-4 text-gray-400">#{u.id}</td>
                  <td className="py-3 pr-4 text-white font-medium">
                    {u.email}
                    {u.is_admin ? <span className="ml-2 text-xs text-brand-400">admin</span> : null}
                  </td>
                  <td className="py-3 pr-4">
                    {u.active ? (
                      <span className="badge-active">
                        {u.plan === '1m' ? '1 Сар' : u.plan === '3m' ? '3 Сар' : '6 Сар'}
                      </span>
                    ) : (
                      <span className="badge-inactive">Байхгүй</span>
                    )}
                  </td>
                  <td className="py-3 pr-4 text-gray-400">{formatDate(u.expires_at)}</td>
                  <td className="py-3 pr-4 text-gray-500">{formatDate(u.created_at)}</td>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      {(['1m', '3m', '6m'] as const).map((plan) => (
                        <button
                          key={plan}
                          onClick={() => extendUser(u.id, plan)}
                          disabled={extending === u.id}
                          className="text-xs bg-gray-700 hover:bg-gray-600 text-white px-2.5 py-1 rounded-lg transition-colors disabled:opacity-50"
                        >
                          +{plan === '1m' ? '1с' : plan === '3m' ? '3с' : '6с'}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500">
                    Хэрэглэгч олдсонгүй
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  )
}
