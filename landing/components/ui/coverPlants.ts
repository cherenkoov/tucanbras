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
  /**
   * Which of the bar's horizontal edges the plant hangs off: `bottom` grows up out
   * of the bar's floor, `top` hangs down from its ceiling. It is also what `hang`
   * is measured from.
   */
  vAnchor: 'top' | 'bottom'
  /** height, in bar heights. Width follows from the file — nothing is stretched. */
  h: number
  /**
   * How far past its anchor the art hangs, in bar heights. Positive is INWARD (away
   * from that edge), so a negative number lets a plant overhang the bar and be
   * clipped by the plate, which is how most of them are framed.
   *
   * For a `centre` anchor there is no edge to be inward of: it is simply how far
   * the art's own centre sits to the right of the bar's.
   */
  dx: number
  /**
   * How far the art hangs PAST its vertical edge, in bar heights: for `bottom`, how
   * far BELOW the bar's bottom its own bottom edge lands; for `top`, how far ABOVE
   * the bar's top its own top edge lands. The plants are far taller than the bar —
   * this is the knob that chooses which band of a plant the bar shows.
   *
   * The two are mirror images of each other: the same number read off the opposite
   * edge frames the same band of the file, upside down. Which is why a `flipY` plant
   * moved from one edge to the other keeps its number and keeps its composition.
   */
  hang: number
  /**
   * Mirrored top-to-bottom before it is placed — the design's «перевернуть по оси X
   * на 180°», written as the `scaleY(-1)` it renders as rather than `rotateX(180deg)`:
   * identical pixels without opening a 3D context.
   */
  flipY?: boolean
}

/**
 * Desktop: one plant growing out of the bottom-left corner and one hanging DOWN from
 * the top centre. The right-hand plant (`Flower 4 - Cover.svg`) was dropped by design —
 * the file is still in `decor/` if it is ever wanted back.
 *
 * Flower 2's `hang` is the `drop` it had when it stood on the bar's floor (3.10 − 80/96
 * bar heights, the 80px lift that first framed it): mirrored to the opposite edge, the
 * same number frames the same band of the file, and `flipY` turns that band over. So the
 * plant reads as hanging from the ceiling without any of it having to be re-fitted.
 */
export const COVER_DESKTOP: readonly Plant[] = [
  { file: 'Flower 1 - Cover.svg', role: 'left', anchor: 'left',   vAnchor: 'bottom', h: 7.32, dx: -1.53, hang: 4.10 },
  { file: 'Flower 2 - Cover.svg', role: 'mid',  anchor: 'centre', vAnchor: 'top',    h: 4.00, dx:  0,    hang: 2.27, flipY: true },
]

/**
 * Phone: one plant in the bottom-left corner, and Flower 2 hanging from the top centre
 * exactly as it does on the desktop bar — same edge, same anchor, same flip, only sized
 * to the smaller bar. It used to sit in the bottom-right corner; the middle is where the
 * logotype is, so the two now overlap by design (the brand rides `z-10`, the plants sit
 * under it).
 */
export const COVER_MOBILE: readonly Plant[] = [
  { file: 'Flower 1 - Cover.svg', role: 'left', anchor: 'left',   vAnchor: 'bottom', h: 3.60, dx: -0.70, hang: 1.90 },
  { file: 'Flower 2 - Cover.svg', role: 'mid',  anchor: 'centre', vAnchor: 'top',    h: 3.10, dx:  0,    hang: 2.05, flipY: true },
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
 *
 * `flipY` is a transform and is safe for the same reason the centring was not: the
 * individual `scale` property applies before `transform`, but a mirror about the box's
 * own centre carries no translation for it to multiply. The plant grows in place.
 */
export function plantBox(p: Plant, u: number): CSSProperties {
  const base: CSSProperties = {
    position: 'absolute',
    height:   p.h * u,
    width:    'auto',
    maxWidth: 'none',
    ...(p.vAnchor === 'top' ? { top: -p.hang * u } : { bottom: -p.hang * u }),
    ...(p.flipY ? { transform: 'scaleY(-1)' } : {}),
  }
  if (p.anchor === 'left')  return { ...base, left:  p.dx * u }
  if (p.anchor === 'right') return { ...base, right: p.dx * u }
  // Both edges pinned and the margins auto centres a replaced element between them;
  // moving one edge by 2n therefore moves the centre by n.
  return { ...base, left: 2 * p.dx * u, right: 0, marginInline: 'auto' }
}
