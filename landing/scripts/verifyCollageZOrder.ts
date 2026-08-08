// The collage's paint order is spread across three places that cannot see each other:
// FRONT_IDS (what gets lifted into the z50 front layer), the per-layer zIndex values in
// BackgroundCanvas's JSX, and the per-frame zIndex the human hook writes. Nothing ties
// them together, so an id moved between those lists is silent — the page renders, tsc
// and lint pass, and a sprite simply paints on the wrong side of another one.
//
// That is exactly how `Mount forest 4` ended up ON TOP of the walking figures: it rode in
// FRONT_IDS at z50 while the figures — which the authored art paints INSIDE `City`, i.e.
// after the forest — were lifted out to z20-40. Figures climbing the upper arc of the
// track (y≈1117 in canvas units, inside the forest band's y 619-1160) disappeared behind
// the trees.
//
// So this reads the z-index the browser actually resolved for each layer and asserts the
// order the art requires. It also proves the layers share ONE stacking context: every
// comparison here is meaningless if some ancestor (the bounded sprite host, most of all)
// grows a transform / z-index / opacity and starts nesting them.
//
//   npm run verify:z-order                        → http://localhost:3000/ru
//   npm run verify:z-order -- http://host/pt      → custom URL
import { chromium } from 'playwright'
import { Z_BLUE } from '../components/ui/background/humanPaths'

const BASE = process.argv[2] ?? 'http://localhost:3000/ru'
// Desktop: below WIDE_BREAKPOINT the figures are cropped off-screen and their animation
// is gated off entirely (see isNarrowCrop), so there is nothing to order.
const VIEWPORT = { width: 1440, height: 900 }

// One marker id per layer — a group that identifies the layer it was extracted into.
const MARKERS = {
  base: 'Mount forest 3',   // never lifted: stays in mainSvg
  mf4: 'Mount forest 4',
  roads: 'road 1',
  human1: 'human 1',
  human2: 'human 2',
  human3: 'human 3',
  human4: 'human 4',
  house4: 'house 4',
  house5: 'house 5',
  house6: 'house 6',
  front: 'City',            // the z50 front layer
  bigTree: 'Big tree',
}

const failures: string[] = []
const ok: string[] = []

async function main() {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: VIEWPORT, deviceScaleFactor: 1 })
  // Same reason as verifyHeroPlants: without Notion credentials NotionRetry reloads the
  // page three times, and every measurement lands at a random point inside those loads.
  await page.addInitScript(() => {
    try { sessionStorage.setItem('notion_retry', '99') } catch { /* storage blocked */ }
  })
  await page.goto(BASE, { waitUntil: 'load', timeout: 60_000 })
  // The layers are fetched + extracted client-side; the humans are the last ones placed.
  await page.waitForSelector('[id="human 1"]', { timeout: 30_000 })
  await page.waitForSelector('[id="Mount forest 4"]', { timeout: 30_000 })
  await page.waitForTimeout(500) // let the hook write its first frame's zIndex

  // Inline bodies only: a named arrow inside evaluate gets an esbuild `__name()` call
  // that does not exist in the browser.
  const m = await page.evaluate((markers) => {
    const canvas = document.querySelector<HTMLElement>('.background-canvas')!
    // The zoom/parallax container: the ONE stacking context every layer is meant to
    // share (it carries the cover-zoom transform + will-change). The walk below stops
    // here — a context found between a layer and this element is a real isolation bug,
    // this one is the common root.
    const root = canvas.querySelector<HTMLElement>(':scope > div')!
    const out: Record<string, {
      z: number
      nested: string[]
      viewBox: string | null
      top: number
      bottom: number
    } | null> = {}
    let collageH = 0
    let collageTop = 0
    const collage = canvas.querySelector<HTMLElement>('[id="Mount"]')?.closest('div')
    if (collage) {
      const r = collage.getBoundingClientRect()
      collageH = r.height
      collageTop = r.top
    }
    for (const [key, id] of Object.entries(markers)) {
      const el = canvas.querySelector<SVGElement>(`[id="${id}"]`)
      if (!el) { out[key] = null; continue }
      // The layer is the nearest ancestor div carrying an explicit z-index; walking up
      // also collects every ancestor that would nest the layer in its own stacking
      // context, which would make the z comparison a lie.
      let z = 0
      let layer: HTMLElement | null = null
      const nested: string[] = []
      let node = el.parentElement
      while (node && node !== root && node !== canvas) {
        const cs = getComputedStyle(node)
        if (!layer && cs.zIndex !== 'auto') {
          z = Number(cs.zIndex)
          layer = node
        } else if (layer) {
          // Ancestors ABOVE the layer: any of these creates a stacking context that
          // would isolate this layer's z-index from its siblings'.
          if (cs.zIndex !== 'auto') nested.push(`z-index:${cs.zIndex}`)
          if (cs.transform !== 'none') nested.push(`transform:${cs.transform}`)
          if (cs.filter !== 'none') nested.push(`filter:${cs.filter}`)
          if (cs.opacity !== '1') nested.push(`opacity:${cs.opacity}`)
          if (cs.isolation === 'isolate') nested.push('isolation:isolate')
          if (cs.mixBlendMode !== 'normal') nested.push(`mix-blend-mode:${cs.mixBlendMode}`)
          if (cs.contain.includes('paint') || cs.contain.includes('layout')) nested.push(`contain:${cs.contain}`)
          if (cs.willChange.includes('transform') || cs.willChange.includes('opacity')) nested.push(`will-change:${cs.willChange}`)
        }
        node = node.parentElement
      }
      const r = (layer ?? (el as unknown as HTMLElement)).getBoundingClientRect()
      out[key] = {
        z,
        nested,
        viewBox: layer?.querySelector('svg')?.getAttribute('viewBox') ?? null,
        // Canvas units: the collage block is the 800x2047 canvas at top:0.
        top: collageH ? ((r.top - collageTop) / collageH) * 2047 : NaN,
        bottom: collageH ? ((r.bottom - collageTop) / collageH) * 2047 : NaN,
      }
    }
    return out
  }, MARKERS)

  const missing = Object.entries(m).filter(([, v]) => !v).map(([k]) => k)
  if (missing.length) {
    failures.push(`layers never rendered: ${missing.join(', ')} — extraction changed or the ids drifted`)
  }
  const z = (k: keyof typeof MARKERS) => m[k]?.z ?? NaN
  const above = (a: keyof typeof MARKERS, b: keyof typeof MARKERS, why: string) => {
    if (!m[a] || !m[b]) return
    if (z(a) > z(b)) ok.push(`${MARKERS[a]} (z${z(a)}) paints over ${MARKERS[b]} (z${z(b)}) — ${why}`)
    else failures.push(`${MARKERS[a]} is z${z(a)}, ${MARKERS[b]} is z${z(b)} — ${MARKERS[a]} must be ABOVE it (${why})`)
  }

  // ── the fix this guard exists for: every figure, in every z state, walks IN FRONT of
  // the forest band, the way the authored order (humans inside City, City after the
  // forest) had them.
  for (const h of ['human1', 'human2', 'human3', 'human4'] as const) {
    above(h, 'mf4', 'figures are painted inside City, which the art paints after the forest')
  }
  if (m.mf4 && z('mf4') >= Z_BLUE) {
    failures.push(`Mount forest 4 is z${z('mf4')}, but the lowest human state (BLUE) is z${Z_BLUE}`
      + ' — a figure passing behind a house would also drop behind the forest')
  } else if (m.mf4) {
    ok.push(`Mount forest 4 (z${z('mf4')}) clears the lowest figure state, BLUE z${Z_BLUE}`)
  }

  // ── and the relationships the forest must KEEP while it sits down there
  above('mf4', 'base', 'the forest is painted after Mount forest 3 / the road group')
  above('roads', 'mf4', 'roads are inside City, painted after the forest')
  above('house4', 'mf4', 'houses are inside City, painted after the forest')
  above('house5', 'mf4', 'houses are inside City, painted after the forest')
  above('house6', 'mf4', 'houses are inside City, painted after the forest')
  above('front', 'mf4', 'the front layer carries the rest of City')
  above('bigTree', 'mf4', 'the tree stands in front of the forest band')

  // ── the layer must still be BOUNDED and land where the art puts it. A full-canvas
  // viewBox here is the page-sized-surface regression (see spriteBoxes.ts), and a box
  // measured against the wrong canvas would place a correct z-index in the wrong place.
  if (m.mf4?.viewBox === '0 0 800 2047') {
    failures.push('Mount forest 4 renders at the full canvas viewBox — the bounded box was lost')
  } else if (m.mf4?.viewBox) {
    ok.push(`Mount forest 4 is bounded (viewBox "${m.mf4.viewBox}")`)
  }
  if (m.mf4 && Number.isFinite(m.mf4.bottom)) {
    // Measured from the art: box y 619-1160 (+8 units of bleed each side).
    const want = { top: 611, bottom: 1169 }
    for (const edge of ['top', 'bottom'] as const) {
      const got = m.mf4[edge]
      if (Math.abs(got - want[edge]) > 25) {
        failures.push(`Mount forest 4's ${edge} edge sits at canvas y ${got.toFixed(0)}, expected ≈${want[edge]}`)
      } else ok.push(`Mount forest 4's ${edge} edge at canvas y ${got.toFixed(0)} ≈ ${want[edge]}`)
    }
    // The whole point: the band really does reach into the track the figures walk.
    if (m.mf4.bottom < 1105) {
      failures.push(`Mount forest 4 ends at y ${m.mf4.bottom.toFixed(0)}, above the human track (y≈1105)`
        + ' — this guard would pass on art that no longer overlaps, so re-check the z map by eye')
    }
  }

  // ── one stacking context, or none of the above means anything
  for (const [key, v] of Object.entries(m)) {
    if (v && v.nested.length) {
      failures.push(`${MARKERS[key as keyof typeof MARKERS]} is nested in its own stacking context`
        + ` (${[...new Set(v.nested)].join(', ')}) — its z-index no longer competes with the other layers`)
    }
  }
  if (!failures.some(f => f.includes('stacking context'))) {
    ok.push('all layers resolve in one stacking context')
  }

  await browser.close()

  ok.forEach(l => console.log(`✓ ${l}`))
  if (failures.length) {
    console.error('\n✗ ' + failures.join('\n✗ '))
    process.exit(1)
  }
  console.log('\n✓ collage z-order holds: figures in front of the forest, behind the houses')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
