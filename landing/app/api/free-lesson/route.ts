import { NextRequest, NextResponse } from 'next/server'
import { Client as NotionClient } from '@notionhq/client'
import { sendWelcomeEmail } from '@/lib/email'
import pool from '@/lib/db'

// ─── Integrations ─────────────────────────────────────────────────────────────

async function sendTelegramNotification(
  name: string, telegram: string, email: string,
  tutorId: number | null, plan: string, source: string,
) {
  const token  = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!token || !chatId) return

  const sourceLabel = source === 'footer' ? 'Форма записи' : 'Бесплатный урок'
  const text =
    `🎉 *Новая заявка — ${sourceLabel}*\n` +
    `Имя: ${name}\n` +
    `Telegram: ${telegram || '—'}\n` +
    `Email: ${email || '—'}\n` +
    `Преподаватель ID: ${tutorId ?? '—'}\n` +
    `Тариф: ${plan || '—'}`

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
  })
  if (!res.ok) throw new Error(`Telegram error ${res.status}`)
}

async function saveToNotion(
  name: string, telegram: string, email: string,
  tutorId: number | null, plan: string, locale: string,
) {
  const dbId = process.env.NOTION_LEADS_DB_ID
  if (!dbId) return

  const notion = new NotionClient({ auth: process.env.NOTION_TOKEN })
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
  let body: {
    name?:     string
    telegram?: string
    email?:    string
    tutor_id?: number
    plan?:     string
    locale?:   string
    source?:   string
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const name     = body.name?.trim()     ?? ''
  const telegram = body.telegram?.trim() ?? ''
  const email    = body.email?.trim()    ?? ''
  const plan     = body.plan?.trim()     ?? ''
  const locale   = body.locale           ?? 'ru'
  const source   = body.source           ?? 'free_lesson'
  const tutorId  = typeof body.tutor_id === 'number' ? body.tutor_id : null

  if (!name)                return NextResponse.json({ error: 'name is required' },             { status: 400 })
  if (!telegram && !email)  return NextResponse.json({ error: 'telegram or email is required' }, { status: 400 })

  const tasks: Promise<unknown>[] = [
    saveToNotion(name, telegram, email, tutorId, plan, locale),
    saveToPostgres(name, telegram, email, tutorId, plan, source),
  ]

  if (telegram) tasks.push(sendTelegramNotification(name, telegram, email, tutorId, plan, source))
  if (email)    tasks.push(sendWelcomeEmail(email, name, locale))

  const results = await Promise.allSettled(tasks)
  results.forEach((r, i) => {
    if (r.status === 'rejected') console.error(`[free-lesson] step ${i} failed:`, r.reason)
  })

  return NextResponse.json({ ok: true })
}
