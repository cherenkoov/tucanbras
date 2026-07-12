import { NextRequest, NextResponse } from 'next/server'
import { Client as NotionClient } from '@notionhq/client'
import { sendWelcomeEmail } from '@/lib/email'
import pool from '@/lib/db'

// ─── Rate limiting ────────────────────────────────────────────────────────────
// In-memory sliding window, per warm serverless instance. Not a distributed
// limiter — but enough to stop naive form-spam and accidental double-submits.

const RATE_LIMIT_MAX = 5
const RATE_LIMIT_WINDOW_MS = 60_000
const hitLog = new Map<string, number[]>()

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const recent = (hitLog.get(ip) ?? []).filter(t => now - t < RATE_LIMIT_WINDOW_MS)
  recent.push(now)
  hitLog.set(ip, recent)
  if (hitLog.size > 5000) {
    for (const [key, times] of hitLog) {
      if (now - times[times.length - 1] >= RATE_LIMIT_WINDOW_MS) hitLog.delete(key)
    }
  }
  return recent.length > RATE_LIMIT_MAX
}

function clientIp(req: NextRequest): string {
  return (
    req.headers.get('x-nf-client-connection-ip') ??
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    'unknown'
  )
}

// ─── Validation ───────────────────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const LOCALES = ['ru', 'en', 'pt'] as const
const SOURCES = ['free_lesson', 'footer'] as const

const MAX_NAME = 100
const MAX_TELEGRAM = 100
const MAX_EMAIL = 254
const MAX_PLAN = 100

// ─── Integrations ─────────────────────────────────────────────────────────────

const notion = new NotionClient({ auth: process.env.NOTION_TOKEN })

async function sendTelegramNotification(
  name: string, telegram: string, email: string,
  tutorId: number | null, plan: string, source: string,
) {
  const token  = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!token || !chatId) return

  const sourceLabel = source === 'footer' ? 'Форма записи' : 'Бесплатный урок'
  // Plain text (no parse_mode): user-supplied fields can't break Markdown
  // parsing or inject formatting.
  const text =
    `🎉 Новая заявка — ${sourceLabel}\n` +
    `Имя: ${name}\n` +
    `Telegram: ${telegram || '—'}\n` +
    `Email: ${email || '—'}\n` +
    `Преподаватель ID: ${tutorId ?? '—'}\n` +
    `Тариф: ${plan || '—'}`

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ chat_id: chatId, text }),
  })
  if (!res.ok) throw new Error(`Telegram error ${res.status}`)
}

async function saveToNotion(
  name: string, telegram: string, email: string,
  tutorId: number | null, plan: string, locale: string,
) {
  const dbId = process.env.NOTION_LEADS_DB_ID
  if (!dbId) return

  await notion.pages.create({
    parent: { database_id: dbId },
    properties: {
      Name:     { title: [{ text: { content: name } }] },
      Email:    { email: email || null },
      Telegram: { rich_text: telegram ? [{ text: { content: telegram } }] : [] },
      Учитель:  { rich_text: tutorId != null ? [{ text: { content: String(tutorId) } }] : [] },
      Тариф:    plan   ? { select: { name: plan } }   : { select: null },
      Язык:     locale ? { select: { name: locale } } : { select: null },
    },
  })
}

async function saveToPostgres(
  name: string, telegram: string, email: string,
  tutorId: number | null, plan: string, source: string,
) {
  await pool.query(
    `INSERT INTO leads (name, telegram, email, tutor_id, plan, source)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [name, telegram || null, email || null, tutorId, plan || null, source],
  )
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  if (isRateLimited(clientIp(req))) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  let body: {
    name?:     string
    telegram?: string
    email?:    string
    tutor_id?: number
    plan?:     string
    locale?:   string
    source?:   string
    website?:  string
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Honeypot: the "website" field is invisible to humans; bots that fill it
  // get a fake success and no side effects.
  if (typeof body.website === 'string' && body.website.trim() !== '') {
    return NextResponse.json({ ok: true })
  }

  const name     = typeof body.name     === 'string' ? body.name.trim()     : ''
  const telegram = typeof body.telegram === 'string' ? body.telegram.trim() : ''
  const email    = typeof body.email    === 'string' ? body.email.trim()    : ''
  const rawPlan  = typeof body.plan     === 'string' ? body.plan.trim()     : ''

  if (!name)               return NextResponse.json({ error: 'name is required' },              { status: 400 })
  if (!telegram && !email) return NextResponse.json({ error: 'telegram or email is required' }, { status: 400 })

  if (name.length > MAX_NAME)         return NextResponse.json({ error: 'name too long' },     { status: 400 })
  if (telegram.length > MAX_TELEGRAM) return NextResponse.json({ error: 'telegram too long' }, { status: 400 })
  if (email && (email.length > MAX_EMAIL || !EMAIL_RE.test(email))) {
    return NextResponse.json({ error: 'invalid email' }, { status: 400 })
  }

  const plan    = rawPlan.slice(0, MAX_PLAN)
  const locale  = LOCALES.includes(body.locale as typeof LOCALES[number]) ? body.locale as string : 'ru'
  const source  = SOURCES.includes(body.source as typeof SOURCES[number]) ? body.source as string : 'free_lesson'
  const tutorId =
    typeof body.tutor_id === 'number' && Number.isInteger(body.tutor_id) &&
    body.tutor_id > 0 && body.tutor_id < 1_000_000_000
      ? body.tutor_id
      : null

  // Storage first-class, notifications best-effort: the response reflects
  // whether the lead was actually persisted anywhere. Notion is only counted
  // as storage when it's configured — otherwise its no-op would read as a
  // successful save and mask a Postgres failure with a 200.
  const storageNames: string[] = []
  const storageTasks: Promise<unknown>[] = []
  if (process.env.NOTION_LEADS_DB_ID) {
    storageNames.push('notion')
    storageTasks.push(saveToNotion(name, telegram, email, tutorId, plan, locale))
  }
  storageNames.push('postgres')
  storageTasks.push(saveToPostgres(name, telegram, email, tutorId, plan, source))
  const notifyTasks: Promise<unknown>[] = []
  if (telegram) notifyTasks.push(sendTelegramNotification(name, telegram, email, tutorId, plan, source))
  if (email)    notifyTasks.push(sendWelcomeEmail(email, name, locale))

  const [storageResults, notifyResults] = await Promise.all([
    Promise.allSettled(storageTasks),
    Promise.allSettled(notifyTasks),
  ])

  storageResults.forEach((r, i) => {
    if (r.status === 'rejected') console.error(`[free-lesson] storage ${storageNames[i]} failed:`, r.reason)
  })
  notifyResults.forEach((r, i) => {
    if (r.status === 'rejected') console.error(`[free-lesson] notification ${i} failed:`, r.reason)
  })

  if (!storageResults.some(r => r.status === 'fulfilled')) {
    return NextResponse.json({ error: 'Failed to save lead' }, { status: 502 })
  }

  return NextResponse.json({ ok: true })
}
