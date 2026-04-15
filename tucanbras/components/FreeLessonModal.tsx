'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Locale } from '@/types'

// ─── Tutor reference (subset of Tutor used in modal) ─────────────────────────

export interface TutorRef {
  id:       number
  fullName: string
  imageUrl: string | null
}

// ─── Localised strings ────────────────────────────────────────────────────────

const S: Record<Locale, {
  title:       string
  tutorLabel:  string
  tutorPh:     string
  namePh:      string
  emailPh:     string
  submit:      string
  successMsg:  string
  errorMsg:    string
  nameError:   string
}> = {
  ru: {
    title:      'Записаться на бесплатный урок',
    tutorLabel: 'Преподаватель',
    tutorPh:    'Выбрать преподавателя',
    namePh:     'Ваше имя',
    emailPh:    'Email (необязательно)',
    submit:     'Записаться',
    successMsg: 'Спасибо! Переходим в бот…',
    errorMsg:   'Что-то пошло не так. Попробуйте ещё раз.',
    nameError:  'Пожалуйста, введите ваше имя',
  },
  en: {
    title:      'Sign up for a free lesson',
    tutorLabel: 'Tutor',
    tutorPh:    'Choose a tutor',
    namePh:     'Your name',
    emailPh:    'Email (optional)',
    submit:     'Sign up',
    successMsg: 'Thank you! Redirecting to bot…',
    errorMsg:   'Something went wrong. Please try again.',
    nameError:  'Please enter your name',
  },
  pt: {
    title:      'Inscreva-se para uma aula gratuita',
    tutorLabel: 'Professor',
    tutorPh:    'Escolha um professor',
    namePh:     'Seu nome',
    emailPh:    'E-mail (opcional)',
    submit:     'Inscrever-se',
    successMsg: 'Obrigado! Redirecionando para o bot…',
    errorMsg:   'Algo deu errado. Tente novamente.',
    nameError:  'Por favor, insira seu nome',
  },
}

// ─── Tutor Avatar ─────────────────────────────────────────────────────────────

function TutorAvatar({ tutor, size = 36 }: { tutor: TutorRef; size?: number }) {
  const initials = tutor.fullName
    .split(' ')
    .slice(0, 2)
    .map(w => w[0])
    .join('')

  if (tutor.imageUrl) {
    return (
      <img
        src={tutor.imageUrl}
        alt={tutor.fullName}
        className="rounded-full object-cover object-top shrink-0"
        style={{ width: size, height: size }}
      />
    )
  }
  return (
    <div
      className="rounded-full bg-green flex items-center justify-center shrink-0 font-sans font-bold text-ink"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {initials}
    </div>
  )
}

// ─── Tutor Selector ───────────────────────────────────────────────────────────

function TutorSelector({
  selected,
  allTutors,
  placeholder,
  onChange,
}: {
  selected:  TutorRef | null
  allTutors: TutorRef[]
  placeholder: string
  onChange:  (t: TutorRef) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-[12px] w-full border-2 border-[#323031] rounded-[66px] px-[24px] py-[16px] transition-colors hover:border-[#5b595a]"
      >
        {selected ? (
          <>
            <TutorAvatar tutor={selected} size={36} />
            <span
              className="font-heading font-normal text-ink flex-1 text-left truncate"
              style={{ fontSize: 'clamp(16px, 1.8vw, 24px)', lineHeight: '1.3' }}
            >
              {selected.fullName}
            </span>
          </>
        ) : (
          <span
            className="font-heading font-normal text-ink opacity-50 flex-1 text-left"
            style={{ fontSize: 'clamp(16px, 1.8vw, 24px)', lineHeight: '1.3' }}
          >
            {placeholder}
          </span>
        )}
        {/* Chevron */}
        <svg
          width="20" height="20" viewBox="0 0 20 20" fill="none"
          className="shrink-0 transition-transform"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        >
          <path d="M5 7.5L10 12.5L15 7.5" stroke="#323031" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* Dropdown */}
      {open && allTutors.length > 0 && (
        <div
          className="absolute left-0 right-0 bg-cream border-2 border-[#323031] rounded-[24px] overflow-auto z-20 scrollbar-custom"
          style={{ top: 'calc(100% + 8px)', maxHeight: '220px', boxShadow: '0 4px 24px rgba(0,0,0,0.14)' }}
        >
          {allTutors.map((tutor, i) => (
            <button
              key={tutor.id}
              type="button"
              onClick={() => { onChange(tutor); setOpen(false) }}
              className="flex items-center gap-[12px] w-full px-[24px] py-[14px] hover:bg-[#f5f3d8] transition-colors text-left"
              style={{
                borderRadius: i === 0 ? '22px 22px 0 0' : i === allTutors.length - 1 ? '0 0 22px 22px' : '0',
              }}
            >
              <TutorAvatar tutor={tutor} size={32} />
              <span
                className="font-heading font-normal text-ink truncate"
                style={{ fontSize: 'clamp(14px, 1.6vw, 22px)', lineHeight: '1.3' }}
              >
                {tutor.fullName}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  open:          boolean
  onClose:       () => void
  locale:        Locale
  initialTutor?: TutorRef | null
  allTutors?:    TutorRef[]
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function FreeLessonModal({
  open,
  onClose,
  locale,
  initialTutor = null,
  allTutors    = [],
}: Props) {
  const s = S[locale]

  const [mounted,       setMounted]       = useState(false)
  const [selectedTutor, setSelectedTutor] = useState<TutorRef | null>(null)
  const [name,          setName]          = useState('')
  const [email,         setEmail]         = useState('')
  const [nameErr,       setNameErr]       = useState(false)
  const [status,        setStatus]        = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => setMounted(true), [])

  // Sync initialTutor when modal opens
  useEffect(() => {
    if (open) setSelectedTutor(initialTutor ?? null)
  }, [open, initialTutor])

  // Lock body scroll while open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
      const t = setTimeout(() => nameRef.current?.focus(), 120)
      return () => { clearTimeout(t); document.body.style.overflow = '' }
    }
    document.body.style.overflow = ''
  }, [open])

  // Reset form when closed
  useEffect(() => {
    if (!open) {
      const t = setTimeout(() => {
        setName(''); setEmail(''); setNameErr(false); setStatus('idle')
      }, 300)
      return () => clearTimeout(t)
    }
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) { setNameErr(true); nameRef.current?.focus(); return }

    setStatus('loading')
    try {
      const res = await fetch('/api/free-lesson', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          name:      name.trim(),
          email:     email.trim(),
          tutor_id:  selectedTutor?.id ?? null,
        }),
      })
      if (!res.ok) throw new Error('non-ok')
      setStatus('success')
      setTimeout(() => {
        const botUrl = process.env.NEXT_PUBLIC_TG_BOT_URL ?? 'https://t.me/'
        window.open(botUrl, '_blank', 'noopener')
        onClose()
      }, 1600)
    } catch {
      setStatus('error')
    }
  }

  if (!open || !mounted) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[300] flex flex-col items-center justify-start px-[12px] pt-[190px]"
      style={{ backgroundColor: 'rgba(0,0,0,0.52)', backdropFilter: 'blur(6px)', animation: 'backdrop-in 0.25s ease' }}
      onClick={onClose}
    >
      <div
        className="bg-cream rounded-[26px] p-[36px] w-full max-w-[560px] flex flex-col gap-[24px]"
        style={{ transformOrigin: '50% 0%', animation: 'modal-scale-in 0.35s cubic-bezier(0.34,1.48,0.64,1)' }}
        onClick={e => e.stopPropagation()}
      >

        {/* Header row: title + close */}
        <div className="flex items-start justify-between gap-[16px]">
          <p
            className="font-heading font-medium text-ink"
            style={{ fontSize: 'clamp(24px, 3.5vw, 48px)', lineHeight: '1.13' }}
          >
            {s.title}
          </p>
          <button
            onClick={onClose}
            aria-label="Закрыть"
            className="shrink-0 flex flex-col gap-[6px] items-end opacity-80 hover:opacity-100 transition-opacity"
          >
            <span className="block h-[12px] w-[40px] rounded-xsm bg-ink translate-y-[21px] rotate-45" />
            <span className="block h-[18px] w-[48px] rounded-xsm bg-ink opacity-0 scale-x-0" />
            <span className="block h-[12px] w-[40px] rounded-xsm bg-ink -translate-y-[21px] -rotate-45" />
          </button>
        </div>

        {/* Form */}
        {status === 'success' ? (
          <p
            className="font-heading font-medium text-ink text-center py-[24px]"
            style={{ fontSize: 'clamp(20px, 2.5vw, 32px)', lineHeight: '1.2' }}
          >
            {s.successMsg}
          </p>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-[16px]">

            {/* Tutor selector (shown when there are tutors to choose from) */}
            {allTutors.length > 0 && (
              <TutorSelector
                selected={selectedTutor}
                allTutors={allTutors}
                placeholder={s.tutorPh}
                onChange={setSelectedTutor}
              />
            )}

            {/* Name */}
            <label
              className="border-2 rounded-[66px] px-[32px] py-[20px] block transition-colors"
              style={{ borderColor: nameErr ? '#f26434' : '#323031' }}
            >
              <input
                ref={nameRef}
                type="text"
                name="name"
                value={name}
                onChange={e => { setName(e.target.value); setNameErr(false) }}
                placeholder={s.namePh}
                required
                autoComplete="name"
                className="w-full bg-transparent font-heading font-normal text-ink placeholder:text-ink placeholder:opacity-50 outline-none"
                style={{ fontSize: 'clamp(18px, 2vw, 28px)', lineHeight: '1.3' }}
              />
            </label>
            {nameErr && (
              <p className="font-sans text-[#f26434] pl-[16px]" style={{ fontSize: '14px' }}>
                {s.nameError}
              </p>
            )}

            {/* Email */}
            <label className="border-2 border-[#323031] rounded-[66px] px-[32px] py-[20px] block">
              <input
                type="email"
                name="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder={s.emailPh}
                autoComplete="email"
                className="w-full bg-transparent font-heading font-normal text-ink placeholder:text-ink placeholder:opacity-50 outline-none"
                style={{ fontSize: 'clamp(18px, 2vw, 28px)', lineHeight: '1.3' }}
              />
            </label>

            {/* Error */}
            {status === 'error' && (
              <p className="font-sans text-[#f26434] pl-[16px]" style={{ fontSize: '14px' }}>
                {s.errorMsg}
              </p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={status === 'loading'}
              className="flex items-center justify-center w-full rounded-[66px] px-[36px] disabled:opacity-60 transition-opacity"
              style={{
                backgroundColor: '#323031',
                paddingTop: '28px',
                paddingBottom: '28px',
                boxShadow: '0px 1px 4px 0px rgba(0,0,0,0.18), inset 0px 1px 2px 0px rgba(255,255,255,0.18)',
              }}
            >
              <span
                className="font-sans font-bold text-cream"
                style={{ fontSize: 'clamp(18px, 2vw, 28px)', lineHeight: '1' }}
              >
                {status === 'loading' ? '…' : s.submit}
              </span>
            </button>

          </form>
        )}

      </div>
    </div>,
    document.body
  )
}
