import assert from 'node:assert/strict'
import { buildSilhouetteMask, computeMaskPlacement } from '../components/ui/adaptiveHeadingMask'

// ── buildSilhouetteMask ──────────────────────────────────────────────────────
const mask = buildSilhouetteMask({
  paths: ['M0 0 H100 V50 H0 Z'],
  bbox: { x: 0, y: 0, w: 100, h: 50 },
  featherUnits: 4,
})

// pad = ceil(feather * 3) = 12, applied symmetrically around the bbox
assert.equal(mask.padUnits, 12, 'pad = ceil(feather*3)')
assert.ok(mask.dataUri.startsWith('url("data:image/svg+xml,'), 'data-uri wrapper')

const PREFIX = 'url("data:image/svg+xml,'
const decoded = decodeURIComponent(mask.dataUri.slice(PREFIX.length, -2))
assert.ok(decoded.includes('<path d="M0 0 H100 V50 H0 Z"/>'), 'path included')
assert.ok(decoded.includes('feGaussianBlur stdDeviation="4"'), 'blur uses feather units')
assert.ok(decoded.includes('viewBox="-12 -12 124 74"'), 'viewBox padded on all sides')

// raw '#' would break the data-URI — it must be percent-encoded
assert.ok(!mask.dataUri.includes('#000'), 'no raw # in data-uri')
assert.ok(mask.dataUri.includes('%23000'), 'fill hash percent-encoded')

// multiple paths, zero feather
const m2 = buildSilhouetteMask({
  paths: ['M0 0 H10', 'M5 5 H8'],
  bbox: { x: 0, y: 0, w: 10, h: 10 },
  featherUnits: 0,
})
const d2 = decodeURIComponent(m2.dataUri.slice(PREFIX.length, -2))
assert.ok(d2.includes('<path d="M0 0 H10"/>') && d2.includes('<path d="M5 5 H8"/>'), 'both paths emitted')
assert.equal(m2.padUnits, 0, 'zero feather => zero pad')

// ── computeMaskPlacement ─────────────────────────────────────────────────────
// figure rendered 200px wide from a 100-unit bbox => scale 2; pad 12 units => 24px
const pl = computeMaskPlacement({
  figureRect: { left: 300, top: 500, width: 200, height: 100 },
  headingOrigin: { left: 50, top: 400 },
  bbox: { x: 0, y: 0, w: 100, h: 50 },
  padUnits: 12,
})
assert.equal(pl.sizeW, 200 + 2 * 24, 'sizeW = figW + 2*padPx') // 248
assert.equal(pl.sizeH, 100 + 2 * 24, 'sizeH = figH + 2*padPx') // 148
assert.equal(pl.posX, 300 - 24 - 50, 'posX = figLeft - padPx - headLeft') // 226
assert.equal(pl.posY, 500 - 24 - 400, 'posY = figTop - padPx - headTop') // 76

console.log('verifyAdaptiveMask: all assertions passed')
