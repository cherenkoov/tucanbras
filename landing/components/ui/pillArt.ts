/**
 * How a pill's decoration layer is boxed.
 *
 * Every part is drawn with `preserveAspectRatio="… slice"`, so an <img> scales it
 * to COVER its own box and clips whatever falls outside — the box IS the frame.
 * That is right for the ground, and too tight for a decoration that leans and
 * grows on hover: a plant sitting against the pill's edge has no art in hand the
 * moment the gesture pulls it sideways, and shows a cut.
 *
 * So a decoration gets a bigger window. `gen:pill-art` writes its part with the
 * viewBox expanded symmetrically by DECOR_BLEED, and the layer is drawn in a box
 * inflated by the same factor around the same centre. Scale is
 * max(boxW/vbW, boxH/vbH) and `xMidYMid` pins the viewBox centre to the box
 * centre — grow both by k and neither changes, so the art lands pixel-identical
 * to `inset-0` with the original viewBox, only with room around it.
 *
 * The pill DOES clip (`overflow-hidden rounded-btn`), and that clip is the one
 * thing shaping the button: the plants are re-exported uncropped and run well past
 * the pill on every side, so the silhouette the eye reads is `--radius-btn` at the
 * pill's real rendered size, identical on every pill however long its label. That
 * only works because the art is uncropped — while the hand-off shipped one flat
 * sheet per pill, Figma had already cut each plant to the pill's frame, so any clip
 * landed on top of a cut that was baked in at a different box. See PLACED in
 * `scripts/generatePillArt.ts`.
 */
export const DECOR_BLEED = 1.5

/**
 * Inflates the layer to DECOR_BLEED of the pill's box, centred on it:
 * `-(k-1)/2` = -25% out on each side, `k` = 150% of the box.
 *
 * Sized, not inset. Four insets stretch a normal box, but an <img> is a REPLACED
 * element: with `width: auto` it takes its intrinsic size and `right`/`bottom`
 * are simply dropped, so `inset-[-25%]` alone pinned the art at the corner at its
 * own SVG size instead of covering the pill. Percentages here resolve against the
 * containing block — width against its width, height against its height — which
 * is exactly the box the sheet was authored to cover.
 *
 * `max-w-none` is not decoration. Tailwind's preflight gives every <img> a
 * `max-width: 100%`, and a max-width beats a width: the layer took the -25% offset
 * and then computed 100% wide instead of 150%, so every decoration in the header sat
 * a quarter of its own box to the LEFT of where it belongs and drew into a window
 * two-thirds the intended width. On a pill that is ~30px; across the bar's plate it
 * walked the cover plants 380px. There is no matching `max-height`, which is why the
 * layers looked merely mis-placed rather than obviously broken — the height was the
 * only half of the box that worked. Guard: `npm run verify:header-hover` measures
 * every layer's RENDERED box against its own containing block, which is the only
 * check a stylesheet override cannot slip past.
 *
 * Mind that a `translate` percentage on this layer resolves against the LAYER's own
 * border box, not the pill's — so a lean written here is worth DECOR_BLEED× what it
 * reads as. DECOR_LEAN does that division; see PILL_DECOR in Header.tsx.
 *
 * Spelled out rather than computed — Tailwind only generates classes it can read
 * literally in the source. `verify:pill-art` asserts these agree with the number.
 */
export const DECOR_LAYER_OFFSET = '-25%'
export const DECOR_LAYER_SIZE   = '150%'

/**
 * How far the outer pair leans in, as a fraction of the PILL's width — 6%, so a
 * wide pill and a narrow one lean by the same proportion rather than the same
 * pixels. On a layer DECOR_BLEED× the pill that is written as 6 / 1.5 = 4%.
 * `verify:pill-art` asserts the literal in Header.tsx still matches this.
 */
export const DECOR_LEAN_PILL_PCT = 6
export const DECOR_LEAN_CLASS_PCT = DECOR_LEAN_PILL_PCT / DECOR_BLEED   // 4
export const DECOR_LAYER =
  'pointer-events-none absolute left-[-25%] top-[-25%] w-[150%] h-[150%] max-w-none block select-none'

/** The layer box a decoration part is rendered into, in units of the pill box. */
export function bleedViewBox(viewBox: string, k = DECOR_BLEED): string {
  const [x, y, w, h] = viewBox.trim().split(/[\s,]+/).map(Number)
  const round = (n: number) => +n.toFixed(3)
  return [round(x - ((k - 1) * w) / 2), round(y - ((k - 1) * h) / 2), round(w * k), round(h * k)].join(' ')
}
