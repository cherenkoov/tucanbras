import type { FooterProps, FaqGroup as FaqGroupType } from '@/types'
import LanguageSwitcher from '@/components/LanguageSwitcher'

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

export default function Footer({ data }: FooterProps) {
  return (
    <footer id="footer" className="w-full">
      {/* ══ Outer green container ══ */}
      <div
        className="flex flex-col max-w-[1720px] mx-auto w-full rounded-[38px] p-[12px]"
        style={{ backgroundColor: '#8fd096' }}
      >

        {/* ══ Form card ══ */}
        <div className="relative z-[4] pb-[12px]">
          <form
            className="bg-cream rounded-[26px] p-[36px] flex flex-col gap-[24px]"
            action="#" // TODO: TBD — form submission handler
          >
            {/* Title */}
            <div className="px-[8px]">
              <p
                className="font-heading font-medium text-ink"
                style={{ fontSize: 'clamp(36px, 5vw, 72px)', lineHeight: '1.13' }}
              >
                {data.formTitle}
              </p>
            </div>

            {/* Inputs */}
            <div className="flex flex-col gap-[24px]">
              <label className="border-2 border-[#323031] rounded-[66px] px-[32px] py-[24px] block">
                <input
                  type="text"
                  name="name"
                  placeholder={data.formNamePlaceholder}
                  className="w-full bg-transparent font-heading font-normal text-ink placeholder:text-ink outline-none"
                  style={{ fontSize: 'clamp(20px, 2.5vw, 32px)', lineHeight: '36px' }}
                />
              </label>
              <label className="border-2 border-[#323031] rounded-[66px] px-[32px] py-[24px] block">
                <input
                  type="text"
                  name="telegram"
                  placeholder={data.formTelegramPlaceholder}
                  className="w-full bg-transparent font-heading font-normal text-ink placeholder:text-ink outline-none"
                  style={{ fontSize: 'clamp(20px, 2.5vw, 32px)', lineHeight: '36px' }}
                />
              </label>
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="flex items-center justify-center w-full rounded-[66px] px-[36px] py-[36px]"
              style={{
                backgroundColor: '#323031',
                boxShadow: '0px 1px 4px 0px rgba(0,0,0,0.18), inset 0px 1px 2px 0px rgba(255,255,255,0.18)',
              }}
            >
              <span
                className="font-sans font-bold text-cream"
                style={{ fontSize: 'clamp(20px, 2.5vw, 32px)', lineHeight: '32px' }}
              >
                {data.formSubmitText}
              </span>
            </button>
          </form>
        </div>

        {/* ══ Footer content card ══ */}
        <div
          className="relative z-[2] bg-cream rounded-[26px] overflow-hidden px-[36px] py-[36px] flex flex-col gap-[64px]"
          style={{ boxShadow: '0px 2px 4px 0px rgba(0,0,0,0.18), inset 0px 4px 4px 0px rgba(255,255,255,0.25)' }}
        >

          {/* ── Logo + description ── */}
          <div className="flex flex-wrap items-center justify-center gap-[30px]">
            {/* Logo */}
            <div className="w-full min-h-[140px] lg:min-h-[192px] relative">
              <img
                src={IMG_LOGO}
                alt="TucanBRAS"
                className="absolute inset-0 w-full h-full object-contain object-left"
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
              <div className="flex w-full gap-[24px] items-center justify-center">
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
