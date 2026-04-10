import { ComparisonProps } from '@/types'

// ─── Assets ──────────────────────────────────────────────────────────────────
const IMG_TUCAN_PIXEL      = '/comparison/Tucan Pixel.png'
const IMG_STONE_PIXEL      = '/comparison/Stonehead Pixel.png'
const IMG_MARK_TUCAN       = '/comparison/Mark - Tucan.svg'
const IMG_MARK_OTHERS      = '/comparison/Mark - Others.svg'
const IMG_COMPARISON_SYMBOL = '/comparison/Comparison Symbol.svg'

// ─── Icons ───────────────────────────────────────────────────────────────────
function CheckMark() {
  return (
    <img src={IMG_MARK_TUCAN} alt="" aria-hidden="true" width={36} height={36} className="shrink-0 pointer-events-none" />
  )
}

function XMark() {
  return (
    <img src={IMG_MARK_OTHERS} alt="" aria-hidden="true" width={36} height={36} className="shrink-0 pointer-events-none" />
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Comparison({ data }: ComparisonProps) {
  return (
    <section id="comparison" className="w-full">
      <div className="flex flex-col gap-[64px] lg:gap-[100px] items-center max-w-[1720px] mx-auto w-full pt-[80px]">

        {/* ══ Heading ══ */}
        <h2
          className="font-heading font-bold text-ink text-center w-full"
          style={{ fontSize: 'clamp(36px, 5vw, 80px)', lineHeight: '1.1' }}
        >
          {data.heading}
        </h2>

        {/* ══ Blocks row ══ */}
        <div className="flex flex-col lg:flex-row gap-[32px] lg:gap-[48px] items-stretch justify-center w-full">

          {/* ── Tucan block ── */}
          <div
            className="flex flex-col gap-[36px] flex-1 min-w-[300px] lg:max-w-[727px] rounded-[48px] p-[36px] overflow-hidden"
            style={{
              backgroundColor: '#7cb082',
              boxShadow: 'inset 0px 4px 4px 0px rgba(255,255,255,0.25), 0px 2px 4px 0px rgba(0,0,0,0.18)',
            }}
          >
            {/* Block heading */}
            <div className="flex items-center justify-between w-full">
              <p
                className="font-accent font-bold text-cream"
                style={{ fontSize: 'clamp(22px, 2.5vw, 36px)', lineHeight: '1.1' }}
              >
                Наш ТУКАН
              </p>
              <img
                alt=""
                src={IMG_TUCAN_PIXEL}
                className="shrink-0 pointer-events-none"
                style={{ width: '110px', height: '72px', objectFit: 'contain' }}
              />
            </div>

            {/* Features */}
            <ul className="flex flex-col gap-[32px]">
              {data.tucanPros.map((item, i) => (
                <li key={i} className="flex items-center gap-[28px]">
                  <CheckMark />
                  <span
                    className="font-sans font-bold text-cream"
                    style={{ fontSize: 'clamp(24px, 2vw, 32px)', lineHeight: '1.2' }}
                  >
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* ── VS symbol ── */}
          <div className="flex items-center justify-center shrink-0 py-4 lg:py-0">
            <img
              src={IMG_COMPARISON_SYMBOL}
              alt="VS"
              className="pointer-events-none select-none"
              style={{ width: 'clamp(40px, 5vw, 80px)', height: 'auto' }}
            />
          </div>

          {/* ── Others block ── */}
          <div
            className="flex flex-col gap-[36px] flex-1 min-w-[300px] lg:max-w-[727px] rounded-[48px] p-[36px] overflow-hidden"
            style={{
              backgroundColor: '#cccab7',
              boxShadow: 'inset 0px 4px 4px 0px rgba(255,255,255,0.25), 0px 2px 4px 0px rgba(0,0,0,0.18)',
            }}
          >
            {/* Block heading */}
            <div className="flex items-center justify-between w-full">
              <p
                className="font-accent font-bold"
                style={{ fontSize: 'clamp(22px, 2.5vw, 36px)', lineHeight: '1.1', color: '#5b595a' }}
              >
                Обычные скучные школы
              </p>
              <img
                alt=""
                src={IMG_STONE_PIXEL}
                className="shrink-0 pointer-events-none"
                style={{ width: '69px', height: '72px', objectFit: 'contain' }}
              />
            </div>

            {/* Features */}
            <ul className="flex flex-col gap-[32px]">
              {data.schoolCons.map((item, i) => (
                <li key={i} className="flex items-center gap-[28px]">
                  <XMark />
                  <span
                    className="font-sans font-bold"
                    style={{ fontSize: 'clamp(24px, 2vw, 32px)', lineHeight: '1.2', color: '#5b595a' }}
                  >
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* ══ Footer quote ══ */}
        <p
          className="font-accent font-bold text-ink text-center max-w-[874px] w-full"
          style={{ fontSize: 'clamp(22px, 2.5vw, 36px)', lineHeight: '1.15' }}
        >
          {data.summaryText}
        </p>

      </div>
    </section>
  )
}
