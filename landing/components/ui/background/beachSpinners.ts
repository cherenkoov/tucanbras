// The palms and umbrellas of the beach scene spin on scroll.
//
// The rule, and the whole of it:
//   • each object turns about ITS OWN CENTRE — it spins in place, it never travels;
//   • half of them turn clockwise, the other half counter-clockwise (alternating, so any
//     two neighbours in the list turn against each other);
//   • scroll down turns them one way, scroll up turns them back the other way.
//
// Each object is lifted out of the beach SVG into its own full-canvas overlay div
// (BackgroundCanvas), which is what actually gets the CSS rotation — a transform on an inner
// <g> does not render under dangerouslySetInnerHTML. useBeachSpinnerAnimation drives it.

/** +1 = clockwise on scroll-DOWN (and counter-clockwise on scroll-up); -1 = the mirror. */
export type SpinDir = 1 | -1

export interface BeachSpinner {
  /** Figma group id WITHOUT the runtime b2- prefix (see prepareBeachSvg). */
  id: string
  dir: SpinDir
}

// Degrees of turn per pixel scrolled. An object is on screen for roughly a viewport height
// plus its own height (~1200px on desktop), so this is "degrees per pass ÷ 1200": at 0.08 an
// object turns about a quarter of a revolution while it crosses the screen — a slow drift.
export const SPIN_DEG_PER_PX = 0.08

// How hard the rendered angle chases the scrolled-to angle each frame (0..1). Below 1 it
// lags slightly behind the scroll and glides to a stop instead of snapping — that lag IS the
// easing. 1 would rotate in lockstep with the wheel, which looks mechanical.
export const SPIN_EASE = 0.12

export const SPIN_SETTLE_EPS = 0.01 // deg: closer than this counts as "arrived"
export const SPIN_IDLE_FRAMES = 20 // frames at rest before the RAF loop shuts down

// An object only accumulates angle while it is actually on screen (± this margin), so it
// enters the viewport at 0° and turns from there. 0 = starts exactly at the viewport edge.
export const SPIN_MARGIN_PX = 0

// The 20 objects in the beach art, in source order. NOTE: 'type 2 palm 04 ' keeps its
// trailing space — that is the real id in the SVG, not a typo.
const SPINNER_IDS = [
  'type 1 palm 01',
  'type 1 palm 02',
  'type 1 palm 03',
  'type 2 palm 01',
  'type 2 palm 02',
  'type 2 palm 03',
  'type 2 palm 04 ',
  'type 3 palm 01',
  'type 3 palm 02',
  'type 3 palm 03',
  'type 3 palm 04',
  'type 2 umbrella 01',
  'type 2 umbrella 02',
  'type 2 umbrella 03',
  'type 4 umbrella 01',
  'type 4 umbrella 02',
  'type 4 umbrella 03',
  'type 3 umbrella 01',
  'type 3 umbrella 02',
  'type 3 umbrella 03',
]

// Alternating parity splits the 20 objects into two equal halves (10 + 10) and guarantees
// neighbours never share a direction. Derived from the index rather than typed out per
// object, so it cannot silently drift out of step when the list is edited.
export const BEACH_SPINNERS: BeachSpinner[] = SPINNER_IDS.map((id, i) => ({
  id,
  dir: (i % 2 === 0 ? 1 : -1) as SpinDir,
}))

/**
 * The beach SVG's own viewBox, read from the markup.
 *
 * Never hardcode it. The beach is re-exported by hand and the surf injection rewrites the
 * viewBox at runtime (beachWaves.ts), so any constant copy of it goes stale — and a stale
 * viewBox silently misplaces every object. The overlays must carry the SAME viewBox as the
 * art they were lifted from, or they will not sit on top of it.
 */
export function readViewBox(svg: string): string | null {
  return svg.match(/viewBox="([^"]+)"/)?.[1] ?? null
}
