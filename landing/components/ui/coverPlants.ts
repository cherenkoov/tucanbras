import type { CSSProperties } from 'react'

/**
 * The plants the header bar wears, and where each one sits.
 *
 * They used to be mapped onto the plate: one window onto the hand-off, drawn with
 * `preserveAspectRatio="none"` so the art took the plate's own squash. That keeps a
 * plant welded to the outline it decorates, and it means every plant is stretched by
 * whatever the bar's width happens to be — the wider the screen, the flatter the
 * leaves. So they are placed instead: each file is drawn at its OWN aspect, sized off
 * the one dimension of the bar that does not move (its height), and pinned to an
 * edge. Widening the window now walks the plants apart instead of pulling them wider.
 *
 * Every number below is in BAR HEIGHTS, not pixels — that is what makes one table
 * serve both the 85px phone bar and the 96px desktop one, and what keeps a plant the
 * same size relative to the bar on either.
 */
export type PlantRole = 'left' | 'mid' | 'right'

export type Plant = {
  /** file in `public/SVG/header/decor` */
  file: string
  /** which way it leans when the pointer is on the plate; `mid` only grows */
  role: PlantRole
  /** the edge it is pinned to, and therefore what it does when the bar resizes */
  anchor: 'left' | 'centre' | 'right'
  /** height, in bar heights. Width follows from the file — nothing is stretched. */
  h: number
  /**
   * How far past its anchor the art hangs, in bar heights. Positive is INWARD (away
   * from that edge), so a negative number lets a plant overhang the bar and be
   * clipped by the plate, which is how most of them are framed.
   */
  dx: number
  /**
   * Where the art's bottom edge sits, in bar heights BELOW the bar's own bottom.
   * The plants are far taller than the bar — this is the knob that chooses which
   * band of a plant the bar shows.
   */
  drop: number
}

/**
 * Desktop: one plant in the bottom-left corner and one across the middle. The
 * right-hand plant (`Flower 4 - Cover.svg`) was dropped by design — the file is still
 * in `decor/` if it is ever wanted back.
 *
 * The middle plant's `drop` is 80px above where it was placed originally
 * (3.10 − 80/96 bar heights), which is what shows the band of it the design asks for.
 */
export const COVER_DESKTOP: readonly Plant[] = [
  { file: 'Flower 1 - Cover.svg', role: 'left',  anchor: 'left',   h: 7.32, dx: -1.53, drop: 4.10 },
  { file: 'Flower 2 - Cover.svg', role: 'mid',   anchor: 'centre', h: 4.00, dx:  0.60, drop: 2.27 },
]

/**
 * Phone: two plants, one per bottom corner. The bar is a third of the width and the
 * middle is where the logotype sits, so the third plant has nowhere to be.
 */
export const COVER_MOBILE: readonly Plant[] = [
  { file: 'Flower 1 - Cover.svg', role: 'left',  anchor: 'left',  h: 3.60, dx: -0.70, drop: 1.90 },
  { file: 'Flower 2 - Cover.svg', role: 'right', anchor: 'right', h: 3.10, dx: -0.40, drop: 2.05 },
]

/**
 * The bar's own height at each breakpoint — `h-[85px] lg:h-[96px]` in Header.tsx.
 * Spelled twice because Tailwind reads class names literally and cannot be handed a
 * constant; `verify:header-hover` checks the rendered bar against these.
 */
export const BAR_H = { mobile: 85, desktop: 96 } as const

/**
 * A plant's box, in px, for a bar `u` tall.
 *
 * `width: auto` is doing the work: an <img> is a replaced element, so with a height
 * and no width it takes the file's own aspect ratio — the art can never be squashed,
 * whatever happens to the bar. `max-width: none` because preflight's `max-width:100%`
 * would otherwise clamp a plant wider than the bar back into it (see pillArt.ts).
 *
 * Centring is done with `left`/`right` + auto margins rather than a transform: the
 * hover writes the `scale` property, and a transform on the same element would be
 * scaled by it — the plant would jump sideways as it grew.
 */
export function plantBox(p: Plant, u: number): CSSProperties {
  const base: CSSProperties = {
    position: 'absolute',
    height:   p.h * u,
    width:    'auto',
    maxWidth: 'none',
    bottom:   -p.drop * u,
  }
  if (p.anchor === 'left')  return { ...base, left:  p.dx * u }
  if (p.anchor === 'right') return { ...base, right: p.dx * u }
  // Both edges pinned and the margins auto centres a replaced element between them;
  // moving one edge by 2n therefore moves the centre by n.
  return { ...base, left: 2 * p.dx * u, right: 0, marginInline: 'auto' }
}
