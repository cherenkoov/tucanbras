import { NextRequest, NextResponse } from 'next/server'
import { sendWelcomeEmail } from '@/lib/email'
import { isLocale } from '@/lib/locales'
import pool from '@/lib/db'

// ─── Rate limiting ────────────────────────────────────────────────────────────
// In-memory sliding window. Prod runs as a single long-lived `next start`
// process behind nginx, so one Map covers all traffic (unlike serverless).

const RATE_LIMIT_MAX = 5
const RATE_LIMIT_WINDOW_MS = 60_000
const hitLog = new Map<string, number[]>()

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  let recent = (hitLog.get(ip) ?? []).filter(t => now - t < RATE_LIMIT_WINDOW_MS)
  recent.push(now)
  // Cap the per-IP array: past MAX+1 entries the verdict can't change, and without
  // a cap a flooding client grows its own array (and the filter cost) unboundedly
  // for the life of the process.
  if (recent.length > RATE_LIMIT_MAX + 1) recent = recent.slice(-(RATE_LIMIT_MAX + 1))
  hitLog.set(ip, recent)
  if (hitLog.size > 5000) {
    for (const [key, times] of hitLog) {
      if (now - times[times.length - 1] >= RATE_LIMIT_WINDOW_MS) hitLog.delete(key)
    }
  }
  return recent.length > RATE_LIMIT_MAX
}

function clientIp(req: NextRequest): string {
  // Behind nginx the FIRST X-Forwarded-For entry is whatever the client sent —
  // trivially spoofable. With the standard `proxy_add_x_forwarded_for` setup the
  // proxy APPENDS the real peer address, so the LAST entry is the trustworthy one.
  // X-Real-IP (when nginx sets it) is the peer address directly and wins.
  const real = req.headers.get('x-real-ip')?.trim()
  if (real) return real
  const nf = req.headers.get('x-nf-client-connection-ip') // Netlify (legacy hosting)
  if (nf) return nf
  const xff = req.headers.get('x-forwarded-for')
  if (xff) {
    const parts = xff.split(',')
    return parts[parts.length - 1].trim()
  }
  return 'unknown'
}

// ─── Validation ───────────────────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const SOURCES = ['free_lesson', 'footer'] as const

const MAX_NAME = 100
const MAX_TELEGRAM = 100
const MAX_EMAIL = 254
const MAX_PLAN = 100

// ─── Integrations ─────────────────────────────────────────────────────────────

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
  const locale  = isLocale(body.locale) ? body.locale : 'ru'
  const source  = SOURCES.includes(body.source as typeof SOURCES[number]) ? body.source as string : 'free_lesson'
  const tutorId =
    typeof body.tutor_id === 'number' && Number.isInteger(body.tutor_id) &&
    body.tutor_id > 0 && body.tutor_id < 1_000_000_000
      ? body.tutor_id
      : null

  // Storage first-class, notifications best-effort: the response reflects
  // whether the lead was actually persisted anywhere. Postgres is the only
  // storage — Telegram and Resend are notifications, and their failure must
  // never turn a saved lead into an error (nor a lost lead into a 200).
  const storageNames: string[] = ['postgres']
  const storageTasks: Promise<unknown>[] = [
    saveToPostgres(name, telegram, email, tutorId, plan, source),
  ]
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
