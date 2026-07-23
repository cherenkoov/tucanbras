import assert from 'node:assert/strict'
import {
  addScroll,
  centreOrigin,
  easeToTarget,
  isOnScreen,
  isSettled,
  type SpinState,
} from '../components/ui/background/beachSpinnerMath'
import {
  BEACH_SPINNERS,
  SPIN_DEG_PER_PX,
  SPIN_EASE,
  SPIN_SETTLE_EPS,
  readViewBox,
} from '../components/ui/background/beachSpinners'

const rest = (): SpinState => ({ target: 0, current: 0 })
const settle = (s: SpinState, frames = 400) => {
  for (let i = 0; i < frames; i++) easeToTarget(s, SPIN_EASE)
  return s.current
}

// ── The rule: half turn one way, half the other; scrolling up reverses both ──────────────

// exactly half of the objects turn each way
{
  const cw = BEACH_SPINNERS.filter((s) => s.dir === 1).length
  const ccw = BEACH_SPINNERS.filter((s) => s.dir === -1).length
  assert.equal(cw, ccw, `the two halves must be equal (${cw} vs ${ccw})`)
  assert.equal(cw + ccw, BEACH_SPINNERS.length, 'every object belongs to a half')
  BEACH_SPINNERS.forEach((s, i) => {
    assert.equal(s.dir, i % 2 === 0 ? 1 : -1, `${s.id}: neighbours must turn against each other`)
  })
}

// scroll DOWN: the halves turn opposite ways
{
  const a = rest()
  const b = rest()
  addScroll(a, 500, SPIN_DEG_PER_PX, 1)
  addScroll(b, 500, SPIN_DEG_PER_PX, -1)
  assert.ok(a.target > 0, 'half A turns clockwise on the way down')
  assert.ok(b.target < 0, 'half B turns counter-clockwise on the way down')
  assert.equal(a.target, -b.target, 'the halves are exact mirrors')
}

// scroll UP: each half turns the OTHER way (the delta flips sign, so the angle unwinds)
{
  const a = rest()
  const b = rest()
  addScroll(a, -500, SPIN_DEG_PER_PX, 1)
  addScroll(b, -500, SPIN_DEG_PER_PX, -1)
  assert.ok(a.target < 0, 'half A turns counter-clockwise on the way up')
  assert.ok(b.target > 0, 'half B turns clockwise on the way up')
}

// down then all the way back up returns to where it started — no net drift
{
  const s = rest()
  for (let i = 0; i < 2000; i++) addScroll(s, 1, SPIN_DEG_PER_PX, 1)
  settle(s)
  assert.ok(s.current > 100, 'a long scroll down builds a real angle')
  for (let i = 0; i < 2000; i++) addScroll(s, -1, SPIN_DEG_PER_PX, 1)
  assert.ok(Math.abs(settle(s)) < 0.5, 'scrolling back up unwinds it symmetrically')
}

// ── The angle holds, and never caps ──────────────────────────────────────────────────────

{
  const s = rest()
  for (let i = 0; i < 4000; i++) addScroll(s, 1, SPIN_DEG_PER_PX, 1) // 4000px of scrolling
  assert.ok(s.target > 180, 'the angle keeps accumulating — there is no cap')
  const held = settle(s)
  assert.ok(Math.abs(settle(s) - held) < 1e-6, 'it holds its angle when the scroll stops')
  assert.ok(isSettled(s, SPIN_SETTLE_EPS), 'and the RAF loop can go idle')
}

// the rendered angle glides toward the target rather than snapping to it
{
  const s = rest()
  addScroll(s, 1000, SPIN_DEG_PER_PX, 1)
  const f1 = easeToTarget(s, SPIN_EASE)
  const f2 = easeToTarget(s, SPIN_EASE)
  assert.ok(f1 > 0 && f2 > f1 && f1 < s.target, 'it lags behind the scroll and catches up')
  assert.ok(Math.abs(settle(s) - s.target) < SPIN_SETTLE_EPS, 'and it does arrive')
}

// ── The axis is the object's own centre — it spins in place, it never travels ────────────

{
  // an object 100×200 at (200,1000) on a 1027×3614 canvas: its centre is (250,1100)
  const o = centreOrigin({ x: 200, y: 1000, width: 100, height: 200 }, { x: 0, y: 0, width: 1027, height: 3614 })
  assert.ok(Math.abs(o.x - (250 / 1027) * 100) < 1e-9, 'axis sits on the object centre x')
  assert.ok(Math.abs(o.y - (1100 / 3614) * 100) < 1e-9, 'axis sits on the object centre y')
}

{
  // BOUNDED overlay (viewBox = object's own box + 8u bleed): the origin must be taken
  // relative to the viewBox ORIGIN — here the object centre lands dead-centre of the box.
  const o = centreOrigin(
    { x: 200, y: 1000, width: 100, height: 200 },
    { x: 192, y: 992, width: 116, height: 216 },
  )
  assert.ok(Math.abs(o.x - 50) < 1e-9, 'bounded box: axis at 50% x')
  assert.ok(Math.abs(o.y - 50) < 1e-9, 'bounded box: axis at 50% y')
}

// ── The gate: an object turns while it is on screen, and only then ───────────────────────

{
  assert.equal(isOnScreen({ top: 1200, bottom: 1400 }, 900, 0), false, 'below the fold -> no')
  assert.equal(isOnScreen({ top: -500, bottom: -100 }, 900, 0), false, 'scrolled past -> no')
  assert.equal(isOnScreen({ top: 850, bottom: 1100 }, 900, 0), true, 'edge-entering -> yes')
  assert.equal(isOnScreen({ top: 1000, bottom: 1100 }, 900, 200), true, 'margin widens the gate')
}

// REGRESSION (the reported bug): the umbrellas never turned on screen. Their position used to
// be derived from getBBox × a hardcoded viewBox height, but the surf injection rewrites the
// beach viewBox, so every object was placed ~26% too far down: the umbrellas' gate only opened
// once they had scrolled off the TOP, so they did their turning where nobody could see it.
// The gate now measures the art, so these numbers are the ones the browser reports.
{
  const VIEW_H = 900
  const OBJ_TOP = 6602 // 'type 3 umbrella 01' at scrollY 0, measured in the browser
  const OBJ_H = 310
  const s = rest()
  let onScreen = 0
  let offScreen = 0
  let entryAngle: number | null = null

  for (let y = 1; y <= 9000; y++) {
    const top = OBJ_TOP - y
    const visible = isOnScreen({ top, bottom: top + OBJ_H }, VIEW_H, 0)
    if (visible) addScroll(s, 1, SPIN_DEG_PER_PX, 1)
    const before = s.current
    const moved = Math.abs(easeToTarget(s, SPIN_EASE) - before)
    if (visible) {
      if (entryAngle === null) entryAngle = before
      onScreen += moved
    } else if (entryAngle !== null) {
      offScreen += moved
    }
  }
  assert.ok(entryAngle !== null, 'the umbrella does come into view')
  assert.ok(Math.abs(entryAngle) < 0.5, `it enters at ~0deg, not already spun (${entryAngle})`)
  assert.ok(onScreen > 60, `it must turn WHILE ON SCREEN (only ${onScreen.toFixed(1)}deg — the bug)`)
  assert.ok(offScreen < 5, `and not do its turning out of sight (${offScreen.toFixed(1)}deg)`)
}

// speed: a visible drift, not a frantic wheel. One pass ≈ viewport + object height ≈ 1200px.
{
  const perPass = 1200 * SPIN_DEG_PER_PX
  assert.ok(perPass > 45, `a pass must be a visible turn (only ${perPass.toFixed(0)}deg)`)
  assert.ok(perPass < 180, `a pass must not spin it wildly (${perPass.toFixed(0)}deg)`)
}

// ── Config integrity ────────────────────────────────────────────────────────────────────

assert.equal(BEACH_SPINNERS.length, 20, '11 palms + 9 umbrellas = 20')
assert.equal(BEACH_SPINNERS.filter((s) => s.id.includes('palm')).length, 11, '11 palms')
assert.equal(BEACH_SPINNERS.filter((s) => s.id.includes('umbrella')).length, 9, '9 umbrellas')
const ids = BEACH_SPINNERS.map((s) => s.id)
assert.equal(new Set(ids).size, ids.length, 'no duplicate ids')
assert.ok(ids.includes('type 2 palm 04 '), 'trailing-space id preserved verbatim')

// readViewBox: the overlays take the beach's real viewBox, whatever it is today
assert.equal(readViewBox('<svg width="100%" viewBox="0 0 1027 4560">'), '0 0 1027 4560', 'reads it')
assert.equal(readViewBox('<svg width="100%">'), null, 'absent -> null, so we skip rather than guess')

console.log('verifyBeachSpinner: all assertions passed')
