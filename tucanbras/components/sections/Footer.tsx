import type { FooterProps, FaqGroup as FaqGroupType } from '@/types'
import LanguageSwitcher from '@/components/ui/LanguageSwitcher'
import FooterForm from '@/components/ui/FooterForm'

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

// className controls wrapper size; SVG fills the wrapper.
function FooterTucan({ className = 'w-[80px] h-[79px] shrink-0' }: { className?: string }) {
  return (
    <div className={`pointer-events-none select-none ${className}`} aria-hidden="true">
      <style>{`
        .tucan-footer-wing {
          transform-box: fill-box;
          transform-origin: 0% 100%;
          animation: tucan-wing-wave 5s ease-in-out infinite;
        }
        .tucan-lid-upper {
          transform-box: fill-box;
          animation: tucan-lid-upper-blink 5s linear 2s infinite backwards;
        }
        .tucan-lid-lower {
          transform-box: fill-box;
          animation: tucan-lid-lower-blink 5s linear 2s infinite backwards;
        }
        @keyframes tucan-wing-wave {
          0%   { transform: rotate(0deg);   }
          20%  { transform: rotate(-18deg); }
          35%  { transform: rotate(-6deg);  }
          55%  { transform: rotate(-22deg); }
          70%  { transform: rotate(-4deg);  }
          100% { transform: rotate(0deg);   }
        }
        @keyframes tucan-lid-upper-blink {
          0%,  40% { transform: translateY(-105%); }
          45%      { transform: translateY(0);      }
          50%, 100%{ transform: translateY(-105%); }
        }
        @keyframes tucan-lid-lower-blink {
          0%,  40% { transform: translateY(105%);  }
          45%      { transform: translateY(0);      }
          50%, 100%{ transform: translateY(105%);  }
        }
        @media (prefers-reduced-motion: reduce) {
          .tucan-footer-wing,
          .tucan-lid-upper,
          .tucan-lid-lower { animation: none; }
        }
      `}</style>
      <svg
        viewBox="0 0 223 219"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full block overflow-visible"
      >
        <defs>
          <clipPath id="tucan-ft-eye-clip">
            <ellipse cx="47.8" cy="71.0" rx="6.1" ry="9.8"/>
          </clipPath>
          <mask id="mask0_ft" style={{ maskType: 'luminance' }} maskUnits="userSpaceOnUse" x="29" y="61" width="37" height="178">
            <path d="M43.3965 61.9006C43.3965 61.9006 84.8286 195.663 53.2641 232.599C21.6999 269.535 30.6949 113.743 30.6949 113.743L43.3965 61.9006Z" fill="white"/>
          </mask>
          <mask id="mask1_ft" style={{ maskType: 'luminance' }} maskUnits="userSpaceOnUse" x="55" y="52" width="83" height="173">
            <path d="M79.7073 52.4012C79.7073 52.4012 103.133 113.154 55.1393 224.332L74.4341 217.175L137.559 128.093L110.481 53.0372L79.7027 52.4031L79.7073 52.4012Z" fill="white"/>
          </mask>
        </defs>

        {/* ── Body ── */}
        <path d="M139.108 200.549C139.108 200.549 132.648 67.9513 27.6253 108.822C27.4131 108.559 -8.47221 142.827 12.4293 178.152C14.1907 181.13 16.2817 184.911 21.0509 186.997L20.8567 183.518C20.8567 183.518 21.1232 185.32 22.1981 185.63C23.273 185.939 22.871 186.19 23.6072 186.5C24.3433 186.809 24.1446 184.823 25.084 186.002C26.0234 187.181 45.1762 187.723 47.6286 219H139.108V200.549Z" fill="#25292B"/>

        {/* ── Wing (animated) ── */}
        <g className="tucan-footer-wing">
          <path d="M128.841 183.095C81.0807 183.041 71.8161 168.051 68.714 129.851C118.409 141.393 165.371 19.1053 171.193 0.814952C173.693 13.815 167.852 44.2623 144.374 81.815C155.352 71.7623 171.193 53.815 190.193 9.31496C191.489 25.815 191.221 46.9794 156.607 80.5936C175.26 70.1185 196.693 42.315 205.693 27.815C202.193 53.315 184.755 70.192 167.693 85.315C189.468 76.536 194.193 73.8677 215.193 48.815C213.693 65.315 183.193 88.815 175.193 96.6732C197.193 86.815 203.755 82.6466 219.193 68.815C215.193 80.5936 210.413 92.1325 177.733 109.315C203.755 100.815 210.843 93.3265 222.693 86.815C215.357 98.8265 209.193 106.144 180.193 119.315C196.193 114.815 192.986 118.132 222.693 102C205.326 119.671 188.878 125.5 178.262 130.315C190.693 129.315 194.193 128.815 208.34 122.276C200.193 134.677 174.413 137.472 173.193 138.315C179.747 137.986 189.193 137.815 203.755 134.677C195.693 141.315 171.693 144.815 171.693 144.815C171.693 144.815 176.193 148.315 188.878 147.501C175.693 153.815 169.148 152.892 169.148 152.892C169.148 152.892 168.693 159.815 178.262 159.081C169.148 164.315 157.22 161.167 157.22 161.167C157.22 161.167 152.193 168.315 158.468 171.496C155.606 176.201 144.374 171.923 144.374 171.923C144.374 171.923 149.48 177.232 147.654 180.184C141.193 177.815 137.821 179.367 137.821 179.367L128.841 183.095Z" fill="#25292B"/>
        </g>

        {/* Head / Top Feathers */}
        <path d="M21.0509 114.58C21.0509 114.58 19.6533 62.1295 56.8915 49.057C94.1314 35.9885 94.7667 72.7702 94.7667 72.7702L95.2769 103.503L21.0509 114.58Z" fill="#282B2E"/>

        {/* Head / Face Oval */}
        <path d="M69.9667 139.838C91.7991 130.984 103.366 110.012 95.8014 92.9969C88.2376 75.9816 64.407 69.366 42.5746 78.2205C20.7422 87.0749 9.17538 108.046 16.7396 125.062C24.3037 142.077 48.1343 148.692 69.9667 139.838Z" fill="#FEF1CA"/>

        {/* Head / Eye Ring */}
        <path d="M97.721 78.0776C96.9096 72.9294 93.2529 69.3144 89.5545 70.0028C85.8552 70.6915 83.5142 75.4234 84.3256 80.5715C85.1371 85.7197 88.7936 89.3349 92.4927 88.6461C96.192 87.9573 98.5324 83.2259 97.721 78.0776Z" fill="#D55C27"/>

        {/* Head / Beak Ridge */}
        <path d="M52.3782 71.4802C53.4904 66.2674 52.1671 61.7716 49.4223 61.4385C46.6776 61.1053 43.5508 65.061 42.4386 70.2738C41.3263 75.4866 42.6496 79.9824 45.3944 80.3155C48.1391 80.6486 51.2659 76.693 52.3782 71.4802Z" fill="#D55C27"/>

        {/* Eye / Iris */}
        <path d="M51.6293 72.5453C52.4819 68.2192 51.3638 64.4659 49.132 64.1621C46.9001 63.8584 44.3997 67.1191 43.547 71.4453C42.6944 75.7714 43.8125 79.5246 46.0443 79.8283C48.2762 80.132 50.7766 76.8714 51.6293 72.5453Z" fill="#3166B1"/>

        {/* Eye / Pupil */}
        <path d="M44.5846 71.5338C43.9659 74.6776 45.0718 77.3435 47.0049 77.7084C49.8461 78.2448 51.0498 75.6434 51.6685 72.4996C52.2872 69.3558 52.0077 66.3686 49.2482 66.3251C47.2632 66.295 45.2033 68.39 44.5846 71.5338Z" fill="#1E1617"/>

        {/* Eye / Highlight */}
        <path d="M46.8616 71.8792C46.939 71.4218 46.6935 71.0171 46.3131 70.9751C45.9329 70.9332 45.5619 71.2699 45.4845 71.7272C45.4072 72.1844 45.6527 72.5892 46.033 72.6311C46.4132 72.6731 46.7843 72.3364 46.8616 71.8792Z" fill="#FBFADF"/>

        {/* Eye / Brow Detail */}
        <path d="M47.2847 69.7801C47.2847 69.7801 47.9386 67.4526 49.3344 67.1125C49.3344 67.1125 48.5193 66.5618 47.3772 67.7586C46.2352 68.9554 45.5384 70.3868 46.3302 70.5272C47.1219 70.6674 47.289 69.7784 47.289 69.7784L47.2847 69.7801Z" fill="#FBFADF"/>

        {/* Eyelids (animated blink) — above Eye layers, below Head/Upper Beak Outline */}
        <g clipPath="url(#tucan-ft-eye-clip)">
          <g className="tucan-lid-upper">
            <path d="M41.3 70.9 A 6.1 9.8 0 0 1 53.5 70.9 Z" fill="#D55C27"/>
          </g>
        </g>
        <g clipPath="url(#tucan-ft-eye-clip)">
          <g className="tucan-lid-lower">
            <path d="M41.3 70.9 A 6.1 9.8 0 0 0 53.5 70.9 Z" fill="#D55C27"/>
          </g>
        </g>

        {/* Head / Upper Beak Outline */}
        <path fillRule="evenodd" clipRule="evenodd" d="M46.8163 87.346L46.8184 87.3469L46.8143 87.3488L46.8163 87.346ZM46.8163 87.346L66.396 61.3746C66.396 61.3746 45.5016 52.9997 41.6358 68.3636C37.8084 83.5893 46.659 87.2817 46.8163 87.346ZM42.6879 76.1258C41.1637 68.3815 45.6355 61.5036 48.6523 61.8894C51.6691 62.2753 54.009 71.193 50.2204 76.8407C46.4318 82.4885 43.3012 79.1047 42.6879 76.1258Z" fill="#F79235"/>

        {/* Beak / Main */}
        <path d="M51.0358 117.033L48.1454 104.909C48.1454 104.909 45.4593 96.2308 49.206 86.0742C52.9528 75.9177 65.9763 65.1178 65.9763 65.1178C65.9763 65.1178 75.4093 59.0959 82.9977 59.7001C90.5815 60.3062 92.5694 65.5855 92.5694 65.5855L93.5026 70.3053C93.5026 70.3053 97.1108 101.807 90.9155 138.429C84.7158 175.053 75.8885 208.323 58.485 217.139C58.485 217.139 62.4047 177.435 57.3247 148.482C52.2449 119.528 51.0358 117.033 51.0358 117.033Z" fill="#F79138"/>

        {/* Beak / Left Side */}
        <g mask="url(#mask0_ft)">
          <path d="M51.0407 116.814L48.1503 104.69C48.1503 104.69 45.4642 96.0116 49.2109 85.8551C52.9578 75.6986 65.9813 64.8986 65.9813 64.8986C65.9813 64.8986 75.4142 58.8768 83.0028 59.481C90.5865 60.087 92.5744 65.3663 92.5744 65.3663L93.5076 70.0861C93.5076 70.0861 97.1157 101.588 90.9204 138.21C84.7208 174.834 75.8935 208.104 58.49 216.92C58.49 216.92 62.4097 177.216 57.3297 148.263C52.2498 119.309 51.0407 116.814 51.0407 116.814Z" fill="#D05427"/>
        </g>

        {/* Beak / Right Side */}
        <g mask="url(#mask1_ft)">
          <path d="M51.0608 117.105L48.1703 104.981C48.1703 104.981 45.4843 96.3028 49.2311 86.1463C52.9778 75.9898 66.0013 65.1898 66.0013 65.1898C66.0013 65.1898 75.4343 59.1679 83.0226 59.7722C90.6064 60.3783 92.5943 65.6576 92.5943 65.6576L93.5275 70.3773C93.5275 70.3773 97.1358 101.879 90.9406 138.501C84.7408 175.125 75.9134 208.395 58.5099 217.211C58.5099 217.211 62.4297 177.507 57.3498 148.554C52.2699 119.6 51.0608 117.105 51.0608 117.105Z" fill="#F47530"/>
        </g>

        {/* Beak / Tip Dot */}
        <path opacity="0.64" d="M58.4865 217.143C58.4865 217.143 60.1106 215.87 62.2212 163.534C63.7738 125.034 76.842 153.936 76.9179 164.18C76.9943 174.424 75.0576 201.909 58.4865 217.143Z" fill="#25292B"/>

        {/* Beak / Rim */}
        <path d="M51.5371 118.754C51.5371 118.754 44.9263 94.781 54.7324 77.9083C64.6879 60.7719 87.6474 53.5319 93.5034 70.3044L93.3207 69.4788C93.3207 69.4788 94.4166 56.517 81.3139 56.7511C68.2093 56.9907 62.8046 63.801 58.4336 67.5301C54.0567 71.2569 44.067 87.835 44.9725 96.6217C45.8763 105.404 46.2325 108.739 51.5414 118.752L51.5371 118.754Z" fill="#282B2E"/>
      </svg>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Footer({ data, tutors, planNames, locale }: FooterProps) {
  return (
    <footer id="footer" className="w-full scroll-mt-[136px] lg:scroll-mt-[147px]">
      {/* ══ Outer green container ══ */}
      <div
        className="flex flex-col max-w-[1720px] mx-auto w-full rounded-[38px] p-[12px]"
        style={{ backgroundColor: '#8fd096' }}
      >

        {/* ══ Form + Tucan row ══ */}
        <div className="relative z-[4] pb-[12px] flex flex-col lg:flex-row gap-[12px]">

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

          {/* Tucan: 40% on desktop only */}
          <div className="hidden lg:flex lg:flex-[4] items-end justify-center">
            <FooterTucan className="w-full h-auto" />
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
