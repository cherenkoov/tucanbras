'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { TutorRef, FreeLessonModalStrings } from '@/types'

export type { TutorRef }

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
  submitRef,
}: {
  selected:    TutorRef | null
  allTutors:   TutorRef[]
  placeholder: string
  onChange:    (t: TutorRef) => void
  submitRef:   React.RefObject<HTMLButtonElement | null>
}) {
  const [open,          setOpen]          = useState(false)
  const [dropdownMaxH,  setDropdownMaxH]  = useState(220)
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

  const handleOpen = () => {
    if (!open && ref.current && submitRef.current) {
      const triggerBottom = ref.current.getBoundingClientRect().bottom
      const submitBottom  = submitRef.current.getBoundingClientRect().bottom
      setDropdownMaxH(Math.max(60, submitBottom - triggerBottom - 8))
    }
    setOpen(v => !v)
  }

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={handleOpen}
        className="flex items-center gap-[12px] w-full border-2 border-[#323031] rounded-[66px] px-[18px] py-[18px] transition-colors hover:border-[#5b595a]"
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
          width="32" height="24" viewBox="-8 -4 36 28" fill="none"
          className="shrink-0 transition-transform"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        >
          <path d="M-2 4L10 16L22 4" stroke="#323031" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* Dropdown */}
      {open && allTutors.length > 0 && (
        <div
          className="absolute left-0 right-0 bg-cream border-2 border-[#323031] rounded-[24px] overflow-auto z-20 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{ top: 'calc(100% + 8px)', maxHeight: dropdownMaxH, boxShadow: '0 4px 24px rgba(0,0,0,0.14)' }}
        >
          {allTutors.map((tutor, i) => (
            <button
              key={tutor.id}
              type="button"
              onClick={() => { onChange(tutor); setOpen(false) }}
              className="flex items-center gap-[12px] w-full px-[18px] py-[18px] hover:bg-[#f5f3d8] transition-colors text-left"
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
  strings:       FreeLessonModalStrings
  locale:        string
  initialTutor?: TutorRef | null
  allTutors?:    TutorRef[]
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function FreeLessonModal({
  open,
  onClose,
  strings: s,
  locale,
  initialTutor = null,
  allTutors    = [],
}: Props) {

  const [mounted,       setMounted]       = useState(false)
  const [selectedTutor, setSelectedTutor] = useState<TutorRef | null>(null)
  const [name,          setName]          = useState('')
  const [telegram,      setTelegram]      = useState('')
  const [email,         setEmail]         = useState('')
  const [nameErr,       setNameErr]       = useState(false)
  const [contactErr,    setContactErr]    = useState(false)
  const [emailErr,      setEmailErr]      = useState(false)
  const [status,        setStatus]        = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const nameRef   = useRef<HTMLInputElement>(null)
  const submitRef = useRef<HTMLButtonElement>(null)

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
        setName(''); setTelegram(''); setEmail('')
        setNameErr(false); setContactErr(false); setEmailErr(false); setStatus('idle')
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
    const tg       = telegram.trim()
    const em       = email.trim()
    const emailOk  = !em || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)

    if (!name.trim()) { setNameErr(true); nameRef.current?.focus(); return }
    if (!tg && !em)   { setContactErr(true); return }
    if (!emailOk)     { setEmailErr(true); return }

    setStatus('loading')
    try {
      const res = await fetch('/api/free-lesson', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          name:     name.trim(),
          telegram: tg,
          email:    em,
          tutor_id: selectedTutor?.id ?? null,
          locale,
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
      className="fixed inset-0 z-[300] flex flex-col items-center justify-start px-[12px] pt-[60px]"
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
                submitRef={submitRef}
              />
            )}

            {/* Name */}
            <label
              className="border-2 rounded-[66px] p-[18px] block transition-colors"
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
                style={{ fontSize: 'clamp(16px, 2vw, 24px)', lineHeight: '1.3' }}
              />
            </label>
            {nameErr && (
              <p className="font-sans text-[#f26434] pl-[16px]" style={{ fontSize: '14px' }}>
                {s.nameError}
              </p>
            )}

            {/* Telegram */}
            <label
              className="border-2 rounded-[66px] p-[18px] block transition-colors"
              style={{ borderColor: contactErr ? '#f26434' : '#323031' }}
            >
              <input
                type="text"
                name="telegram"
                value={telegram}
                onChange={e => { setTelegram(e.target.value); setContactErr(false) }}
                placeholder={s.telegramPh}
                autoComplete="off"
                className="w-full bg-transparent font-heading font-normal text-ink placeholder:text-ink placeholder:opacity-50 outline-none"
                style={{ fontSize: 'clamp(16px, 2vw, 24px)', lineHeight: '1.3' }}
              />
            </label>

            {/* Email */}
            <label
              className="border-2 rounded-[66px] p-[18px] block transition-colors"
              style={{ borderColor: (contactErr || emailErr) ? '#f26434' : '#323031' }}
            >
              <input
                type="email"
                name="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setContactErr(false); setEmailErr(false) }}
                placeholder={s.emailPh}
                autoComplete="email"
                className="w-full bg-transparent font-heading font-normal text-ink placeholder:text-ink placeholder:opacity-50 outline-none"
                style={{ fontSize: 'clamp(16px, 2vw, 24px)', lineHeight: '1.3' }}
              />
            </label>
            {contactErr && (
              <p className="font-sans text-[#f26434] pl-[16px]" style={{ fontSize: '14px' }}>
                {s.contactError}
              </p>
            )}
            {emailErr && (
              <p className="font-sans text-[#f26434] pl-[16px]" style={{ fontSize: '14px' }}>
                {s.emailError}
              </p>
            )}

            {/* Error */}
            {status === 'error' && (
              <p className="font-sans text-[#f26434] pl-[16px]" style={{ fontSize: '14px' }}>
                {s.errorMsg}
              </p>
            )}

            {/* Submit */}
            <button
              ref={submitRef}
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
              {status === 'loading' ? (
                <div className="flex items-center gap-[8px]">
                  {[0, 1, 2].map(i => (
                    <span
                      key={i}
                      className="block bg-cream rounded-[4px]"
                      style={{
                        width: '10px',
                        height: '10px',
                        animation: `btn-dot-pulse 1.2s ease-in-out infinite`,
                        animationDelay: `${i * 0.2}s`,
                      }}
                    />
                  ))}
                </div>
              ) : (
                <span
                  className="font-sans font-bold text-cream"
                  style={{ fontSize: 'clamp(18px, 2vw, 28px)', lineHeight: '1' }}
                >
                  {s.submit}
                </span>
              )}
            </button>

          </form>
        )}

      </div>
    </div>,
    document.body
  )
}
