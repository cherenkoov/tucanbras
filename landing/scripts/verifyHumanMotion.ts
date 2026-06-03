import assert from 'node:assert/strict'
import {
  progressFor,
  facingFor,
  gait,
  zForProgress,
} from '../components/ui/background/humanMotion'
import { HUMANS, Z_RED, Z_YELLOW, Z_BLUE } from '../components/ui/background/humanPaths'

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

// z-state ordering sanity
assert.ok(Z_BLUE < Z_YELLOW && Z_YELLOW < Z_RED, 'blue < yellow < red')

const h = (id: string) => HUMANS.find((x) => x.id === id)!

// human 1: big arc RED, small arc [0.362,0.465] YELLOW
assert.equal(zForProgress(0.40, h('human 1').baseZ, h('human 1').layerToggles), Z_YELLOW)
assert.equal(zForProgress(0.20, h('human 1').baseZ, h('human 1').layerToggles), Z_RED)

// human 2: whole loop RED
assert.equal(zForProgress(0.10, h('human 2').baseZ, h('human 2').layerToggles), Z_RED)
assert.equal(zForProgress(0.90, h('human 2').baseZ, h('human 2').layerToggles), Z_RED)

// human 3: big arc RED, small arc [0.662,0.863] BLUE
assert.equal(zForProgress(0.75, h('human 3').baseZ, h('human 3').layerToggles), Z_BLUE)
assert.equal(zForProgress(0.50, h('human 3').baseZ, h('human 3').layerToggles), Z_RED)

// human 4: big arc RED, small arc [0.572,0.870] BLUE
assert.equal(zForProgress(0.70, h('human 4').baseZ, h('human 4').layerToggles), Z_BLUE)
assert.equal(zForProgress(0.20, h('human 4').baseZ, h('human 4').layerToggles), Z_RED)

// data integrity
assert.equal(HUMANS.length, 4)
for (const cfg of HUMANS) {
  assert.equal(cfg.baseZ, Z_RED, `${cfg.id}: big arc must be RED`)
  assert.ok(cfg.d.startsWith('M') && /Z\s*$/.test(cfg.d), `${cfg.id}: path must be closed`)
  for (const t of cfg.layerToggles) {
    assert.ok(
      t.range[0] >= 0 && t.range[1] <= 1 && t.range[0] < t.range[1],
      `${cfg.id}: toggle range must be within [0,1]`
    )
  }
}

// regression guard vs scripts/computeMarkerProgress.mjs
assert.deepEqual(h('human 1').layerToggles[0].range, [0.362, 0.465])
assert.deepEqual(h('human 3').layerToggles[0].range, [0.662, 0.863])
assert.deepEqual(h('human 4').layerToggles[0].range, [0.572, 0.87])

console.log('verifyHumanMotion: all assertions passed')
