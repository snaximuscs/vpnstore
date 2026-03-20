import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { queryOne, execute } from '@/lib/db'
import { sendActivationEmail } from '@/lib/email'

interface UserRow {
  id: number
  email: string
  email_verified: number
}

interface RecentToken {
  id: number
}

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Имэйл хаяг шаардлагатай' },
        { status: 400 }
      )
    }

    const user = await queryOne<UserRow>(
      'SELECT id, email, email_verified FROM users WHERE email = ?',
      [email.toLowerCase()]
    )

    // ── Always return 200 to prevent email enumeration ──────────────────────
    if (!user) {
      return NextResponse.json({
        message: 'Хэрэв тэр имэйл бүртгэлтэй бол идэвхжүүлэх имэйл илгээнэ.',
      })
    }

    if (user.email_verified) {
      return NextResponse.json({
        message: 'Энэ имэйл хаяг аль хэдийн баталгаажсан байна. Нэвтэрч болно.',
        alreadyVerified: true,
      })
    }

    // ── Rate limit: one token per 2 minutes ─────────────────────────────────
    const recent = await queryOne<RecentToken>(
      `SELECT id FROM activation_tokens
       WHERE user_id    = ?
         AND used_at    IS NULL
         AND expires_at > NOW()
         AND created_at > DATE_SUB(NOW(), INTERVAL 2 MINUTE)`,
      [user.id]
    )

    if (recent) {
      return NextResponse.json(
        {
          error:
            'Та хэт олон удаа оролдож байна. 2 минутын дараа дахин оролдоно уу.',
          code: 'RATE_LIMITED',
        },
        { status: 429 }
      )
    }

    // ── Invalidate previous unused tokens ───────────────────────────────────
    await execute(
      `UPDATE activation_tokens
       SET expires_at = NOW()
       WHERE user_id = ? AND used_at IS NULL`,
      [user.id]
    )

    // ── Create new token ────────────────────────────────────────────────────
    const expiryHours = parseInt(
      process.env.ACTIVATION_TOKEN_EXPIRY_HOURS || '24',
      10
    )
    const token = randomBytes(32).toString('hex')

    await execute(
      `INSERT INTO activation_tokens (user_id, token, expires_at)
       VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? HOUR))`,
      [user.id, token, expiryHours]
    )

    // ── Send email ───────────────────────────────────────────────────────────
    try {
      await sendActivationEmail(user.email, token)
      console.log(`[resend-activation] Sent to ${user.email}`)
    } catch (emailErr) {
      console.error('[resend-activation] Email send failed:', emailErr)
      return NextResponse.json(
        { error: 'Имэйл илгээхэд алдаа гарлаа. Дараа дахин оролдоно уу.' },
        { status: 502 }
      )
    }

    return NextResponse.json({
      message: `Идэвхжүүлэх имэйл ${user.email} хаяг руу дахин илгээгдлээ.`,
    })
  } catch (err) {
    console.error('[resend-activation]', err)
    return NextResponse.json({ error: 'Серверийн алдаа' }, { status: 500 })
  }
}
