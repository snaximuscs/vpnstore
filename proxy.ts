import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'fallback-secret-change-me-in-production'
)

async function getPayload(req: NextRequest) {
  const token =
    req.cookies.get('vpn_token')?.value ||
    req.headers.get('authorization')?.replace('Bearer ', '')

  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload
  } catch {
    return null
  }
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Public — always allow
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/activate') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/payment/qpay') ||
    pathname.startsWith('/_next') ||
    pathname === '/'
  ) {
    return NextResponse.next()
  }

  const payload = await getPayload(req)

  // Not logged in → redirect to login
  if (!payload) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const url = new URL('/login', req.url)
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  const isAdmin = Boolean(payload['is_admin'])

  // /admin routes — require is_admin = true
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    if (!isAdmin) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      // Normal user tries /admin → send to their dashboard
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
    // is_admin = true → allow through
    return NextResponse.next()
  }

  // All other protected routes — any logged-in user is fine
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}