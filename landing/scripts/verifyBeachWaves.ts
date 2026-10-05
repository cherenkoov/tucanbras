import assert from 'node:assert/strict'
import { injectWaveSurfAnimation, injectStaticSea } from '../components/ui/background/beachWaves'
import { computeWaveQueue, BEACH_ART_H } from '../components/ui/background/waveQueueLayout'
import type { OceanWaveShape } from '../components/ui/background/oceanWaves'
import { OCEAN_WAVE_IDS } from '../components/ui/background/oceanWaves'
import { OCEAN_WAVE_CRESTS } from '../components/ui/background/oceanWaveCrests'

const ASPECTS = [0.320540, 0.326056, 0.299655, 0.307349, 0.364198, 0.250537]

// Minimal stand-ins for the real silhouettes: one numbered line each, real viewBox sizes.
const SIZES: [number, number][] = [
  [2371, 760], [2107, 687], [1742, 522], [2245, 690], [1782, 649], [2327, 583],
]
const shapes: Record<string, OceanWaveShape> = Object.fromEntries(
  OCEAN_WAVE_IDS.map((id, i) => [id, {
    w: SIZES[i][0], h: SIZES[i][1],
    inner: `<g id="b2-${id}"><path id="b2-1" d="M0 0h10v10H0z"/></g>`,
  }]),
)

// A stand-in beach: the viewBox + Figma clip rect the injector rewrites, plus the two
// type-2 foam groups it lifts out and re-attaches to queue waves.
const beachSvg =
  '<svg viewBox="0 0 1027 3614">' +
  '<g clip-path="url(#c)"><rect width="1027" height="3614" fill="white"/>' +
  '<g id="b2-type 2 wave 01"><path id="b2-f1" d="M0 2948h10v10H0z"/></g>' +
  '<g id="b2-type 2 wave 02"><path id="b2-f2" d="M0 2982h10v10H0z"/></g>' +
  '</g></svg>'

const desktopLayout = computeWaveQueue({
  viewportWidth: 1920, viewportHeight: 900, containerWidth: 1920, vScaleY: 1,
  contentHeight: 40000, baseHeightPx: 1000, verticalOffset: 0, aspects: ASPECTS,
})

const out = injectWaveSurfAnimation(beachSvg, { layout: desktopLayout, shapes })

// ── The viewBox and the Figma clip rect BOTH follow the layout (widening only one
// leaves the extra strip empty — the clip still cuts at the old height).
//
// This MUST be asserted with a layout that lands ABOVE the 3614 floor. desktopLayout sits
// exactly ON it (spawn 3433 + thMax/2 84 + 60 = 3578 → floored to 3614), and 3614 is also
// the stand-in beach's authored height — so both strings are already in the INPUT, and the
// assertions would pass even with the rewrites deleted. A 1080-tall viewport clears the
// floor and makes the rewrite the only thing that can satisfy them. ──
{
  const tallLayout = computeWaveQueue({
    viewportWidth: 1920, viewportHeight: 1080, containerWidth: 1920, vScaleY: 1,
    contentHeight: 40000, baseHeightPx: 1000, verticalOffset: 0, aspects: ASPECTS,
  })
  assert.ok(tallLayout.beachViewH > 3614, 'precondition: this layout clears the art floor')
  const tallOut = injectWaveSurfAnimation(beachSvg, { layout: tallLayout, shapes })
  assert.ok(
    tallOut.includes(`viewBox="0 0 1027 ${tallLayout.beachViewH}"`),
    'viewBox is rewritten to layout.beachViewH',
  )
  assert.ok(
    tallOut.includes(`<rect width="1027" height="${tallLayout.beachViewH}" fill="white"/>`),
    'the root clip rect grows with the viewBox — both, or the extra strip stays empty',
  )
  assert.ok(!tallOut.includes('viewBox="0 0 1027 3614"'), 'the original viewBox is gone')
}

assert.ok(
  out.includes(`viewBox="0 0 1027 ${desktopLayout.beachViewH}"`),
  'viewBox follows layout.beachViewH',
)
assert.ok(
  out.includes(`<rect width="1027" height="${desktopLayout.beachViewH}" fill="white"/>`),
  'the root clip rect grows with the viewBox',
)

// ── Exactly layout.n wave instances — the cap is real, not advisory. ──
const waveCount = (out.match(/class="beach-wave"/g) ?? []).length
assert.equal(waveCount, desktopLayout.n, 'one .beach-wave group per layout.n')
assert.equal(waveCount, 6, 'desktop bakes 6 waves, not 14')

// ── Every SMIL duration is the layout's, so a shorter track means a shorter cycle
// (constant speed), not slower waves. ──
const durs = new Set(out.match(/dur="([\d.]+)s"/g) ?? [])
assert.equal(durs.size, 1, 'a single duration across the whole queue')
assert.ok(
  out.includes(`dur="${desktopLayout.durSeconds.toFixed(1)}s"`),
  'duration = layout.durSeconds',
)

// ── The RISE distance is layout.travel. Nothing else pins it: `dur` is read straight off
// the layout, so hardcoding the old q = 1150 back into buildQueueInstance passes every
// other assertion here AND the whole suite — while waves would rise 1150 units from spawn
// 3433 to 2283, i.e. ~700 units past the shore and up into the sand, at 61 u/s instead of
// the intended 23. Visible garbage, zero test signal. So read the emitted transform. ──
{
  // The rise is `values="0 0;<dx> <-travel/2>;<ndx> <-travel>"` on each instance's first
  // animateTransform. Recover the final y and compare it to the layout's travel.
  const rises = [...out.matchAll(/values="0 0;[-\d.]+ [-\d.]+;[-\d.]+ (-[\d.]+)"/g)]
  assert.equal(rises.length, desktopLayout.n, 'one rise transform per wave instance')
  for (const m of rises) {
    assert.ok(
      Math.abs(-Number(m[1]) - desktopLayout.travel) < 0.2,
      `rise distance ${-Number(m[1])} = layout.travel (${desktopLayout.travel.toFixed(1)}), not a constant`,
    )
  }
  // The waves must stop AT the shore (3000 in the art), never overshoot into the sand.
  assert.ok(
    Math.abs(desktopLayout.spawnCy - desktopLayout.travel - 3000) < 0.001,
    'a full rise lands exactly on the shore line',
  )
}

// ── No NaN anywhere: the foam math divides by wave heights, and a shrunk wave used
// to drive restDepth past the wave's own box. ──
assert.ok(!out.includes('NaN'), 'no NaN leaked into the baked SVG')

// ── The foam's waterline clip follows its wave's OUTLINE, the foam rests fully under it, and
// it is gated, not faded.
//
// The clip used to be a straight line under the crest: in a trough it sat ABOVE the water and
// sliced the foam off in mid-air, and an opacity fade dissolved the foam before it reached the
// wave at all. Everything here is read back OUT of the emitted markup — arithmetic over the
// layout alone would stay green if the injector ignored the crest table entirely. ──
{
  const CREST_CLIP_INSET = 0.03 // mirror of beachWaves.ts
  // Authored foam footprints (FOAM_BBOX in beachWaves.ts) — the stand-in foam paths above are
  // seated at the same minY, so the emitted translate recovers the real rest position.
  const FOAM_ART: Record<string, { minX: number; maxX: number; minY: number }> = {
    f1: { minX: 0, maxX: 414, minY: 2948 },
    f2: { minX: 0, maxX: 913, minY: 2982 },
  }
  const foams = [...out.matchAll(
    /<clipPath id="b2-foamclip-(\d+)"[^>]*><path d="([^"]+)"\/><\/clipPath>(.*?)<\/g><\/g>/g,
  )]
  assert.ok(foams.length > 0, 'at least one foam clip was emitted')

  for (const m of foams) {
    const k = Number(m[1])
    const id = OCEAN_WAVE_IDS[k % OCEAN_WAVE_IDS.length]
    const [w, hFile] = SIZES[k % SIZES.length]
    const th = desktopLayout.heightRefW * (hFile / w)
    const yBase = desktopLayout.spawnCy - th / 2
    const tw = 1027 * 2.4
    const tx = (1027 - tw) / 2

    // 1. The outline: after the two far-left points, one vertex per crest sample, at the
    //    crest's own depth (+ inset) — then the two far-right points.
    const pts = [...m[2].matchAll(/[ML]([-\d.]+) ([-\d.]+)/g)].map(q => [Number(q[1]), Number(q[2])])
    const crest = OCEAN_WAVE_CRESTS[id]
    assert.equal(pts.length, crest.length + 4, `foam ${k}: one outline vertex per crest sample`)
    crest.forEach((cy, i) => {
      const [x, y] = pts[i + 2]
      const ex = tx + (i / (crest.length - 1)) * tw
      const ey = yBase + (cy / hFile) * th + CREST_CLIP_INSET * th
      assert.ok(Math.abs(x - ex) < 0.11 && Math.abs(y - ey) < 0.11,
        `foam ${k}: vertex ${i} (${x}, ${y}) follows the crest (${ex.toFixed(1)}, ${ey.toFixed(1)})`)
    })
    const ys = crest.map(c => (c / hFile) * th)
    assert.ok(Math.max(...ys) - Math.min(...ys) > th * 0.2,
      `foam ${k}: the outline is a contour, not a straight line`)

    // 2. At rest (both before and after the leap) the foam's top is under the outline
    //    everywhere it spans — otherwise it pokes out of a trough while it waits.
    const body = m[3]
    const art = body.match(/<g transform="translate\(([-\d.]+) ([-\d.]+)\) scale\(([-\d.]+) ([-\d.]+)\)">.*?id="b2-(f[12])-f/)
    assert.ok(art, `foam ${k}: seated art found`)
    const [fx, fy, sx, s] = [1, 2, 3, 4].map(i => Number(art![i]))
    const bb = FOAM_ART[art![5]]
    const left = sx < 0 ? fx - s * bb.maxX : fx + s * bb.minX
    const wf = s * (bb.maxX - bb.minX)
    const restTop = fy + s * bb.minY
    const jumpVals = body.match(/type="translate" values="([^"]+)"/)![1].split(';')
    const n = Number(jumpVals[jumpVals.length - 1].split(' ')[0])
    const depthAt = (x: number) => {
      // linear between outline vertices
      for (let i = 0; i < pts.length - 1; i++) {
        const [x0, y0] = pts[i], [x1, y1] = pts[i + 1]
        if (x >= Math.min(x0, x1) && x <= Math.max(x0, x1) && x1 !== x0) return y0 + (y1 - y0) * (x - x0) / (x1 - x0)
      }
      return Infinity
    }
    for (const start of [left, left + n]) {
      for (let x = start; x <= start + wf; x += 2) {
        assert.ok(restTop >= depthAt(x) - 0.2,
          `foam ${k}: at rest its top (${restTop.toFixed(1)}) is under the outline at x=${x.toFixed(0)} (${depthAt(x).toFixed(1)})`)
      }
    }

    // 3. A gate, not a fade: opacity only ever 0 or 1, switched while buried.
    const gate = body.match(/<animate attributeName="opacity" values="([^"]+)" keyTimes="([^"]+)"[^>]*calcMode="([a-z]+)"/)
    assert.ok(gate, `foam ${k}: opacity gate present`)
    assert.equal(gate![1], '0;1;0', `foam ${k}: gate values`)
    assert.equal(gate![3], 'discrete', `foam ${k}: the gate switches, it never fades mid-air`)
  }
}

// ── The old baked-in type-1 sea groups are gone, replaced by the queue. ──
for (const id of OCEAN_WAVE_IDS) {
  assert.ok(!out.includes(`<g id="b2-${id}"`), `old baked-in group ${id} removed`)
}

// ── The N_MIN queue still produces a legal SVG. At the current 5x wave sizes even three
// waves clear the art-height floor, so this no longer exercises the floor — a small wave
// (short viewport) is now the only way to reach it, and it is asserted below. ──
{
  const shortLayout = computeWaveQueue({
    viewportWidth: 1920, viewportHeight: 900, containerWidth: 1920, vScaleY: 1,
    contentHeight: 1000, baseHeightPx: 5000, verticalOffset: 0, aspects: ASPECTS,
  })
  const shortOut = injectWaveSurfAnimation(beachSvg, { layout: shortLayout, shapes })
  assert.equal((shortOut.match(/class="beach-wave"/g) ?? []).length, 3, 'floor: 3 waves')
  assert.ok(shortOut.includes(`viewBox="0 0 1027 ${shortLayout.beachViewH}"`), 'floor: viewBox follows the layout')
  assert.ok(shortLayout.beachViewH >= BEACH_ART_H, 'floor: never below the art height')
  assert.ok(!shortOut.includes('NaN'), 'floor: no NaN')
}

// ── A queue that asks for LESS than the art still emits the art's full height: the
// injector must never write a viewBox that crops the beach. ──
{
  const tinyLayout = computeWaveQueue({
    viewportWidth: 1920, viewportHeight: 120, containerWidth: 1920, vScaleY: 1,
    contentHeight: 1000, baseHeightPx: 5000, verticalOffset: 0, aspects: ASPECTS,
  })
  assert.equal(tinyLayout.beachViewH, BEACH_ART_H, 'precondition: this layout is at the floor')
  const tinyOut = injectWaveSurfAnimation(beachSvg, { layout: tinyLayout, shapes })
  assert.ok(tinyOut.includes(`viewBox="0 0 1027 ${BEACH_ART_H}"`), 'floor: emits the full art height')
  assert.ok(!tinyOut.includes('NaN'), 'floor: no NaN')
}

// ── injectStaticSea (balanced/lite tiers + reduced motion): takes a plain height, paints
// the water, animates NOTHING. The tiers pass BEACH_ART_H — the art, unextended. ──
{
  const staticOut = injectStaticSea(beachSvg, BEACH_ART_H)
  assert.ok(staticOut.includes(`viewBox="0 0 1027 ${BEACH_ART_H}"`), 'static: viewBox = the height passed in')
  assert.ok(
    staticOut.includes(`<rect width="1027" height="${BEACH_ART_H}" fill="white"/>`),
    'static: the clip rect follows too',
  )
  // The water plane is the whole point: without it the gaps between the baked silhouettes
  // show whatever lies behind the beach.
  assert.ok(staticOut.includes('fill="#2982B6"'), 'static: the water rect is painted')
  // A static sea is static. No SMIL of any kind may survive here.
  assert.ok(!/<animate/.test(staticOut), 'static: no <animate>/<animateTransform> emitted')
  assert.ok(!staticOut.includes('class="beach-wave"'), 'static: no conveyor instances')
  assert.ok(!staticOut.includes('NaN'), 'static: no NaN')
  // It follows whatever height it is handed — the conveyor path passes layout.beachViewH.
  const taller = injectStaticSea(beachSvg, desktopLayout.beachViewH)
  assert.ok(
    taller.includes(`viewBox="0 0 1027 ${desktopLayout.beachViewH}"`),
    'static: honours a layout-derived height as well',
  )
}

console.log('verifyBeachWaves: all assertions passed')
