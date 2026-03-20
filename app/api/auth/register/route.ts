import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { randomBytes } from 'crypto'
import { queryOne, execute } from '@/lib/db'
import { sendActivationEmail } from '@/lib/email'
import type { User } from '@/types'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()

    // ── Validation ──────────────────────────────────────────────────────────
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email болон нууц үг шаардлагатай' },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Нууц үг хамгийн багадаа 8 тэмдэгт байх ёстой' },
        { status: 400 }
      )
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Имэйл хаяг буруу байна' },
        { status: 400 }
      )
    }

    // ── Duplicate check ─────────────────────────────────────────────────────
    const existing = await queryOne<User>(
      'SELECT id FROM users WHERE email = ?',
      [email.toLowerCase()]
    )
    if (existing) {
      return NextResponse.json(
        { error: 'Энэ имэйл хаяг аль хэдийн бүртгэлтэй байна' },
        { status: 409 }
      )
    }

    // ── Create user (email_verified = 0) ────────────────────────────────────
    const hash     = await bcrypt.hash(password, 12)
    const adminEmail = process.env.ADMIN_EMAIL || ''
    const isAdmin  = email.toLowerCase() === adminEmail.toLowerCase() ? 1 : 0

    const result = await execute(
      'INSERT INTO users (email, password_hash, is_admin, email_verified) VALUES (?, ?, ?, 0)',
      [email.toLowerCase(), hash, isAdmin]
    )
    const userId = result.insertId

    // ── Generate activation token ────────────────────────────────────────────
    const expiryHours = parseInt(
      process.env.ACTIVATION_TOKEN_EXPIRY_HOURS || '24',
      10
    )
    const token = randomBytes(32).toString('hex')  // 64-char hex string

    await execute(
      `INSERT INTO activation_tokens (user_id, token, expires_at)
       VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? HOUR))`,
      [userId, token, expiryHours]
    )

    // ── Send activation email ────────────────────────────────────────────────
    let emailSent = false
    try {
      await sendActivationEmail(email.toLowerCase(), token)
      emailSent = true
      console.log(`[register] Activation email sent → ${email.toLowerCase()}`)
    } catch (emailErr) {
      // Do not block registration if SMTP fails — warn only
      console.error('[register] Failed to send activation email:', emailErr)
    }

    return NextResponse.json(
      {
        requiresActivation: true,
        message: emailSent
          ? `Баталгаажуулах имэйл ${email} хаяг руу илгээлээ. Имэйлээ шалгана уу.`
          : 'Бүртгэл амжилттай. Имэйл илгээхэд алдаа гарлаа — дараа дахин оролдоно уу.',
        emailSent,
      },
      { status: 201 }
    )
  } catch (err) {
    console.error('[register]', err)
    return NextResponse.json({ error: 'Серверийн алдаа' }, { status: 500 })
  }
}
