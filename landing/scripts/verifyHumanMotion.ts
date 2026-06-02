import assert from 'node:assert/strict'
import {
  progressFor,
  facingFor,
  gait,
  zForProgress,
} from '../components/ui/background/humanMotion'
import { HUMANS } from '../components/ui/background/humanPaths'

// progressFor wraps into [0,1)
assert.equal(progressFor(0, 10, 0), 0)
assert.ok(Math.abs(progressFor(5, 10, 0) - 0.5) < 1e-9)
assert.ok(Math.abs(progressFor(15, 10, 0) - 0.5) < 1e-9, 'wraps past one lap')
assert.ok(Math.abs(progressFor(0, 10, 0.25) - 0.25) < 1e-9, 'phase offset')

// facingFor: deadzone holds the previous facing
assert.equal(facingFor(2, -1, 0.5), 1)
assert.equal(facingFor(-2, 1, 0.5), -1)
assert.equal(facingFor(0.1, 1, 0.5), 1, 'inside deadzone -> keep last (+1)')
assert.equal(facingFor(0.1, -1, 0.5), -1, 'inside deadzone -> keep last (-1)')

// gait: neutral at sin=0; sx narrows while sy stretches
const g0 = gait(0, 0.1, 0.05, 9, 0)
assert.ok(Math.abs(g0.sx - 1) < 1e-9 && Math.abs(g0.sy - 1) < 1e-9, 'neutral frame')
const gQ = gait(Math.PI / 2 / 9, 0.1, 0.05, 9, 0) // sin(omega*t)=1
assert.ok(gQ.sy > 1 && gQ.sx < 1, 'stretch => taller & narrower')

// zForProgress: human 3 behind house 6 inside window, base outside
const h3 = HUMANS.find((h) => h.id === 'human 3')!
assert.equal(zForProgress(0.9, h3.baseZ, h3.layerToggles), 2)
assert.equal(zForProgress(0.5, h3.baseZ, h3.layerToggles), 4)
const h4 = HUMANS.find((h) => h.id === 'human 4')!
assert.equal(zForProgress(0.7, h4.baseZ, h4.layerToggles), 6)
assert.equal(zForProgress(0.2, h4.baseZ, h4.layerToggles), 4)
const h1 = HUMANS.find((h) => h.id === 'human 1')!
assert.equal(zForProgress(0.5, h1.baseZ, h1.layerToggles), 6, 'human 1 always front')

// data integrity
assert.equal(HUMANS.length, 4)
for (const h of HUMANS) {
  assert.ok(h.d.startsWith('M') && /Z\s*$/.test(h.d), `${h.id}: path must be closed`)
  for (const t of h.layerToggles) {
    assert.ok(
      t.range[0] >= 0 && t.range[1] <= 1 && t.range[0] < t.range[1],
      `${h.id}: toggle range must be within [0,1]`
    )
  }
}

// regression guard vs scripts/computeMarkerProgress.mjs
assert.deepEqual(h3.layerToggles[0].range, [0.858, 1.0])
assert.deepEqual(h4.layerToggles[0].range, [0.572, 0.87])

console.log('verifyHumanMotion: all assertions passed')
