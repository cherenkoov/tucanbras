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

  // The wall is gone: on desktop a wave is now ~0.30 of the screen, not ~1.0 of it.
  assert.ok(dPx / desktop.viewportHeight < 0.35, 'desktop wave is no longer a full screen tall')

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

// ── Phones keep (approximately) the size AND density they have today. Comparing
// against WAVE_H_VH_NARROW · vh directly would just restate the constant under test
// (phonePx reduces to exactly that, independent of aspects/containerWidth/vScaleY) —
// so instead compare against the OLD geometry computed an entirely different way. ──
{
  const phone = computeWaveQueue({
    viewportWidth: 375, viewportHeight: 900, containerWidth: 375, vScaleY: 1.2,
    aspects: ASPECTS, contentHeight: 40000, baseHeightPx: 1000, verticalOffset: 0,
  })
  const phonePx = phone.thUnits * (375 / 1027) * 1.2

  // 0.23 is a ROUNDING of what phones render today: the old geometry was
  // thUnits = WAVE_HEIGHT_REF_W · meanAspect = 1027 · 1.5 · 0.311389, and on a
  // 375×900 phone that renders 210.3px. Assert against that number computed the OLD
  // way — comparing against WAVE_H_VH_NARROW · vh would just restate the constant.
  const oldThUnits = 1027 * 1.5 * 0.311389
  const oldPhonePx = oldThUnits * (375 / 1027) * 1.2   // 210.3
  assert.ok(
    Math.abs(phonePx / oldPhonePx - 1) < 0.02,
    `phone wave within 2% of today (got ${phonePx.toFixed(1)} vs ${oldPhonePx.toFixed(1)})`,
  )

  // Density: today's step is QUEUE_TRAVEL / QUEUE_COUNT_DEFAULT = 1150 / 14 = 82.1
  // canvas units. STEP_RATIO_NARROW (0.17) exists specifically to keep phones at
  // roughly that density instead of inheriting the desktop-tuned 0.50.
  const oldStepUnits = 1150 / 14
  assert.ok(
    Math.abs(phone.stepUnits / oldStepUnits - 1) < 0.05,
    `phone step within 5% of today's density (got ${phone.stepUnits.toFixed(1)} vs ${oldStepUnits.toFixed(1)})`,
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

// ── beachViewH never crops the authored beach art ──
{
  const r = computeWaveQueue({
    ...desktop, contentHeight: 1000, baseHeightPx: 5000, verticalOffset: 0,
  })
  assert.equal(r.beachViewH, BEACH_ART_H, 'short queue: viewBox floored at the art height 3614')
  assert.ok(r.beachViewH >= BEACH_ART_H, 'viewBox never below the art height')
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

// ── A zoomed phone floors at the art height instead, and that is CORRECT, not a bug.
// Cover-zoom makes every canvas unit taller in px, so a 12-wave queue spans fewer units
// and asks for a viewBox (~3611) marginally BELOW the art (3614) — the floor takes over.
// Pinned because it lands 3 units from the boundary: a future STEP_RATIO_NARROW nudge
// flips this case, and the floor is the only thing keeping the beach art uncropped. ──
{
  const r = computeWaveQueue({
    ...mobileZoomed, contentHeight: 40000, baseHeightPx: 1000, verticalOffset: 0,
  })
  assert.equal(r.n, N_CAP_NARROW, 'zoomed phone: still capped at 12')
  assert.equal(r.beachViewH, BEACH_ART_H, 'zoomed phone: viewBox floored at the art height')
  assert.ok(
    r.spawnCy + r.thMax / 2 + 60 < BEACH_ART_H,
    'the floor is what is binding here, not the queue',
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
