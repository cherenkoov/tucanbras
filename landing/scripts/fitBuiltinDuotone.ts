// Which duotone pairs can a BUILT-IN filter chain reach on WebKit?
//
// WebKit gives us nothing else: url(#) inside backdrop-filter paints blank, and the
// element's own filter does not touch the backdrop image either (both device-verified
// 2026-08-09). So the brand colour has to come out of the backdrop chain itself.
//
// THE CLAMP IS THE WHOLE GAME. WebKit does not clamp between filter functions, so
// contrast(50) leaves ±20-ish values that ride through the chain and only clamp at the
// end — any tint after it is inert. A blur() forces rasterisation, which DOES clamp
// (device-verified 2026-08-09 via ?duoblur=1), and that changes what is reachable:
//
//   WITHOUT a barrier: after the binarise both poles are grays, and every remaining
//     built-in is either an offset-free matrix (sepia/saturate/hue-rotate) or a scalar
//     (brightness), so both poles sit on ONE ray through colour space — one hue at two
//     lightnesses. Green+blue is unreachable, and `--simple` below still measures that.
//
//   WITH barriers: clamping is a per-channel non-linearity, and a contrast AFTER the tint
//     adds an offset that lifts the pair off the ray while a second matrix supplies a
//     second independent direction. That is a real search space, and this script searches
//     it — random restarts plus a pattern-search refine.
//
// Usage:
//   npm run fit:duotone-chain            → search the extended grammar for green↔blue
//   npm run fit:duotone-chain -- --simple → the old single-stage grammar, for the record
type V3 = [number, number, number]
const clamp = (v: number) => Math.min(1, Math.max(0, v))
const cl3 = (v: V3): V3 => [clamp(v[0]), clamp(v[1]), clamp(v[2])]
const mul = (m: number[][], v: V3): V3 => [
  m[0][0] * v[0] + m[0][1] * v[1] + m[0][2] * v[2],
  m[1][0] * v[0] + m[1][1] * v[1] + m[1][2] * v[2],
  m[2][0] * v[0] + m[2][1] * v[1] + m[2][2] * v[2],
]

// Filter Effects matrices, verbatim from the spec.
const sepia = (a: number) => [
  [0.393 + 0.607 * (1 - a), 0.769 - 0.769 * (1 - a), 0.189 - 0.189 * (1 - a)],
  [0.349 - 0.349 * (1 - a), 0.686 + 0.314 * (1 - a), 0.168 - 0.168 * (1 - a)],
  [0.272 - 0.272 * (1 - a), 0.534 - 0.534 * (1 - a), 0.131 + 0.869 * (1 - a)],
]
const saturate = (s: number) => [
  [0.213 + 0.787 * s, 0.715 - 0.715 * s, 0.072 - 0.072 * s],
  [0.213 - 0.213 * s, 0.715 + 0.285 * s, 0.072 - 0.072 * s],
  [0.213 - 0.213 * s, 0.715 - 0.715 * s, 0.072 + 0.928 * s],
]
const hueRotate = (deg: number) => {
  const a = (deg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a)
  return [
    [0.213 + c * 0.787 - s * 0.213, 0.715 - c * 0.715 - s * 0.715, 0.072 - c * 0.072 + s * 0.928],
    [0.213 - c * 0.213 + s * 0.143, 0.715 + c * 0.285 + s * 0.140, 0.072 - c * 0.072 - s * 0.283],
    [0.213 - c * 0.213 - s * 0.787, 0.715 - c * 0.715 + s * 0.715, 0.072 + c * 0.928 + s * 0.072],
  ]
}

// One stage = contrast → sepia → saturate → hue-rotate → brightness. Two stages give the
// second independent direction the single-stage grammar lacks. `clamped` records whether a
// stage's output left [0,1]: those are exactly the places that need a blur barrier, and a
// chain that needs none is cheaper on the device.
type Stage = { c: number; sep: number; sat: number; hue: number; br: number }
const PARAMS_PER_STAGE = 5

// CRITICAL for verifiability: Chromium clamps after EVERY function, WebKit only where a
// blur forces rasterisation. The two engines therefore agree only if nothing leaves [0,1]
// mid-stage — escapes are allowed just at the stage END, where a barrier sits and both
// engines clamp at the same point. `midEscape` counts violations so the fit can be
// penalised; without it a chain could verify green in Chromium and paint mush on a phone.
function runStage(v: V3, st: Stage, barrier: boolean): { v: V3; escaped: boolean; midEscape: number } {
  const out = (n: number) => (n < -1e-6 || n > 1 + 1e-6 ? 1 : 0)
  let mid = 0
  let x: V3 = [v[0] * st.c + (0.5 - 0.5 * st.c), v[1] * st.c + (0.5 - 0.5 * st.c), v[2] * st.c + (0.5 - 0.5 * st.c)]
  mid += x.reduce((a, n) => a + out(n), 0)
  x = mul(sepia(st.sep), x)
  mid += x.reduce((a, n) => a + out(n), 0)
  x = mul(saturate(st.sat), x)
  mid += x.reduce((a, n) => a + out(n), 0)
  x = mul(hueRotate(st.hue), x)
  mid += x.reduce((a, n) => a + out(n), 0)
  // brightness is the LAST function of the stage — the barrier lands right after it, so an
  // escape here is clamped identically by both engines and is not counted.
  x = [x[0] * st.br, x[1] * st.br, x[2] * st.br]
  const escaped = x.some(n => n < -1e-9 || n > 1 + 1e-9)
  return { v: barrier ? cl3(x) : x, escaped, midEscape: mid }
}

function runChain(pole: 0 | 1, stages: Stage[], barriers: boolean[]): { out: V3; needs: boolean[]; midEscape: number } {
  let v: V3 = pole === 1 ? [1, 1, 1] : [0, 0, 0]
  const needs: boolean[] = []
  let midEscape = 0
  stages.forEach((st, i) => {
    const r = runStage(v, st, barriers[i])
    v = r.v
    needs.push(r.escaped)
    midEscape += r.midEscape
  })
  return { out: cl3(v), needs, midEscape }
}

const hex = (h: string): V3 => [
  parseInt(h.slice(1, 3), 16) / 255,
  parseInt(h.slice(3, 5), 16) / 255,
  parseInt(h.slice(5, 7), 16) / 255,
]
const toHex = (v: V3) => '#' + v.map(x => Math.round(x * 255).toString(16).padStart(2, '0')).join('')
const err = (a: V3, b: V3) => Math.hypot((a[0] - b[0]) * 255, (a[1] - b[1]) * 255, (a[2] - b[2]) * 255)

const BOUNDS: [number, number][] = [[0.01, 3], [0, 1], [0, 8], [0, 360], [0.05, 3]]
const rnd = (lo: number, hi: number) => lo + Math.random() * (hi - lo)

function toStages(p: number[], n: number): Stage[] {
  const out: Stage[] = []
  for (let i = 0; i < n; i++) {
    const b = i * PARAMS_PER_STAGE
    out.push({ c: p[b], sep: p[b + 1], sat: p[b + 2], hue: p[b + 3], br: p[b + 4] })
  }
  return out
}

function score(p: number[], n: number, barriers: boolean[], t1: V3, t0: V3): number {
  const s = toStages(p, n)
  const r1 = runChain(1, s, barriers)
  const r0 = runChain(0, s, barriers)
  // Heavy penalty, not a hard reject: the optimiser needs a gradient out of the bad region.
  const penalty = 40 * (r1.midEscape + r0.midEscape)
  return err(r1.out, t1) + err(r0.out, t0) + penalty
}

// Random restarts + pattern search. The objective is 2 vectors through a short chain, so
// evaluation is trivially cheap and brute force beats being clever here.
function fit(t1: V3, t0: V3, nStages: number, barriers: boolean[], restarts: number) {
  const dim = nStages * PARAMS_PER_STAGE
  let best: number[] = []
  let bestE = Infinity
  for (let r = 0; r < restarts; r++) {
    const p: number[] = []
    for (let i = 0; i < dim; i++) { const b = BOUNDS[i % PARAMS_PER_STAGE]; p.push(rnd(b[0], b[1])) }
    let e = score(p, nStages, barriers, t1, t0)
    let step = 0.35
    while (step > 1e-4) {
      let improved = false
      for (let i = 0; i < dim; i++) {
        const b = BOUNDS[i % PARAMS_PER_STAGE]
        const span = b[1] - b[0]
        for (const d of [step, -step]) {
          const q = p.slice()
          q[i] = Math.min(b[1], Math.max(b[0], q[i] + d * span))
          const qe = score(q, nStages, barriers, t1, t0)
          if (qe < e - 1e-9) { p[i] = q[i]; e = qe; improved = true }
        }
      }
      if (!improved) step *= 0.5
    }
    if (e < bestE) { bestE = e; best = p.slice() }
  }
  return { params: best, e: bestE }
}

function chainCss(stages: Stage[], barriers: boolean[]): string {
  const parts = ['grayscale(1) brightness(0.714) contrast(50) invert(1)', 'blur(0.5px)']
  stages.forEach((st, i) => {
    parts.push(`contrast(${st.c.toFixed(3)})`)
    if (st.sep > 0.005) parts.push(`sepia(${st.sep.toFixed(3)})`)
    parts.push(`saturate(${st.sat.toFixed(3)})`, `hue-rotate(${st.hue.toFixed(1)}deg)`, `brightness(${st.br.toFixed(3)})`)
    if (barriers[i] && i < stages.length - 1) parts.push('blur(0.5px)')
  })
  return parts.join(' ')
}

function report(label: string, t1hex: string, t0hex: string, nStages: number, barriers: boolean[], restarts: number) {
  const t1 = hex(t1hex), t0 = hex(t0hex)
  const { params, e } = fit(t1, t0, nStages, barriers, restarts)
  const stages = toStages(params, nStages)
  const r1 = runChain(1, stages, barriers)
  const r0 = runChain(0, stages, barriers)
  console.log(`\n${label}`)
  console.log(`  want   darkBg ${t1hex}   lightBg ${t0hex}`)
  console.log(`  got    darkBg ${toHex(r1.out)}   lightBg ${toHex(r0.out)}`)
  console.log(`  err    ${err(r1.out, t1).toFixed(1)} / ${err(r0.out, t0).toFixed(1)}  (0-255 distance)`)
  const needed = r1.needs.map((n, i) => n || r0.needs[i])
  console.log(`  barrier needed after stage: ${needed.map((n, i) => (n ? i + 1 : '')).filter(Boolean).join(', ') || 'none'}`)
  const mid = r1.midEscape + r0.midEscape
  console.log(`  mid-stage escapes: ${mid}${mid ? '  ← engines will DISAGREE, chain not usable' : '  (Chromium and WebKit agree)'}`)
  console.log(`  chain  ${chainCss(stages, barriers)}`)
  return e
}

const GREEN = '#8fd096'   // what a DARK backdrop must resolve to
const BLUE = '#2e67b2'    // what a LIGHT backdrop must resolve to

if (process.argv.includes('--simple')) {
  // The pre-barrier world, kept so the old limit stays measurable: ONE stage, no clamping
  // between functions. Both poles are stuck on a single ray — green+blue cannot be fitted.
  console.log('SINGLE STAGE, no clamp barrier (what WebKit did before ?duoblur):')
  report('green ↔ blue  (two hues — expected to fail)', GREEN, BLUE, 1, [false], 400)
  report('green ↔ green-dark  (one hue — expected to fit)', GREEN, '#6a906e', 1, [false], 400)
} else {
  console.log('WITH clamp barriers (blur forces rasterisation → clamp; device-verified):')
  report('green ↔ blue, 1 stage', GREEN, BLUE, 1, [true], 600)
  report('green ↔ blue, 2 stages', GREEN, BLUE, 2, [true, true], 900)
  report('green ↔ blue, 3 stages', GREEN, BLUE, 3, [true, true, true], 900)
}
