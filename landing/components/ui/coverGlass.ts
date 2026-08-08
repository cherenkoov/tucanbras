/**
 * The header plate's glass, factored out so every cream surface in the bar is made
 * of the same material.
 *
 * The plate rests at 72% cream and fills in to solid over 600ms once the pointer is
 * on it — `.header-plate` in globals.css for the desktop silhouette, the inline
 * `bg-[rgba(255,252,229,0.72)] → bg-cream` pair for the mobile rect. Desktop also
 * frosts whatever shows through the 28% (`backdrop-blur-[4px]`) and drops that blur
 * the INSTANT it turns hot: a backdrop filter re-runs over the whole buffer every
 * frame it is animated, so the blur is deliberately the one property with no
 * transition on it.
 *
 * The ⋮ button and the flag pills used to be flat `--color-cream` — the only opaque
 * things on a translucent plate, which is what made them read as stickers on the bar
 * rather than as part of it. They wear this instead.
 *
 * The blur is `lg:` only, exactly as the plate's is: on phones the backdrop buffers
 * (element size × DPR) dropped the tab, which is why the mobile plate is colour-only.
 * A 48px pill is a fraction of an 85px-tall bar, but the rule stays the rule — the
 * phone gets the same gesture as one colour fade.
 */

/** How long the cream takes to fill in — the plate's own number. */
export const GLASS_MS = 600

/**
 * The colour half of the recipe, as a `transition` entry rather than a class.
 *
 * Every element that wears this glass ALREADY hand-writes a `transition` for its own
 * press or deal, and two Tailwind `transition-*` utilities do not merge: they set the
 * same `transition-property`, so the later RULE wins outright and one of the two
 * silently stops animating. Compose this into the element's own list instead.
 */
export const GLASS_TRANSITION = `background-color ${GLASS_MS}ms ease`

// Spelled out in full and never assembled from a constant: Tailwind scans source
// text for COMPLETE class names, so a composed one compiles to a rule that is never
// generated — the class lands in the DOM with nothing behind it and nothing fails
// loudly. See the note on PILL_HOVER in Header.tsx.
const GLASS_REST  = 'bg-[rgba(255,252,229,0.72)] lg:backdrop-blur-[4px]'
const GLASS_SOLID = 'bg-cream lg:backdrop-blur-none'

// …and a surface that is off the plate answers for itself. The dropdown cards hang
// BELOW the bar, so the plate's own hot state says nothing about them: without this,
// moving the cursor down onto a card took it off the plate and the card went MORE
// transparent under the pointer. `data-tapped` is the finger's half of it (armed by
// bloomOnTap, components/ui/tapBloom.ts) — a phone has no hover, and `:active` dies
// with the touch a third of the way into the fade.
//
// Both are pseudo-class/attribute qualified, so they outrank the resting pair on
// specificity and no `!` is needed.
const GLASS_OWN_HOT =
  'hover:bg-cream lg:hover:backdrop-blur-none data-tapped:bg-cream lg:data-tapped:backdrop-blur-none'

/**
 * Classes for a cream surface in the header bar.
 *
 * @param hot the plate's own state (`coverHot` in Header.tsx) — the pointer is on
 *        the plate, so everything standing on it firms up together.
 */
export function coverGlass(hot: boolean): string {
  return hot ? GLASS_SOLID : `${GLASS_REST} ${GLASS_OWN_HOT}`
}
