// Config for the beach umbrella/palm scroll-spin (mirrors beachCars.ts).
// Each object is lifted out of the beach SVG into its own overlay layer and spun
// around its own centre by useBeachSpinnerAnimation. `dir` sets which way it turns
// on scroll-DOWN (+1 clockwise, -1 counter-clockwise); scroll-UP reverses it.
// See docs/superpowers/*/specs/2026-07-07-beach-umbrella-palm-spin-design.md.

export type SpinDir = 1 | -1

export interface BeachSpinnerConfig {
  /** Figma group id WITHOUT the runtime b2- prefix (see prepareBeachSvg). */
  id: string
  dir: SpinDir
}

// Beach SVG viewBox (canvas units). Overlays reuse it so they align 1:1.
export const BEACH_VIEWBOX_W = 1027
export const BEACH_VIEWBOX_H = 3614
export const SPINNER_VIEWBOX = `0 0 ${BEACH_VIEWBOX_W} ${BEACH_VIEWBOX_H}`

// Tuning (adjustable on-device). SPIN_SENS: deg of spin per px scrolled.
export const SPIN_SENS = 0.3
export const SPIN_STIFFNESS = 0.1 // pull of current toward target (ease-in strength)
export const SPIN_DAMPING = 0.82  // velocity retention (ease-out settle)
export const SPIN_IDLE_FRAMES = 20
export const SPIN_SETTLE_EPS = 0.01

// 11 palms + 9 umbrellas. Directions alternate by default — hand-tune per object.
// NOTE: 'type 2 palm 04 ' keeps its trailing space (that is the real source id).
export const BEACH_SPINNERS: BeachSpinnerConfig[] = [
  { id: 'type 1 palm 01', dir: 1 },
  { id: 'type 1 palm 02', dir: -1 },
  { id: 'type 1 palm 03', dir: 1 },
  { id: 'type 2 palm 01', dir: -1 },
  { id: 'type 2 palm 02', dir: 1 },
  { id: 'type 2 palm 03', dir: -1 },
  { id: 'type 2 palm 04 ', dir: 1 },
  { id: 'type 3 palm 01', dir: -1 },
  { id: 'type 3 palm 02', dir: 1 },
  { id: 'type 3 palm 03', dir: -1 },
  { id: 'type 3 palm 04', dir: 1 },
  { id: 'type 2 umbrella 01', dir: -1 },
  { id: 'type 2 umbrella 02', dir: 1 },
  { id: 'type 2 umbrella 03', dir: -1 },
  { id: 'type 4 umbrella 01', dir: 1 },
  { id: 'type 4 umbrella 02', dir: -1 },
  { id: 'type 4 umbrella 03', dir: 1 },
  { id: 'type 3 umbrella 01', dir: -1 },
  { id: 'type 3 umbrella 02', dir: 1 },
  { id: 'type 3 umbrella 03', dir: -1 },
]
