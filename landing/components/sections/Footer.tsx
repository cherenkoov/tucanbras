import type { CSSProperties } from 'react'
import type { FooterProps, FaqGroup as FaqGroupType } from '@/types'
import LanguageSwitcher from '@/components/ui/LanguageSwitcher'
import FooterForm from '@/components/ui/FooterForm'
import FooterTucan from '@/components/ui/FooterTucan'
import FooterDecor from '@/components/ui/FooterDecor'
import ComingSoonHint from '@/components/ui/ComingSoonHint'
import { uiLabels } from '@/lib/uiLabels'

// ─── Assets ──────────────────────────────────────────────────────────────────
const IMG_LOGO      = '/SVG/footer/TUCANBRAS.svg'
const IMG_SOCIAL_TG = '/SVG/footer/telegram.svg'
const IMG_SOCIAL_IG = '/SVG/footer/instagram.svg'
const IMG_SOCIAL_YT = '/SVG/footer/youtube.svg'
// Arrow icon (bxs:up-arrow). Base state = up, closed accordion = rotate-180 (down).
const ICON_ARROW    = '/SVG/footer/arrow.svg'

// ─── Геометрия карточки футера ────────────────────────────────────────────────
// Радиус карточки и её отступ объявлены ЗДЕСЬ, а не только в классе/стиле: от этой
// же пары считается маска логотипа (см. ниже), и разъехаться им нельзя. Отступ
// уезжает в кастомное свойство `--footer-card-pad`, чтобы формула ниже читала ровно
// то число, которым карточка отбита на текущей ширине.
const CARD_RADIUS = 48                        // = --radius-2xl
const CARD_PAD    = 'clamp(12px, 4vw, 36px)'  // отступ карточки: и по бокам, и сверху

// Live social URLs, keyed by socialLinks label. Anything not listed here renders
// as an inactive (dimmed, non-clickable) icon until its channel goes live.
const SOCIAL_URLS: Record<string, string> = {
  Telegram: 'https://t.me/tucanBRAS',
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FaqAccordion({ group }: { group: FaqGroupType }) {
  return (
    <div className="flex flex-col gap-[24px] flex-1 min-w-[276px] max-w-[320px]">
      {/* Group heading */}
      <p
        className="font-heading font-normal text-ink text-center md:text-left"
        style={{ fontSize: 'clamp(20px, 2vw, 28px)', lineHeight: '32px' }}
      >
        {group.title}
      </p>

      {/* Items */}
      <div className="flex flex-col gap-[16px] pl-[8px]">
        {group.items.map((item, i) => (
          <details key={i} className="group">
            <summary className="flex items-center gap-[16px] cursor-pointer list-none [&::-webkit-details-marker]:hidden">
              {/* Arrow: up-arrow icon, rotate-180 in closed state (= down arrow) */}
              <div className="shrink-0 w-[12px] h-[12px] transition-transform rotate-0 group-open:rotate-180 opacity-80">
                <img
                  src={ICON_ARROW}
                  alt=""
                  className="w-full h-full object-contain pointer-events-none"
                />
              </div>
              <span
                className="font-sans font-bold text-ink"
                style={{ fontSize: 'clamp(14px, 1.2vw, 18px)', lineHeight: '18px' }}
              >
                {item.question}
              </span>
            </summary>

            {item.answer && (
              <p
                className="mt-[8px] pl-[28px] font-sans text-ink opacity-70"
                style={{ fontSize: 'clamp(12px, 1vw, 16px)', lineHeight: '1.4' }}
              >
                {item.answer}
              </p>
            )}
          </details>
        ))}
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Footer({ data, tutors, planNames, planPrices, locale }: FooterProps) {
  const comingSoon = uiLabels(locale).comingSoon
  return (
    <footer id="footer" className="w-full scroll-mt-[136px] lg:scroll-mt-[164px]">
      {/* ══ Outer container — transparent (green plate removed), keeps the 12px gutter ══ */}
      <div
        className="relative isolate flex flex-col max-w-[1720px] mx-auto w-full rounded-[38px] p-[12px]"
      >

        {/* ══ Form row ══ */}
        <div className="relative pb-[12px] flex flex-col lg:flex-row gap-[12px]">

          {/* Form: 60% on desktop, full width on mobile.
              z-[3]: the open tutor/plan dropdowns hang below the form and must paint
              over the footer content card (z-[2]) instead of behind it. Equal z to the
              tucan head, which is later in the DOM → head still wins over the form. */}
          <div className="relative z-[3] lg:flex-[6] min-w-0">
            <FooterForm
              formTitle={data.formTitle}
              tutors={tutors}
              planNames={planNames}
              planPrices={planPrices}
              locale={locale}
            />
          </div>

          {/* Spacer: reserves 40% for the toucan */}
          <div className="hidden lg:block lg:flex-[4]" />

          {/* Tucan body — z-[1], behind white card, bottom 5px below card top */}
          <div className="hidden lg:block absolute z-[1] bottom-[-5px] right-[0] w-[calc((100%-12px)*0.4)]">
            <FooterTucan layer="body" className="w-full" />
          </div>

          {/* Tucan head/beak — z-[3], in front of white card */}
          <div className="hidden lg:block absolute z-[3] bottom-[-5px] right-[0] w-[calc((100%-12px)*0.4)]">
            <FooterTucan layer="head" className="w-full" />
          </div>

        </div>

        {/* ══ Footer content card — glass → solid on hover ══ */}
        <div
          className="glass relative z-[2] overflow-hidden flex flex-col gap-[64px]"
          style={{
            boxShadow: '0px 2px 4px 0px rgba(0,0,0,0.18), inset 0px 4px 4px 0px rgba(255,255,255,0.25)',
            '--footer-card-pad': CARD_PAD,
            borderRadius: `${CARD_RADIUS}px`,
            padding: 'var(--footer-card-pad)',
          } as CSSProperties}
        >

          <FooterDecor />

          {/* Every block below is `relative` so it paints OVER the decor layer: an
              absolutely positioned sibling outranks a static one whatever the DOM order. */}

          {/* ── Logo + description ── */}
          <div className="relative flex flex-wrap items-center justify-center gap-[30px]">
            {/* Logo — маска со скруглёнными ВЕРХНИМИ углами.
                Надпись упирается своим левым верхним углом ровно в угол контентной
                области карточки (первый блок в колонке, отбитой на `--footer-card-pad`),
                и её прямой угол спорил с кривой самой карточки. Радиус маски — вложенная
                формула проекта R_inner = R_outer − отступ (та же, что у hero-CTA и
                контролов футер-формы, см. globals.css): отступ карточки одинаков по бокам
                и сверху, поэтому оба верхних угла маски концентричны её углам.
                Нижние углы прямые: снизу надпись ни во что не упирается.

                `-mt-[2px]` ниже lg — ОПТИЧЕСКАЯ правка, а не выравнивание: коробка
                логотипа отбита строго одинаково со всех трёх сторон (замерено на 390px:
                15.59 сверху, слева и справа), но читается сверху просторнее. Причина в
                форме букв: верхний край надписи — ровная полоса в 15.5px на 222px ширины,
                а боковые края короткие (64px высоты) и рваные — под перекладиной «Т»
                пустой клин до «U», поэтому чернила там в среднем дальше от края
                (медиана 26.25px слева, 18px справа против 15.5px сверху). Величина —
                решение владельца. На десктопе гасится: там отступ 36px, а надпись втрое
                выше, и полоса сверху уже не выделяется. */}
            <div
              className="flex-1 min-w-[280px] overflow-hidden -mt-[2px] lg:mt-0"
              style={{
                borderTopLeftRadius:  `calc(${CARD_RADIUS}px - var(--footer-card-pad))`,
                borderTopRightRadius: `calc(${CARD_RADIUS}px - var(--footer-card-pad))`,
              }}
            >
              <img
                src={IMG_LOGO}
                alt="TucanBRAS"
                className="block w-full h-auto"
              />
            </div>
            {/* Description */}
            <div className="flex-1 min-w-[240px] max-w-[310px] flex items-center justify-center">
              <p
                className="font-heading font-normal text-ink text-center"
                style={{ fontSize: 'clamp(16px, 1.8vw, 28px)', lineHeight: '1.3' }}
              >
                {data.brandDescription}
              </p>
            </div>
          </div>

          {/* ── FAQ accordion — 3 columns ── */}
          {data.faqGroups.length > 0 && (
            <div className="relative flex flex-wrap gap-[24px_16px] items-start justify-center w-full">
              {data.faqGroups.map((group, i) => (
                <FaqAccordion key={i} group={group} />
              ))}
            </div>
          )}

          {/* ── Links row: Legal + Social ── */}
          <div className="relative flex flex-wrap gap-[60px_30px] items-start justify-center w-full">

            {/* Legal / Policy links */}
            <div className="flex flex-col items-center text-center gap-[24px] flex-1 min-w-[276px] max-w-[320px] md:items-start md:text-left">
              <p
                className="font-heading font-normal text-ink"
                style={{ fontSize: 'clamp(20px, 2vw, 28px)', lineHeight: '32px' }}
              >
                {data.legalTitle}
              </p>
              <div className="flex flex-col gap-[16px] pl-[8px]">
                {data.policyLinks.map(link => {
                  const href = link.href && link.href !== '#' ? link.href : null
                  const style = { fontSize: 'clamp(14px, 1.2vw, 18px)', lineHeight: '18px' }

                  // No page yet: dimmed to 40%, non-clickable, hint on hover/tap.
                  if (!href) {
                    return (
                      <ComingSoonHint key={link.label} label={comingSoon}>
                        <span
                          className="font-sans font-bold text-ink underline opacity-40 pointer-events-none"
                          style={style}
                          aria-disabled="true"
                        >
                          {link.label}
                        </span>
                      </ComingSoonHint>
                    )
                  }

                  return (
                    <a
                      key={link.label}
                      href={href}
                      className="font-sans font-bold text-ink underline"
                      style={style}
                    >
                      {link.label}
                    </a>
                  )
                })}
              </div>
            </div>

            {/* Social icons */}
            {data.socialLinks.length > 0 && (
              <div className="flex flex-1 min-w-[276px] gap-[24px] items-center justify-center">
                {data.socialLinks.map(link => {
                  const url = SOCIAL_URLS[link.label]
                  const icon = (
                    <img
                      src={link.iconUrl}
                      alt={link.label}
                      className="w-full h-full object-contain"
                    />
                  )

                  // Inactive channel: dimmed to 40%, non-clickable, hint on hover/tap.
                  if (!url) {
                    return (
                      <ComingSoonHint
                        key={link.label}
                        label={comingSoon}
                        className="flex-1 aspect-square flex items-center justify-center"
                        style={{ maxWidth: '210px' }}
                      >
                        <span
                          className="block w-full h-full opacity-40 pointer-events-none"
                          aria-label={link.label}
                          aria-disabled="true"
                        >
                          {icon}
                        </span>
                      </ComingSoonHint>
                    )
                  }

                  return (
                    <a
                      key={link.label}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-press flex-1 aspect-square relative"
                      style={{ maxWidth: '210px' }}
                      aria-label={link.label}
                    >
                      {icon}
                    </a>
                  )
                })}
              </div>
            )}
          </div>

          {/* ── Bottom bar: stacked & centered when tight; copyright left / language right (32px gap) when wide ── */}
          <div className="relative flex flex-col items-center gap-y-[20px] w-full sm:flex-row sm:items-center sm:justify-between sm:gap-x-[32px]">
            {/* Copyright */}
            <div className="flex flex-col gap-[0] items-center sm:items-start">
              <p
                className="font-sans font-bold text-ink"
                style={{ fontSize: 'clamp(16px, 2vw, 32px)', lineHeight: '1' }}
              >
                {data.copyright}
              </p>
              <p
                className="font-sans font-bold text-ink"
                style={{ fontSize: 'clamp(16px, 2vw, 32px)', lineHeight: '1' }}
              >
                {data.allRightsReserved}
              </p>
            </div>
            {/* Language selector */}
            <LanguageSwitcher style={{ fontSize: 'clamp(16px, 2vw, 32px)', lineHeight: '1' }} />
          </div>

        </div>

      </div>
    </footer>
  )
}
