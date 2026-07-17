import assert from 'node:assert/strict'
import { computeCoverage } from '../components/ui/background/backgroundCoverage'

const config = {
  maxZoom: 1.6, maxZoomWide: 1.6, focalX: 0.45, minP: 0.3,
  focalAnchorNarrow: 0.5, focalAnchorWide: 0.78, focalAnchorStart: 520, focalAnchorEnd: 768,
}
const approx = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) <= eps

// ── Desktop / wide: zoom alone covers, no parallax, no fill, no focal shift ──
// natural 8700, content 8000 → zoomFull < 1 → clamp to 1.
{
  const r = computeCoverage({
    naturalHeight: 8700, contentHeight: 8000,
    viewportHeight: 900, viewportWidth: 1440,
    motionEnabled: true, config,
  })
  assert.equal(r.zoom, 1, 'wide: zoom clamps to 1')
  assert.equal(r.parallaxFactor, 1, 'wide: p = 1')
  assert.equal(r.focalTranslateX, 0, 'wide: no focal shift at zoom 1')
  assert.equal(r.fillHeight, 0, 'wide: no fill')
  assert.equal(r.bgHeight, 8700, 'wide: H_bg = natural')
}

// ── Desktop needing slight zoom below the cap: zoom = zoomFull, p = 1 ──
// natural 8000, content 9600 → zoomFull = 1.2 (< 1.6) → zoom 1.2, full coverage.
{
  const r = computeCoverage({
    naturalHeight: 8000, contentHeight: 9600,
    viewportHeight: 900, viewportWidth: 1440,
    motionEnabled: true, config,
  })
  assert.ok(approx(r.zoom, 1.2), 'mid: zoom = zoomFull = 1.2')
  assert.equal(r.parallaxFactor, 1, 'mid: zoom below cap → p = 1')
  assert.equal(r.fillHeight, 0, 'mid: no fill')
  assert.ok(approx(r.bgHeight, 9600), 'mid: H_bg = content')
  // vw 1440 ≥ focalAnchorEnd → anchor = focalAnchorWide (0.78). Wanted translate
  // 0.78·1440 − 0.45·1728 = +345.6 > 0 → clamped to 0 (left edge flush, no strip).
  assert.equal(r.focalTranslateX, 0, 'mid: rightward anchor clamps to 0')
}

// ── Mobile, motion ON: cap hit, parallax engages, no fill ──
// natural 2300, content 9200, vp 800 → zoomFull = 4 → clamp 1.6 → H_bg = 3680.
// S = 9200 − 800 = 8400. pNeeded = (3680 − 800)/8400 = 0.342857… ∈ [0.3, 1].
{
  const r = computeCoverage({
    naturalHeight: 2300, contentHeight: 9200,
    viewportHeight: 800, viewportWidth: 375,
    motionEnabled: true, config,
  })
  assert.equal(r.zoom, 1.6, 'mobile: zoom clamps to cap')
  assert.ok(approx(r.bgHeight, 3680), 'mobile: H_bg = natural·cap')
  assert.ok(approx(r.parallaxFactor, (3680 - 800) / 8400), 'mobile: p = pNeeded')
  assert.equal(r.fillHeight, 0, 'mobile: parallax closes gap → no fill')
  assert.ok(approx(r.focalTranslateX, 375 / 2 - 0.45 * 375 * 1.6), 'mobile: focal formula')
}

// ── Extreme height, motion ON: pNeeded < minP → p floored, fill closes remainder ──
// natural 2300, content 30000, vp 800 → cap 1.6 → H_bg 3680. S = 29200.
// pNeeded = (3680 − 800)/29200 = 0.0986… < 0.3 → p = 0.3.
// fill = max(0, (vp + p·S) − H_bg) = (800 + 0.3·29200) − 3680 = 5880.
{
  const r = computeCoverage({
    naturalHeight: 2300, contentHeight: 30000,
    viewportHeight: 800, viewportWidth: 375,
    motionEnabled: true, config,
  })
  assert.equal(r.parallaxFactor, 0.3, 'extreme: p floored to minP')
  assert.ok(approx(r.fillHeight, (800 + 0.3 * 29200) - 3680), 'extreme: fill closes remainder')
}

// ── Reduced motion / weak device: p = 1, static terminal fill = content − H_bg ──
{
  const r = computeCoverage({
    naturalHeight: 2300, contentHeight: 9200,
    viewportHeight: 800, viewportWidth: 375,
    motionEnabled: false, config,
  })
  assert.equal(r.zoom, 1.6, 'reduced: zoom clamps to cap')
  assert.equal(r.parallaxFactor, 1, 'reduced: p = 1 (no scroll motion)')
  assert.ok(approx(r.fillHeight, 9200 - 3680), 'reduced: static fill = content − H_bg')
}

// ── Reduced motion but zoom already covers: no fill ──
{
  const r = computeCoverage({
    naturalHeight: 8000, contentHeight: 9600,
    viewportHeight: 900, viewportWidth: 1440,
    motionEnabled: false, config,
  })
  assert.ok(approx(r.zoom, 1.2), 'reduced-covered: zoom = zoomFull')
  assert.equal(r.fillHeight, 0, 'reduced-covered: zoom below cap → no fill')
}

// ── verticalOffset below the zoom cap ENGAGES parallax (the reported bug, option A) ──
// Sub-cap zoom (natural 8000, content 9600 → zoom 1.2, H_bg = 9600 == content). With no
// lift the art covers exactly (p = 1, no fill). Lifting the container 500px up creates a
// bottom deficit — previously left as a cream gap. Now parallax engages by the deficit
// and lags exactly 500px over the scroll, closing it with real art (fill stays 0).
{
  const base = {
    naturalHeight: 8000, contentHeight: 9600,
    viewportHeight: 900, viewportWidth: 1440,
    motionEnabled: true, config,
  }
  const flat = computeCoverage(base)
  assert.equal(flat.parallaxFactor, 1, 'no lift: no parallax')
  assert.equal(flat.fillHeight, 0, 'no lift: no fill')

  const S = 9600 - 900
  const lifted = computeCoverage({ ...base, verticalOffset: 500 })
  assert.ok(approx(lifted.parallaxFactor, (9600 - 900 - 500) / S), 'lift: parallax engages by the deficit')
  assert.ok(approx(lifted.fillHeight, 0), 'lift: parallax closes the gap → no fill')
  // Lag at the page bottom = (1 − p)·S = exactly the 500px lift.
  assert.ok(approx((1 - lifted.parallaxFactor) * S, 500), 'lift: bottom lag equals the lift')
}

// ── Reduced motion + lift: no scroll parallax, so the static band absorbs the lift ──
{
  const r = computeCoverage({
    naturalHeight: 2300, contentHeight: 9200,
    viewportHeight: 800, viewportWidth: 375,
    motionEnabled: false, config, verticalOffset: 350,
  })
  assert.equal(r.parallaxFactor, 1, 'reduced+lift: p = 1 (no scroll motion)')
  assert.ok(approx(r.fillHeight, 9200 - 3680 + 350), 'reduced+lift: static fill = content − H_bg + lift')
}

// ── verticalOffset with the parallax cap hit: fill = H_vp + p·S − H_bg + offset ──
// Reuse the extreme-height case (p floored to 0.3) and add a 400px lift.
{
  const r = computeCoverage({
    naturalHeight: 2300, contentHeight: 30000,
    viewportHeight: 800, viewportWidth: 375,
    motionEnabled: true, config, verticalOffset: 400,
  })
  assert.ok(
    approx(r.fillHeight, (800 + r.parallaxFactor * 29200) - 3680 + 400),
    'offset+parallax: fill adds the lift on top of the parallax remainder',
  )
}

// ── Focal clamp: a far-right focal on a low-zoom wide screen would over-shift ──
// zoom 1.2 → containerWidth = 1440·1.2 = 1728. Centring a focalX=0.9 column wants
// translateX = 720 − 0.9·1728 = −835.2, which would pull the right edge to 892.8 < vw
// (bare strip on the right). Clamp floors it at vw − containerWidth = 1440 − 1728 = −288,
// keeping the right edge flush at vw. Vertical coverage is unaffected.
{
  const r = computeCoverage({
    naturalHeight: 8000, contentHeight: 9600,
    viewportHeight: 900, viewportWidth: 1440,
    motionEnabled: true, config: { ...config, focalX: 0.9 },
  })
  assert.ok(approx(r.zoom, 1.2), 'clamp: zoom = 1.2')
  assert.ok(approx(r.focalTranslateX, 1440 - 1440 * 1.2), 'clamp: focal floored at vw − containerWidth')
}

// ── Focal clamp upper bound: a far-LEFT focal never shifts right past 0 ──
// focalX=0.05, zoom 1.2 → wants 720 − 0.05·1728 = 633.6 > 0; clamp caps at 0 so the
// left edge stays flush at 0 (no bare strip on the left).
{
  const r = computeCoverage({
    naturalHeight: 8000, contentHeight: 9600,
    viewportHeight: 900, viewportWidth: 1440,
    motionEnabled: true, config: { ...config, focalX: 0.05 },
  })
  assert.equal(r.focalTranslateX, 0, 'clamp: focal capped at 0')
}

// ── Horizontal framing curve: phone centred → tablet+ pushed right (ease-in) ──
// All three hit the zoom cap (natural 2300, content 9200 → zoomFull 4 → 1.6), so
// containerWidth = vw·1.6; focalX 0.5 keeps every result inside the clamp window.
const framing = (viewportWidth: number) =>
  computeCoverage({
    naturalHeight: 2300, contentHeight: 9200,
    viewportHeight: 800, viewportWidth,
    motionEnabled: true, config: { ...config, focalX: 0.5 },
  }).focalTranslateX

// Phone (vw 400 < start 520): anchor = 0.5 (centred). translate = 0.5·400 − 0.5·640.
assert.ok(approx(framing(400), 0.5 * 400 - 0.5 * 400 * 1.6), 'framing: phone centred (anchor 0.5)')
// Ease midpoint (vw 644): anchorT = 0.5 → eased 0.25 → anchor = 0.5 + 0.28·0.25 = 0.57.
assert.ok(approx(framing(644), 0.57 * 644 - 0.5 * 644 * 1.6), 'framing: midpoint eased anchor 0.57')
// Tablet (vw 768 = end): anchor = focalAnchorWide 0.78 (statue near the right edge).
assert.ok(approx(framing(768), 0.78 * 768 - 0.5 * 768 * 1.6), 'framing: tablet+ anchor 0.78')

// ── maxZoomWide: on wide screens the zoom ceiling is separate, so a shortened sea
// cannot be re-inflated by cover-zoom. The freed space goes to parallax instead. ──
const wideConfig = { ...config, maxZoom: 2.0, maxZoomWide: 1.0 }

// Wide + art shorter than the page: without maxZoomWide this would zoom to 1.92 and
// magnify every wave. With it, zoom stays 1 and the parallax picks the deficit up.
{
  const r = computeCoverage({
    naturalHeight: 5000, contentHeight: 9600,
    viewportHeight: 900, viewportWidth: 1440,
    motionEnabled: true, config: wideConfig,
  })
  assert.equal(r.zoom, 1, 'wide: zoom held at maxZoomWide')
  assert.equal(r.bgHeight, 5000, 'wide: H_bg = natural (no magnification)')
  const S = 9600 - 900
  assert.ok(approx(r.parallaxFactor, (5000 - 900) / S), 'wide: parallax engages on the deficit')
  assert.ok(r.parallaxFactor < 1, 'wide: parallax actually moves')
  assert.equal(r.fillHeight, 0, 'wide: parallax closes the gap → no flat band')
}

// Narrow keeps the ORIGINAL maxZoom — mobile still relies on cover-zoom.
{
  const r = computeCoverage({
    naturalHeight: 2300, contentHeight: 9200,
    viewportHeight: 800, viewportWidth: 375,
    motionEnabled: true, config: wideConfig,
  })
  assert.equal(r.zoom, 2.0, 'narrow: still uses maxZoom, not maxZoomWide')
}

// Exactly ON the breakpoint counts as wide.
{
  const r = computeCoverage({
    naturalHeight: 5000, contentHeight: 9600,
    viewportHeight: 900, viewportWidth: 1024,
    motionEnabled: true, config: wideConfig,
  })
  assert.equal(r.zoom, 1, 'breakpoint 1024 is wide')
}

// ONE PIXEL below it is narrow. Pairs with the case above to pin the breakpoint from
// both sides: the 375 test alone is satisfied by any ceiling between 376 and 1024, so
// an off-by-one (`>= WIDE_BREAKPOINT - 1`) would pass everything else here.
{
  const r = computeCoverage({
    naturalHeight: 5000, contentHeight: 9600,
    viewportHeight: 900, viewportWidth: 1023,
    motionEnabled: true, config: wideConfig,
  })
  assert.equal(r.zoom, 1.92, '1023 is narrow: zoomFull passes through, uncapped by maxZoomWide')
}

console.log('verifyBackgroundCoverage: all assertions passed')
