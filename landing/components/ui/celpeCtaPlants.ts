import type { CSSProperties } from 'react'

export { decorSrc } from '@/components/ui/heroPlants'

/**
 * The three blooms the CELPE-BRAS CTA is planted with (Figma 3479:44702).
 *
 * All three are the SAME component — `Flower 2 - Become` — placed three times with a
 * per-instance colour override. The art is not re-exported: the files in `decor/` are
 * copies of `Flower 2 - Become.svg` with its four `#BFA028` fills replaced, the same
 * move `Flower 2 - Burger.svg` makes (see burgerArt.ts). Copies rather than one file
 * tinted in CSS because the flower is NOT flat: its big inner petal group carries
 * `mix-blend-mode: multiply` against the rest of the drawing, so a single fill renders
 * as two tones (#7E5226 × #7E5226 = #3E1907 in the core). A `mask-image` + background
 * would collapse that to one flat silhouette; a `filter` would not hold the two tones
 * apart either. Swapping the fill keeps the multiply doing the work.
 *
 * The colours are the only values here that are not tokens — the palette in globals.css
 * has no browns or olives, and these are three one-off tints of a single decorative
 * drawing rather than a surface anything else can be built from.
 *
 * ── Why cqw, and why the centre ──
 *
 * The button is width-driven (it fills the 485px footer column, and the full viewport
 * below `lg`), so its height is whatever the label's clamp plus the padding makes it.
 * Sizing and placing the flowers in `cqw` of the button — the wrapper in CelpeBras.tsx
 * is marked `@container` — keeps the whole arrangement geometrically similar at every
 * width, exactly as heroPlants.ts does for the Hero's anthurium.
 *
 * Each flower is anchored by its CENTRE rather than its box, for two reasons. Rotation
 * and skew are about the centre, so an offset measured to the centre is the one value
 * the transform cannot move; and the centre is the only anchor that stays put when the
 * button's height changes, which it does between the mobile and desktop clamps.
 *
 * ── Where the numbers come from ──
 *
 * Figma draws the button at 618 × 96, centre (309, 48). The design's insets give each
 * instance's axis-aligned box; `dx`/`dy` are that box's centre minus the button's,
 * over 618. `w` is the instance's own (pre-rotation) width over 618 — for the two
 * rotated flowers that is the size inside the rotated wrapper, NOT the bigger box the
 * rotation sweeps out. Height is never written: a width plus `height: auto` takes the
 * file's own aspect, so nothing here can be squashed by the button's proportions.
 *
 * They are ordered as Figma paints them — the brown flower goes over the olive one,
 * the moss flower over both — and all three sit UNDER the label, which is why the
 * button's `<span>` is `relative`.
 *
 * The flowers are children of the button, not siblings: the design clips them to it
 * (`overflow-clip` on the frame), so what shows is the part inside the rounded box.
 */
export type CelpeCtaPlant = {
  /** file in `public/SVG/header/decor` */
  file: string
  /** centre offset from the button's centre, in cqw of the button */
  dx: number
  dy: number
  /** width, in cqw of the button. Height follows the file. */
  w: number
  /** degrees, applied about the flower's centre */
  rotate: number
  skewX: number
}

export const CELPE_CTA_PLANTS: readonly CelpeCtaPlant[] = [
  /* 3479:44704 — hangs into the middle of the bar from above, upright */
  { file: 'Flower 2 - Celpe CTA Olive.svg', dx:   5.176, dy: -11.141, w: 34.951, rotate:   0,     skewX:  0 },
  /* 3479:44710 — the big one, leaning in over the left end */
  { file: 'Flower 2 - Celpe CTA Brown.svg', dx: -37.190, dy:  12.987, w: 46.396, rotate:  50.12,  skewX: -1.72 },
  /* 3479:44715 — right end, tipped back the other way */
  { file: 'Flower 2 - Celpe CTA Moss.svg',  dx:  39.405, dy:   9.760, w: 32.456, rotate: -12.69,  skewX:  0.78 },
]

/**
 * What hovering the button does to the flowers, on the header's own `.pill-decor`
 * timing: the button snaps to size in its 120ms (`.btn-press`) and the greenery keeps
 * easing for another 340, so the bar lands first and the flowers drift out behind it.
 * 1.15 is the header's decor zoom — same gesture, same number.
 *
 * `group-data-tapped` is the finger's half: `:active` lasts as long as the finger is
 * down (~100-150ms), which is shorter than the transition it would be starting, so a
 * tap would buy a twitch. `bloomOnTap` arms `[data-tapped]` for 900ms instead — see
 * tapBloom.ts. Spelled out as one literal string because Tailwind generates rules only
 * for class names it can read literally.
 */
export const CELPE_CTA_ZOOM =
  'pill-decor motion-safe:group-hover/cta:scale-[1.15] motion-safe:group-data-tapped/cta:scale-[1.15]'

/**
 * Where one flower's box has to sit for its centre to land `dx`/`dy` from the button's.
 *
 * `left`/`top` place the centre and the `translate` PROPERTY pulls the box back over it.
 * That split is what lets CELPE_CTA_ZOOM work: the individual properties compose as
 * translate → rotate → scale → `transform`, so a `scale` written by a Tailwind utility
 * grows the flower about its own centre and leaves the −50% anchor alone. Fold the
 * anchor back into the `transform` shorthand and the scale multiplies it instead —
 * the flower drifts up and left by 7.5% of itself every time it grows, which reads as
 * the arrangement coming apart rather than as the art breathing.
 *
 * The rotation and skew stay in `transform`: they run about the untranslated centre,
 * which is what makes `dx`/`dy` independent of the angle.
 *
 * Inline rather than in classes because these are computed values.
 */
export function celpeCtaPlantStyle(p: CelpeCtaPlant): CSSProperties {
  return {
    left: `calc(50% + ${p.dx}cqw)`,
    top: `calc(50% + ${p.dy}cqw)`,
    width: `${p.w}cqw`,
    translate: '-50% -50%',
    transform: `rotate(${p.rotate}deg) skewX(${p.skewX}deg)`,
  }
}
