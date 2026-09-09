// Bakes the 20 beach spinners (palms + umbrellas) into rasters + a generated boxes module,
// so BackgroundCanvas can render them through next/image instead of inlining their markup.
//
// WHY. The spinners are 4 230 of `main 2.svg`'s 5 501 nodes — 77% of the beach, and the
// single biggest contributor to the page's DOM (8 625 elements; Lighthouse named
// `<g id="b2-type 3 palm 01">` with its 403 children as the worst offender). Inlining them
// costs three times over: the HTML parser builds them inside a React commit, the style
// engine relayouts over them, and measureGroupBoxes mounts the WHOLE 5 501-node beach
// invisibly just to read 20 bounding boxes. Mobile Lighthouse 2026-09-02: TBT 2 090 ms,
// main thread 8.7 s, Parse HTML & CSS 1 735 ms.
//
// A raster is loss-free HERE — and only here — because the spin animation transforms the
// WRAPPER div, never the sprite's inner nodes (see useBeachSpinnerAnimation and the
// bounded-overlay note in utils/spriteBoxes.ts). The compositor rotates an already-painted
// surface; whether that surface came from <svg> markup or an <img> is invisible to it.
// Sprites whose motion mutates inner geometry (cars: SMIL animateTransform on the <g>)
// CANNOT be baked this way and are deliberately left alone.
//
// Worth knowing when reading the request waterfall: the site is served over HTTP/1.1 (no h2
// on the nginx vhost as of 2026-09-02), so these sprites do add requests against a
// 6-connection cap. They are lazy and far below the fold, which is what makes that
// affordable — an atlas would have dodged it, but see the cover-src note below for why one
// is not an option here.
//
// Re-run after any re-export of main 2.svg — alongside the gen:front-fill regeneration
// that the art already requires:
//   npm run bake:spinners
//
// The generated module records a hash of the source SVG; `npm run verify:spinner-bake`
// fails the build when they drift, so a forgotten re-bake cannot silently ship the old art.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
import { chromium } from 'playwright'
import sharp from 'sharp'
import { prepareBeachSvg, BEACH_PREFIX } from '../components/ui/background/prepareBeachSvg'
import { BEACH_SPINNERS, readViewBox } from '../components/ui/background/beachSpinners'
import { BOX_BLEED, padBox, type SpriteBox } from '../components/ui/background/utils/spriteBoxes'

const SRC = join('public', 'SVG', 'background', 'main 2.svg')
const OUT_DIR = join('public', 'PNG', 'background')
// ONE FILE PER SPRITE, not a packed atlas — forced by useAdaptiveText, not by taste.
// A sprite declares itself to the adaptive text via `data-adaptive-cover-src`, and that
// URL is painted AT THE ELEMENT'S OWN BOX (see COVER_SRC_ATTR): a palm is mostly
// transparent inside its box, so the fill needs the real picture rather than a solid
// plate. Point that at an atlas and every palm's box gets the whole strip painted into it.
//
// TWO artifacts per sprite, because the two consumers want opposite things:
//  • master — fed to next/image, which negotiates AVIF/WebP and the served width itself
//    (landing/CLAUDE.md: <Image> everywhere, no raw <img> for raster). It only ever needs
//    to be the LARGEST width anyone is served, so it is baked once at SCALE and never
//    shipped as-is.
//  • fill — a deliberately tiny copy for the adaptive text, which samples luminance into a
//    canvas and could not care less about sharpness. Pointing the fill at the master would
//    mean up to 20 full-size downloads the moment a heading drifts over the palms.
const SPRITE_DIR = join(OUT_DIR, 'spinners')
// The beach art the page downloads: main 2.svg minus the baked groups. See the block that
// writes it for why fetching the full export would undo the whole change on the byte axis.
const BASE_SVG = join('public', 'SVG', 'background', 'main2-no-spinners.svg')

/** canvas units → pixels for the FILL copy. The adaptive text bins pixels against one
 *  luminance threshold, so this only has to preserve the silhouette's coarse shape. */
const FILL_SCALE = 0.6
// A generated TS module, not a JSON in public/: the boxes are code the component imports,
// they must be type-checked alongside it, and they have no business being fetchable.
// Sits with the other background data modules (beachSpinners.ts, spriteBoxes.ts).
const META = join('components', 'ui', 'background', 'beachSpinnerBake.ts')

/** `type 2 palm 04 ` → `type-2-palm-04` — stable, url-safe, and free of the trailing
 *  spaces the Figma export leaves in some ids. */
const slugify = (id: string) =>
  id.replace(/^b2-/, '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

// Raster scale for the MASTER: canvas units → pixels. Required scale on screen is
// (viewport CSS width / 1027) × DPR — phone 412 @DPR3 → 1.20, tablet 768 @DPR2 → 1.50,
// laptop 1440 @DPR1 → 1.40, retina desktop 1920 @DPR2 → 3.74. The master must cover the
// LARGEST of those, since next/image only ever scales down; 3 is where the curve flattens
// (past a 1600px-wide beach at DPR2) for art that is decorative and permanently rotating.
// Nothing is served at this size — each sprite declares its own `sizes`, so a phone is sent
// a ~120px palm regardless. The generated module carries the number; nothing hardcodes it.
const SCALE = 3

// Verbatim copy of extractGroup in components/ui/background/BackgroundCanvas.tsx (and of
// the copy in generateFrontFill.ts). Kept duplicated ON PURPOSE, exactly as that script
// does: these three call sites must be able to drift independently of the live component.
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

// Verbatim copy of stripSpinnerClip in BackgroundCanvas.tsx: drop the clip-path on the
// object's OUTER <g> so the rotated art isn't cropped to its resting footprint.
const stripSpinnerClip = (groupSvg: string) =>
  groupSvg.replace(/(<g id="[^"]*")\s+clip-path="[^"]*"/, '$1')

function parseViewBox(vb: string | null) {
  if (!vb) return null
  const [x, y, w, h] = vb.split(/[\s,]+/).map(Number)
  return Number.isFinite(w) && Number.isFinite(h) ? { x, y, w, h } : null
}

const rawSvg = readFileSync(SRC, 'utf8')
const sourceHash = createHash('sha256').update(rawSvg).digest('hex').slice(0, 16)
const prepared = prepareBeachSvg(rawSvg)
const vb = parseViewBox(readViewBox(prepared))
if (!vb) throw new Error(`${SRC}: no parsable viewBox — the export is malformed`)

// ── Measure, in a real browser ────────────────────────────────────────────────────────
// getBoundingClientRect, not getBBox — the groups carry their own transform attributes
// from the Figma export and getBBox ignores those. This mirrors measureGroupBoxes; the
// holder is sized to the viewBox width so px and canvas units are 1:1 and no scaling
// arithmetic can drift between this script and the runtime it replaces.
const ids = BEACH_SPINNERS.map(cfg => `${BEACH_PREFIX}${cfg.id}`)
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: vb.w, height: 900 } })
await page.setContent(
  `<body style="margin:0"><div id="holder" style="width:${vb.w}px">${prepared}</div></body>`,
  { waitUntil: 'load' },
)
const measured: Record<string, SpriteBox> = await page.evaluate((wanted) => {
  const out: Record<string, { x: number; y: number; w: number; h: number }> = {}
  const root = document.querySelector('#holder svg') as SVGSVGElement | null
  if (!root) return out
  const vbb = root.viewBox.baseVal
  const rootRect = root.getBoundingClientRect()
  const sx = vbb.width / rootRect.width
  const sy = vbb.height / rootRect.height
  for (const id of wanted) {
    const el = root.querySelector(`[id="${id}"]`) as SVGGraphicsElement | null
    if (!el) continue
    const r = el.getBoundingClientRect()
    if (r.width === 0 && r.height === 0) continue
    out[id] = {
      x: vbb.x + (r.left - rootRect.left) * sx,
      y: vbb.y + (r.top - rootRect.top) * sy,
      w: r.width * sx,
      h: r.height * sy,
    }
  }
  return out
}, ids)
await browser.close()

const missing = ids.filter(id => !measured[id])
if (missing.length) {
  throw new Error(
    `${SRC}: ${missing.length} spinner group(s) not measurable — the art was re-exported ` +
    `with different ids. Fix SPINNER_IDS in beachSpinners.ts or the export, then re-run.\n` +
    missing.map(id => `  · ${id}`).join('\n'),
  )
}

// ── Rasterise each sprite into its own pair of files ──────────────────────────────────
type Baked = {
  id: string
  box: SpriteBox
  /** master handed to next/image; never served at this size */
  src: string
  /** tiny copy for useAdaptiveText's cover — see the note on SPRITE_DIR */
  fill: string
  /** the sprite's on-screen width as a share of the viewport, for next/image's `sizes`.
   *  The beach spans 100% width against its 1027-unit viewBox, so a box of w units is
   *  w/1027 of the viewport — exact at every width, no breakpoint table needed. */
  sizes: string
}
const baked: Baked[] = []
let masterBytes = 0
let fillBytes = 0

mkdirSync(SPRITE_DIR, { recursive: true })

for (const cfg of BEACH_SPINNERS) {
  const id = `${BEACH_PREFIX}${cfg.id}`
  const { inner } = extractGroup(prepared, id)
  if (!inner) throw new Error(`${SRC}: group ${id} measured but not extractable — malformed nesting`)
  const box = padBox(measured[id], BOX_BLEED)
  const w = Math.max(1, Math.round(box.w * SCALE))
  const h = Math.max(1, Math.round(box.h * SCALE))
  // Standalone sprite SVG at explicit pixel size. The clip-path on the outer <g> is
  // dropped (stripSpinnerClip) exactly as the live lift does; anything the group clipped
  // against defs outside itself would be a dangling reference in this document, which is
  // why the live overlays never relied on one either.
  const spriteSvg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box.x} ${box.y} ${box.w} ${box.h}" ` +
    `width="${w}" height="${h}">${stripSpinnerClip(inner)}</svg>`
  // Lossless master: next/image re-encodes it per request, and starting that from a lossy
  // source stacks two generations of artefacts on art that is mostly flat fills and edges.
  const master = await sharp(Buffer.from(spriteSvg)).webp({ lossless: true }).toBuffer()
  const fill = await sharp(Buffer.from(spriteSvg))
    .resize({ width: Math.max(1, Math.round(box.w * FILL_SCALE)) })
    .webp({ quality: 70 })
    .toBuffer()
  const slug = slugify(id)
  writeFileSync(join(SPRITE_DIR, `${slug}.webp`), master)
  writeFileSync(join(SPRITE_DIR, `${slug}-fill.webp`), fill)
  masterBytes += master.length
  fillBytes += fill.length
  baked.push({
    id,
    box,
    src: `/PNG/background/spinners/${slug}.webp`,
    fill: `/PNG/background/spinners/${slug}-fill.webp`,
    sizes: `${((box.w / vb.w) * 100).toFixed(2)}vw`,
  })
}

// ── The base the PAGE fetches: the same art minus the groups just baked ───────────────
// Without this file the page pays for the spinners TWICE — 215 KB gzipped of their markup
// inside the beach download, which is then thrown away client-side, plus the rasters on
// top. Measured before it existed (A/B, 2026-09-05): total transfer 1380 → 1529 KB, i.e.
// the whole point of the change inverted on the byte axis while the DOM halved.
//
// Stripped from the RAW export, not from `prepared`: the runtime still runs
// prepareBeachSvg over what it fetches, so this file must be in the same form main 2.svg
// is — unprefixed ids, backdrops intact. Everything that is NOT a spinner stays, because
// the runtime still needs it: the cars (their SMIL is injected into this string), the
// curb/curb 3 groups the wave band is measured against, and the viewBox itself.
let base = rawSvg
for (const cfg of BEACH_SPINNERS) {
  const { inner, without } = extractGroup(base, cfg.id)
  if (!inner) throw new Error(`${SRC}: group ${cfg.id} measured but not extractable from the raw export`)
  base = without
}
writeFileSync(BASE_SVG, base)

writeFileSync(
  META,
  `// GENERATED by scripts/bakeBeachSpinners.mts — do not edit by hand.
// Re-run \`npm run bake:spinners\` after any re-export of main 2.svg.
//
// The 20 beach spinners as baked rasters: their boxes in the beach's own viewBox units,
// plus the two encodings of each. BackgroundCanvas renders these instead of inlining the
// groups' markup — 4 230 DOM nodes and a whole-beach invisible measure pass removed.
import type { SpriteBox } from './utils/spriteBoxes'

export interface BakedSpinner {
  /** b2-prefixed Figma group id, as it appears in the prepared beach svg */
  id: string
  /** box in beach viewBox units, already padded by BOX_BLEED */
  box: SpriteBox
  /** master handed to next/image — never served at this size */
  src: string
  /** tiny copy for useAdaptiveText's cover */
  fill: string
  /** on-screen width as a share of the viewport, for next/image's \`sizes\` */
  sizes: string
}

/** sha256 of main 2.svg at bake time — verify:spinner-bake compares against the file. */
export const SPINNER_BAKE_SOURCE_HASH = '${sourceHash}'

/** The beach art with the baked groups removed — what BackgroundCanvas fetches instead of
 *  main 2.svg. Fetching the full export would ship the spinners' markup as well as their
 *  rasters; see the note in the bake script. */
export const BEACH_BASE_SVG = '/SVG/background/main2-no-spinners.svg'

/** canvas units → raster pixels used when baking; see the SCALE note in the script. */
export const SPINNER_BAKE_SCALE = ${SCALE}

/** The canvas the boxes are expressed in. Placement is a PERCENTAGE of this viewBox
 *  (boundedLayerStyle), so nothing here is in pixels and it survives resize, the
 *  cover-zoom and the phones-only scaleY untouched. */
export const SPINNER_BAKE_VIEWBOX = ${JSON.stringify(vb)} as const

export const BAKED_SPINNERS: BakedSpinner[] = ${JSON.stringify(baked, null, 2)}

/** by b2-prefixed id, for the render path */
export const BAKED_SPINNER_BY_ID = new Map(BAKED_SPINNERS.map(s => [s.id, s]))
`,
)

const svgBytes = baked.reduce((n, b) => n + extractGroup(prepared, b.id).inner.length, 0)
console.log(`${SPRITE_DIR}: ${baked.length}×2 files — masters ${(masterBytes / 1024).toFixed(0)} KB (never served), fills ${(fillBytes / 1024).toFixed(0)} KB`)
console.log(`${BASE_SVG}: ${(base.length / 1024).toFixed(0)} KB raw (was ${(rawSvg.length / 1024).toFixed(0)} KB)`)
console.log(`${META}: source ${sourceHash}`)
console.log(`replaces ${(svgBytes / 1024).toFixed(0)} KB of inline SVG (215 KB gzipped) across 4 230 nodes`)
