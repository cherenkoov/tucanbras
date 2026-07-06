// Beach road-traffic animation.
//
// The 8 cars are baked into the beach SVG (public/SVG/background/main 2.svg,
// viewBox 0 0 1027 3614), on a horizontal road band near canvas y ≈ 890–950. Their
// Figma ids are prefixed `b2-` at runtime by prepareBeachSvg.
//
// The beach SVG is injected via dangerouslySetInnerHTML, and post-injection JS mutation
// of its inner <g> elements does not render reliably in this app (the same reason the
// humans / bushes / big-tree are extracted into React-owned layers). So instead of a JS
// ticker we bake a native SMIL <animateTransform> into each car <g> *in the SVG string*
// before injection — the browser's SVG engine drives it, no JS DOM mutation needed.
//
// Each car sweeps horizontally in the direction its artwork faces and wraps cyclically:
// it slides fully off one edge, then re-enters from the other and repeats (no U-turn).
// The beach <svg> keeps its native viewBox with default overflow:hidden, so the car is
// clipped by the viewport at the edges and the loop's restart jump happens off-screen.

export type BeachCarConfig = {
  /** Figma group id WITHOUT the b2- prefix, e.g. 'type 3 car 1' */
  id: string
  /** +1 = drives right, -1 = drives left (matches the artwork's facing) */
  dir: 1 | -1
  /** measured bbox in canvas units (getBBox on the car <g>) — used to size the sweep */
  x: number
  w: number
}

// x / w measured once via getBBox (see git history of useBeachCarAnimation debug logs).
// The art is a fixed export, so these are stable; re-measure only if main 2.svg changes.
export const BEACH_CARS: BeachCarConfig[] = [
  { id: 'type 4 car 2', dir: 1, x: 476.01, w: 133.88 },
  { id: 'type 4 car 3', dir: 1, x: 925.01, w: 133.89 },
  { id: 'type 3 car 1', dir: 1, x: 18.09, w: 148.76 },
  { id: 'type 2 car 1', dir: 1, x: 377.05, w: 143.81 },
  { id: 'type 2 car 2', dir: -1, x: -11.86, w: 143.81 },
  { id: 'type 1 car 1', dir: -1, x: 692.13, w: 137.75 },
  { id: 'type 1 car 2', dir: -1, x: 460.13, w: 137.75 },
  { id: 'type 1 car 3', dir: 1, x: 139.12, w: 137.75 },
]

// Slow traffic: seconds to sweep the full scene width. One random value per DIRECTION
// (not per car) — see the collision note in injectBeachCarAnimation.
export const CAR_SWEEP_MIN_SEC = 30
export const CAR_SWEEP_MAX_SEC = 50

// Beach SVG viewBox width (canvas units). Cars translate in this coordinate space.
export const BEACH_SVG_W = 1027

// Off-screen buffer (canvas units) added past the scene edges so every car fully exits
// before it wraps, regardless of its authored x.
const SWEEP_MARGIN = 20

// Inject a SMIL <animateTransform> into each car <g> of the (already b2-prefixed) beach
// SVG string, so the browser animates the cars natively. Also drops each car's Figma
// clip-path so the car isn't cropped once it leaves its authored box. Returns the SVG
// unchanged under prefers-reduced-motion (cars stay static — project convention).
//
// COLLISION AVOIDANCE: all cars going the SAME direction share one sweep range + one
// duration, so they translate by an identical function of time. Their relative positions
// are therefore frozen — a car can never catch up to and overlap another in its lane. As
// the beach art places oncoming traffic in separate rows (different y), opposite
// directions don't overlap either. The trade-off is a single speed per direction rather
// than per car. A negative `begin` puts translate=0 at load, so the road shows the cars
// at their authored (non-overlapping) positions immediately, then drives from there.
export function injectBeachCarAnimation(beachSvg: string): string {
  if (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ) {
    return beachSvg
  }

  // Uniform sweep range covering every car, so same-direction cars move in lockstep.
  const minX = Math.min(...BEACH_CARS.map(c => c.x))
  const maxRight = Math.max(...BEACH_CARS.map(c => c.x + c.w))
  const sweepLeft = -(maxRight + SWEEP_MARGIN) // all cars fully off the left edge
  const sweepRight = BEACH_SVG_W - minX + SWEEP_MARGIN // all cars fully off the right edge

  // One random duration per direction (+1 / -1).
  const rndDur = () => CAR_SWEEP_MIN_SEC + Math.random() * (CAR_SWEEP_MAX_SEC - CAR_SWEEP_MIN_SEC)
  const durByDir: Record<number, number> = { 1: rndDur(), [-1]: rndDur() }

  let out = beachSvg
  for (const car of BEACH_CARS) {
    // dir +1: sweep sweepLeft → sweepRight (L→R). dir -1: reversed (R→L). No flip.
    const from = car.dir > 0 ? sweepLeft : sweepRight
    const to = car.dir > 0 ? sweepRight : sweepLeft
    const dur = durByDir[car.dir]
    // Start mid-cycle so translate=0 at load (cars at authored positions).
    const p0 = (0 - from) / (to - from)
    const begin = (-p0 * dur).toFixed(2)
    const anim =
      `<animateTransform attributeName="transform" attributeType="XML" type="translate" ` +
      `values="${from.toFixed(2)} 0;${to.toFixed(2)} 0" dur="${dur.toFixed(1)}s" ` +
      `begin="${begin}s" repeatCount="indefinite" calcMode="linear"/>`
    // Replace the car's opening tag (dropping its clip-path) and inject the animation.
    out = out.replace(new RegExp(`<g id="b2-${car.id}"[^>]*>`), `<g id="b2-${car.id}">${anim}`)
  }
  return out
}
