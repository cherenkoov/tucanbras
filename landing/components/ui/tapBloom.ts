/**
 * The phone's stand-in for hover.
 *
 * Everything decorative in the header answers to `group-hover` — the plants inside
 * a pill, the tucan's head, the plate's cover art. A phone has none of that, and
 * `:active` is not the substitute it looks like: it lasts exactly as long as the
 * finger is down (~100-150ms on a tap), while `.pill-decor` takes 340ms to open and
 * `.art-zoom` 500ms. Mirroring the hover rules into `group-active` therefore buys a
 * clipped twitch that starts back before it ever arrives — the gesture reads as a
 * glitch rather than as the bloom the same pill does under a cursor.
 *
 * So a tap ARMS the element for TAP_BLOOM_MS instead: `[data-tapped]` goes on, the
 * hover rules answer to it as well, and it comes off on a timer once the art has had
 * time to open, hold and settle.
 *
 * Written straight to the DOM, never through React state: this is an animation, and
 * the header re-renders the whole drum (four cells, each with its own art stack) on
 * every state change. One attribute on one node costs nothing to set and nothing to
 * undo.
 *
 * `pointerdown`, not `click`: the response has to land under the finger, and a tap
 * that turns into a scroll should still bloom — that is what a cursor passing over
 * the pill does too.
 */

import type { PointerEvent as ReactPointerEvent } from 'react'

/**
 * How long the tap holds the bloom open. Comfortably past `.pill-decor`'s 340ms and
 * `.art-zoom`'s 500ms, so the art reaches full size and rests there for a beat
 * before easing back — the shape of a hover, compressed into one gesture.
 */
export const TAP_BLOOM_MS = 900

/**
 * One timer per element, keyed weakly so a pill that unmounts mid-bloom (the burger
 * column closes on every pick) takes its timer's only reference with it. A second
 * tap restarts the hold rather than inheriting the first tap's remaining time.
 */
const timers = new WeakMap<HTMLElement, number>()

/** Arms `[data-tapped]` on the element the gesture started on. Mouse pointers no-op —
 *  they have a real hover, and a click would otherwise pin the bloom open for 900ms
 *  after the cursor has already left. */
export function bloomOnTap(e: ReactPointerEvent<HTMLElement>): void {
  if (e.pointerType === 'mouse') return

  const el = e.currentTarget
  const running = timers.get(el)
  if (running !== undefined) window.clearTimeout(running)

  el.dataset.tapped = ''
  timers.set(
    el,
    window.setTimeout(() => {
      delete el.dataset.tapped
      timers.delete(el)
    }, TAP_BLOOM_MS),
  )
}
