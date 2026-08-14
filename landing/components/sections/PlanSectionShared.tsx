'use client'

import { useEffect, useState } from 'react'
import { scrollToElement } from '@/components/ui/AnchorScrollHandler'
import { uiLabels } from '@/lib/uiLabels'
import { bloomOnTap } from '@/components/ui/tapBloom'
import PlanDecor from '@/components/ui/PlanDecor'
import type { PlanCard } from '@/types'

export const BG = [
  '/SVG/plans/cover-1.svg',
  '/SVG/plans/cover-2.svg',
  '/SVG/plans/cover-3.svg',
  '/SVG/plans/cover-4.svg',
]

const MOBILE_BG = [
  '/SVG/plans/cover-mobile-1.svg',
  '/SVG/plans/cover-mobile-2.svg',
  '/SVG/plans/cover-mobile-3.svg',
  '/SVG/plans/cover-mobile-4.svg',
]

const ICON_CHECK = '/SVG/marks/Mark%20-%20Positive.svg'

// Кнопка «Попробовать» (тариф 1): декоративные цветы из Figma 3483:45258
// (инстансы 3510:46024-26; поворот двух из них запечён в экспорт). В каждый
// ассет запечена подложка #8FD096 (= CONFIG[0].accent), чтобы multiply-тень
// цветка умножалась на цвет кнопки, как в макете. Сменится акцент первого
// тарифа — перегенерить ассеты.
// Цветы — ПОЛНЫЕ (не обрезанные по краю макетной кнопки): торчат за края, а
// живой overflow-hidden кнопки сам обрезает их на любой ширине — иначе на узкой
// кнопке линия обреза оказывалась посреди кнопки. Координаты — getBBox()
// контента в системе макетной кнопки 466×99; % = значение/466. Кнопка уже 466 →
// цветы сжимаются пропорционально ей (для отрицательных смещений min/max
// меняются местами), шире — замирают на макетных пикселях, чтобы не
// разрастаться относительно текста. Вертикаль — через margin-top/-bottom:
// их % считается от ШИРИНЫ контейнера, что даёт равномерный масштаб по осям.
const TRY_FLOWERS = [
  { src: '/SVG/plans/try-flower-top.svg',   pos: { left: 'calc(50% - min(74px, 15.879%))', top: 0, marginTop: 'max(-51px, -10.944%)', width: 'min(119px, 25.536%)', aspectRatio: '119 / 121' } },
  { src: '/SVG/plans/try-flower-left.svg',  pos: { left: 'max(-105.5px, -22.639%)', top: 0, marginTop: 'min(6.5px, 1.395%)', width: 'min(232px, 49.785%)', aspectRatio: '232 / 210' } },
  { src: '/SVG/plans/try-flower-right.svg', pos: { right: 'max(-12.5px, -2.682%)', bottom: 0, marginBottom: 'max(-29.5px, -6.331%)', width: 'min(111px, 23.82%)', aspectRatio: '111 / 113' } },
]

export const CONFIG = [
  { featuresFirst: true,  textCream: false, mobileTextCream: false, accent: '#8FD096', btnText: null      },
  { featuresFirst: false, textCream: true,  mobileTextCream: true,  accent: '#FFFCE5', btnText: '#7CB082' },
  { featuresFirst: true,  textCream: false, mobileTextCream: false, accent: '#2E67B2', btnText: '#FFD376' },
  { featuresFirst: false, textCream: true,  mobileTextCream: true,  accent: '#FFD376', btnText: '#F69137' },
]

function FeatureRow({ text, textCream, mobileTextCream, accent }: {
  text: string
  textCream: boolean
  mobileTextCream: boolean
  accent: string
}) {
  const colorClass = [
    mobileTextCream ? 'text-cream' : 'text-ink',
    textCream       ? 'lg:text-cream' : 'lg:text-ink',
  ].join(' ')

  return (
    <div className="flex items-center gap-[16px] px-[8px]">
      <div
        className="shrink-0 w-[32px] h-[36px]"
        style={{
          backgroundColor: accent,
          WebkitMaskImage: `url(${ICON_CHECK})`,
          WebkitMaskSize: 'contain',
          WebkitMaskRepeat: 'no-repeat',
          WebkitMaskPosition: 'center',
          maskImage: `url(${ICON_CHECK})`,
          maskSize: 'contain',
          maskRepeat: 'no-repeat',
          maskPosition: 'center',
        }}
      />
      <span
        className={`font-sans font-bold ${colorClass}`}
        style={{ fontSize: 'clamp(16px, 1.5vw, 24px)', lineHeight: '1.2' }}
      >
        {text}
      </span>
    </div>
  )
}

export function PlanSection({ plan, index, locale }: { plan: PlanCard; index: number; locale: string }) {
  const cfg    = CONFIG[index]
  const isLast = index === 3
  const L      = uiLabels(locale)

  // Выбор живёт в глобальном `plan-selected` (его же слушает FooterForm), а не в
  // локальном стейте: одна и та же карточка рендерится дважды (десктоп + мобильный
  // стек), и выбор в футере тоже должен гасить надпись на остальных карточках.
  const [selected, setSelected] = useState(false)

  useEffect(() => {
    const onPlanSelected = (e: Event) => {
      setSelected((e as CustomEvent<string>).detail === plan.name)
    }
    window.addEventListener('plan-selected', onPlanSelected)
    return () => window.removeEventListener('plan-selected', onPlanSelected)
  }, [plan.name])

  const handleCtaClick = () => {
    // Диспатч синхронный — слушатель выше поднимет `selected` до скролла к футеру.
    window.dispatchEvent(new CustomEvent('plan-selected', { detail: plan.name }))
    const footer = document.getElementById('footer')
    if (footer) scrollToElement(footer)
  }

  const priceColor = [
    cfg.mobileTextCream ? 'text-cream' : 'text-ink',
    cfg.textCream       ? 'lg:text-cream' : 'lg:text-ink',
  ].join(' ')

  const rowClass = cfg.featuresFirst ? 'flex-col lg:flex-row-reverse' : 'flex-col lg:flex-row'

  return (
    <div
      data-glass-center
      /* Тап взводит `[data-tapped]` на 900ms — на телефоне это стенд-ин для hover, к
         которому обращается декор плашки (см. ZOOM_PLATE в PlanDecor). Мышь тут no-op. */
      onPointerDown={bloomOnTap}
      className={`group relative px-[32px] py-[64px] w-full overflow-hidden rounded-[28px] lg:overflow-visible lg:rounded-none ${isLast ? '' : 'mb-[-48px]'}`}
    >
      {/*
        Frost layer — DESKTOP-ONLY backdrop-blur clipped to the plate silhouette
        via the SVG mask. Kept SEPARATE from the colored layer because element
        `opacity` on a backdrop-filter element breaks the mask clip and leaks a
        square halo at the corners; this layer carries no opacity, only the
        blur + mask. The mobile twin is removed on purpose: phone compositors
        pay element-size × DPR buffers per backdrop-filter and were crashing.
        Blur не транзишенится (снимается мгновенно) — анимация радиуса
        перефильтровывает весь backdrop-буфер каждый кадр.
      */}
      <div
        aria-hidden
        className="hidden lg:block absolute inset-0 pointer-events-none backdrop-blur-[4px] group-hover:backdrop-blur-none group-[.is-center]:backdrop-blur-none"
        style={{
          WebkitMaskImage: `url(${BG[index]})`,
          WebkitMaskSize: '100% 100%',
          WebkitMaskRepeat: 'no-repeat',
          maskImage: `url(${BG[index]})`,
          maskSize: '100% 100%',
          maskRepeat: 'no-repeat',
        }}
      />
      {/* Mobile SVG colored plate (custom notch shape); transparent notch reveals card below — translucent, solid on hover */}
      <div
        className="lg:hidden absolute inset-0 opacity-80 group-hover:opacity-100 group-[.is-center]:opacity-100 transition-opacity duration-[600ms]"
        style={{
          backgroundImage: `url(${MOBILE_BG[index]})`,
          backgroundSize: '100% 100%',
          backgroundRepeat: 'no-repeat',
        }}
      />
      {/* Desktop SVG colored plate (custom notch shape + preserveAspectRatio="none"); translucent, solid on hover */}
      <div
        className="hidden lg:block absolute inset-0 opacity-80 group-hover:opacity-100 group-[.is-center]:opacity-100 transition-opacity duration-[600ms]"
        style={{
          backgroundImage: `url(${BG[index]})`,
          backgroundSize: '100% 100%',
          backgroundRepeat: 'no-repeat',
        }}
      />

      {/* Декор плашки — над окрашенной плашкой, под контентом; клип по её силуэту */}
      {/* Две композиции декора плашки: у мобилки свой макет (Price List 3498:46099), а не
          пересчёт десктопной. Обе в разметке, выбор — брейкпоинтом внутри PlanDecor. */}
      <PlanDecor plan={index} slot="plate" mask={{ mobile: MOBILE_BG[index], desktop: BG[index] }} />
      <PlanDecor plan={index} slot="plate" variant="mobile" mask={{ mobile: MOBILE_BG[index], desktop: BG[index] }} />

      <div className={`relative z-10 flex ${rowClass} items-center justify-between gap-[0px] w-full`}>

        <div className={`flex flex-col items-center ${cfg.featuresFirst ? 'lg:items-end' : 'lg:items-start'} shrink-0 lg:flex-1`}>
          <p
            className={`font-sans font-semibold w-full ${cfg.mobileTextCream ? 'text-cream' : 'text-ink'} ${cfg.textCream ? 'lg:text-cream' : 'lg:text-ink'} text-center ${cfg.featuresFirst ? 'lg:text-right' : 'lg:text-left'}`}
            style={{ fontSize: 'clamp(18px, 1.8vw, 32px)', lineHeight: '1.15' }}
          >
            {plan.name}
          </p>

          {/*
            Цена идёт в тон колонке: у карточек с featuresFirst колонка уезжает
            вправо (flex-row-reverse), и цена/период должны прижиматься к правому
            краю. text-* тут недостаточно — на lg это flex-колонка, спаны сжаты по
            контенту, поэтому выравнивает именно items-*.
            Flex и на мобилке (там ряд, wrap как у прежних инлайн-спанов) — иначе
            gap между ценой и периодом не к чему применить.
            my-[16px] — отступы до имени плана сверху и подзаголовка снизу.
          */}
          <div className={`flex flex-wrap justify-center items-baseline gap-[4px] my-[16px] text-center lg:flex-col lg:flex-nowrap ${cfg.featuresFirst ? 'lg:text-right lg:items-end' : 'lg:text-left lg:items-start'} ${priceColor}`}>
            <span className="font-heading font-bold" style={{ fontSize: 'clamp(40px, 5vw, 80px)', lineHeight: '1.1' }}>
              {plan.priceAmount}
            </span>
            <span className="font-heading font-bold" style={{ fontSize: 'clamp(40px, 5vw, 80px)', lineHeight: '1.1' }}>
              {plan.pricePeriod}
            </span>
          </div>

          <p
            className={`font-sans font-semibold w-full text-center ${cfg.featuresFirst ? 'lg:text-right' : 'lg:text-left'} ${cfg.mobileTextCream ? 'text-cream' : 'text-ink'} ${cfg.textCream ? 'lg:text-cream' : 'lg:text-ink'}`}
            style={{ fontSize: 'clamp(14px, 1.2vw, 21px)', lineHeight: '1.2' }}
          >
            {plan.subtitle}
          </p>
        </div>

        <div className="flex flex-col gap-[32px] shrink-0 lg:flex-1 w-full lg:w-auto mt-[32px] lg:mt-0">
          <div className="flex flex-col gap-[24px]">
            {plan.features.map(f => (
              <FeatureRow
                key={f}
                text={f}
                textCream={cfg.textCream}
                mobileTextCream={cfg.mobileTextCream}
                accent={cfg.accent}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={handleCtaClick}
            aria-pressed={selected}
            /* `relative` — контейнер для слоя декора: без него `absolute inset-0`
               отсчитывается от ближайшего позиционированного предка, и лист рисуется
               размером с колонку, а не с кнопку. На вид самой кнопки не влияет. */
            /* `group/btn` — своё имя группы: листья внутри кнопки должны отвечать на
               наведение НА КНОПКУ, а не на карточку целиком. Тап взводится тем же
               bloomOnTap; он всплывает и до карточки, поэтому плашка отвечает заодно. */
            onPointerDown={bloomOnTap}
            className="btn-press group/btn relative flex items-center justify-center w-full overflow-hidden rounded-[28px] cursor-pointer"
            style={{
              backgroundColor: cfg.accent,
              paddingTop: '32px',
              paddingBottom: '32px',
              paddingLeft: '16px',
              paddingRight: '16px',
              // У первого тарифа inner-shadow уезжает в оверлей ПОВЕРХ цветов
              // (в Figma эффекты кнопки рисуются над детьми).
              boxShadow: index === 0
                ? '0px 1px 4px 0px rgba(0,0,0,0.18)'
                : '0px 1px 4px 0px rgba(0,0,0,0.18), inset 0px 1px 2px 0px rgba(255,255,255,0.18)',
            }}
          >
            {/* Кнопка первого тарифа — СВОЯ композиция (`TRY_FLOWERS` выше), а не общий
                слой `PlanDecor`: у неё цветы поверх плиты по узлу 3483:45258, с запечённой
                подложкой акцента под multiply-тени. Прежние срезы `p0-btn-*` из таблицы
                убраны — иначе на кнопке рисовались бы обе композиции сразу. */}
            {index === 0
              ? TRY_FLOWERS.map(f => (
                <div
                  key={f.src}
                  aria-hidden
                  className="absolute pointer-events-none"
                  style={{
                    ...f.pos,
                    backgroundImage: `url(${f.src})`,
                    backgroundSize: '100% 100%',
                    backgroundRepeat: 'no-repeat',
                  }}
                />
              ))
              : <PlanDecor plan={index} slot="button" />}

            {/* `relative` — иначе абсолютный слой декора нарисуется поверх лейбла */}
            <span
              className="relative font-sans font-bold text-center"
              style={{ fontSize: 'clamp(24px, 2.5vw, 48px)', lineHeight: '32px', color: cfg.btnText ?? 'var(--color-cream)' }}
            >
              {selected ? L.planSelected : plan.ctaText}
            </span>
            {index === 0 && (
              <div
                aria-hidden
                className="absolute inset-0 pointer-events-none rounded-[inherit]"
                style={{ boxShadow: 'inset 0px 1px 2px 0px rgba(255,255,255,0.18)' }}
              />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
