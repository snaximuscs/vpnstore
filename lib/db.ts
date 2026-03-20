import mysql from 'mysql2/promise'

let pool: mysql.Pool | null = null

function getPool(): mysql.Pool {
  if (!pool) {
    pool = mysql.createPool({
      host:            process.env.DB_HOST     || 'localhost',
      port:            Number(process.env.DB_PORT) || 3306,
      user:            process.env.DB_USER     || 'vpnuser',
      password:        process.env.DB_PASSWORD || '',
      database:        process.env.DB_NAME     || 'vpndb',
      waitForConnections: true,
      connectionLimit: 10,
    })
  }
  return pool
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SqlValues = any[]

export async function query<T = unknown>(
  sql: string,
  values?: SqlValues
): Promise<T> {
  const [rows] = await getPool().execute(sql, values)
  return rows as T
}

export async function queryOne<T = unknown>(
  sql: string,
  values?: SqlValues
): Promise<T | null> {
  const rows = await query<T[]>(sql, values)
  return rows[0] ?? null
}

export async function execute(
  sql: string,
  values?: SqlValues
): Promise<mysql.ResultSetHeader> {
  const [result] = await getPool().execute(sql, values)
  return result as mysql.ResultSetHeader
}

export async function getConnection(): Promise<mysql.PoolConnection> {
  return getPool().getConnection()
}
