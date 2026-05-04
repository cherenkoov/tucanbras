import { Pool } from 'pg'

// Singleton pool — reused across Server Component renders in the same process.
// Next.js hot-reload creates a new module in dev, so we cache on globalThis.
const globalForPg = globalThis as typeof globalThis & { pgPool?: Pool }

const pool =
  globalForPg.pgPool ??
  (process.env.DATABASE_URL
    ? new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
    : new Pool({
        host:     process.env.DB_HOST     || 'localhost',
        port:     Number(process.env.DB_PORT) || 5432,
        database: process.env.DB_NAME,
        user:     process.env.DB_USER,
        password: process.env.DB_PASSWORD,
      })
  )

if (process.env.NODE_ENV !== 'production') globalForPg.pgPool = pool

export default pool
