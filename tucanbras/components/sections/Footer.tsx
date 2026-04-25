import type { FooterProps, FaqGroup as FaqGroupType } from '@/types'
import LanguageSwitcher from '@/components/ui/LanguageSwitcher'
import FooterForm from '@/components/ui/FooterForm'
import FooterTucan from '@/components/ui/FooterTucan'

// ─── Assets ──────────────────────────────────────────────────────────────────
const IMG_LOGO      = '/footer/TUCANBRAS.svg'
const IMG_SOCIAL_TG = '/footer/telegram.svg'
const IMG_SOCIAL_IG = '/footer/instagram.svg'
const IMG_SOCIAL_YT = '/footer/youtube.svg'
// Arrow icon (bxs:up-arrow). Base state = up, closed accordion = rotate-180 (down).
const ICON_ARROW    = '/footer/arrow.svg'

// ─── Sub-components ───────────────────────────────────────────────────────────

function FaqAccordion({ group }: { group: FaqGroupType }) {
  return (
    <div className="flex flex-col gap-[24px] flex-1 min-w-[276px] max-w-[320px]">
      {/* Group heading */}
      <p
        className="font-heading font-normal text-ink"
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

export default function Footer({ data, tutors, planNames, locale }: FooterProps) {
  return (
    <footer id="footer" className="w-full scroll-mt-[136px] lg:scroll-mt-[147px]">
      {/* ══ Outer green container ══ */}
      <div
        className="relative isolate flex flex-col max-w-[1720px] mx-auto w-full rounded-[38px] p-[12px]"
        style={{ backgroundColor: '#8fd096' }}
      >

        {/* ══ Form row ══ */}
        <div className="relative pb-[12px] flex flex-col lg:flex-row gap-[12px]">

          {/* Form: 60% on desktop, full width on mobile */}
          <div className="lg:flex-[6] min-w-0">
            <FooterForm
              formTitle={data.formTitle}
              formNamePlaceholder={data.formNamePlaceholder}
              formTutorPlaceholder={data.formTutorPlaceholder}
              formPlanPlaceholder={data.formPlanPlaceholder}
              formTelegramPlaceholder={data.formTelegramPlaceholder}
              formEmailPlaceholder={data.formEmailPlaceholder}
              formContactError={data.formContactError}
              formEmailError={data.formEmailError}
              formErrorMsg={data.formErrorMsg}
              formSubmitText={data.formSubmitText}
              tutors={tutors}
              planNames={planNames}
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

        {/* ══ Footer content card ══ */}
        <div
          className="relative z-[2] bg-cream rounded-[26px] overflow-hidden px-[36px] py-[36px] flex flex-col gap-[64px]"
          style={{ boxShadow: '0px 2px 4px 0px rgba(0,0,0,0.18), inset 0px 4px 4px 0px rgba(255,255,255,0.25)' }}
        >

          {/* ── Logo + description ── */}
          <div className="flex flex-wrap items-center justify-center gap-[30px]">
            {/* Logo */}
            <div className="flex-1 min-w-[280px]">
              <img
                src={IMG_LOGO}
                alt="TucanBRAS"
                className="w-full h-auto"
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
            <div className="flex flex-wrap gap-[24px_16px] items-start justify-center w-full">
              {data.faqGroups.map((group, i) => (
                <FaqAccordion key={i} group={group} />
              ))}
            </div>
          )}

          {/* ── Links row: Legal + Social ── */}
          <div className="flex flex-wrap gap-[60px_30px] items-start justify-center w-full">

            {/* Legal / Policy links */}
            <div className="flex flex-col gap-[24px] flex-1 min-w-[276px] max-w-[320px]">
              <p
                className="font-heading font-normal text-ink"
                style={{ fontSize: 'clamp(20px, 2vw, 28px)', lineHeight: '32px' }}
              >
                {data.legalTitle}
              </p>
              <div className="flex flex-col gap-[16px] pl-[8px]">
                {data.policyLinks.map(link => (
                  <a
                    key={link.label}
                    href={link.href} // TODO: TBD — final URLs
                    className="font-sans font-bold text-ink underline"
                    style={{ fontSize: 'clamp(14px, 1.2vw, 18px)', lineHeight: '18px' }}
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            </div>

            {/* Social icons */}
            {data.socialLinks.length > 0 && (
              <div className="flex flex-1 min-w-[276px] gap-[24px] items-center justify-center">
                {data.socialLinks.map(link => (
                  <a
                    key={link.label}
                    href={link.href} // TODO: TBD — final URLs
                    className="flex-1 aspect-square relative"
                    style={{ maxWidth: '210px' }}
                    aria-label={link.label}
                  >
                    <img
                      src={link.iconUrl}
                      alt={link.label}
                      className="w-full h-full object-contain"
                    />
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* ── Bottom bar: copyright + language ── */}
          <div className="flex flex-wrap gap-y-[20px] items-center justify-between w-full">
            {/* Copyright */}
            <div className="flex flex-col gap-[8px]">
              <p
                className="font-sans font-bold text-ink"
                style={{ fontSize: 'clamp(16px, 2vw, 32px)', lineHeight: '36px' }}
              >
                {data.copyright}
              </p>
              <p
                className="font-sans font-bold text-ink"
                style={{ fontSize: 'clamp(16px, 2vw, 32px)', lineHeight: '36px' }}
              >
                {data.allRightsReserved}
              </p>
            </div>
            {/* Language selector */}
            <LanguageSwitcher style={{ fontSize: 'clamp(16px, 2vw, 32px)', lineHeight: '36px' }} />
          </div>

        </div>

      </div>
    </footer>
  )
}
