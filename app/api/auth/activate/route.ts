import { NextRequest, NextResponse } from 'next/server'
import { queryOne, execute } from '@/lib/db'
import { signToken, setAuthCookie } from '@/lib/auth'
import { sendWelcomeEmail } from '@/lib/email'

interface TokenRow {
  id: number
  user_id: number
  token: string
  expires_at: string
  used_at: string | null
}

interface UserRow {
  id: number
  email: string
  is_admin: number
  email_verified: number
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const token = searchParams.get('token')

    // ── Basic token format check ────────────────────────────────────────────
    if (!token || token.length !== 64 || !/^[0-9a-f]+$/.test(token)) {
      return NextResponse.json(
        { error: 'Токен буруу формат байна', code: 'INVALID_TOKEN' },
        { status: 400 }
      )
    }

    // ── Look up token ───────────────────────────────────────────────────────
    const record = await queryOne<TokenRow>(
      'SELECT * FROM activation_tokens WHERE token = ?',
      [token]
    )

    if (!record) {
      return NextResponse.json(
        { error: 'Баталгаажуулах токен олдсонгүй', code: 'TOKEN_NOT_FOUND' },
        { status: 404 }
      )
    }

    // ── Already used ────────────────────────────────────────────────────────
    if (record.used_at) {
      return NextResponse.json(
        {
          error: 'Энэ баталгаажуулах холбоос аль хэдийн ашиглагдсан байна.',
          code: 'TOKEN_USED',
        },
        { status: 410 }
      )
    }

    // ── Expired ─────────────────────────────────────────────────────────────
    if (new Date(record.expires_at) < new Date()) {
      return NextResponse.json(
        {
          error: 'Баталгаажуулах холбоосын хугацаа дууссан байна. Дахин илгээлгэнэ үү.',
          code: 'TOKEN_EXPIRED',
        },
        { status: 410 }
      )
    }

    // ── Load user ───────────────────────────────────────────────────────────
    const user = await queryOne<UserRow>(
      'SELECT id, email, is_admin, email_verified FROM users WHERE id = ?',
      [record.user_id]
    )

    if (!user) {
      return NextResponse.json(
        { error: 'Хэрэглэгч олдсонгүй', code: 'USER_NOT_FOUND' },
        { status: 404 }
      )
    }

    const alreadyVerified = user.email_verified === 1

    // ── Mark user as verified (idempotent) ──────────────────────────────────
    if (!alreadyVerified) {
      await execute(
        'UPDATE users SET email_verified = 1 WHERE id = ?',
        [user.id]
      )
    }

    // ── Mark token as used ──────────────────────────────────────────────────
    await execute(
      'UPDATE activation_tokens SET used_at = NOW() WHERE id = ?',
      [record.id]
    )

    // ── Send welcome email (fire-and-forget, don't block) ───────────────────
    if (!alreadyVerified) {
      sendWelcomeEmail(user.email).catch((err) =>
        console.error('[activate] Welcome email failed:', err)
      )
    }

    // ── Issue JWT and set cookie ────────────────────────────────────────────
    const jwt = await signToken({
      sub: user.id,
      email: user.email,
      is_admin: user.is_admin === 1,
    })

    await setAuthCookie(jwt)

    console.log(`[activate] Email verified → ${user.email}`)

    return NextResponse.json({
      message: 'Имэйл амжилттай баталгаажлаа. Нэвтэрч байна...',
      token: jwt,
      user: { id: user.id, email: user.email, is_admin: user.is_admin === 1 },
      alreadyVerified,
    })
  } catch (err) {
    console.error('[activate]', err)
    return NextResponse.json({ error: 'Серверийн алдаа' }, { status: 500 })
  }
}
