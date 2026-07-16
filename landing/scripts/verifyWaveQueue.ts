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
const mobile = {
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

// ── Phones keep exactly the size they have today. 0.23 was measured, not chosen:
// today's mean thUnits (1027 · 1.5 · 0.311389 ≈ 480) renders 480 · 375/1027 · 1.2 =
// 210px on a 375×900 phone. A regression here means phones visibly changed. ──
{
  const phone = computeWaveQueue({
    viewportWidth: 375, viewportHeight: 900, containerWidth: 375, vScaleY: 1.2,
    aspects: ASPECTS, contentHeight: 40000, baseHeightPx: 1000, verticalOffset: 0,
  })
  const phonePx = phone.thUnits * (375 / 1027) * 1.2
  assert.ok(approx(phonePx, 207, 1.5), `phone wave stays ~210px (got ${phonePx.toFixed(1)})`)
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
