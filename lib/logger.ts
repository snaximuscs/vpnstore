import { execute } from '@/lib/db'

type LogType = 'auth' | 'vpn' | 'admin' | 'error' | 'system'

export async function writeLog(
  type:    LogType,
  message: string,
  opts?:   { userId?: number; ip?: string; meta?: object }
): Promise<void> {
  try {
    await execute(
      `INSERT INTO logs (type, user_id, message, ip, meta)
       VALUES (?, ?, ?, ?, ?)`,
      [
        type,
        opts?.userId ?? null,
        message,
        opts?.ip     ?? null,
        opts?.meta   ? JSON.stringify(opts.meta) : null,
      ]
    )
  } catch (e) {
    console.error('[logger] DB write алдаа:', e)
  }
}
