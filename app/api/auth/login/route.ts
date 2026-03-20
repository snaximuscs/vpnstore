import { writeLog } from '@/lib/logger'
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { queryOne } from '@/lib/db'
import { signToken, setAuthCookie } from '@/lib/auth'

interface UserRow {
  id: number
  email: string
  password_hash: string
  is_admin: number
  email_verified: number
}

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email болон нууц үг шаардлагатай' },
        { status: 400 }
      )
    }

    const user = await queryOne<UserRow>(
      'SELECT id, email, password_hash, is_admin, email_verified FROM users WHERE email = ?',
      [email.toLowerCase()]
    )

    // Use constant-time comparison path to avoid timing attacks
    if (!user) {
      await bcrypt.hash('dummy', 4) // timing equalisation
      return NextResponse.json(
        { error: 'Имэйл эсвэл нууц үг буруу байна' },
        { status: 401 }
      )
    }

    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) {
      return NextResponse.json(
        { error: 'Имэйл эсвэл нууц үг буруу байна' },
        { status: 401 }
      )
    }

    // ── Block unverified accounts ─────────────────────────────────────────
    if (!user.email_verified) {
      return NextResponse.json(
        {
          error: 'Имэйл хаяг баталгаажаагүй байна. Имэйлээ шалгаж баталгаажуулах холбоос дарна уу.',
          code: 'EMAIL_NOT_VERIFIED',
          email: user.email,
        },
        { status: 403 }
      )
    }

    // ── Issue JWT ────────────────────────────────────────────────────────
    const token = await signToken({
      sub: user.id,
      email: user.email,
      is_admin: user.is_admin === 1,
    })

    await setAuthCookie(token)

    return NextResponse.json({
      message: 'Нэвтрэлт амжилттай',
      token,
      user: { id: user.id, email: user.email, is_admin: user.is_admin === 1 },
    })
  } catch (err) {
    console.error('[login]', err)
    return NextResponse.json({ error: 'Серверийн алдаа' }, { status: 500 })
  }
}
