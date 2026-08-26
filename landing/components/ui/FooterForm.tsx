'use client'

import { useEffect, useRef, useState } from 'react'
import TutorAvatar from '@/components/ui/TutorAvatar'
import ComingSoonHint from '@/components/ui/ComingSoonHint'
import { uiLabels, BECOME_TEACHER_ID } from '@/lib/uiLabels'
import type { TutorRef } from '@/types'

// The "I want to teach" row is an action, not a person: no avatar (initials of a
// sentence read as noise), and picking it drops the plan field — see the form below.
const isTeacherRoute = (t: TutorRef | null) => t?.id === BECOME_TEACHER_ID

// Who that row is for. Same type size as the label it follows — only the opacity
// sets it back — so the two read as one line. Renders in the list and once selected.
function ForTutors({ label }: { label: string }) {
  // nowrap: once the label wraps, the parenthetical has to move as one piece —
  // "(для" left on the first line reads as a typo, not a hint.
  return <span className="opacity-80 ml-[0.35em] whitespace-nowrap">{label}</span>
}

const ARROW_ICON = '/SVG/footer/arrow.svg'

// Chevron: FAQ accordion icon, points down when closed; flips (scaleY) to up when open.
function Chevron({ open }: { open: boolean }) {
  return (
    <img
      src={ARROW_ICON}
      alt=""
      aria-hidden
      className="shrink-0 w-[20px] h-[16px] object-contain transition-transform"
      style={{ transform: open ? 'scaleY(-1)' : 'scaleY(1)' }}
    />
  )
}

// ─── Tutor Selector ───────────────────────────────────────────────────────────

function TutorSelector({
  selected,
  allTutors,
  placeholder,
  teacherHint,
  onChange,
}: {
  selected:    TutorRef | null
  allTutors:   TutorRef[]
  placeholder: string
  teacherHint: string
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
        className="btn-press-field flex items-center gap-[12px] w-full border-[3px] border-[#323031] rounded-[28px] px-[32px] py-[24px]"
      >
        {selected ? (
          <>
            {!isTeacherRoute(selected) && <TutorAvatar tutor={selected} size={40} />}
            {/* Wraps instead of truncating: the teacher row is a whole sentence, and
                an ellipsis in the middle of it hides the very thing the reader picked.
                min-w-0 lets the flex child actually shrink to the pill's width. */}
            <span
              className="font-heading font-normal text-ink flex-1 min-w-0 text-left break-words"
              style={{ fontSize: 'clamp(20px, 2.5vw, 32px)', lineHeight: '1.15' }}
            >
              {selected.fullName}
              {isTeacherRoute(selected) && <ForTutors label={teacherHint} />}
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
        <Chevron open={open} />
      </button>

      {open && allTutors.length > 0 && (
        <div
          className="absolute left-0 right-0 bg-cream border-[3px] border-[#323031] rounded-[28px] overflow-auto z-20 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{ top: 'calc(100% + 8px)', maxHeight: 280, boxShadow: '0 4px 24px rgba(0,0,0,0.14)' }}
        >
          {allTutors.map((tutor, i) => (
            <button
              key={tutor.id}
              type="button"
              onClick={() => { onChange(tutor); setOpen(false) }}
              className="flex items-center gap-[12px] w-full px-[32px] py-[20px] hover:bg-[#f5f3d8] transition-colors text-left"
              style={{
                // Panel radius minus its 3px border — the row has to hug the curve
                // from the inside, otherwise the corners show a cream wedge.
                borderRadius: i === 0 ? '25px 25px 0 0' : i === allTutors.length - 1 ? '0 0 25px 25px' : '0',
              }}
            >
              {!isTeacherRoute(tutor) && <TutorAvatar tutor={tutor} size={36} />}
              <span
                className="font-heading font-normal text-ink flex-1 min-w-0 break-words"
                style={{ fontSize: 'clamp(18px, 2vw, 28px)', lineHeight: '1.3' }}
              >
                {tutor.fullName}
                {isTeacherRoute(tutor) && <ForTutors label={teacherHint} />}
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
  planPrices,
  placeholder,
  onChange,
}: {
  selected:    string | null
  planNames:   string[]
  planPrices:  Record<string, string>
  placeholder: string
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
        className="btn-press-field flex items-center gap-[12px] w-full border-[3px] border-[#323031] rounded-[28px] px-[32px] py-[24px]"
      >
        <span
          className={`font-heading font-normal text-ink flex-1 min-w-0 text-left break-words${!selected ? ' opacity-50' : ''}`}
          style={{ fontSize: 'clamp(20px, 2.5vw, 32px)', lineHeight: '1.15' }}
        >
          {selected ?? placeholder}
        </span>
        <Chevron open={open} />
      </button>

      {open && planNames.length > 0 && (
        <div
          className="absolute left-0 right-0 bg-cream border-[3px] border-[#323031] rounded-[28px] overflow-auto z-20 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{ top: 'calc(100% + 8px)', maxHeight: 280, boxShadow: '0 4px 24px rgba(0,0,0,0.14)' }}
        >
          {planNames.map((name, i) => (
            <button
              key={name}
              type="button"
              onClick={() => { onChange(name); setOpen(false) }}
              // Wrapping row: on a narrow screen the price drops to a second line
              // (name left, price right) instead of squeezing the name until it
              // breaks mid-word — "Adven / ced / course" was the bug.
              className="flex flex-wrap items-center gap-x-[16px] gap-y-[2px] w-full px-[32px] py-[20px] hover:bg-[#f5f3d8] transition-colors text-left"
              style={{
                borderRadius: i === 0 ? '25px 25px 0 0' : i === planNames.length - 1 ? '0 0 25px 25px' : '0',
              }}
            >
              {/* flex-auto, NOT flex-1: `flex: 1 1 0%` gives the name a zero base
                  size, so the line never overflows and the price never wraps. With
                  an auto basis the row breaks exactly when the two stop fitting. */}
              <span
                className="font-heading font-normal text-ink flex-auto min-w-0 break-words"
                style={{ fontSize: 'clamp(18px, 2vw, 28px)', lineHeight: '1.3' }}
              >
                {name}
              </span>
              {planPrices[name] && (
                // ml-auto, not justify-between: alone on the wrapped line the price
                // would sit at flex-start, i.e. left under the name.
                <span
                  className="font-heading font-normal text-ink opacity-70 shrink-0 ml-auto"
                  style={{ fontSize: 'clamp(16px, 1.6vw, 24px)', lineHeight: '1.3' }}
                >
                  {planPrices[name]}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  formTitle:  string
  tutors:     TutorRef[]
  planNames:  string[]
  planPrices: Record<string, string>
  locale:     string
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function FooterForm({ formTitle, tutors, planNames, planPrices, locale }: Props) {
  const L = uiLabels(locale)

  const [selectedTutor, setSelectedTutor] = useState<TutorRef | null>(null)
  const [selectedPlan,  setSelectedPlan]  = useState<string | null>(null)

  // Heads the tutor list: whoever wants to teach rather than study says so here,
  // and the header's "become a tutor" pill preselects this row on arrival.
  const teacherRoute: TutorRef = { id: BECOME_TEACHER_ID, fullName: L.wantToTeach, imageUrl: null }
  const options = [teacherRoute, ...tutors]

  const teaching = isTeacherRoute(selectedTutor)

  // Continue needs BOTH a tutor and a plan — the onboarding URL is built from the
  // two of them. The teacher branch is the exception: it carries no tariff at all,
  // so the plan field is gone and the tutor alone is enough.
  const canContinue = selectedTutor !== null && (teaching || selectedPlan !== null)

  // Заблокированная кнопка не говорит, почему она заблокирована — подсказка у курсора
  // называет недостающее поле (тот же чип, что и у неактивных ссылок футера).
  const blockedHint = selectedTutor === null
    ? (selectedPlan === null ? L.needBoth : L.needTutor)
    : L.needPlan

  // Prefill from the Plans section CTA (plan-selected). detail = plan name, or null
  // when a CTA drops its own choice (the hero button toggles off) — same null-means-
  // nothing convention `tutor-selected` already uses below.
  useEffect(() => {
    const onPlan = (e: Event) => {
      const plan = (e as CustomEvent<string | null>).detail
      if (plan === null) { setSelectedPlan(null); return }
      if (planNames.includes(plan)) setSelectedPlan(plan)
    }
    window.addEventListener('plan-selected', onPlan)
    return () => window.removeEventListener('plan-selected', onPlan)
  }, [planNames])

  // Two-way sync with the Tutors carousel and the header's "become a tutor" pill.
  // detail = tutor id, the BECOME_TEACHER_ID sentinel, or null on deselect.
  useEffect(() => {
    const onTutor = (e: Event) => {
      const id = (e as CustomEvent<number | null>).detail
      if (id == null) { setSelectedTutor(null); return }
      if (id === BECOME_TEACHER_ID) { setSelectedTutor(teacherRoute); return }
      setSelectedTutor(tutors.find(t => t.id === id) ?? null)
    }
    window.addEventListener('tutor-selected', onTutor)
    return () => window.removeEventListener('tutor-selected', onTutor)
    // teacherRoute is rebuilt every render but only ever holds L.wantToTeach.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tutors, L.wantToTeach])

  const changeTutor = (t: TutorRef) => {
    setSelectedTutor(t)
    window.dispatchEvent(new CustomEvent('tutor-selected', { detail: t.id }))
  }

  // Двусторонняя синхронизация с секцией Plans: без диспатча кнопка ранее выбранного
  // тарифа так и осталась бы с надписью «Выбрано!» после смены тарифа в форме.
  const changePlan = (plan: string) => {
    setSelectedPlan(plan)
    window.dispatchEvent(new CustomEvent('plan-selected', { detail: plan }))
  }

  const handleContinue = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canContinue) return

    const base = process.env.NEXT_PUBLIC_ONBOARDING_URL
    if (!base) {
      console.warn('[footer] NEXT_PUBLIC_ONBOARDING_URL is not set — cannot continue to onboarding')
      return
    }
    // Onboarding opens on a role question ("I want to learn / I want to teach").
    // Teaching carries no tutor and no tariff — just the role.
    const query = teaching
      ? `?role=teacher`
      : `?tutor=${encodeURIComponent(selectedTutor!.id)}&plan=${encodeURIComponent(selectedPlan!)}`
    window.location.assign(`${base}${query}&locale=${encodeURIComponent(locale)}`)
  }

  return (
    <form
      onSubmit={handleContinue}
      noValidate
      // Radius budget: this surface is 48px (--radius-2xl) and every nested inset
      // spends from it — 48 − 20 = 28px (--radius-card) for the controls below.
      // The padding can never exceed the radius; the old clamp(…, 4vw, 36px)
      // against a 26px form went negative from 650px up, which is why nothing
      // inside was concentric.
      className="glass rounded-[48px] flex flex-col gap-[24px] p-[20px]"
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

      {/* Selectors */}
      <div className="flex flex-col gap-[16px]">
        <TutorSelector
          selected={selectedTutor}
          allTutors={options}
          placeholder={L.yourTutor}
          teacherHint={L.forTutors}
          onChange={changeTutor}
        />
        {/* No tariff on the teacher route. The choice itself is kept, not cleared,
            so switching back to a tutor restores the plan the reader already picked. */}
        {!teaching && (
          <PlanSelector
            selected={selectedPlan}
            planNames={planNames}
            planPrices={planPrices}
            placeholder={L.yourPlan}
            onChange={changePlan}
          />
        )}
      </div>

      {/* Continue */}
      {(() => {
        const button = (
          <button
            type="submit"
            disabled={!canContinue}
            // btn-press-swell only while enabled: :hover/:active fire on disabled buttons
            // too, and a dead button that still lifts under the cursor reads as clickable.
            // Disabled also hands the pointer to the wrapper below, which needs the
            // hover to place its hint chip.
            // Keep the space before `${`: Tailwind scans the raw source for candidates,
            // and an interpolation glued straight onto `py-[36px]` swallows the class —
            // the button silently loses its 36px of vertical padding (which the swell
            // in globals.css also names as its rest value).
            className={`flex items-center justify-center w-full rounded-[28px] px-[36px] py-[36px] ${
              canContinue ? 'btn-press-swell' : 'opacity-40 pointer-events-none'
            }`}
            style={{
              backgroundColor: '#323031',
              boxShadow: '0px 1px 4px 0px rgba(0,0,0,0.18), inset 0px 1px 2px 0px rgba(255,255,255,0.18)',
            }}
          >
            <span
              className="font-sans font-bold text-cream"
              style={{ fontSize: 'clamp(20px, 2.5vw, 32px)', lineHeight: '32px' }}
            >
              {L.continue}
            </span>
          </button>
        )

        // Blocked: no crossed-out cursor — say what is missing, the same cursor chip
        // the footer's inactive links use.
        // @container: the swell measures itself in cqw off this wrapper, which is
        // exactly the button's rest width. Layout containment doesn't clip, so the
        // button is free to grow past it into the form's inset (same trick as the
        // hero CTA's wrapper).
        return (
          <div className="@container">
            {canContinue ? button : (
              <ComingSoonHint label={blockedHint} className="block w-full">
                {button}
              </ComingSoonHint>
            )}
          </div>
        )
      })()}
    </form>
  )
}
