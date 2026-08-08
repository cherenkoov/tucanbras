'use client'

import { CELPE_CTA_PLANTS, CELPE_CTA_ZOOM, celpeCtaPlantStyle, decorSrc } from '@/components/ui/celpeCtaPlants'
import { bloomOnTap } from '@/components/ui/tapBloom'

/**
 * The section's CTA — a dark bar with three flowers clipped into it (Figma 3479:44702).
 *
 * Its own component, and the only client boundary in CELPE-BRAS: the flowers answer to
 * the button the way the header's plants answer to their pill, and the phone's half of
 * that (`bloomOnTap`) is an event handler. Keeping it here leaves CelpeBras.tsx a server
 * component.
 *
 * The wrapper is the `@container`, not the button: `container-type: inline-size` makes
 * an element's width independent of its contents, which on the button itself would take
 * away the `w-auto` that lets it fill the column.
 */
export default function CelpeBrasCta({ ctaText }: { ctaText: string }) {
  return (
    <div className="@container w-full">
      <a
        href="#footer"
        onPointerDown={bloomOnTap}
        className="group/cta btn-press relative flex items-center justify-center overflow-hidden rounded-card bg-ink px-s400 w-full lg:w-auto lg:min-w-[400px]"
        style={{
          paddingTop: 'var(--spacing-s800)',
          paddingBottom: 'var(--spacing-s800)',
          boxShadow: 'var(--shadow-btn)',
        }}
      >
        {/* Декор — обрезается рамкой кнопки (overflow-hidden) и лежит ПОД подписью:
            цветы абсолютные, поэтому подпись поднимается над ними своим relative.
            max-w-none защищает от preflight-правила `max-width: 100%`, которое иначе
            бьёт ширину в cqw и сдвигает цветок. */}
        {CELPE_CTA_PLANTS.map((plant) => (
          <img
            key={plant.file}
            src={decorSrc(plant.file)}
            alt=""
            aria-hidden
            className={`absolute h-auto max-w-none select-none pointer-events-none ${CELPE_CTA_ZOOM}`}
            style={celpeCtaPlantStyle(plant)}
          />
        ))}

        {/* Подпись мерится в тех же cqw, что и цветы: 48px на кнопке 618px в Figma =
            7.767cqw, поэтому вся композиция масштабируется одним числом, а не
            разъезжается (vw-клэмп упирался в свой минимум на любом реальном экране). */}
        <span
          className="relative font-accent text-center text-cream"
          style={{ fontSize: 'clamp(24px, 7.767cqw, 48px)', lineHeight: '1', letterSpacing: '0.1em' }}
        >
          {ctaText}
        </span>
      </a>
    </div>
  )
}
