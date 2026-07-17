// Beach surf ("прибой") animation for the blue SEA at the bottom of the beach SVG.
//
// The beach (public/SVG/background/main 2.svg, viewBox 0 0 1027 3614) is injected via
// dangerouslySetInnerHTML. Post-injection JS/CSS mutation of its inner nodes does NOT render
// reliably (see beachCars.ts + the `feedback_svg_animation` memory), so we bake native SMIL
// into the SVG string before injection — the browser's SVG engine drives it, no JS ticker.
//
// ── type-1 → a QUEUE (conveyor) of waves ────────────────────────────────────────
// The sea silhouettes come from the standalone "Ocean Waves" files (see oceanWaves.ts), NOT
// from main 2.svg — the old baked-in type-1 groups are removed and replaced by this queue.
// Think of a queue: a wave appears at the sea line (bottom), rises the whole way to the shore
// (top), DISSOLVES onto the sand line-by-line, then goes to the BACK of the queue (recycles to
// the bottom). Offset in phase, it reads as waves continuously approaching the shore. We:
//   • place each wave via a nested <svg viewBox> mapped onto a target rect in beach space —
//     the target is WIDER than the 1027 viewBox (WAVE_WIDTH_SCALE) so edges never enter frame,
//   • CLONE shapes (cycling the 6 silhouettes) up to `layout.n` instances (ids suffixed so
//     they never collide — waves reference no defs, so renaming is safe),
//   • give every instance the SAME rise (+ a two-direction horizontal BEND: one way for the
//     first half, the other for the second; start side alternating per wave) + duration,
//     evenly staggered `begin` → even spacing / no gaps,
//   • dissolve each instance line-by-line only near the top (shore); at the repeat wrap it is
//     already at opacity 0, so the reset to the sea is unseen. Dissolve order follows the line
//     NUMBERS in the art (so re-numbered exports change the order automatically).
// The queue's geometry comes from computeWaveQueue (waveQueueLayout.ts): wave height is
// derived from the VIEWPORT HEIGHT (not the canvas width, which is why waves used to be
// a full screen tall at 1920px), the track length is n × step, and n is capped at 6 on
// desktop / 12 on mobile. Space the queue no longer fills is closed by the parallax.
//
// ── type-2 → foam that JUMPS out from behind a wave (from main 2.svg) ───────────
// Lifted out of the beach and re-attached as a CHILD of two queue waves, painted BEHIND each
// wave's silhouette. It appears by rising above its wave's crest and hides by diving back under
// the SAME wave (a fish out of water) — pure occlusion, no fade. It rides with its wave.
//
// prefers-reduced-motion → injectStaticSea, NOT the SVG untouched. The art holds only the
// wave SILHOUETTES — the water plane left with the old baked sea — so returning it as-is
// shows whatever lies BEHIND the beach through the gaps between them. `return beachSvg`
// here is a regression, however much it looks like a simplification.

import { OCEAN_WAVE_IDS, type OceanWaveShape } from './oceanWaves'
import { VIEWBOX_W, SEA_BASE_TOP, type WaveQueueLayout } from './waveQueueLayout'

// ── Queue geometry (canvas units) + timing ───────────────────────────────────────
// Count, wave height, track length, spawn/shore lines and cycle duration used to be module
// constants here; they now all come from the WaveQueueLayout passed in via WaveSurfOptions
// (see waveQueueLayout.ts / computeWaveQueue) — a wave's PIXEL size follows the viewport
// HEIGHT instead of a fixed canvas-unit height that scaled with the container WIDTH.

// Target rect of each wave in beach space. Width = viewBox × widthScale, overspilling the
// viewBox so no drift exposes an edge (widthScale is a tunable option, default below). Height
// is DECOUPLED from width — it comes from layout.heightRefW — so widening a wave keeps its
// height (waves get broader/flatter, not bigger).
const WAVE_WIDTH_SCALE = 2.4 // tuned in the wave-lab (edge-safe for drift ≤ ~700)
// Horizontal drift AMPLITUDE (canvas units) — a wave goes to +drift by the MIDDLE of its rise,
// then CROSSES to −drift by the top (пол пути в одну сторону, пол пути в противоположную). Start
// side alternates per instance so neighbours mirror. Spread over the long slow rise, so it
// reads as a gentle diagonal S, not a slide. |drift| is the max on-screen offset, so it must
// stay ≤ the width overspill or an edge enters frame (widen the wave to allow more).
const QUEUE_DRIFT = 370 // tuned in the wave-lab

// ── Sea base + the terminal sea tile ─────────────────────────────────────────────
// The old sea art is REMOVED from main 2.svg and replaced by the queue, which is only a set of
// wave SILHOUETTES — it does not paint the water itself. Wherever the waves leave a gap the
// beach is transparent and the layers BEHIND it show through, which reads as a stray band
// between the waves and whatever sits below. So the queue gets its own water: a rect painted
// BEHIND every wave. Its top edge (SEA_BASE_TOP, from waveQueueLayout.ts) is a straight line,
// so it sits low enough to stay under the dense part of the conveyor — above that the waves
// are dissolving into the sand anyway. Its BOTTOM now follows whatever viewBox height it is
// handed (layout.beachViewH for the conveyor, a plain number for the static sea) instead of a
// fixed constant — see seaBaseRect().
const SEA_BASE_COLOR = '#2982B6' // a mid blue taken from the wave art

// Per-line dissolve cascade (fractions of the cycle) — ONLY near the shore (top), so overlapping
// neighbours keep the lower/mid sea gap-free. DROP_WIDTH must stay < the per-line step
// (Q_CASCADE_SPAN / lines-1) or the cascade blurs into one fade.
const Q_FADE_IN_END   = 0.06
const Q_CASCADE_START = 0.80
const Q_CASCADE_SPAN  = 0.15
const Q_DROP_WIDTH    = 0.02

// ── type-2 foam: rides ON a wave and JUMPS out from behind it (fish out of water) ──
// The foam is a CHILD of a wave instance, painted BEFORE that wave's <svg>, so the wave's own
// silhouette OCCLUDES it. Nothing fades to "appear": the foam becomes visible purely by rising
// above its wave's crest, and hides again by sinking back behind the SAME wave. Being a child,
// it inherits the wave's rise + drift, so it rides along with it.
//
// The only opacity is a GATE covering the window where its wave dissolves at the shore (it
// would otherwise lose its cover) and the spawn below the fold. Both gate switches happen while
// the foam is submerged behind a solid wave, so they are never seen. Likewise the x reset at
// the wrap happens submerged — no snap.
const FOAM_SHAPES = ['type 2 wave 01', 'type 2 wave 02'] as const
// Four foams. Only two silhouettes exist in the art, so shapes repeat — but each sits on a
// DIFFERENT wave, at a different x along it, at a slightly different size, and (being phase-
// locked to its own wave) jumps at a different moment. So they never read as copies.
// Shape 0 is the SMALL silhouette (414×314) and shape 1 the wide one (913×368), so the shape-0
// foams are doubled to keep all four comparable in footprint. `x0` is the LEFT edge — keep
// `x0 + width` inside the 1027 viewBox, and give each a distinct column.
const FOAM_SLOTS: { shape: 0 | 1; x0: number; scale: number; flip: boolean }[] = [
  // `flip` mirrors the art horizontally so the foam faces the other way. It does NOT flip the
  // jump: every foam sits on an odd-k wave, whose drift carries it RIGHT across the jump window,
  // so a rightward leap compounds with the wave (a leftward one would be cancelled by it).
  // x0 = LEFT edge. Keep x0 ≳ 190 (the wave has dragged the foam ~180 left when it surfaces) and
  // leave room on the right for the leap — buildFoam clamps the reach if a foam is too wide.
  { shape: 0, x0: 200, scale: 0.75, flip: false }, // w 311
  { shape: 1, x0: 200, scale: 0.60, flip: true },  // w 548
  { shape: 0, x0: 420, scale: 0.80, flip: true },  // w 331
  { shape: 1, x0: 190, scale: 0.70, flip: false }, // w 639 — widest, reach gets clamped
]
// Vertical seating, measured from the wave's box top (yBase) DOWN to the foam's TOP edge.
// REST — fully buried inside the wave's body (nothing pokes out; always below the clip line).
// Shallower than it used to be (260): the rise is REST − PEAK, so burying the foam deeper made
// the arc taller and thinner. 200 still leaves it comfortably under the clip line at rest.
// This is a canvas unit tuned against a ~480-unit wave (TH_TUNED_REF) — multiplied by
// layout.waveScale at build time, or a shrunk wave would have its foam sit below its own box.
const FOAM_REST_DEPTH = 200
// How much of ITSELF the foam clears above the waterline at the peak. A single peak-depth
// constant cannot express this: the four foams have different heights (scale × art height), so
// the peak is derived per-foam from its own height. 0.9 = nine tenths of it is out of the water.
const FOAM_EMERGE = 0.9
// Forward reach of the leap along x, relative to its wave. Must be COMPARABLE to the rise `h`
// (~250-280) or the path reads as a straight up-and-down rather than an arc. Clamped per foam so
// a wide one never leaps into the frame edge. Tuned against the same ~480-unit wave as the depths
// above, so it too is multiplied by layout.waveScale at build time.
const FOAM_JUMP_N = 240
const FOAM_EDGE_MARGIN = 20
// One JUMP per wave pass, phase-locked to the wave: buried → arc → buried. Halved (0.36 → 0.18
// of the cycle = 9s) about the same late apex (0.61). Must finish before the wave starts
// dissolving at Q_CASCADE_START (0.80).
const FOAM_JUMP_START = 0.52
const FOAM_JUMP_END = 0.70
// The arc is a real PARABOLA, sampled into this many segments and played at a UNIFORM rate.
// Three points + keySplines could not do it: `values` are interpolated linearly BETWEEN points,
// so three points always gave a triangle (a corner at the apex), and the splines only bent the
// TIMING — easing near the apex is exactly what read as the foam stopping up there. Sampling the
// curve puts the shape in the geometry, and linear timing keeps the horizontal speed constant,
// so the foam flies like a thrown object: up, over, gone — no corner, no pause.
const FOAM_ARC_STEPS = 8
// Opacity, phase-locked to the same window but slightly LATER than the motion: it fades IN
// while still hidden behind the wave (so the appearance still reads as emerging from under it),
// holds across the apex, then fades OUT as it dives — the wave is a stack of bands, not a solid
// fill, so without this you catch the foam sliding under it through the gaps. 0 everywhere
// else, which also covers the spawn and the shore dissolve.
const FOAM_FADE_VALUES = '0;0;1;1;0;0'
const FOAM_FADE_KEYTIMES = '0;0.557;0.595;0.647;0.692;1'
// Authored bbox of each foam (canvas units) — used to seat it on the wave and to keep it inside
// the wave's box (silhouettes differ a lot in height: wave 06 is 386 tall, wave 05 is 561).
const FOAM_BBOX: Record<string, { minX: number; maxX: number; minY: number; h: number }> = {
  'type 2 wave 01': { minX: 0, maxX: 414, minY: 2948, h: 314 },
  'type 2 wave 02': { minX: 0, maxX: 913, minY: 2982, h: 368 },
}

// ── The waterline MASK ───────────────────────────────────────────────────────────
// The wave is a STACK OF BANDS, not a solid fill, so a foam merely painted behind it shows
// through the gaps. We additionally CLIP each foam to everything ABOVE a waterline that rides
// with its wave: anything below is cut away entirely and can never leak through a gap.
//
// The line is placed BELOW the wave's crest on purpose. Above the crest the wave paints
// nothing, so the foam shows; between the crest and the line the wave paints OVER the foam.
// The visible boundary is therefore the wave's own WAVY contour, not this straight line — the
// clip only kills the foam deep down. Measured from the wave's box top (yBase) downwards.
// Canvas units tuned against a ~480-unit wave (TH_TUNED_REF), so multiplied by
// layout.waveScale at build time — on desktop the wave is now only ~150 units tall, and an
// unscaled 150 would put the waterline clip below the wave's own box.
const FOAM_CLIP_DEPTH = 150

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// Depth-aware inner range of `<g id="fullId" …> … </g>`.
function groupInner(svg: string, fullId: string): [number, number] | null {
  const start = svg.indexOf(`<g id="${fullId}"`)
  if (start === -1) return null
  const tagEnd = svg.indexOf('>', start)
  if (tagEnd === -1) return null
  const innerStart = tagEnd + 1
  let depth = 1
  let i = innerStart
  while (i < svg.length) {
    const open = svg.indexOf('<g', i)
    const close = svg.indexOf('</g>', i)
    if (close === -1) return null
    if (open !== -1 && open < close) { depth++; i = open + 2 }
    else { depth--; if (depth === 0) return [innerStart, close]; i = close + 4 }
  }
  return null
}

// Full `<g id="fullId" …> … </g>` span (opening tag through closing </g>), depth-aware.
function groupSpan(svg: string, fullId: string): [number, number] | null {
  const start = svg.indexOf(`<g id="${fullId}"`)
  if (start === -1) return null
  const inner = groupInner(svg, fullId)
  if (!inner) return null
  return [start, inner[1] + 4]
}

// Suffix every id inside a group so a clone never collides. Waves reference no defs, so this
// has no side effects.
function cloneIds(groupHtml: string, suffix: string): string {
  return groupHtml.replace(/id="([^"]+)"/g, `id="$1${suffix}"`)
}

// One opacity timeline for the line at `rank` of `count`, phase-locked to the instance cycle.
function qLineOpacity(rank: number, count: number, begin: string, dur: number): string {
  const t = count > 1 ? rank / (count - 1) : 0
  const dropStart = Q_CASCADE_START + t * Q_CASCADE_SPAN
  const dropEnd = Math.min(0.99, dropStart + Q_DROP_WIDTH)
  const keyTimes = `0;${Q_FADE_IN_END};${dropStart.toFixed(3)};${dropEnd.toFixed(3)};1`
  return (
    `<animate attributeName="opacity" values="0;1;1;0;0" keyTimes="${keyTimes}" ` +
    `dur="${dur.toFixed(1)}s" begin="${begin}s" repeatCount="indefinite" calcMode="linear"/>`
  )
}

// Inject the per-line dissolve into an isolated (id-suffixed) wave group HTML. Numbered lines
// dissolve in NUMBER order (line 1 first … last line last — the number IS the order signal, so
// a re-numbered export changes the sequence); un-numbered detail paths dissolve after, in
// document order — so nothing is left un-animated (which would freeze it visible).
function injectLineDissolve(groupHtml: string, begin: string, dur: number): string {
  const innerStart = groupHtml.indexOf('>') + 1
  const innerEnd = groupHtml.lastIndexOf('</g>')
  const inner = groupHtml.slice(innerStart, innerEnd)
  const lines: { id: string; tag: string; num: number | null; idx: number }[] = []
  const re = /<(path|g) id="(b2-[^"]+)"/g
  let m: RegExpExecArray | null
  let idx = 0
  while ((m = re.exec(inner)) !== null) {
    const bare = m[2].slice(3) // strip b2-
    const numMatch = bare.match(/^(\d+)(?:_\d+)?/) // leading number (before the -qK suffix)
    lines.push({ id: m[2], tag: m[1], num: numMatch ? parseInt(numMatch[1], 10) : null, idx: idx++ })
  }
  const ordered = [...lines].sort((p, q) => (p.num ?? 1000 + p.idx) - (q.num ?? 1000 + q.idx))
  let out = groupHtml
  ordered.forEach((line, rank) => {
    const anim = qLineOpacity(rank, ordered.length, begin, dur)
    if (line.tag === 'g') {
      out = out.replace(new RegExp(`<g id="${escapeRe(line.id)}"[^>]*>`), mm => mm + anim)
    } else {
      out = out.replace(
        new RegExp(`(<path id="${escapeRe(line.id)}"[^>]*?)/>`),
        (_full, openTag) => `${openTag}>${anim}</path>`,
      )
    }
  })
  return out
}

// Build one queue instance k: pick a shape (cycling the 6), clone it with unique ids, add the
// line dissolve, place it via a nested <svg> mapped onto a target rect in beach space, and wrap
// that in a <g> carrying the shared rise + sway animation (phase-offset by `begin`).
// Build the foam that rides on instance `k`: a sibling painted BEFORE the wave's <svg>, so the
// wave occludes it. Local arc = jump out from behind the crest, advance N, dive back under.
function buildFoam(
  foam: { id: string; html: string; x0: number; scale: number; flip: boolean },
  k: number, yBase: number, th: number, begin: string, layout: WaveQueueLayout,
): string {
  const bbox = FOAM_BBOX[foam.id] ?? { minX: 0, maxX: 0, minY: 0, h: 0 }
  // Every absolute depth/reach below was tuned against a ~480-unit wave. The wave is now
  // sized from the viewport HEIGHT, so it can be a third of that on a wide screen —
  // scale the foam with it or it ends up deeper than the wave it hides inside.
  const ws = layout.waveScale
  const restDepthRef = FOAM_REST_DEPTH * ws
  const clipDepth = FOAM_CLIP_DEPTH * ws
  const jumpN = FOAM_JUMP_N * ws
  const s = foam.scale * ws
  const hf = bbox.h * s
  const wf = (bbox.maxX - bbox.minX) * s
  // Rest depth. The floor is what matters: the foam's TOP must stay below the clip line, or it
  // would peek out while submerged. (Anything below that line is cut away, so a tall foam
  // hanging past the wave's box bottom is harmless — the clip, not the box, is the hider.)
  const restDepth = Math.min(restDepthRef, Math.max(clipDepth + 40 * ws, th - hf - 10 * ws))
  // Seat it: LEFT edge at the slot's x0, top edge `restDepth` below the wave's box top (yBase).
  // Mirroring negates the x scale, which pins the art by its RIGHT edge — so anchor on maxX to
  // keep the same left edge, and the same on-screen footprint.
  const fx = foam.flip ? foam.x0 + s * bbox.maxX : foam.x0 - s * bbox.minX
  const fy = (yBase + restDepth) - s * bbox.minY
  // Clamp the leap so a wide foam cannot sail past the frame edge (the foam is NOT inside the
  // wave's over-wide <svg>, so nothing but the beach viewBox clips it horizontally).
  const n = Math.min(jumpN, Math.max(0, VIEWBOX_W - FOAM_EDGE_MARGIN - (foam.x0 + wf)))
  // Peak so that FOAM_EMERGE of the foam's own height sits above the waterline (clip line).
  // May go negative — the foam's top then clears the wave's box top, which is fine.
  const peakDepth = clipDepth - FOAM_EMERGE * hf
  const h = restDepth - peakDepth // how far it rises out of the wave
  const p = (v: number) => v.toFixed(1)
  const dur = layout.durSeconds
  // Sample the parabola x = n·u, y = −h·4u(1−u) over the jump window, at a uniform rate.
  // Bracketed by two "buried" holds so the wave's whole cycle is covered; the velocity steps at
  // the window edges happen below the waterline (clipped), so they are never seen.
  const span = FOAM_JUMP_END - FOAM_JUMP_START
  const arc: string[] = []
  const times: string[] = []
  for (let i = 0; i <= FOAM_ARC_STEPS; i++) {
    const u = i / FOAM_ARC_STEPS
    arc.push(`${p(n * u)} ${p(-h * 4 * u * (1 - u))}`)
    times.push((FOAM_JUMP_START + u * span).toFixed(3))
  }
  const values = `0 0;${arc.join(';')};${p(n)} 0`
  const keyTimes = `0;${times.join(';')};1`
  const jump =
    `<animateTransform attributeName="transform" attributeType="XML" type="translate" ` +
    `values="${values}" keyTimes="${keyTimes}" calcMode="linear" ` +
    `dur="${dur.toFixed(1)}s" begin="${begin}s" repeatCount="indefinite"/>`
  const gate =
    `<animate attributeName="opacity" values="${FOAM_FADE_VALUES}" keyTimes="${FOAM_FADE_KEYTIMES}" ` +
    `dur="${dur.toFixed(1)}s" begin="${begin}s" repeatCount="indefinite" calcMode="linear"/>`
  const art =
    `<g transform="translate(${p(fx)} ${p(fy)}) scale(${foam.flip ? -s : s} ${s})">` +
    `${cloneIds(foam.html, `-f${k}`)}</g>`

  // Waterline mask. The clip MUST live on a parent that does NOT carry the jump transform,
  // otherwise the clip would ride along with the foam and never cut it. This wrapper has no
  // transform, so the clip is fixed in the wave's own space (and thus rides with the wave).
  const clipId = `b2-foamclip-${k}`
  const clipY = yBase + clipDepth
  const clip =
    `<clipPath id="${clipId}" clipPathUnits="userSpaceOnUse">` +
    `<rect x="-6000" y="${p(clipY - 6000)}" width="14000" height="6000"/></clipPath>`
  return `${clip}<g clip-path="url(#${clipId})"><g class="beach-foam">${jump}${gate}${art}</g></g>`
}

function buildQueueInstance(
  shapes: Record<string, OceanWaveShape>, k: number, layout: WaveQueueLayout,
  drift: number, widthScale: number,
  foam?: { id: string; html: string; x0: number; scale: number; flip: boolean },
): string {
  const id = OCEAN_WAVE_IDS[k % OCEAN_WAVE_IDS.length]
  const shape = shapes[id]
  if (!shape) return ''
  const dur = layout.durSeconds
  const begin = (-(k / layout.n) * dur).toFixed(2)
  let inner = cloneIds(shape.inner, `-q${k}`)
  inner = injectLineDissolve(inner, begin, dur)

  // Target rect in beach coords: wider than the viewBox (overspill → edges off-screen),
  // centred. Height is DECOUPLED from width (the nested <svg> carries
  // preserveAspectRatio="none"), so a wave gets broader/flatter, never bigger. It comes
  // from layout.heightRefW, which is derived from the VIEWPORT HEIGHT — that is what
  // stops a 1920px screen from rendering near-full-height waves.
  const tw = VIEWBOX_W * widthScale
  const tx = (VIEWBOX_W - tw) / 2
  const th = layout.heightRefW * (shape.h / shape.w)
  const yBase = layout.spawnCy - th / 2 // centre the wave on the spawn line at rest
  // overflow="hidden" CLIPS to the viewBox — reproducing the Figma frame crop. Without it,
  // stray path fragments outside the frame (e.g. wave 03 reaches y≈−504 in a 522-tall box)
  // render as a "piece" flying far above the wave. The clip travels with the wave (it's in
  // the wave's local space), so the sway/rise never expose an edge.
  const nested =
    `<svg x="${tx.toFixed(1)}" y="${yBase.toFixed(1)}" width="${tw.toFixed(1)}" height="${th.toFixed(1)}" ` +
    `viewBox="0 0 ${shape.w} ${shape.h}" preserveAspectRatio="none" overflow="hidden">${inner}</svg>`

  // Rise (y) + a TWO-DIRECTION horizontal move: one way over the FIRST half of the rise (to
  // +drift by the middle), then the OTHER way over the second half, CROSSING to the opposite
  // side (to −drift at the top). Start side alternates per instance so neighbours mirror. The
  // −drift→0 reset at the wrap is hidden (wave is dissolved + below the fold at the spawn).
  const dxNum = (k % 2 === 0 ? 1 : -1) * drift
  const dx = dxNum.toFixed(1)
  const ndx = (-dxNum).toFixed(1)
  const q = layout.travel
  const rise =
    `<animateTransform attributeName="transform" attributeType="XML" type="translate" ` +
    `values="0 0;${dx} ${(-q * 0.5).toFixed(1)};${ndx} ${(-q).toFixed(1)}" ` +
    `keyTimes="0;0.5;1" dur="${dur.toFixed(1)}s" ` +
    `begin="${begin}s" repeatCount="indefinite" calcMode="linear"/>`
  // Foam (if any) goes BEFORE the wave's <svg> so the wave's silhouette occludes it.
  const foamMarkup = foam ? buildFoam(foam, k, yBase, th, begin, layout) : ''
  // `beach-wave` class → useWaveDepthOrder keeps the instances sorted by DESCENDING phase, so
  // FARTHER waves paint on top (higher z) and nearer-shore waves sit behind (lower z). It reads
  // `begin`/`dur` off this rise animation, which must stay the instance's FIRST animateTransform.
  return `<g class="beach-wave">${rise}${foamMarkup}${nested}</g>`
}

export interface WaveSurfOptions {
  /** geometry of the conveyor: count, wave height, track, duration, viewBox height.
   *  Comes from computeWaveQueue — see waveQueueLayout.ts. */
  layout: WaveQueueLayout
  /** one-way horizontal drift amplitude per wave (canvas units); defaults to QUEUE_DRIFT */
  drift?: number
  /** wave width as a multiple of the viewBox (overspill); defaults to WAVE_WIDTH_SCALE.
   *  Must be >= 1 + 2·drift/1027 or the drift will pull a wave edge into frame. */
  widthScale?: number
  /** the Ocean Waves silhouettes (from loadOceanWaveShapes). Omit → queue is skipped. */
  shapes?: Record<string, OceanWaveShape>
}

// Static sea (balanced/lite tiers + prefers-reduced-motion): the art contains only the
// wave SILHOUETTES — the water plane was removed together with the old baked sea — so
// without the SMIL conveyor the gaps between waves show whatever lies BEHIND the beach.
// Paint the same over-wide water rect the conveyor uses (behind the baked waves), and
// extend the viewBox/clip the same way so the water runs below the fold. No animations.
//
// Takes the viewBox height as a NUMBER, not a WaveQueueLayout: the balanced/lite tiers
// never load the silhouettes, so no layout exists for them — and a static sea has no
// conveyor whose geometry could matter. They pass BEACH_ART_H (the art, unextended) and
// let the parallax + terminal fill close the rest; the conveyor path passes
// layout.beachViewH so the water follows the queue down.
export function injectStaticSea(beachSvg: string, beachViewH: number): string {
  const viewH = beachViewH
  let out = beachSvg
  out = out.replace(/viewBox="0 0 1027 3614"/, `viewBox="0 0 ${VIEWBOX_W} ${viewH}"`)
  out = out.replace(
    /<rect width="1027" height="3614" fill="white"\/>/,
    `<rect width="${VIEWBOX_W}" height="${viewH}" fill="white"/>`,
  )
  const sea = seaBaseRect(viewH)
  const at = out.indexOf('<g id="b2-type 1 wave')
  if (at !== -1) return out.slice(0, at) + sea + out.slice(at)
  const end = out.lastIndexOf('</svg>')
  return end !== -1 ? out.slice(0, end) + sea + out.slice(end) : out
}

// Bake the surf SMIL into the (already b2-prefixed) beach SVG string.
// Under prefers-reduced-motion: static sea instead (project convention).
export function injectWaveSurfAnimation(beachSvg: string, options: WaveSurfOptions): string {
  const { layout } = options
  if (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ) {
    return injectStaticSea(beachSvg, layout.beachViewH)
  }

  const drift = options.drift ?? QUEUE_DRIFT
  const widthScale = options.widthScale ?? WAVE_WIDTH_SCALE
  let out = beachSvg

  // Extend the beach DOWN so the conveyor that runs below the art stops being clipped —
  // one continuous sea, no second <svg>, so there is no seam. TWO things clip it and both
  // must grow together: the viewBox, and the root group's clipPath (Figma wraps the scene
  // in `<g clip-path=…>` over a 1027×3614 rect). Widening only the viewBox leaves the extra
  // strip EMPTY. layout.beachViewH is floored at BEACH_ART_H, so this never CROPS the art.
  const viewH = layout.beachViewH
  out = out.replace(/viewBox="0 0 1027 3614"/, `viewBox="0 0 ${VIEWBOX_W} ${viewH}"`)
  out = out.replace(
    /<rect width="1027" height="3614" fill="white"\/>/,
    `<rect width="${VIEWBOX_W}" height="${viewH}" fill="white"/>`,
  )

  // ── type-2 → lift the foam OUT of the beach; it is re-attached to two queue waves below ──
  const foamHtml: Record<string, string> = {}
  for (const id of FOAM_SHAPES) {
    const span = groupSpan(out, `b2-${id}`)
    if (!span) continue
    foamHtml[id] = out.slice(span[0], span[1])
    out = out.slice(0, span[0]) + out.slice(span[1])
  }

  // ── type-1 → the queue (only when the Ocean Waves shapes are provided) ──
  if (options.shapes) {
    const queueCount = layout.n
    // Spread the foam slots evenly over the queue, so their waves (and therefore their jumps,
    // which are phase-locked to each wave) are staggered in time as well as in space.
    const foamK: Record<number, number> = {}
    const foamCount = Math.min(FOAM_SLOTS.length, queueCount)
    for (let i = 0; i < foamCount; i++) {
      const k = Math.floor(((i + 0.5) * queueCount) / foamCount)
      if (foamK[k] === undefined) foamK[k] = i
    }

    // Remove the old baked-in type-1 groups; keep a placeholder where the first one was so the
    // queue paints in the same z-position.
    const snapshot = out
    const blocks: string[] = []
    for (const id of OCEAN_WAVE_IDS) {
      const span = groupSpan(snapshot, `b2-${id}`)
      if (span) blocks.push(snapshot.slice(span[0], span[1]))
    }
    const PLACEHOLDER = '<!--__WAVE_QUEUE__-->'
    blocks.forEach((block, i) => { out = out.replace(block, i === 0 ? PLACEHOLDER : '') })

    let queue = ''
    // Lay out NEAR→FAR (first child = nearest shore = back = LOW z), so the farther a wave is
    // the higher its z. Instance k is at phase k/N at load, so k=queueCount-1 (nearest) goes
    // first. Correct at load; useWaveDepthOrder keeps it correct on each wrap.
    for (let k = queueCount - 1; k >= 0; k--) {
      const si = foamK[k]
      const slot = si !== undefined ? FOAM_SLOTS[si] : undefined
      const shapeId = slot ? FOAM_SHAPES[slot.shape] : undefined
      const foam = slot && shapeId && foamHtml[shapeId]
        ? { id: shapeId, html: foamHtml[shapeId], x0: slot.x0, scale: slot.scale, flip: slot.flip }
        : undefined
      queue += buildQueueInstance(options.shapes, k, layout, drift, widthScale, foam)
    }
    // The sea base goes in FRONT of the queue group in document order, i.e. painted first =
    // behind every wave, so gaps show water instead of whatever lies behind the beach.
    const queueGroup = `${seaBaseRect(viewH)}<g class="beach-wave-queue">${queue}</g>`

    if (out.includes(PLACEHOLDER)) out = out.replace(PLACEHOLDER, queueGroup)
    else {
      // No old groups found — inject before the first foam group, else before the last </svg>.
      const foamAt = out.indexOf('<g id="b2-type 2 wave')
      const at = foamAt !== -1 ? foamAt : out.lastIndexOf('</svg>')
      if (at !== -1) out = out.slice(0, at) + queueGroup + out.slice(at)
    }
  }

  return out
}


// The water itself, painted BEHIND the waves. Over-wide so the waves' drift can never pull an
// edge into frame. Its bottom follows the viewBox, so the sea always reaches the art's bottom
// edge — which is the colour the terminal fill band samples.
// A `tpl` + `tpl` chain is safe here (unlike the old fixed-height version, see the
// `project_turbopack_template_fold_bug` memory): Turbopack's prod minifier only mis-folds
// FULLY-CONSTANT template concatenations, and `seaBottom` is now a runtime parameter, so this
// expression is no longer constant-foldable.
function seaBaseRect(seaBottom: number): string {
  return (
    `<rect x="${-2 * VIEWBOX_W}" y="${SEA_BASE_TOP}" width="${5 * VIEWBOX_W}" ` +
    `height="${seaBottom - SEA_BASE_TOP}" fill="${SEA_BASE_COLOR}"/>`
  )
}
