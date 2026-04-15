import { NextRequest, NextResponse } from 'next/server'
import { Client as NotionClient } from '@notionhq/client'
import { Pool } from 'pg'

// ─── Clients (lazy-init to avoid cold-start errors when env vars are absent) ──

let pgPool: Pool | null = null
function getPool() {
  if (!pgPool && process.env.DATABASE_URL) {
    pgPool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
  }
  return pgPool
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

async function sendTelegram(name: string, email: string, tutorId: number | null) {
  const token  = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!token || !chatId) return

  const text =
    `🎉 *Новая заявка — бесплатный урок*\n` +
    `Имя: ${name}\n` +
    `Email: ${email || '—'}\n` +
    `Преподаватель ID: ${tutorId ?? '—'}`

  const url = `https://api.telegram.org/bot${token}/sendMessage`
  const res = await fetch(url, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
  })
  if (!res.ok) throw new Error(`Telegram error ${res.status}`)
}

async function saveToNotion(name: string, email: string) {
  const dbId = process.env.NOTION_LEADS_DB_ID
  if (!dbId) return

  const notion = new NotionClient({ auth: process.env.NOTION_TOKEN })
  await notion.pages.create({
    parent: { database_id: dbId },
    properties: {
      Name:  { title:  [{ text: { content: name  } }] },
      Email: { email: email || null },
    },
  })
}

async function saveToPostgres(name: string, email: string, tutorId: number | null) {
  const pool = getPool()
  if (!pool) return

  await pool.query(
    `INSERT INTO leads (name, email, tutor_id, source) VALUES ($1, $2, $3, 'free_lesson')`,
    [name, email || null, tutorId],
  )
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let body: { name?: string; email?: string; tutor_id?: number }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const name     = body.name?.trim() ?? ''
  const email    = body.email?.trim() ?? ''
  const tutorId  = typeof body.tutor_id === 'number' ? body.tutor_id : null

  if (!name) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 })
  }

  // Fire all integrations in parallel; don't fail the request if one is down
  const results = await Promise.allSettled([
    sendTelegram(name, email, tutorId),
    saveToNotion(name, email),
    saveToPostgres(name, email, tutorId),
  ])

  results.forEach((r, i) => {
    if (r.status === 'rejected') {
      console.error(`[free-lesson] step ${i} failed:`, r.reason)
    }
  })

  return NextResponse.json({ ok: true })
}
