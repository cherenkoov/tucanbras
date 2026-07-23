import assert from 'node:assert/strict'
import {
  computeWaveQueue, BEACH_ART_H, QUEUE_SHORE_CY, QUEUE_SPEED,
  N_CAP_WIDE, N_CAP_NARROW, N_MIN, WAVE_H_VH_WIDE, WAVE_H_VH_NARROW, TH_TUNED_REF,
} from '../components/ui/background/waveQueueLayout'

// h/w of the six Ocean Waves silhouettes (public/SVG/background/Ocean Waves/*.svg).
const ASPECTS = [0.320540, 0.326056, 0.299655, 0.307349, 0.364198, 0.250537]
const approx = (a: number, b: number, eps = 1e-3) => Math.abs(a - b) <= eps

const desktop = {
  viewportWidth: 1920, viewportHeight: 900, containerWidth: 1920, vScaleY: 1,
  aspects: ASPECTS,
}
// containerWidth == viewportWidth because the Task 1 probe measured zoom = 1.0 at every
// width on a production build — cover-zoom has never actually engaged.
const mobile = {
  viewportWidth: 375, viewportHeight: 800, containerWidth: 375, vScaleY: 1.2,
  aspects: ASPECTS,
}
// A phone whose cover-zoom DID engage. Below WIDE_BREAKPOINT maxZoom stays 2.0 (only wide
// screens get the 1.0 ceiling), and shortening the sea lowers naturalHeight, so zoomFull
// can climb past 1 here even though it never has before. Reachable, hence tested.
const mobileZoomed = {
  viewportWidth: 375, viewportHeight: 800, containerWidth: 750, vScaleY: 1.2,
  aspects: ASPECTS,
}

// ── Cap on desktop: a page far taller than the art still yields at most 6 waves ──
{
  const r = computeWaveQueue({
    ...desktop, contentHeight: 40000, baseHeightPx: 1000, verticalOffset: 0,
  })
  assert.equal(r.n, N_CAP_WIDE, 'desktop: wave count capped at 6')
}

// ── Cap on mobile: same starved page yields at most 12 ──
{
  const r = computeWaveQueue({
    ...mobile, contentHeight: 40000, baseHeightPx: 1000, verticalOffset: 0,
  })
  assert.equal(r.n, N_CAP_NARROW, 'mobile: wave count capped at 12')
}

// ── Floor: art already overshoots the page → the queue does not go below N_MIN ──
{
  const r = computeWaveQueue({
    ...desktop, contentHeight: 1000, baseHeightPx: 5000, verticalOffset: 0,
  })
  assert.equal(r.n, N_MIN, 'overshoot: wave count floored at 3')
}

// ── THE core property: a wave's PIXEL height is a fixed fraction of the VIEWPORT
// HEIGHT, independent of viewport WIDTH. That width-dependence was the bug: the Task 1
// probe measured one wave at 897px against a 900px viewport at 1920 (99.7% — the
// "wall") versus 210px at 375. The fraction differs by breakpoint on purpose (see
// WAVE_H_VH_WIDE / _NARROW): only desktop was broken, so only desktop moves. ──
{
  const d = computeWaveQueue({ ...desktop, contentHeight: 40000, baseHeightPx: 1000, verticalOffset: 0 })
  const m = computeWaveQueue({ ...mobile,  contentHeight: 40000, baseHeightPx: 1000, verticalOffset: 0 })
  const pxPerUnitY = (containerWidth: number, vScaleY: number) => (containerWidth / 1027) * vScaleY
  const dPx = d.thUnits * pxPerUnitY(desktop.containerWidth, desktop.vScaleY)
  const mPx = m.thUnits * pxPerUnitY(mobile.containerWidth, mobile.vScaleY)
  assert.ok(approx(dPx, WAVE_H_VH_WIDE * desktop.viewportHeight, 0.5), 'desktop: wave px = WAVE_H_VH_WIDE · vh')
  assert.ok(approx(mPx, WAVE_H_VH_NARROW * mobile.viewportHeight, 0.5), 'mobile: wave px = WAVE_H_VH_NARROW · vh')

  // The BUG was never "waves are large" — it was that their size tracked viewport WIDTH
  // (0.997 of the screen at 1920, 0.23 at 375, from the same constant). The fraction
  // itself is art direction and has since been dialled up 5x, so asserting it is small
  // would pin a preference. Assert the actual fix instead: the OLD width-driven formula
  // gives two different wave/screen ratios at 1920 vs 2560, ours gives one.
  const oldPxAt = (vw: number) => 1027 * 1.5 * 0.311389 * (vw / 1027)
  assert.ok(
    Math.abs(oldPxAt(1920) / 900 - oldPxAt(2560) / 900) > 0.3,
    'precondition: the old width-driven formula really did differ across widths',
  )

  // Width-independence WITHIN a tier is the real invariant — the same tier at two very
  // different widths must yield the same wave/screen ratio. (Across tiers it must NOT:
  // that difference is the deliberate 0.30 vs 0.23.)
  const d2 = computeWaveQueue({
    ...desktop, viewportWidth: 2560, containerWidth: 2560,
    contentHeight: 40000, baseHeightPx: 1000, verticalOffset: 0,
  })
  const d2Px = d2.thUnits * pxPerUnitY(2560, 1)
  assert.ok(
    approx(dPx / desktop.viewportHeight, d2Px / desktop.viewportHeight, 1e-6),
    '1920 and 2560 give the same wave/screen ratio — width no longer drives wave size',
  )
}

// ── Phones are their own tier. Both constants are split at WIDE_BREAKPOINT because the
// two tiers were measured to need different framing; the 5x size bump (2026-07-17) kept
// the split rather than collapsing it. Pin the RELATIONSHIP, not the absolute — an
// absolute here would just restate the constant under test (phonePx reduces to exactly
// WAVE_H_VH_NARROW · vh, independent of aspects/containerWidth/vScaleY). ──
{
  const phone = computeWaveQueue({
    viewportWidth: 375, viewportHeight: 900, containerWidth: 375, vScaleY: 1.2,
    aspects: ASPECTS, contentHeight: 40000, baseHeightPx: 1000, verticalOffset: 0,
  })
  const phonePx = phone.thUnits * (375 / 1027) * 1.2
  const deskPx = computeWaveQueue({
    ...desktop, contentHeight: 40000, baseHeightPx: 1000, verticalOffset: 0,
  }).thUnits * (1920 / 1027)

  // Phones stay SHORTER than desktop relative to their screen — the tiers must not
  // silently converge, which is what a single collapsed constant would do.
  assert.ok(
    phonePx / 900 < deskPx / 900,
    `phone wave is a smaller share of its screen than desktop's ` +
    `(${(phonePx / 900).toFixed(2)} vs ${(deskPx / 900).toFixed(2)})`,
  )
  assert.ok(
    approx(phonePx / 900, WAVE_H_VH_NARROW, 0.005),
    'phone wave height is exactly its tier fraction of the viewport',
  )

  // Density stays a tier decision too: phones are DENSER than desktop (0.17 vs 0.50),
  // which is what keeps their surf rhythm from thinning out. Ratio, not absolute —
  // the step scales with the wave, so the 5x bump moved both together.
  assert.ok(
    phone.thUnits / phone.stepUnits > 5,
    `phones keep the dense overlap (${(phone.thUnits / phone.stepUnits).toFixed(1)} waves deep)`,
  )
}

// ── WIDE_BREAKPOINT boundary: 1024 is both the branch edge and the tightest measured
// row (Task 1 probe: containerH == contentH == 9024 at 1024, zero headroom). Exactly
// at the boundary the WIDE tier must apply, not the narrow one. ──
{
  const r = computeWaveQueue({
    viewportWidth: 1024, viewportHeight: 900, containerWidth: 1024, vScaleY: 1,
    aspects: ASPECTS, contentHeight: 40000, baseHeightPx: 1000, verticalOffset: 0,
  })
  assert.ok(r.n <= N_CAP_WIDE, 'boundary 1024: wide cap applies (n <= 6)')
  const pxPerUnitY = (1024 / 1027) * 1
  const px = r.thUnits * pxPerUnitY
  assert.ok(approx(px, WAVE_H_VH_WIDE * 900, 0.5), 'boundary 1024: wave px uses WAVE_H_VH_WIDE')
}

// ── beachViewH never crops the authored beach art. The floor must hold for EVERY input,
// including the ones that ask for less than the art. ──
{
  // At the current 5x wave sizes the queue clears 3614 on its own even at N_MIN, so the
  // shortest possible desktop queue no longer reaches the floor — it can only be observed
  // binding on a small wave. Both cases are asserted: one where the floor is what decides
  // the viewBox, and one where the queue is.
  const overshoot = computeWaveQueue({
    ...desktop, contentHeight: 1000, baseHeightPx: 5000, verticalOffset: 0,
  })
  assert.ok(overshoot.beachViewH >= BEACH_ART_H, 'art overshoots the page: still never below the art height')

  const tiny = computeWaveQueue({
    viewportWidth: 1920, viewportHeight: 120, containerWidth: 1920, vScaleY: 1,
    contentHeight: 1000, baseHeightPx: 5000, verticalOffset: 0, aspects: ASPECTS,
  })
  assert.ok(
    tiny.spawnCy + tiny.thMax / 2 + 60 < BEACH_ART_H,
    'precondition: this queue asks for LESS than the art height',
  )
  assert.equal(tiny.beachViewH, BEACH_ART_H, 'and the floor overrides it — the art is never cropped')
}

// ── A long mobile queue pushes the viewBox PAST the floor ──
{
  const r = computeWaveQueue({
    ...mobile, contentHeight: 40000, baseHeightPx: 1000, verticalOffset: 0,
  })
  assert.equal(r.n, 12, 'mobile: at the cap')
  assert.ok(r.beachViewH > BEACH_ART_H, 'long queue: viewBox grows past the floor')
  assert.ok(approx(r.beachViewH, r.spawnCy + r.thMax / 2 + 60), 'viewBox = spawn + thMax/2 + SEA_MARGIN')
  assert.ok(approx(r.spawnCy, QUEUE_SHORE_CY + r.travel), 'spawn = shore + travel')
  assert.ok(approx(r.travel, r.n * r.stepUnits), 'travel = n · step')
}

// ── A phone whose cover-zoom engaged is still a legal, reachable state: below
// WIDE_BREAKPOINT the ceiling stays maxZoom 2.0, and shortening the sea lowers
// naturalHeight, so zoomFull can climb past 1 here even though the probe has never yet
// caught it doing so. Zoom makes every canvas unit taller in px, so the same wave spans
// FEWER units — the queue must shrink in canvas space and still stay legal. ──
{
  const r = computeWaveQueue({
    ...mobileZoomed, contentHeight: 40000, baseHeightPx: 1000, verticalOffset: 0,
  })
  const unzoomed = computeWaveQueue({
    ...mobile, contentHeight: 40000, baseHeightPx: 1000, verticalOffset: 0,
  })
  assert.equal(r.n, N_CAP_NARROW, 'zoomed phone: still capped at 12')
  assert.ok(r.beachViewH >= BEACH_ART_H, 'zoomed phone: never crops the art')
  assert.ok(
    r.thUnits < unzoomed.thUnits,
    'zoom buys taller px per unit, so the wave spans fewer canvas units',
  )
  // The px height is what the viewer sees, and it must NOT change with zoom — the
  // fraction of the screen is the invariant, canvas units are just the medium.
  const px = (l: typeof r, cw: number) => l.thUnits * (cw / 1027) * 1.2
  assert.ok(
    approx(px(r, 750), px(unzoomed, 375), 0.5),
    'the rendered wave is the same height zoomed or not',
  )
}

// ── Duration follows a CONSTANT speed: a shorter track means a shorter cycle,
// not slower waves. ──
{
  const r = computeWaveQueue({ ...desktop, contentHeight: 40000, baseHeightPx: 1000, verticalOffset: 0 })
  assert.ok(approx(r.durSeconds * QUEUE_SPEED, r.travel), 'dur · speed = travel')
  assert.ok(r.durSeconds > 0, 'dur is positive')
}

// ── waveScale drives the foam: it is the ratio to the height the foam was tuned for ──
{
  const r = computeWaveQueue({ ...desktop, contentHeight: 40000, baseHeightPx: 1000, verticalOffset: 0 })
  assert.ok(approx(r.waveScale, r.thUnits / TH_TUNED_REF), 'waveScale = thUnits / TH_TUNED_REF')
  // The invariant the foam scaling exists to protect: the foam's rest depth
  // (200 · waveScale) must stay inside the SHORTEST wave's box.
  const minTh = r.heightRefW * Math.min(...ASPECTS)
  assert.ok(200 * r.waveScale < minTh, 'foam rest depth stays inside the shortest wave')
  assert.ok(150 * r.waveScale < minTh, 'foam clip line stays inside the shortest wave')
}

// ── Degenerate measurement (pre-render): no NaN, safe fallback ──
{
  const r = computeWaveQueue({
    ...desktop, containerWidth: 0, contentHeight: 9000, baseHeightPx: 3600, verticalOffset: 0,
  })
  assert.equal(r.n, N_MIN, 'degenerate: falls back to N_MIN')
  assert.equal(r.beachViewH, BEACH_ART_H, 'degenerate: viewBox at the art floor')
  assert.ok(Number.isFinite(r.thUnits) && r.thUnits > 0, 'degenerate: no NaN in thUnits')
  assert.ok(Number.isFinite(r.durSeconds) && r.durSeconds > 0, 'degenerate: no NaN in dur')
}

console.log('verifyWaveQueue: all assertions passed')
