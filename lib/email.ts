/**
 * lib/email.ts — SMTP email sender for 1stCS VPN
 *
 * Reads configuration from environment variables:
 *   SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS,
 *   SMTP_FROM, ACTIVATION_TOKEN_EXPIRY_HOURS, APP_URL
 */

import nodemailer from 'nodemailer'

// ─── Transport factory ────────────────────────────────────────────────────────

function createTransport() {
  const host   = process.env.SMTP_HOST   || 'localhost'
  const port   = parseInt(process.env.SMTP_PORT   || '587', 10)
  const secure = process.env.SMTP_SECURE === 'true'   // true = port 465
  const user   = process.env.SMTP_USER   || ''
  const pass   = process.env.SMTP_PASS   || ''

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: user ? { user, pass } : undefined,
    tls: {
      // Allow self-signed certs in development
      rejectUnauthorized: process.env.NODE_ENV === 'production',
    },
  })
}

// ─── Verify SMTP connection (used by install script / health check) ───────────

export async function verifySmtp(): Promise<{ ok: boolean; error?: string }> {
  try {
    await createTransport().verify()
    return { ok: true }
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

// ─── Activation email ─────────────────────────────────────────────────────────

export async function sendActivationEmail(
  toEmail: string,
  token: string
): Promise<void> {
  const appUrl      = process.env.APP_URL || 'https://vpn.1stcs.gg'
  const from        = process.env.SMTP_FROM || '"1stCS VPN" <noreply@1stcs.gg>'
  const expiryHours = parseInt(process.env.ACTIVATION_TOKEN_EXPIRY_HOURS || '24', 10)
  const activationUrl = `${appUrl}/activate?token=${token}`

  const transport = createTransport()

  await transport.sendMail({
    from,
    to: toEmail,
    subject: '1stCS VPN — Имэйл хаягаа баталгаажуулна уу',

    // ── Plain-text fallback ──────────────────────────────────────────────────
    text: `
1stCS VPN — Имэйл баталгаажуулалт
══════════════════════════════════

Сайн байна уу,

1stCS VPN-д бүртгүүлсэнд баярлалаа.
Доорх холбоосоор орж имэйлээ баталгаажуулна уу:

${activationUrl}

Энэ холбоос ${expiryHours} цагийн дараа хүчингүй болно.

Хэрэв та бүртгүүлээгүй бол энэ имэйлийг үл тоомсорлоно уу.

— 1stCS VPN баг
    `.trim(),

    // ── HTML email ───────────────────────────────────────────────────────────
    html: `<!DOCTYPE html>
<html lang="mn">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Имэйл баталгаажуулалт — 1stCS VPN</title>
</head>
<body style="margin:0;padding:0;background:#060b14;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#060b14;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0"
               style="max-width:560px;background:#0f172a;border-radius:16px;
                      border:1px solid #1e293b;overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1d4ed8,#2563eb);
                        padding:32px 40px;text-align:center;">
              <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
                <tr>
                  <td style="background:rgba(255,255,255,0.15);width:44px;height:44px;
                              border-radius:10px;text-align:center;vertical-align:middle;">
                    <span style="color:#fff;font-weight:800;font-size:20px;line-height:44px;">V</span>
                  </td>
                  <td style="padding-left:12px;color:#fff;font-size:20px;
                              font-weight:700;letter-spacing:-0.3px;vertical-align:middle;">
                    1stCS VPN
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px;">
              <h1 style="margin:0 0 12px;color:#f1f5f9;font-size:22px;
                          font-weight:700;text-align:center;letter-spacing:-0.3px;">
                Имэйл хаягаа баталгаажуулна уу
              </h1>
              <p style="margin:0 0 28px;color:#94a3b8;font-size:15px;
                         line-height:1.7;text-align:center;">
                1stCS VPN-д бүртгүүлсэнд баярлалаа.<br/>
                Доорх товчийг дарж имэйл хаягаа баталгаажуулна уу.
              </p>

              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" style="margin:0 auto 32px;">
                <tr>
                  <td style="border-radius:10px;background:#2563eb;">
                    <a href="${activationUrl}"
                       style="display:inline-block;padding:14px 36px;
                              color:#ffffff;font-size:16px;font-weight:600;
                              text-decoration:none;border-radius:10px;
                              letter-spacing:-0.2px;">
                      ✓&nbsp; Имэйл баталгаажуулах
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Fallback URL box -->
              <p style="margin:0 0 10px;color:#64748b;font-size:12px;text-align:center;">
                Товч ажиллахгүй байвал доорх холбоосыг хөтөч дээр нааж нэвтрэнэ үү:
              </p>
              <table cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="background:#1e293b;border-radius:8px;
                              padding:12px 16px;word-break:break-all;">
                    <a href="${activationUrl}"
                       style="color:#60a5fa;font-size:12px;text-decoration:none;">
                      ${activationUrl}
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#0b1220;padding:20px 40px;
                        border-top:1px solid #1e293b;text-align:center;">
              <p style="margin:0;color:#475569;font-size:12px;line-height:1.6;">
                Энэ холбоос
                <strong style="color:#64748b;">${expiryHours} цаг</strong>ийн
                дараа хүчингүй болно.<br/>
                Хэрэв та бүртгүүлээгүй бол энэ имэйлийг үл тоомсорлоно уу.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  })
}

// ─── Welcome email (sent after first successful activation) ──────────────────

export async function sendWelcomeEmail(toEmail: string): Promise<void> {
  const appUrl  = process.env.APP_URL || 'https://vpn.1stcs.gg'
  const from    = process.env.SMTP_FROM || '"1stCS VPN" <noreply@1stcs.gg>'

  const transport = createTransport()

  await transport.sendMail({
    from,
    to: toEmail,
    subject: '1stCS VPN-д тавтай морилно уу! 🎉',
    text: `
1stCS VPN — Тавтай морилно уу!

Имэйл хаяг амжилттай баталгаажлаа.
Одоо нэвтэрч VPN тохиргоогоо авах боломжтой:

${appUrl}/login

— 1stCS VPN баг
    `.trim(),
    html: `<!DOCTYPE html>
<html lang="mn">
<head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#060b14;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#060b14;padding:40px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0"
             style="max-width:560px;background:#0f172a;border-radius:16px;
                    border:1px solid #1e293b;overflow:hidden;">
        <tr>
          <td style="background:linear-gradient(135deg,#166534,#16a34a);
                      padding:32px 40px;text-align:center;">
            <span style="color:#fff;font-size:32px;">✓</span><br/>
            <span style="color:#fff;font-size:20px;font-weight:700;">Баталгаажлаа!</span>
          </td>
        </tr>
        <tr>
          <td style="padding:40px;">
            <p style="margin:0 0 24px;color:#94a3b8;font-size:15px;
                       line-height:1.7;text-align:center;">
              Имэйл хаяг амжилттай баталгаажлаа.<br/>
              Одоо нэвтэрч VPN тохиргоогоо авах боломжтой.
            </p>
            <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
              <tr>
                <td style="border-radius:10px;background:#16a34a;">
                  <a href="${appUrl}/login"
                     style="display:inline-block;padding:14px 36px;
                            color:#fff;font-size:15px;font-weight:600;
                            text-decoration:none;border-radius:10px;">
                    Нэвтрэх →
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  })
}
