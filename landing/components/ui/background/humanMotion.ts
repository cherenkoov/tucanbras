// Pure, DOM-free helpers for the human-walk animation. Imported by both the
// React hook and the Node verification script (no React/GSAP/DOM dependencies).

import type { LayerToggle } from './humanPaths'

/** Loop progress in [0,1) for elapsed time, lap length and start phase. */
export function progressFor(elapsedSec: number, lapSec: number, phase: number): number {
  const p = (elapsedSec / lapSec + phase) % 1
  return p < 0 ? p + 1 : p
}

/**
 * Horizontal facing (+1 / -1) from the path's horizontal tangent. Keeps the
 * previous facing inside the deadzone (near-vertical segments) to stop flicker.
 */
export function facingFor(tangentDx: number, lastFacing: 1 | -1, eps: number): 1 | -1 {
  if (tangentDx > eps) return 1
  if (tangentDx < -eps) return -1
  return lastFacing
}

/** Feet-anchored squash/stretch factors: stretch = taller (sy>1) + narrower (sx<1). */
export function gait(
  timeSec: number,
  A: number,
  B: number,
  omega: number,
  phase: number
): { sx: number; sy: number } {
  const s = Math.sin(timeSec * omega + phase * Math.PI * 2)
  return { sx: 1 - B * s, sy: 1 + A * s }
}

/** zIndex for a progress value: baseZ unless inside a toggle window. */
export function zForProgress(progress: number, baseZ: number, toggles: LayerToggle[]): number {
  for (const t of toggles) {
    if (progress >= t.range[0] && progress <= t.range[1]) return t.z
  }
  return baseZ
}
