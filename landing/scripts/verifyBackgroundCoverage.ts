import assert from 'node:assert/strict'
import { computeCoverage } from '../components/ui/background/backgroundCoverage'

const config = { maxZoom: 1.6, focalX: 0.45, minP: 0.3 }
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
  // zoom > 1 → focal engages: vw/2 − focalX·vw·zoom = 720 − 0.45·1440·1.2 = -57.6
  assert.ok(approx(r.focalTranslateX, 720 - 0.45 * 1440 * 1.2), 'mid: focal formula')
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

console.log('verifyBackgroundCoverage: all assertions passed')
