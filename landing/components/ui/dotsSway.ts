/**
 * The ⋮ button's three marks, and the gust that moves them.
 *
 * They are not dots: each is a leaf shape with a tip at either end, and the three are
 * stacked and overlapping. Clicked, they behave like blades of grass — every one
 * rooted at its own lower tip, tips travelling, feet still, and each leaning its own
 * way so the stack splays instead of tipping over as one object.
 *
 * That is why `gen:pill-art` splits `dot's row` into a layer per mark (GLYPH in
 * scripts/generatePillArt.ts): as one file they could only ever rotate rigidly about a
 * single point, which reads as a signpost swinging, not as grass.
 */

import type { CSSProperties } from 'react'

/**
 * Where each blade is rooted, as a percentage of the 48×48 button.
 *
 * Measured off the art, not eyeballed. Every mark is drawn as two paths sharing a
 * midrib, and the midrib's endpoints are its two tips; the LOWER one is the root.
 * In the sheet's own viewBox units:
 *
 *   dot 1  #E76032 orange  root (16.44, 21.03)  tip (23.14,  2.87)
 *   dot 2  #2C61A7 blue    root (27.73, 33.56)  tip (19.44, 15.90)
 *   dot 3  #8FD096 green   root (17.29, 46.00)  tip (23.11, 27.47)
 *
 * The layer is drawn at `inset-0` over the whole button, so a unit is a percent of 48.
 *
 * `sway` is the peak of the first swing and the sign is the direction — ALTERNATING,
 * which is what makes them splay rather than lean together. `delay` staggers the gust
 * up the stack, bottom first. Amplitude is graded so the lowest blade stays quietest.
 *
 * All three are design knobs. The ceiling is geometry: the arm is ~19.4px, the button
 * clips (`overflow-hidden rounded-btn`), and the tightest corner is the top mark's tip
 * at (23.14, 2.87) where the rounded edge cuts in at x≈8.2 — about 15° before anything
 * is clipped. `verify:header-hover` checks the blades move and let go, not by how much.
 */
export const BLADES = [
  { part: 'blade-1', origin: '34.3% 43.8%', sway: '-9deg', delay: 120 },  // top,    orange
  { part: 'blade-2', origin: '57.8% 69.9%', sway:  '7deg', delay:  60 },  // middle, blue
  { part: 'blade-3', origin: '36.0% 95.8%', sway: '-5deg', delay:   0 },  // bottom, green
] as const

/** One pass of `dots-sway` (globals.css). */
export const DOTS_SWAY_MS = 760

/** …and the last blade to start is the last to finish. */
const HOLD_MS = DOTS_SWAY_MS + Math.max(...BLADES.map(b => b.delay))

/**
 * The per-blade half of the keyframe: its pivot, its lean, its place in the gust.
 * All three travel as custom properties — `dots-sway` is one keyframe shared by the
 * three layers, and these are what make it read differently on each (globals.css).
 */
export function bladeStyle(blade: (typeof BLADES)[number]): CSSProperties {
  return {
    '--blade-origin': blade.origin,
    '--sway':         blade.sway,
    '--blade-delay':  `${blade.delay}ms`,
  } as CSSProperties
}

/**
 * One timer per button, keyed weakly — the same deal `tapBloom` makes, and for the
 * same reason: this is an animation, and the header re-renders the whole drum (four
 * cells, each with its own art stack) on every state change. An attribute written
 * straight to the DOM costs nothing to set and nothing to undo.
 */
const timers = new WeakMap<HTMLElement, number>()

/**
 * Knocks the blades, and lets go on its own.
 *
 * The reflow between the two writes is not decoration: on a second click the attribute
 * is already there, and setting an attribute to the value it already holds starts no
 * animation at all — the gesture would fire once and then be dead for as long as the
 * reader kept clicking. Reading `offsetWidth` flushes the removal, so the attribute
 * genuinely goes off and comes back and the keyframe restarts from 0.
 *
 * Reduced motion is honoured here as well as in the stylesheet. The CSS block is what
 * actually holds the blades still; this is what stops the attribute being set at all,
 * so nothing is left on the element to reason about later.
 */
export function swayDots(button: HTMLElement): void {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  const running = timers.get(button)
  if (running !== undefined) window.clearTimeout(running)

  delete button.dataset.swaying
  void button.offsetWidth
  button.dataset.swaying = ''

  timers.set(
    button,
    window.setTimeout(() => {
      delete button.dataset.swaying
      timers.delete(button)
    }, HOLD_MS),
  )
}
