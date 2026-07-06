import assert from 'node:assert/strict'
import {
  spinStep,
  isSettled,
  originPercent,
  type SpinState,
} from '../components/ui/background/beachSpinnerMath'
import { BEACH_SPINNERS } from '../components/ui/background/beachSpinners'

// originPercent: centre of the full canvas is 50/50
{
  const o = originPercent({ x: 0, y: 0, width: 1027, height: 3614 }, 1027, 3614)
  assert.ok(Math.abs(o.x - 50) < 1e-9 && Math.abs(o.y - 50) < 1e-9, 'full-canvas centre = 50/50')
}

// originPercent: offset bbox centre
{
  const o = originPercent({ x: 250, y: 1600, width: 100, height: 100 }, 1027, 3614)
  assert.ok(Math.abs(o.x - (300 / 1027) * 100) < 1e-9, 'centre x %')
  assert.ok(Math.abs(o.y - (1650 / 3614) * 100) < 1e-9, 'centre y %')
}

// spring ease-IN: from rest the velocity accelerates over the first steps
{
  const s: SpinState = { target: 100, current: 0, velocity: 0 }
  const a1 = spinStep(s, 0.1, 0.82); const v1 = s.velocity
  const a2 = spinStep(s, 0.1, 0.82); const v2 = s.velocity
  assert.ok(a1 > 0 && a2 > a1, 'angle advances toward target')
  assert.ok(v2 > v1, 'velocity accelerates from rest -> ease-in')
}

// spring ease-OUT: settles at target after enough steps
{
  const s: SpinState = { target: 100, current: 0, velocity: 0 }
  for (let i = 0; i < 500; i++) spinStep(s, 0.1, 0.82)
  assert.ok(isSettled(s, 0.01), 'spring settles')
  assert.ok(Math.abs(s.current - 100) < 0.5, 'settles at target')
}

// spring reversal: a negative target unwinds below zero
{
  const s: SpinState = { target: -50, current: 0, velocity: 0 }
  for (let i = 0; i < 500; i++) spinStep(s, 0.1, 0.82)
  assert.ok(Math.abs(s.current + 50) < 0.5, 'reverses to negative target')
}

// isSettled: a mid-flight spring is not settled
{
  const s: SpinState = { target: 100, current: 0, velocity: 0 }
  spinStep(s, 0.1, 0.82)
  assert.ok(!isSettled(s, 0.01), 'mid-flight not settled')
}

// config data integrity
assert.equal(BEACH_SPINNERS.length, 20, '11 palms + 9 umbrellas = 20')
assert.equal(BEACH_SPINNERS.filter((s) => s.id.includes('palm')).length, 11, '11 palms')
assert.equal(BEACH_SPINNERS.filter((s) => s.id.includes('umbrella')).length, 9, '9 umbrellas')
for (const s of BEACH_SPINNERS) {
  assert.ok(s.dir === 1 || s.dir === -1, `${s.id}: dir must be ±1`)
}
const ids = BEACH_SPINNERS.map((s) => s.id)
assert.equal(new Set(ids).size, ids.length, 'no duplicate ids')
assert.ok(ids.includes('type 2 palm 04 '), 'trailing-space id preserved verbatim')

console.log('verifyBeachSpinner: math assertions passed')
