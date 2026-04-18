'use client'

import { useEffect, useRef, useState } from 'react'
import type { TutorRef } from '@/types'

// ─── Tutor Avatar ─────────────────────────────────────────────────────────────

function TutorAvatar({ tutor, size = 40 }: { tutor: TutorRef; size?: number }) {
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
  hasError,
  onChange,
}: {
  selected:    TutorRef | null
  allTutors:   TutorRef[]
  placeholder: string
  hasError:    boolean
  onChange:    (t: TutorRef) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

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
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-[12px] w-full border-2 rounded-[66px] px-[32px] py-[24px] transition-colors hover:opacity-80"
        style={{ borderColor: hasError ? '#f26434' : '#323031' }}
      >
        {selected ? (
          <>
            <TutorAvatar tutor={selected} size={40} />
            <span
              className="font-heading font-normal text-ink flex-1 text-left truncate"
              style={{ fontSize: 'clamp(20px, 2.5vw, 32px)', lineHeight: '36px' }}
            >
              {selected.fullName}
            </span>
          </>
        ) : (
          <span
            className="font-heading font-normal text-ink opacity-50 flex-1 text-left"
            style={{ fontSize: 'clamp(20px, 2.5vw, 32px)', lineHeight: '1' }}
          >
            {placeholder}
          </span>
        )}
        <svg width="32" height="24" viewBox="-8 -4 36 28" fill="none"
          className="shrink-0 transition-transform"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        >
          <path d="M-2 4L10 16L22 4" stroke="#323031" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && allTutors.length > 0 && (
        <div
          className="absolute left-0 right-0 bg-cream border-2 border-[#323031] rounded-[24px] overflow-auto z-20 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{ top: 'calc(100% + 8px)', maxHeight: 280, boxShadow: '0 4px 24px rgba(0,0,0,0.14)' }}
        >
          {allTutors.map((tutor, i) => (
            <button
              key={tutor.id}
              type="button"
              onClick={() => { onChange(tutor); setOpen(false) }}
              className="flex items-center gap-[12px] w-full px-[32px] py-[20px] hover:bg-[#f5f3d8] transition-colors text-left"
              style={{
                borderRadius: i === 0 ? '22px 22px 0 0' : i === allTutors.length - 1 ? '0 0 22px 22px' : '0',
              }}
            >
              <TutorAvatar tutor={tutor} size={36} />
              <span
                className="font-heading font-normal text-ink truncate"
                style={{ fontSize: 'clamp(18px, 2vw, 28px)', lineHeight: '1.3' }}
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

// ─── Plan Selector ────────────────────────────────────────────────────────────

function PlanSelector({
  selected,
  planNames,
  placeholder,
  hasError,
  onChange,
}: {
  selected:    string | null
  planNames:   string[]
  placeholder: string
  hasError:    boolean
  onChange:    (plan: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

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
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-[12px] w-full border-2 rounded-[66px] px-[32px] py-[24px] transition-colors hover:opacity-80"
        style={{ borderColor: hasError ? '#f26434' : '#323031' }}
      >
        <span
          className={`font-heading font-normal text-ink flex-1 text-left truncate${!selected ? ' opacity-50' : ''}`}
          style={{ fontSize: 'clamp(20px, 2.5vw, 32px)', lineHeight: '36px' }}
        >
          {selected ?? placeholder}
        </span>
        <svg width="32" height="24" viewBox="-8 -4 36 28" fill="none"
          className="shrink-0 transition-transform"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        >
          <path d="M-2 4L10 16L22 4" stroke="#323031" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && planNames.length > 0 && (
        <div
          className="absolute left-0 right-0 bg-cream border-2 border-[#323031] rounded-[24px] overflow-auto z-20 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{ top: 'calc(100% + 8px)', maxHeight: 280, boxShadow: '0 4px 24px rgba(0,0,0,0.14)' }}
        >
          {planNames.map((name, i) => (
            <button
              key={name}
              type="button"
              onClick={() => { onChange(name); setOpen(false) }}
              className="flex items-center w-full px-[32px] py-[20px] hover:bg-[#f5f3d8] transition-colors text-left"
              style={{
                borderRadius: i === 0 ? '22px 22px 0 0' : i === planNames.length - 1 ? '0 0 22px 22px' : '0',
              }}
            >
              <span
                className="font-heading font-normal text-ink truncate"
                style={{ fontSize: 'clamp(18px, 2vw, 28px)', lineHeight: '1.3' }}
              >
                {name}
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
  formTitle:               string
  formNamePlaceholder:     string
  formTutorPlaceholder:    string
  formPlanPlaceholder:     string
  formTelegramPlaceholder: string
  formEmailPlaceholder:    string
  formContactError:        string
  formEmailError:          string
  formErrorMsg:            string
  formSubmitText:          string
  tutors:                  TutorRef[]
  planNames:               string[]
  locale:                  string
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function FooterForm({
  formTitle,
  formNamePlaceholder,
  formTutorPlaceholder,
  formPlanPlaceholder,
  formTelegramPlaceholder,
  formEmailPlaceholder,
  formContactError,
  formEmailError,
  formErrorMsg,
  formSubmitText,
  tutors,
  planNames,
  locale,
}: Props) {
  const [name,          setName]          = useState('')
  const [selectedTutor, setSelectedTutor] = useState<TutorRef | null>(null)
  const [selectedPlan,  setSelectedPlan]  = useState<string | null>(null)
  const [telegram,      setTelegram]      = useState('')
  const [email,         setEmail]         = useState('')

  useEffect(() => {
    const plan = new URLSearchParams(window.location.search).get('plan')
    if (plan && planNames.includes(plan)) {
      setSelectedPlan(plan)
      const url = new URL(window.location.href)
      url.searchParams.delete('plan')
      window.history.replaceState({}, '', url.toString())
    }
  }, [])

  const [nameErr,     setNameErr]     = useState(false)
  const [tutorErr,    setTutorErr]    = useState(false)
  const [planErr,     setPlanErr]     = useState(false)
  const [contactErr,  setContactErr]  = useState(false)
  const [emailErr,    setEmailErr]    = useState(false)

  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const tg      = telegram.trim()
    const em      = email.trim()
    const emailOk = !em || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)

    const nErr  = !name.trim()
    const tuErr = !selectedTutor
    const plErr = !selectedPlan
    const coErr = !tg && !em
    const emErr = !emailOk

    setNameErr(nErr)
    setTutorErr(tuErr)
    setPlanErr(plErr)
    setContactErr(coErr)
    setEmailErr(emErr)

    if (nErr || tuErr || plErr || coErr || emErr) return

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
          plan:     selectedPlan,
          locale,
          source:   'footer',
        }),
      })
      if (!res.ok) throw new Error('non-ok')
      setStatus('success')
    } catch {
      setStatus('error')
    }
  }

  const inputStyle = { fontSize: 'clamp(20px, 2.5vw, 32px)', lineHeight: '36px' } as const
  const errorStyle = { fontSize: '14px' } as const

  if (status === 'success') {
    return (
      <div className="bg-cream rounded-[26px] p-[36px] flex items-center justify-center" style={{ minHeight: 200 }}>
        <p
          className="font-heading font-medium text-ink text-center"
          style={{ fontSize: 'clamp(24px, 3vw, 40px)', lineHeight: '1.2' }}
        >
          ✓
        </p>
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="bg-cream rounded-[26px] p-[36px] flex flex-col gap-[24px]"
    >
      {/* Title */}
      <div className="px-[8px]">
        <p
          className="font-heading font-medium text-ink"
          style={{ fontSize: 'clamp(36px, 5vw, 72px)', lineHeight: '1.13' }}
        >
          {formTitle}
        </p>
      </div>

      {/* Inputs */}
      <div className="flex flex-col gap-[16px]">

        {/* Name */}
        <label
          className="border-2 rounded-[66px] px-[32px] py-[24px] block transition-colors"
          style={{ borderColor: nameErr ? '#f26434' : '#323031' }}
        >
          <input
            type="text"
            name="name"
            value={name}
            onChange={e => { setName(e.target.value); setNameErr(false) }}
            placeholder={formNamePlaceholder}
            className="w-full bg-transparent font-heading font-normal text-ink placeholder:text-ink placeholder:opacity-50 outline-none"
            style={inputStyle}
          />
        </label>

        {/* Tutor */}
        <TutorSelector
          selected={selectedTutor}
          allTutors={tutors}
          placeholder={formTutorPlaceholder}
          hasError={tutorErr}
          onChange={t => { setSelectedTutor(t); setTutorErr(false) }}
        />

        {/* Plan */}
        <PlanSelector
          selected={selectedPlan}
          planNames={planNames}
          placeholder={formPlanPlaceholder}
          hasError={planErr}
          onChange={p => { setSelectedPlan(p); setPlanErr(false) }}
        />

        {/* Telegram */}
        <label
          className="border-2 rounded-[66px] px-[32px] py-[24px] block transition-colors"
          style={{ borderColor: contactErr ? '#f26434' : '#323031' }}
        >
          <input
            type="text"
            name="telegram"
            value={telegram}
            onChange={e => { setTelegram(e.target.value); setContactErr(false) }}
            placeholder={formTelegramPlaceholder}
            autoComplete="off"
            className="w-full bg-transparent font-heading font-normal text-ink placeholder:text-ink placeholder:opacity-50 outline-none"
            style={inputStyle}
          />
        </label>

        {/* Email */}
        <label
          className="border-2 rounded-[66px] px-[32px] py-[24px] block transition-colors"
          style={{ borderColor: (contactErr || emailErr) ? '#f26434' : '#323031' }}
        >
          <input
            type="email"
            name="email"
            value={email}
            onChange={e => { setEmail(e.target.value); setContactErr(false); setEmailErr(false) }}
            placeholder={formEmailPlaceholder}
            autoComplete="email"
            className="w-full bg-transparent font-heading font-normal text-ink placeholder:text-ink placeholder:opacity-50 outline-none"
            style={inputStyle}
          />
        </label>

        {contactErr && <p className="font-sans text-[#f26434] pl-[16px]" style={errorStyle}>{formContactError}</p>}
        {emailErr   && <p className="font-sans text-[#f26434] pl-[16px]" style={errorStyle}>{formEmailError}</p>}
        {status === 'error' && (
          <p className="font-sans text-[#f26434] pl-[16px]" style={errorStyle}>
            {formErrorMsg}
          </p>
        )}
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={status === 'loading'}
        className="flex items-center justify-center w-full rounded-[66px] px-[36px] py-[36px] disabled:opacity-60 transition-opacity"
        style={{
          backgroundColor: '#323031',
          boxShadow: '0px 1px 4px 0px rgba(0,0,0,0.18), inset 0px 1px 2px 0px rgba(255,255,255,0.18)',
        }}
      >
        {status === 'loading' ? (
          <div className="flex items-center gap-[8px]">
            {[0, 1, 2].map(i => (
              <span
                key={i}
                className="block bg-cream rounded-[4px]"
                style={{ width: 10, height: 10, animation: 'btn-dot-pulse 1.2s ease-in-out infinite', animationDelay: `${i * 0.2}s` }}
              />
            ))}
          </div>
        ) : (
          <span
            className="font-sans font-bold text-cream"
            style={{ fontSize: 'clamp(20px, 2.5vw, 32px)', lineHeight: '32px' }}
          >
            {formSubmitText}
          </span>
        )}
      </button>
    </form>
  )
}
