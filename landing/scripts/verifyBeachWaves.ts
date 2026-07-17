import assert from 'node:assert/strict'
import { injectWaveSurfAnimation, injectStaticSea } from '../components/ui/background/beachWaves'
import { computeWaveQueue, BEACH_ART_H } from '../components/ui/background/waveQueueLayout'
import type { OceanWaveShape } from '../components/ui/background/oceanWaves'
import { OCEAN_WAVE_IDS } from '../components/ui/background/oceanWaves'

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

// ── No NaN anywhere: the foam math divides by wave heights, and a shrunk wave used
// to drive restDepth past the wave's own box. ──
assert.ok(!out.includes('NaN'), 'no NaN leaked into the baked SVG')

// ── The foam's waterline clip must sit INSIDE its wave's box. THIS is the invariant that
// breaks without waveScale: FOAM_CLIP_DEPTH is 150 canvas units, tuned against a ~480-unit
// wave, and on desktop the shortest wave is now ~116 units tall — an unscaled clip line
// would fall BELOW the wave's own box, cut nothing, and let the foam show through the
// wave's band gaps while it is supposed to be submerged.
//
// Read the depth back OUT of the emitted markup. Asserting `150 * waveScale < minTh`
// instead would be arithmetic over the layout that never touches `out`: it stays true even
// if the implementation ignores waveScale entirely and emits a raw 150.
{
  // Every foam rides an instance whose shape is OCEAN_WAVE_IDS[k % 6], so its wave's own
  // height (and therefore its box) is known per k. Recover clipDepth from the emitted
  // rect: y = yBase + clipDepth − 6000, and yBase = spawnCy − th/2.
  const clips = [...out.matchAll(
    /<clipPath id="b2-foamclip-(\d+)"[^>]*><rect[^>]*y="([-\d.]+)"/g,
  )]
  assert.ok(clips.length > 0, 'at least one foam clipPath was emitted')

  const expectedDepth = 150 * desktopLayout.waveScale
  for (const m of clips) {
    const k = Number(m[1])
    const th = desktopLayout.heightRefW * ASPECTS[k % ASPECTS.length]
    const yBase = desktopLayout.spawnCy - th / 2
    const clipDepth = Number(m[2]) + 6000 - yBase
    assert.ok(
      Math.abs(clipDepth - expectedDepth) < 0.5,
      `foam ${k}: emitted clip depth ${clipDepth.toFixed(2)} = 150 · waveScale ` +
      `(${expectedDepth.toFixed(2)}), not the raw 150`,
    )
    assert.ok(
      clipDepth < th,
      `foam ${k}: clip line ${clipDepth.toFixed(2)} sits inside its wave's box (${th.toFixed(2)})`,
    )
  }

  // And prove the guard has teeth: the UNSCALED constant would break the very same waves.
  const minTh = desktopLayout.heightRefW * Math.min(...ASPECTS)
  assert.ok(150 > minTh, 'sanity: an unscaled 150 really would fall outside the shortest wave')
}

// ── The old baked-in type-1 sea groups are gone, replaced by the queue. ──
for (const id of OCEAN_WAVE_IDS) {
  assert.ok(!out.includes(`<g id="b2-${id}"`), `old baked-in group ${id} removed`)
}

// ── A short queue (the floor) still produces a legal SVG at the art-height floor. ──
{
  const shortLayout = computeWaveQueue({
    viewportWidth: 1920, viewportHeight: 900, containerWidth: 1920, vScaleY: 1,
    contentHeight: 1000, baseHeightPx: 5000, verticalOffset: 0, aspects: ASPECTS,
  })
  const shortOut = injectWaveSurfAnimation(beachSvg, { layout: shortLayout, shapes })
  assert.equal((shortOut.match(/class="beach-wave"/g) ?? []).length, 3, 'floor: 3 waves')
  assert.ok(shortOut.includes('viewBox="0 0 1027 3614"'), 'floor: viewBox at the art height')
  assert.ok(!shortOut.includes('NaN'), 'floor: no NaN')
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
