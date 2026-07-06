// Pure, DOM-free helpers for the beach umbrella/palm scroll-spin.
// The spring integrator gives an ease-in (spin-up) + ease-out (settle) response
// against a continuously moving target — see the design spec.

export interface SpinState {
  /** accumulated goal angle (deg); scroll adds to this, it holds when idle */
  target: number
  /** rendered angle (deg) easing toward target */
  current: number
  /** angular velocity (deg/frame) — the inertia that makes it ease-in-out */
  velocity: number
}

/**
 * One inertial (spring) integration step. Mutates `s` and returns the new angle.
 * velocity += (target - current) * stiffness ; velocity *= damping ; current += velocity
 */
export function spinStep(s: SpinState, stiffness: number, damping: number): number {
  s.velocity += (s.target - s.current) * stiffness
  s.velocity *= damping
  s.current += s.velocity
  return s.current
}

/** True once the spring has effectively reached its target and stopped moving. */
export function isSettled(s: SpinState, eps: number): boolean {
  return Math.abs(s.target - s.current) < eps && Math.abs(s.velocity) < eps
}

/** transform-origin percentages for an object's bbox within a viewBox. */
export function originPercent(
  bbox: { x: number; y: number; width: number; height: number },
  viewW: number,
  viewH: number,
): { x: number; y: number } {
  return {
    x: ((bbox.x + bbox.width / 2) / viewW) * 100,
    y: ((bbox.y + bbox.height / 2) / viewH) * 100,
  }
}
