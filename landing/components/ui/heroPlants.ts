/**
 * The plant the Hero wears, and where it sits.
 *
 * The file comes from `public/SVG/header/decor`, the same shelf the header bar draws
 * from — but it is placed against a box that MOVES. The card is `w-fit`, so its width
 * is whatever the heading measures in the current locale at the current clamp, and the
 * bar's trick of sizing off a fixed height (see coverPlants.ts, BAR_H) has nothing to
 * hold on to here.
 *
 * So the width below is in `cqw` of the button's wrapper — the element already marked
 * `@container` in Hero.tsx for `.btn-press-hero`'s radius maths, whose width is the
 * button's width. One unit drives the flower and the button it hangs off, so the two
 * scale as one thing and a longer Portuguese heading moves the flower with it instead
 * of leaving it behind.
 *
 * Height is never written: a width plus `height: auto` takes the file's own aspect on a
 * replaced element, so nothing here can be squashed by the button's proportions the way
 * a two-percentage box would be.
 *
 * ── Why there is no rotation in this file ──
 *
 * The design (Figma 3464:44948) draws the flower as an instance rotated 15°. That angle
 * does not apply here: this file was exported from an instance that already carried it,
 * so the art in `decor/` is ALREADY turned. Fitting the local file against Figma's own
 * export of the same layer — rotating by candidate angles and scoring silhouette
 * overlap — lands on −15° (IoU 0.995), exactly minus the angle the design applies on
 * top. Net rotation: zero.
 *
 * The same fit settles the proportions. Once turned to match, the ink measures 1.2701
 * against Figma's 1.2704 — uniform scale, no stretch anywhere. (Comparing the file's
 * box to the design's suggests otherwise; that reading is an artefact of measuring a
 * rotated box against an unrotated one, and of this file carrying margin around its ink
 * where Figma's export is cut to it.)
 *
 * Which is why the flower is simply drawn whole: its viewBox IS the design's own AABB,
 * 329.05 × 287.68 measured against 329.616 × 287.138 drawn. No correction term.
 */
export type HeroPlant = {
  /** file in `public/SVG/header/decor` */
  file: string
  /** width, in cqw of the button. Height follows the file. */
  w: number
}

/**
 * The anthurium on the CTA's top-right corner.
 *
 * Placed by a point ON THE FLOWER rather than by its box: ANCHOR is the base of the
 * spadix — where the bloom meets its stem — and it is pinned INSET px inside the
 * button's top-right corner. Everything else follows, so the flower rises out of that
 * corner and its body leans up and to the left over the heading, with the tail hanging
 * past the button's right edge.
 *
 * Anchoring by a point is what makes the arrangement survive a size change: the corner
 * it grows from stays put whatever the flower's width, where a box-anchored flower
 * slides diagonally every time the width is touched. It is also the only description
 * that matches how the placement was specified.
 *
 * ANCHOR was measured, not eyeballed: the spadix is the file's only #FDBB40 geometry,
 * so rendering that path alone and trimming gives its box, and the bottom-centre of
 * that box is the point where the bloom sits on the stem.
 *
 * The flower is a sibling of the button, not a child, so the button's `overflow: clip`
 * cannot reach it and the overhang survives. Being later in the DOM and positioned, it
 * paints over the button — hence `pointer-events: none` on every plant, without which
 * the flower would swallow taps on the CTA's right end.
 */
export const HERO_ANTHURIUM = {
  file: 'Flower 1 - Tutors.svg',
  /**
   * Set by the heading, not by taste. Anchored at the corner, the flower reaches
   * `anchor.x · w` to the LEFT of it — straight into the end of the H1's second line,
   * which in Russian ("и летите в Бразилию") is long enough that a big flower puts the
   * left lobe over its last letter. Swept against the rendered page: at 1920 the pink
   * landing on that line goes 0.09% at 27cqw → 0.03% at 26 → 0.00% at 25.
   *
   * The limit comes from 1920 and not from a bigger screen, because the card's padding
   * is a fixed 40px while the flower is measured in cqw: the wider the viewport, the
   * smaller a share of the card that padding is and the closer the heading runs to the
   * card's right edge — 83.5% of it at 1440, 84.0% at 1920. Past 1920 both clamps have
   * topped out, so the card stops growing with the viewport and nothing is tighter.
   *
   * The anchor is never traded away for this: `inset` is what was asked for, so the
   * flower changes size around a fixed point rather than sliding off its corner.
   */
  w: 25,
  /** the bloom's own stem point, as fractions of the file's box */
  anchor: { x: 0.4847, y: 0.6904 },
  /** how far inside the button's top-right corner that point lands, in px */
  inset: 20,
  aspect: 167 / 146,
} as const satisfies HeroPlant & Record<string, unknown>

/**
 * The anthurium below 500px, where the card stops being `w-fit` and fills the page.
 *
 * Same corner, same anchor point — only smaller. A phone card's right edge is very
 * nearly the viewport's, so a flower scaled from the desktop ratio spends most of
 * itself off-screen; and the CTA's label is centred in a ~334px button, which puts
 * "Бесплатный урок" within ~80px of that edge. 24cqw is what leaves both alone.
 *
 * Nothing here is about preventing a scrollbar — `main` is `overflow-x: clip`, so the
 * overhang could never make one. This is composition.
 */
export const HERO_ANTHURIUM_SM = { w: 24 } as const

/**
 * What hovering the CTA does to the flower, on the header's `.pill-decor` timing.
 * Spelled out here so `verify:hero-plants` can assert the values rather than merely
 * that something changed: at rest `scale` computes to the keyword `none`, so a check
 * that only compares before against after calls `none → 1` a movement and passes on a
 * lean that never engaged.
 */
export const HERO_ANTHURIUM_LEAN = { scale: 1.08, rotateDeg: -5 } as const

/**
 * Where the flower's box has to sit for ANCHOR to land INSET px inside the button's
 * top-right corner. Both offsets are a fixed px term plus a cqw term, because the
 * inset is in pixels and the flower is sized in cqw:
 *
 *   right = inset − (1 − anchor.x) · w        top = inset − anchor.y · w / aspect
 *
 * Returned for `verify:hero-plants` to check against the rendered box. It cannot be
 * used to STYLE the flower: that needs a `max-[500px]:` variant, an inline style is
 * exactly what a media query cannot reach, and Tailwind only generates classes it can
 * read literally — so the results are spelled out as literals in Hero.tsx and this is
 * what catches the two halves drifting apart.
 */
export function anthuriumOffsets(w: number) {
  const h = w / HERO_ANTHURIUM.aspect
  return {
    right: { px: HERO_ANTHURIUM.inset, cqw: -(1 - HERO_ANTHURIUM.anchor.x) * w },
    top: { px: HERO_ANTHURIUM.inset, cqw: -HERO_ANTHURIUM.anchor.y * h },
  }
}

/** `public/SVG/header/decor` holds spaces in its filenames. */
export function decorSrc(file: string): string {
  return `/SVG/header/decor/${encodeURIComponent(file)}`
}
