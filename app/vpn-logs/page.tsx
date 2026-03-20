'use client'

import { useEffect, useState, useCallback } from 'react'
import { InteractiveLogsTable } from '@/components/ui/interactive-logs-table-shadcnui'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function VPNLogsPage() {
  const [logs,    setLogs]    = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  const fetchLogs = useCallback(async () => {
    try {
      const res  = await fetch('/api/admin/logs?limit=200')
      if (res.status === 401 || res.status === 403) {
        setError('Зөвхөн admin хэрэглэгч харж болно')
        setLoading(false)
        return
      }
      const data = await res.json()
      setLogs(data.logs || [])
      setError('')
    } catch {
      setError('Сервертэй холбогдоход алдаа гарлаа')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLogs()
    const t = setInterval(fetchLogs, 15_000)
    return () => clearInterval(t)
  }, [fetchLogs])

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (error) return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <p className="text-red-400">{error}</p>
        <Link href="/dashboard" className="text-blue-400 hover:underline text-sm flex items-center gap-1 justify-center">
          <ArrowLeft className="w-4 h-4" /> Дашборд руу буцах
        </Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold">VPN Логууд</h1>
            <p className="text-xs text-muted-foreground">Бодит өгөгдөл — 15 секунд тутамд шинэчлэгдэнэ</p>
          </div>
        </div>
        <InteractiveLogsTable initialLogs={logs} />
      </div>
    </div>
  )
}
