'use client'

import { Suspense } from 'react'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react'

function ActivateInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token')

  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'missing'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token) { setStatus('missing'); return }

    fetch(`/api/auth/activate?token=${token}`)
      .then(r => r.json())
      .then(data => {
        if (data.ok) {
          setStatus('success')
          setTimeout(() => router.push('/dashboard'), 2000)
        } else {
          setStatus('error')
          setMessage(data.error || 'Баталгаажуулахад алдаа гарлаа')
        }
      })
      .catch(() => {
        setStatus('error')
        setMessage('Сервертэй холбогдоход алдаа гарлаа')
      })
  }, [token, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-lg">V</div>
        </div>
        <h1 className="text-2xl font-bold">1stCS VPN</h1>

        {status === 'loading' && (
          <div className="space-y-3">
            <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto" />
            <p className="text-muted-foreground">Баталгаажуулж байна...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-3">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
            <p className="text-green-500 font-semibold">Имэйл амжилттай баталгаажлаа!</p>
            <p className="text-muted-foreground text-sm">Хянах самбар руу шилжиж байна...</p>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-3">
            <XCircle className="w-12 h-12 text-red-500 mx-auto" />
            <p className="text-red-500 font-semibold">Алдаа гарлаа</p>
            <p className="text-muted-foreground text-sm">{message}</p>
            <Link href="/login" className="inline-block text-blue-500 hover:underline text-sm">
              ← Нэвтрэх хуудас руу буцах
            </Link>
          </div>
        )}

        {status === 'missing' && (
          <div className="space-y-3">
            <Clock className="w-12 h-12 text-yellow-500 mx-auto" />
            <p className="text-yellow-500 font-semibold">Токен олдсонгүй</p>
            <Link href="/login" className="inline-block text-blue-500 hover:underline text-sm">
              ← Нэвтрэх хуудас руу буцах
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

export default function ActivatePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    }>
      <ActivateInner />
    </Suspense>
  )
}
