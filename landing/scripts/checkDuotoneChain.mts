// Guard: a duotone chain shipped to WebKit UNATTENDED must not depend on the one thing
// about WebKit we cannot detect — where it clamps.
//
// WebKit has no url(#) inside backdrop-filter and does not pass its backdrop image through
// the element's own filter, so a live sample there can only be tinted by BUILT-IN filter
// functions. Those are chained without clamping between them (Chromium clamps after every
// one), and `BACKDROP_BUILTIN_BRAND` buys the clamp back with `blur(0.5px)` barriers,
// because rasterising clamps. That was device-verified once (2026-08-09) and WRONG in
// production (owner report 2026-08-17: «надо чтобы были синий и зелёный, а вместо них
// чёрный и светло-синий») — on some WebKit build the barrier does not restore [0,1], the
// ±20…±1250 the binarise produces rides into the tint matrices, and the poles land on
// colours from nowhere near the palette.
//
// Nothing in JS can read back what the compositor painted, so this cannot be feature-
// detected at runtime. What CAN be checked, here and offline, is whether a chain's output
// is the SAME under every clamp semantics — if it is, the engine's behaviour stops
// mattering and the chain is safe to ship by default. This asserts exactly that:
//   • BACKDROP_BUILTIN (mono)  — clamp-independent → it is what WebKit gets by default;
//   • BACKDROP_BUILTIN_BRAND   — clamp-dependent   → it stays behind ?duobrand=1.
// If a refit ever makes the brand chain clamp-independent AND land on the palette, this
// fails on purpose: that is the day the default can move back, and the comments in
// useAdaptiveText.ts saying otherwise have to move with it.
//
//   npm run check:duotone-chain
import { BACKDROP_BUILTIN, BACKDROP_BUILTIN_BRAND, LIGHT_GREEN, BLUE } from '../components/ui/useAdaptiveText'

type V3 = [number, number, number]
type Bound = [number, number]

// How a barrier (blur → rasterise) may behave. 'full' is what the fit assumed; the others
// are what an extended-range or one-sided compositor buffer does instead.
const SEMANTICS: Record<string, Bound> = {
  full: [0, 1],                     // clamps both ends — the fitted assumption
  high: [-Infinity, 1],             // clips overshoot, lets negatives ride
  low: [0, Infinity],               // clips negatives, lets overshoot ride
  none: [-Infinity, Infinity],      // no rasterisation at all (blur folded away)
}

const clamp = (v: number, [lo, hi]: Bound) => Math.min(hi, Math.max(lo, v))
const mul = (m: number[][], v: V3): V3 => [
  m[0][0] * v[0] + m[0][1] * v[1] + m[0][2] * v[2],
  m[1][0] * v[0] + m[1][1] * v[1] + m[1][2] * v[2],
  m[2][0] * v[0] + m[2][1] * v[1] + m[2][2] * v[2],
]
// Filter Effects matrices, verbatim from the spec (same source as fitBuiltinDuotone.ts).
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

// The two poles the binarise produces are exact black and exact white, so the chain only
// ever has to be evaluated at those — every backdrop luminance resolves to one of them.
// `barriers` gives the semantics of each blur in order: they need not agree, and the pair
// that reproduces the production report is exactly a mismatched one.
function run(chain: string, pole: 0 | 1, barriers: Bound[]): V3 {
  let bi = 0
  let v: V3 = pole === 1 ? [1, 1, 1] : [0, 0, 0]
  for (const token of chain.trim().split(/\s+(?=[a-z-]+\()/)) {
    const m = token.match(/^([a-z-]+)\(([^)]*)\)$/)
    if (!m) throw new Error(`unparsable filter function: ${token}`)
    const [, name, arg] = m
    const n = parseFloat(arg)
    switch (name) {
      case 'grayscale': v = mul(saturate(1 - n), v); break
      case 'saturate': v = mul(saturate(n), v); break
      case 'sepia': v = mul(sepia(n), v); break
      case 'hue-rotate': v = mul(hueRotate(n), v); break
      case 'brightness': v = mul([[n, 0, 0], [0, n, 0], [0, 0, n]], v); break
      case 'contrast': v = v.map(x => x * n + (0.5 - 0.5 * n)) as V3; break
      case 'invert': v = v.map(x => x * (1 - 2 * n) + n) as V3; break
      // The only place the engines are known to differ: a barrier is a rasterisation, and
      // whether rasterising clamps (and at which end) is what this sweeps.
      case 'blur': { const b = barriers[bi++]; v = v.map(x => clamp(x, b)) as V3; break }
      default: throw new Error(`unknown filter function: ${name}`)
    }
  }
  // The final composite always clamps, on every engine.
  return v.map(x => clamp(x, [0, 1])) as V3
}

const hex = (v: V3) => '#' + v.map(x => Math.round(x * 255).toString(16).padStart(2, '0')).join('')
const near = (a: string, b: string) => {
  const ch = (s: string, i: number) => parseInt(s.slice(1 + i * 2, 3 + i * 2), 16)
  return [0, 1, 2].every(i => Math.abs(ch(a, i) - ch(b, i)) <= 2)
}

// dark backdrop → the palette's light side; light backdrop → its dark side.
const WANT = { dark: LIGHT_GREEN, light: BLUE }

// Every assignment of a semantics to every barrier in the chain, in order.
function assignments(n: number): [string, Bound][][] {
  const one = Object.entries(SEMANTICS) as [string, Bound][]
  let out: [string, Bound][][] = [[]]
  for (let i = 0; i < n; i++) out = out.flatMap(prefix => one.map(s => [...prefix, s]))
  return out
}

function evaluate(name: string, chain: string) {
  console.log(`\n${name}`)
  const barriers = (chain.match(/blur\(/g) ?? []).length
  const rows = assignments(barriers).map(a => ({
    label: a.map(([l]) => l).join('+') || '—',
    dark: hex(run(chain, 0, a.map(([, b]) => b))),
    light: hex(run(chain, 1, a.map(([, b]) => b))),
  }))
  const isPalette = (r: { dark: string; light: string }) => near(r.dark, WANT.dark) && near(r.light, WANT.light)
  // Collapse to the distinct OUTCOMES — sixteen rows of four repeated pairs says nothing.
  const seen = new Map<string, { dark: string; light: string; labels: string[] }>()
  for (const r of rows) {
    const key = `${r.dark}|${r.light}`
    const hit = seen.get(key) ?? { dark: r.dark, light: r.light, labels: [] }
    hit.labels.push(r.label)
    seen.set(key, hit)
  }
  console.log(`  ${barriers} barrier(s)   want: dark bg → ${WANT.dark}   light bg → ${WANT.light}`)
  for (const o of seen.values()) {
    console.log(`  ${o.dark}  ${o.light}   ${isPalette(o) ? 'PALETTE' : '       '}  ${o.labels.length}/${rows.length}  (${o.labels.slice(0, 3).join(', ')}${o.labels.length > 3 ? ', …' : ''})`)
  }
  const stable = seen.size === 1
  // `full` everywhere is what the fit assumed and what Chromium does unconditionally.
  const fitted = rows.find(r => r.label === Array(barriers).fill('full').join('+') || barriers === 0)!
  console.log(`  → ${stable ? 'clamp-INDEPENDENT' : 'clamp-DEPENDENT'}, palette on ${rows.filter(isPalette).length}/${rows.length} semantics`)
  return { stable, paletteAlways: rows.every(isPalette), paletteFitted: isPalette(fitted) }
}

const fails: string[] = []

const mono = evaluate('BACKDROP_BUILTIN — the WebKit default (mono, no brand tint)', BACKDROP_BUILTIN)
if (!mono.stable) {
  fails.push(
    'the WebKit DEFAULT chain became clamp-dependent — it is handed to every iPhone with ' +
    'nobody watching, so it must render the same whatever the barrier does',
  )
}

const brand = evaluate('BACKDROP_BUILTIN_BRAND — behind ?duobrand=1 (fitted green↔blue)', BACKDROP_BUILTIN_BRAND)
if (brand.stable && brand.paletteAlways) {
  fails.push(
    'BACKDROP_BUILTIN_BRAND now hits the palette under EVERY clamp semantics — the reason ' +
    'it sits behind ?duobrand=1 is gone. Re-measure on a device, then make it the WebKit ' +
    'default again in useAdaptiveText.ts / useAdaptiveDuotone.ts and rewrite the notes here',
  )
}
if (!brand.paletteFitted) {
  fails.push(
    'BACKDROP_BUILTIN_BRAND no longer reaches the palette even where every barrier clamps ' +
    '— the fit is stale against DUOTONES. Refit: npm run fit:duotone-chain',
  )
}

console.log()
for (const f of fails) console.log(`✗ ${f}`)
if (fails.length) {
  console.error('\nDuotone chain claims and arithmetic disagree — see useAdaptiveText.ts.')
  process.exit(1)
}
console.log('OK — the default chain is clamp-independent, the fitted one stays opt-in.')
