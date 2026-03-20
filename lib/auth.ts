import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import type { NextRequest } from 'next/server'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'fallback-secret-change-me-in-production'
)
const TOKEN_EXPIRY = '30d'
const COOKIE_NAME  = 'vpn_token'

export interface JwtPayload {
  sub:      string   // always string (jose requirement)
  email:    string
  is_admin: boolean
  iat?:     number
  exp?:     number
}

export async function signToken(
  payload: { sub: number; email: string; is_admin: boolean }
): Promise<string> {
  return new SignJWT({
    sub:      String(payload.sub),   // convert number → string
    email:    payload.email,
    is_admin: payload.is_admin,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRY)
    .sign(JWT_SECRET)
}

export async function verifyToken(token: string): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return {
      sub:      payload.sub as string,
      email:    payload['email'] as string,
      is_admin: Boolean(payload['is_admin']),
    }
  } catch {
    return null
  }
}

export async function setAuthCookie(token: string): Promise<void> {
  const cookieStore = await cookies()          // await — Next.js 16 requirement
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge:   60 * 60 * 24 * 30,
    path:     '/',
  })
}

export async function clearAuthCookie(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
}

export async function getTokenFromCookies(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get(COOKIE_NAME)?.value || null
}
export async function getAuthUser(req: NextRequest): Promise<JwtPayload | null> {
  const token =
    req.cookies.get('vpn_token')?.value ||
    req.headers.get('authorization')?.replace('Bearer ', '')

  if (!token) return null
  return verifyToken(token)
}
