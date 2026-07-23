// Regenerates the STATIC-FILL assets consumed by useAdaptiveText from the current art:
//
//  1. public/SVG/background/collage-front-fill.svg — every collage group that
//     BackgroundCanvas paints ABOVE the beach block (z>10): roads, houses, humans, the
//     lifted front set, bushes, the big tree — at their authored (rest) positions, the
//     rest of the canvas transparent. The static text fill layers this image over the
//     beach slice in the beach↔collage handoff band, where those sprites hang over the
//     beach art; transparency does the per-pixel compositing.
//
//  2. public/SVG/background/main2-fill.svg — the beach art exactly as the live base
//     renders it (prepareBeachSvg: backdrops stripped) plus the static water plane
//     (injectStaticSea), so glyphs over the sea gap read water, not the bare ground.
//     A STALE copy of this file is how the 390px Tutors headings sampled a beach top
//     that no longer existed in the re-exported art — regenerate, never hand-edit.
//
// Re-run after any re-export of background-collage.svg / main 2.svg:
//   npm run gen:front-fill
//
// The extraction sequence mirrors the BackgroundCanvas fetch effect (extractGroup is
// copied verbatim from there — houses/humans/roads are NESTED inside `City`, so they
// must be pulled out before the front set lifts it).
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { prepareBeachSvg } from '../components/ui/background/prepareBeachSvg'
import { injectStaticSea } from '../components/ui/background/beachWaves'
import { BEACH_ART_H } from '../components/ui/background/waveQueueLayout'

const SRC = join('public', 'SVG', 'background', 'background-collage.svg')
const OUT = join('public', 'SVG', 'background', 'collage-front-fill.svg')
const BEACH_SRC = join('public', 'SVG', 'background', 'main 2.svg')
const BEACH_OUT = join('public', 'SVG', 'background', 'main2-fill.svg')

// Verbatim copy of extractGroup in components/ui/background/BackgroundCanvas.tsx.
function extractGroup(svgString: string, groupId: string): { inner: string; without: string } {
  const start = svgString.indexOf(`<g id="${groupId}"`)
  if (start === -1) return { inner: '', without: svgString }
  let depth = 0, i = start, end = -1
  while (i < svgString.length) {
    const openIdx = svgString.indexOf('<g', i)
    const closeIdx = svgString.indexOf('</g>', i)
    if (openIdx !== -1 && (closeIdx === -1 || openIdx < closeIdx)) { depth++; i = openIdx + 2 }
    else { depth--; i = closeIdx + 4; if (depth === 0) { end = i; break } }
  }
  if (end === -1) return { inner: '', without: svgString }
  return { inner: svgString.substring(start, end), without: svgString.substring(0, start) + svgString.substring(end) }
}

// Same set + order as the live z map (BackgroundCanvas JSX): roads z15 → houses z25/35
// → humans z20-40 → front set z50 → bush 02 → bush 01 → Big tree (z50, later in DOM).
const FRONT_IDS = [
  'Slope 1', 'Mount Forest 1', 'Peak', 'Mount forest 2', 'Slope 2', 'Group 1',
  'Mount forest 4', 'City',
]

let s = readFileSync(SRC, 'utf8')
const take = (id: string): string => {
  const { inner, without } = extractGroup(s, id)
  if (!inner) console.warn(`⚠ group not found: ${id}`)
  s = without
  return inner
}

// 'Background city' (distant skyline) stays out — it renders BELOW the beach.
take('Background city')

const houses = ['house 6', 'house 4', 'house 5'].map(take).join('')
const roads = ['road 1', 'road 2', 'road 3'].map(take).join('')
const humans = ['human 1', 'human 2', 'human 3', 'human 4'].map(take).join('')
const front = FRONT_IDS.map(take).join('')
const bush02 = take('bush 02')
const bush01 = take('bush 01')
const bigTree = take('Big tree')

const inner = roads + houses + humans + front + bush02 + bush01 + bigTree
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 2047">${inner}</svg>`
writeFileSync(OUT, svg)
console.log(`${OUT}: ${(svg.length / 1024).toFixed(0)} KB`)

// The beach fill: current art, prepared like the live base, with the static water
// plane baked in. viewBox stays 1027×BEACH_ART_H — the artW/artH the hook declares.
const beach = injectStaticSea(prepareBeachSvg(readFileSync(BEACH_SRC, 'utf8')), BEACH_ART_H)
writeFileSync(BEACH_OUT, beach)
console.log(`${BEACH_OUT}: ${(beach.length / 1024).toFixed(0)} KB`)
