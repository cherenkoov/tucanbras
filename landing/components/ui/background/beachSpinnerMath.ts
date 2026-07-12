// Pure, DOM-free helpers for the beach palm/umbrella spin. Everything here is a plain
// function of numbers so it can be asserted in scripts/verifyBeachSpinner.ts.

export interface SpinState {
  /** the angle the scroll has asked for (deg). Unbounded: it keeps growing and it HOLDS. */
  target: number
  /** the angle currently rendered (deg), gliding toward `target`. */
  current: number
}

/**
 * Scroll adds angle. `deltaPx` is the scroll delta (down = positive), `dir` the object's
 * half (+1 / -1), so the two halves turn opposite ways — and scrolling UP flips the sign of
 * the delta, which reverses both halves. There is no cap and no spring-back: the object is a
 * wheel that keeps turning while you scroll and stays put when you stop.
 */
export function addScroll(s: SpinState, deltaPx: number, degPerPx: number, dir: 1 | -1): void {
  s.target += deltaPx * degPerPx * dir
}

/** One frame of glide toward the target. Returns the angle to render. */
export function easeToTarget(s: SpinState, ease: number): number {
  s.current += (s.target - s.current) * ease
  return s.current
}

/** True once the rendered angle has effectively caught up with the target. */
export function isSettled(s: SpinState, eps: number): boolean {
  return Math.abs(s.target - s.current) < eps
}

/**
 * Is the object on screen? `rect` MUST be the art's live client rect (top/bottom in css px
 * from the viewport top).
 *
 * It has to be measured, never computed from the SVG's coordinates: the beach viewBox gets
 * rewritten at runtime by the surf injection, and the old code's bbox-times-a-constant
 * arithmetic silently placed every object ~26% too low. The umbrellas — lowest on the canvas,
 * so worst hit — only "became visible" after they had scrolled off the top, i.e. they did all
 * their turning out of sight and looked frozen on screen.
 */
export function isOnScreen(
  rect: { top: number; bottom: number },
  viewportH: number,
  margin: number,
): boolean {
  return rect.bottom > -margin && rect.top < viewportH + margin
}

/**
 * The object's own centre, as transform-origin percentages of the overlay box.
 *
 * The overlay is a FULL-canvas svg (same viewBox as the beach) holding one object, so the
 * object's centre is a fraction of the whole canvas, not of the object. This is what makes
 * the rotation a spin-in-place: put the axis anywhere else and the art swings along an arc,
 * i.e. it travels across the sand — a second motion nobody asked for.
 */
export function centreOrigin(
  bbox: { x: number; y: number; width: number; height: number },
  viewBox: { width: number; height: number },
): { x: number; y: number } {
  return {
    x: ((bbox.x + bbox.width / 2) / viewBox.width) * 100,
    y: ((bbox.y + bbox.height / 2) / viewBox.height) * 100,
  }
}
