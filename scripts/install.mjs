#!/usr/bin/env node
/**
 * 1stCS VPN — Database Installer
 *
 * Usage:
 *   node scripts/install.mjs          # reads .env, prompts for missing values
 *   npm run db:install                 # same, via npm script
 *
 * What it does:
 *   1. Reads .env for all configuration
 *   2. Interactively prompts for any missing required values
 *   3. Connects to MySQL (creates DB if it doesn't exist)
 *   4. Applies schema idempotently (CREATE TABLE IF NOT EXISTS)
 *   5. Seeds the IP pool (INSERT IGNORE — safe to re-run)
 *   6. Saves a complete .env back to disk if values were added
 */

import { createConnection }              from 'mysql2/promise'
import { existsSync, readFileSync,
         writeFileSync }                 from 'fs'
import { createInterface }               from 'readline'
import { resolve, dirname }              from 'path'
import { fileURLToPath }                 from 'url'
import { randomBytes }                   from 'crypto'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT      = resolve(__dirname, '..')
const ENV_PATH  = resolve(ROOT, '.env')

// ─── ANSI helpers ─────────────────────────────────────────────────────────────

const C = {
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
  dim:    '\x1b[2m',
  green:  '\x1b[32m',
  yellow: '\x1b[33m',
  red:    '\x1b[31m',
  cyan:   '\x1b[36m',
  blue:   '\x1b[34m',
  gray:   '\x1b[90m',
  white:  '\x1b[97m',
}

const log = {
  ok:    (msg) => console.log(`  ${C.green}✓${C.reset}  ${msg}`),
  info:  (msg) => console.log(`  ${C.cyan}→${C.reset}  ${msg}`),
  warn:  (msg) => console.log(`  ${C.yellow}⚠${C.reset}  ${msg}`),
  err:   (msg) => console.error(`  ${C.red}✗${C.reset}  ${msg}`),
  step:  (msg) => console.log(`\n${C.bold}${C.blue}  ── ${msg}${C.reset}`),
  dim:   (msg) => console.log(`     ${C.gray}${msg}${C.reset}`),
  blank: ()    => console.log(),
}

function banner(text) {
  const w   = 44
  const pad = Math.floor((w - text.length) / 2)
  const line = '─'.repeat(w)
  console.log(`\n${C.bold}${C.cyan}  ┌${line}┐`)
  console.log(`  │${' '.repeat(pad)}${text}${' '.repeat(w - pad - text.length)}│`)
  console.log(`  └${line}┘${C.reset}\n`)
}

// ─── .env file helpers ────────────────────────────────────────────────────────

/** Parse key=value .env content into a plain object */
function parseEnv(raw) {
  const env = {}
  for (const line of raw.split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const eq = t.indexOf('=')
    if (eq === -1) continue
    const key = t.slice(0, eq).trim()
    let   val = t.slice(eq + 1).trim()
    // Strip surrounding quotes
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) val = val.slice(1, -1)
    env[key] = val
  }
  return env
}

/** Serialise config object back to .env format */
function serializeEnv(e) {
  return [
    '# ─── Database ───────────────────────────────────────────────────────────────',
    `DB_HOST=${e.DB_HOST ?? 'localhost'}`,
    `DB_PORT=${e.DB_PORT ?? '3306'}`,
    `DB_USER=${e.DB_USER ?? 'vpnuser'}`,
    `DB_PASSWORD=${e.DB_PASSWORD ?? ''}`,
    `DB_NAME=${e.DB_NAME ?? 'vpndb'}`,
    '',
    '# ─── JWT ────────────────────────────────────────────────────────────────────',
    `JWT_SECRET=${e.JWT_SECRET ?? ''}`,
    '',
    '# ─── QPay ───────────────────────────────────────────────────────────────────',
    `QPAY_USERNAME=${e.QPAY_USERNAME ?? ''}`,
    `QPAY_PASSWORD=${e.QPAY_PASSWORD ?? ''}`,
    `QPAY_INVOICE_CODE=${e.QPAY_INVOICE_CODE ?? ''}`,
    `QPAY_BASE_URL=${e.QPAY_BASE_URL ?? 'https://merchant.qpay.mn/v2'}`,
    '',
    '# ─── WireGuard Server ───────────────────────────────────────────────────────',
    `WG_SERVER_PUBLIC_KEY=${e.WG_SERVER_PUBLIC_KEY ?? ''}`,
    `WG_SERVER_ENDPOINT=${e.WG_SERVER_ENDPOINT ?? ''}`,
    `WG_SERVER_INTERFACE=${e.WG_SERVER_INTERFACE ?? 'wg0'}`,
    '',
    '# ─── App ────────────────────────────────────────────────────────────────────',
    `NEXT_PUBLIC_APP_URL=${e.APP_URL ?? 'https://vpn.1stcs.gg'}`,
    `APP_URL=${e.APP_URL ?? 'https://vpn.1stcs.gg'}`,
    `NODE_ENV=${e.NODE_ENV ?? 'production'}`,
    '',
    '# ─── Cron ───────────────────────────────────────────────────────────────────',
    `CRON_SECRET=${e.CRON_SECRET ?? ''}`,
    '',
    '# ─── Admin ──────────────────────────────────────────────────────────────────',
    `ADMIN_EMAIL=${e.ADMIN_EMAIL ?? ''}`,
    '',
    '# ─── SMTP (email activation) ────────────────────────────────────────────────',
    `SMTP_HOST=${e.SMTP_HOST ?? 'localhost'}`,
    `SMTP_PORT=${e.SMTP_PORT ?? '587'}`,
    `SMTP_SECURE=${e.SMTP_SECURE ?? 'false'}`,
    `SMTP_USER=${e.SMTP_USER ?? ''}`,
    `SMTP_PASS=${e.SMTP_PASS ?? ''}`,
    `SMTP_FROM=${e.SMTP_FROM ?? '"1stCS VPN" <noreply@1stcs.gg>'}`,
    `ACTIVATION_TOKEN_EXPIRY_HOURS=${e.ACTIVATION_TOKEN_EXPIRY_HOURS ?? '24'}`,
    '',
  ].join('\n')
}

// ─── Required fields ──────────────────────────────────────────────────────────

const DB_REQUIRED = ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_NAME']
const APP_REQUIRED = ['JWT_SECRET', 'CRON_SECRET']
const ALL_REQUIRED = [...DB_REQUIRED, ...APP_REQUIRED]

function getMissing(env) {
  return ALL_REQUIRED.filter((k) => !env[k]?.trim())
}

// ─── Interactive prompts ──────────────────────────────────────────────────────

/**
 * Read a line from stdin, optionally masking the input as `*` characters.
 * Falls back to regular readline when raw mode is not supported (e.g. pipes).
 */
function askLine(question, defaultVal = '', secret = false) {
  return new Promise((resolve) => {
    const hint    = defaultVal ? ` ${C.dim}[${defaultVal}]${C.reset}` : ''
    const prompt  = `  ${C.bold}${question}${hint}${C.reset}: `

    if (!secret || !process.stdin.isTTY) {
      // Non-secret or non-interactive — use standard readline
      const rl = createInterface({ input: process.stdin, output: process.stdout })
      rl.question(prompt, (answer) => {
        rl.close()
        resolve(answer.trim() || defaultVal)
      })
      return
    }

    // Secret field: mask with *
    process.stdout.write(prompt)
    let value = ''

    const onData = (chunk) => {
      const char = chunk.toString()
      switch (char) {
        case '\r':
        case '\n':
        case '\u0004': // Ctrl-D (EOF)
          process.stdin.setRawMode(false)
          process.stdin.pause()
          process.stdin.removeListener('data', onData)
          process.stdout.write('\n')
          resolve(value.trim() || defaultVal)
          break
        case '\u0003': // Ctrl-C
          process.stdout.write('\n')
          process.exit(0)
          break
        case '\u007f': // Backspace
        case '\b':
          if (value.length > 0) {
            value = value.slice(0, -1)
            process.stdout.clearLine(0)
            process.stdout.cursorTo(0)
            process.stdout.write(prompt + '*'.repeat(value.length))
          }
          break
        default:
          value += char
          process.stdout.write('*')
      }
    }

    process.stdin.setRawMode(true)
    process.stdin.resume()
    process.stdin.setEncoding('utf8')
    process.stdin.on('data', onData)
  })
}

// ─── Interactive setup wizard ─────────────────────────────────────────────────

async function runSetupWizard(existing = {}) {
  banner('1stCS VPN — Setup Wizard')
  log.info('No .env found or required values are missing.')
  log.info('Answer the prompts below — press Enter to accept the default.\n')

  const e = { ...existing }

  // ── Database ───────────────────────────────────────────────────────────────
  log.step('Database')
  e.DB_HOST     = await askLine('MySQL host',         e.DB_HOST     || 'localhost')
  e.DB_PORT     = await askLine('MySQL port',         e.DB_PORT     || '3306')
  e.DB_USER     = await askLine('MySQL user',         e.DB_USER     || 'vpnuser')
  e.DB_PASSWORD = await askLine('MySQL password',     e.DB_PASSWORD || '',        true)
  e.DB_NAME     = await askLine('Database name',      e.DB_NAME     || 'vpndb')

  // ── Security ───────────────────────────────────────────────────────────────
  log.step('Security')

  if (!e.JWT_SECRET) {
    const autoJwt  = randomBytes(40).toString('hex')
    const entered  = await askLine('JWT secret (Enter to auto-generate)', '', true)
    e.JWT_SECRET   = entered || autoJwt
    if (!entered) log.dim(`Auto-generated JWT secret saved to .env`)
  } else {
    log.ok('JWT_SECRET already set — keeping existing value')
  }

  if (!e.CRON_SECRET) {
    e.CRON_SECRET = randomBytes(32).toString('hex')
    log.dim(`CRON_SECRET auto-generated and saved to .env`)
  } else {
    log.ok('CRON_SECRET already set — keeping existing value')
  }

  // ── Application ────────────────────────────────────────────────────────────
  log.step('Application')
  e.APP_URL      = await askLine('App URL',      e.APP_URL     || 'https://vpn.1stcs.gg')
  e.ADMIN_EMAIL  = await askLine('Admin email',  e.ADMIN_EMAIL || '')
  e.NODE_ENV     = e.NODE_ENV || 'production'

  // ── QPay ──────────────────────────────────────────────────────────────────
  log.step('QPay — Mongolian Payment Gateway')
  log.info('Press Enter to skip and configure later in .env\n')
  e.QPAY_USERNAME     = await askLine('QPay username',     e.QPAY_USERNAME     || '')
  e.QPAY_PASSWORD     = await askLine('QPay password',     e.QPAY_PASSWORD     || '', true)
  e.QPAY_INVOICE_CODE = await askLine('QPay invoice code', e.QPAY_INVOICE_CODE || '')
  e.QPAY_BASE_URL     = e.QPAY_BASE_URL || 'https://merchant.qpay.mn/v2'

  // ── WireGuard ─────────────────────────────────────────────────────────────
  log.step('WireGuard VPN Server')
  log.info('Run scripts/setup-server.sh on your Ubuntu VPS to get these values.\n')
  e.WG_SERVER_PUBLIC_KEY = await askLine('Server public key',    e.WG_SERVER_PUBLIC_KEY || '')
  e.WG_SERVER_ENDPOINT   = await askLine('Endpoint (ip:51820)',  e.WG_SERVER_ENDPOINT   || '')
  e.WG_SERVER_INTERFACE  = e.WG_SERVER_INTERFACE || 'wg0'

  // ── SMTP ──────────────────────────────────────────────────────────────────
  log.step('SMTP — Email (activation emails)')
  log.info('Used to send email verification links on registration.\n')
  e.SMTP_HOST                    = await askLine('SMTP host',                    e.SMTP_HOST                    || 'localhost')
  e.SMTP_PORT                    = await askLine('SMTP port',                    e.SMTP_PORT                    || '587')
  e.SMTP_SECURE                  = await askLine('Use TLS/SSL? (true=port 465)', e.SMTP_SECURE                  || 'false')
  e.SMTP_USER                    = await askLine('SMTP username',                e.SMTP_USER                    || '')
  e.SMTP_PASS                    = await askLine('SMTP password',                e.SMTP_PASS                    || '', true)
  e.SMTP_FROM                    = await askLine('From address',                 e.SMTP_FROM                    || '"1stCS VPN" <noreply@1stcs.gg>')
  e.ACTIVATION_TOKEN_EXPIRY_HOURS = await askLine('Activation link expiry (hours)', e.ACTIVATION_TOKEN_EXPIRY_HOURS || '24')

  return e
}

// ─── Database schema ──────────────────────────────────────────────────────────

const TABLES = [
  {
    name: 'users',
    sql: `
      CREATE TABLE IF NOT EXISTS users (
        id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        email         VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        is_admin      TINYINT(1)   NOT NULL DEFAULT 0,
        created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_email (email)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `,
  },
  {
    name: 'subscriptions',
    sql: `
      CREATE TABLE IF NOT EXISTS subscriptions (
        id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id     INT UNSIGNED NOT NULL,
        plan        ENUM('1m','3m','6m') NOT NULL,
        price_mnt   INT UNSIGNED NOT NULL,
        active      TINYINT(1)   NOT NULL DEFAULT 0,
        expires_at  DATETIME     NULL,
        created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_id    (user_id),
        INDEX idx_active_exp (active, expires_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `,
  },
  {
    name: 'vpn_clients',
    sql: `
      CREATE TABLE IF NOT EXISTS vpn_clients (
        id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id     INT UNSIGNED NOT NULL,
        public_key  VARCHAR(64)  NOT NULL,
        private_key VARCHAR(64)  NOT NULL,
        ip_address  VARCHAR(15)  NOT NULL UNIQUE,
        config      TEXT         NOT NULL,
        peer_added  TINYINT(1)   NOT NULL DEFAULT 0,
        created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_ip      (ip_address)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `,
  },
  {
    name: 'payments',
    sql: `
      CREATE TABLE IF NOT EXISTS payments (
        id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id         INT UNSIGNED NOT NULL,
        subscription_id INT UNSIGNED NULL,
        invoice_id      VARCHAR(255) NOT NULL UNIQUE,
        amount_mnt      INT UNSIGNED NOT NULL,
        plan            ENUM('1m','3m','6m') NOT NULL,
        status          ENUM('pending','paid','failed','expired') NOT NULL DEFAULT 'pending',
        qpay_data       JSON NULL,
        created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id)         REFERENCES users(id)         ON DELETE CASCADE,
        FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE SET NULL,
        INDEX idx_user_id (user_id),
        INDEX idx_invoice (invoice_id),
        INDEX idx_status  (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `,
  },
  {
    name: 'ip_pool',
    sql: `
      CREATE TABLE IF NOT EXISTS ip_pool (
        id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        ip_address  VARCHAR(15) NOT NULL UNIQUE,
        in_use      TINYINT(1)  NOT NULL DEFAULT 0,
        assigned_to INT UNSIGNED NULL,
        INDEX idx_in_use (in_use)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `,
  },
  {
    name: 'activation_tokens',
    sql: `
      CREATE TABLE IF NOT EXISTS activation_tokens (
        id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id    INT UNSIGNED NOT NULL,
        token      CHAR(64)     NOT NULL UNIQUE,
        expires_at DATETIME     NOT NULL,
        used_at    DATETIME     NULL,
        created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_token   (token),
        INDEX idx_user_id (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `,
  },
]

// ─── Column migrations (safe to re-run on existing installs) ─────────────────

const MIGRATIONS = [
  {
    label: 'users.email_verified column',
    sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS
            email_verified TINYINT(1) NOT NULL DEFAULT 0
          AFTER is_admin`,
  },
]

/** Seed ip_pool with 10.0.0.2–254 in batches — INSERT IGNORE keeps it idempotent */
async function seedIpPool(conn) {
  const all = []
  for (let i = 2; i <= 254; i++) all.push(`('10.0.0.${i}', 0)`)

  const BATCH = 64
  let inserted = 0
  for (let i = 0; i < all.length; i += BATCH) {
    const chunk    = all.slice(i, i + BATCH).join(', ')
    const [result] = await conn.execute(
      `INSERT IGNORE INTO ip_pool (ip_address, in_use) VALUES ${chunk}`
    )
    inserted += result.affectedRows
  }
  return inserted
}

// ─── MySQL connection with retry ─────────────────────────────────────────────

async function connectMySQL(cfg, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const conn = await createConnection({
        host:           cfg.DB_HOST,
        port:           parseInt(cfg.DB_PORT, 10),
        user:           cfg.DB_USER,
        password:       cfg.DB_PASSWORD,
        connectTimeout: 10_000,
      })
      return conn
    } catch (err) {
      if (attempt < retries && err.code === 'ECONNREFUSED') {
        log.warn(`Connection refused — retrying in 3 s (attempt ${attempt}/${retries})…`)
        await new Promise((r) => setTimeout(r, 3000))
      } else {
        throw err
      }
    }
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  banner('1stCS VPN  ·  Database Installer')

  // ── Step 1: Read .env ──────────────────────────────────────────────────────
  log.step('Reading Configuration')

  let env       = {}
  let envLoaded = false

  if (existsSync(ENV_PATH)) {
    try {
      env       = parseEnv(readFileSync(ENV_PATH, 'utf-8'))
      envLoaded = true
      log.ok(`.env loaded from ${ENV_PATH}`)
    } catch {
      log.warn('.env exists but could not be parsed — will reconfigure')
    }
  } else {
    log.warn(`.env not found at ${ENV_PATH}`)
  }

  // ── Step 2: Interactive setup for missing values ───────────────────────────
  const missing = getMissing(env)
  let   needsSave = false

  if (missing.length > 0) {
    if (envLoaded) {
      log.warn(`Missing required values: ${missing.map((k) => `${C.yellow}${k}${C.reset}`).join(', ')}`)
    }
    env       = await runSetupWizard(env)
    needsSave = true
  } else {
    log.ok('All required configuration values are present')
    // Auto-generate any missing optional secrets
    if (!env.CRON_SECRET) {
      env.CRON_SECRET = randomBytes(32).toString('hex')
      log.dim('CRON_SECRET auto-generated')
      needsSave = true
    }
  }

  // ── Step 3: Save .env ──────────────────────────────────────────────────────
  if (needsSave) {
    log.step('Saving Configuration')
    writeFileSync(ENV_PATH, serializeEnv(env), 'utf-8')
    log.ok(`.env written → ${ENV_PATH}`)
    log.warn('Keep .env private — add it to .gitignore and never commit it')
  }

  // ── Step 4: Connect to MySQL ───────────────────────────────────────────────
  log.step('Database Connection')
  log.info(
    `Connecting to ${C.bold}${env.DB_HOST}:${env.DB_PORT}${C.reset}` +
    ` as ${C.bold}${env.DB_USER}${C.reset}…`
  )

  let conn
  try {
    conn = await connectMySQL(env)
    log.ok('Connected to MySQL server')
  } catch (err) {
    log.err(`Cannot connect to MySQL: ${err.message}`)

    const hints = {
      ER_ACCESS_DENIED_ERROR: `  ${C.dim}Hint: check DB_USER and DB_PASSWORD in .env${C.reset}`,
      ECONNREFUSED:
        `  ${C.dim}Hint: MySQL is not running at ${env.DB_HOST}:${env.DB_PORT}\n` +
        `        Start it with:  docker compose up -d db${C.reset}`,
      ETIMEDOUT:
        `  ${C.dim}Hint: host unreachable — verify DB_HOST and firewall rules${C.reset}`,
      ENOTFOUND:
        `  ${C.dim}Hint: hostname '${env.DB_HOST}' cannot be resolved${C.reset}`,
      ER_BAD_DB_ERROR:
        `  ${C.dim}Hint: database '${env.DB_NAME}' does not exist (will be created next run)${C.reset}`,
    }
    if (hints[err.code]) console.log(hints[err.code])
    process.exit(1)
  }

  try {
    // ── Step 5: Create database ──────────────────────────────────────────────
    log.step('Database Setup')

    await conn.execute(
      `CREATE DATABASE IF NOT EXISTS \`${env.DB_NAME}\`` +
      ` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    )
    log.ok(`Database \`${env.DB_NAME}\` — ready`)

    await conn.execute(`USE \`${env.DB_NAME}\``)

    // ── Step 6: Apply schema ─────────────────────────────────────────────────
    log.step('Applying Schema')

    for (const { name, sql } of TABLES) {
      try {
        await conn.execute(sql)
        log.ok(`Table \`${name}\` — ready`)
      } catch (err) {
        log.err(`Failed to create table \`${name}\`: ${err.message}`)
        if (err.code === 'ER_TABLEACCESS_DENIED_ERROR') {
          log.err(`User '${env.DB_USER}' needs CREATE privilege on '${env.DB_NAME}'`)
          log.dim(`  GRANT ALL PRIVILEGES ON \`${env.DB_NAME}\`.* TO '${env.DB_USER}'@'%';`)
        }
        throw err
      }
    }

    // ── Step 6b: Column migrations (idempotent ADD COLUMN IF NOT EXISTS) ────
    log.step('Applying Migrations')
    for (const { label, sql } of MIGRATIONS) {
      try {
        await conn.execute(sql)
        log.ok(`Migration: ${label} — done`)
      } catch (err) {
        // MySQL < 8.0 doesn't support IF NOT EXISTS in ALTER TABLE
        if (err.code === 'ER_DUP_FIELDNAME') {
          log.ok(`Migration: ${label} — already exists, skipped`)
        } else {
          log.warn(`Migration: ${label} — ${err.message}`)
        }
      }
    }

    // ── Step 7: Seed IP pool ─────────────────────────────────────────────────
    log.step('Seeding IP Pool')
    const seeded = await seedIpPool(conn)

    if (seeded > 0) {
      log.ok(`IP pool — seeded ${seeded} addresses (10.0.0.2 – 10.0.0.254)`)
    } else {
      log.ok('IP pool — already fully populated, no changes made')
    }

    // ── Done ─────────────────────────────────────────────────────────────────
    banner('Installation Complete ✓')

    log.ok('Database schema applied successfully (idempotent — safe to re-run)')
    log.blank()

    // Warn about incomplete config
    const noQpay = !env.QPAY_USERNAME || !env.QPAY_PASSWORD || !env.QPAY_INVOICE_CODE
    const noWg   = !env.WG_SERVER_PUBLIC_KEY || !env.WG_SERVER_ENDPOINT

    const noSmtp = !env.SMTP_HOST || env.SMTP_HOST === 'localhost'
    if (noQpay)  log.warn('QPay is not configured — payments will not work until set in .env')
    if (noWg)    log.warn('WireGuard is not configured — run scripts/setup-server.sh on your VPS')
    if (noSmtp)  log.warn('SMTP is using localhost — activation emails may not be delivered in production')

    log.blank()
    log.info(`Start dev server:  ${C.bold}npm run dev${C.reset}`)
    log.info(`Production:        ${C.bold}docker compose up -d${C.reset}`)
    log.blank()

  } catch (err) {
    log.blank()
    log.err(`Installation failed: ${err.message}`)
    process.exit(1)
  } finally {
    await conn.end()
  }
}

main().catch((err) => {
  log.err(`Unexpected error: ${err.message}`)
  process.exit(1)
})
