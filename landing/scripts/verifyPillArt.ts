/**
 * Guard for `npm run gen:pill-art`.
 *
 * The header pills are drawn as a stack — a ground with the decorations taken out,
 * plus one layer per decoration — so that each decoration can lean and grow on
 * hover. Two things have to hold, and this asserts both:
 *
 *   1. Placement. Every decoration is a per-node Figma export, origined at its own
 *      bbox, re-seated by an offset in PLACED (scripts/generatePillArt.ts). Get one
 *      of those offsets wrong and a plant slides. So compare the stack against the
 *      hand-off SHEET, which is the only record of where Figma put each plant.
 *   2. The pill's clip. The sheet paints its own ground, and `slice` crops it
 *      vertically, so the shape it paints is NOT --radius-btn. The pill clips with
 *      `overflow-hidden rounded-btn` instead — so both sides are compared through
 *      that same clip, and the corner is asserted separately.
 *
 * The sheets are cropped art (that is the bug the re-export fixes), so the stack
 * legitimately shows MORE plant than the sheet does, and a restored leaf may well
 * cover something the sheet left bare. What must never happen is art going MISSING.
 * So the measure is three-way against the bare ground: of the pixels where the sheet
 * paints a plant, how many does the stack leave as bare ground? A plant that moved
 * or failed to load shows up there; a plant that merely overlaps differently does
 * not.
 *
 * Served over HTTP on purpose. Chromium refuses file:// subresources inside a
 * document created by setContent, so the previous version of this script compared
 * two blank boxes and passed on every pill including broken ones.
 *
 *   npm run verify:pill-art
 */
import { chromium } from 'playwright'
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import {
  DECOR_LAYER_OFFSET, DECOR_LAYER_SIZE, DECOR_BLEED, DECOR_LEAN_CLASS_PCT,
} from '../components/ui/pillArt'

const PUBLIC = path.resolve(__dirname, '../public')
const PILLS  = path.join(PUBLIC, 'SVG/header/pills')
const PARTS  = path.join(PILLS, 'parts')
const HEADER = path.resolve(__dirname, '../components/sections/Header.tsx')

/** Realistic pill boxes: height is 8 + lineHeight 32 + 8; width is label + 2×16. */
const BOXES: Record<string, { w: number; h: number }> = {
  'about':        { w: 150, h: 48 },
  'connect':      { w: 130, h: 48 },
  'tutors':       { w: 122, h: 48 },
  'celpe':        { w: 175, h: 48 },
  'plans':        { w: 116, h: 48 },
  'become-tutor': { w: 232, h: 48 },
  '3dots':        { w:  48, h: 48 },   // the square icon pill, authored at its size
}

/**
 * A decoration layer, by name. Everything else a sheet is split into — the sheet's
 * own last-painted groups, lifted back on top (GLYPH in gen:pill-art) — is drawn at
 * `inset-0` after them instead of in the bled window. Matched on the role rather than
 * on the lifted names so that adding another top layer cannot silently put it in the
 * wrong box here. Comparing the stack against the sheet is what catches these being
 * buried: the ⋮ dots vanished under its bouquet the moment it became a split pill.
 */
const ROLE_PART = /-(left|mid|right)\.svg$/
const ZOOM = 4          // a one-unit slip in the sheet becomes several pixels
const RADIUS_BTN = 18   // --radius-btn, globals.css

/** Sheet plant the stack leaves as bare ground, as a fraction of the sheet's plant. */
const MAX_MISSING = 0.02
const TOLERANCE = 24
/** Radius, in zoomed px, a gap must survive to count — see the note in MISSING. */
const EROSION = 2

function serve() {
  const server = http.createServer((req, res) => {
    const url = decodeURIComponent((req.url || '/').split('?')[0])
    if (url === '/') { res.setHeader('content-type', 'text/html'); return res.end('<!doctype html><body>') }

    const p = path.join(PUBLIC, url)
    if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.statusCode = 404; return res.end('404') }
    res.setHeader('content-type', 'image/svg+xml')
    res.end(fs.readFileSync(p))
  })
  return new Promise<{ url: string; close: () => void }>(r =>
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as { port: number }
      r({ url: `http://127.0.0.1:${port}`, close: () => server.close() })
    }))
}

/**
 * Sheet, stack and bare ground, compared in the browser. `plant` counts pixels the
 * sheet paints over the ground; `missing` is how many of those the stack leaves as
 * ground — art that vanished, as opposed to art a restored leaf now overlaps.
 */
const MISSING = `(async () => {
  var W = window.__W__, H = window.__H__, T = window.__T__;
  var load = function (b64) {
    return new Promise(function (res) {
      var img = new Image();
      img.onload = function () {
        var c = document.createElement('canvas');
        c.width = W; c.height = H;
        var x = c.getContext('2d');
        x.drawImage(img, 0, 0);
        res(x.getImageData(0, 0, W, H));
      };
      img.src = 'data:image/png;base64,' + b64;
    });
  };
  var sheet = await load(window.__A__), stack = await load(window.__B__), bare = await load(window.__C__);
  var differs = function (p, q, i) {
    return Math.abs(p.data[i] - q.data[i]) > T ||
           Math.abs(p.data[i+1] - q.data[i+1]) > T ||
           Math.abs(p.data[i+2] - q.data[i+2]) > T;
  };
  var plant = 0;
  var gone = new Uint8Array(W * H);
  for (var i = 0, px = 0; i < sheet.data.length; i += 4, px++) {
    if (!differs(sheet, bare, i)) continue;      // sheet shows no plant here
    plant++;
    if (!differs(stack, bare, i)) gone[px] = 1;  // …and the stack shows none either
  }

  // Erode. A plant that moved leaves a solid blob; a hairline along one of the
  // frond's veins is the two sides rounding a sub-pixel edge to different pixels,
  // and at ZOOM there are dozens of those. Only a pixel whose neighbourhood is
  // ALSO empty counts, which keeps blobs and drops slivers.
  var R = ${EROSION}, missing = 0;
  for (var y = R; y < H - R; y++) {
    for (var x = R; x < W - R; x++) {
      if (!gone[y * W + x]) continue;
      var solid = true;
      for (var dy = -R; dy <= R && solid; dy++)
        for (var dx = -R; dx <= R; dx++)
          if (!gone[(y + dy) * W + (x + dx)]) { solid = false; break; }
      if (solid) missing++;
    }
  }
  return { plant: plant, missing: missing };
})()`

async function main() {
  // The layer geometry is spelled out literally in Header.tsx for Tailwind's sake;
  // assert the literals still agree with the numbers they were derived from.
  const header = fs.readFileSync(HEADER, 'utf8')
  const expected = [
    `left-[${DECOR_LAYER_OFFSET}]`, `top-[${DECOR_LAYER_OFFSET}]`,
    `w-[${DECOR_LAYER_SIZE}]`, `h-[${DECOR_LAYER_SIZE}]`,
    // Preflight's `max-width: 100%` on <img> beats the width and silently clamps the
    // layer to its own box — see the note in pillArt.ts. `verify:header-hover`
    // measures the rendered box; this only keeps the class from being tidied away.
    'max-w-none',
  ]
  const layerSrc = fs.readFileSync(path.resolve(__dirname, '../components/ui/pillArt.ts'), 'utf8')
  for (const cls of expected) {
    if (!layerSrc.includes(cls)) throw new Error(`pillArt.ts DECOR_LAYER is missing ${cls} (DECOR_BLEED=${DECOR_BLEED})`)
  }
  const lean = `translate-x-[${DECOR_LEAN_CLASS_PCT}%]`
  if (!header.includes(lean)) {
    throw new Error(
      `Header.tsx PILL_DECOR should lean with ${lean} — ` +
      `${DECOR_LEAN_CLASS_PCT}% of a layer ${DECOR_BLEED}× the pill is the intended 6% of the pill`,
    )
  }
  console.log(`✓ layer geometry  ${DECOR_LAYER_OFFSET}/${DECOR_LAYER_SIZE} and lean ${lean} agree with DECOR_BLEED=${DECOR_BLEED}`)

  const bases = fs.readdirSync(PARTS).filter(f => f.endsWith('-base.svg'))
  if (!bases.length) throw new Error('no parts found — run `npm run gen:pill-art` first')

  const srv = await serve()
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1000, height: 400 } })
  await page.goto(srv.url + '/')
  let failed = 0

  for (const baseFile of bases.sort()) {
    const pill = baseFile.slice(0, -'-base.svg'.length)
    const box = BOXES[pill]
    if (!box) { console.log(`· ${pill.padEnd(14)} no reference box — skipped`); continue }
    const W = box.w * ZOOM, H = box.h * ZOOM
    const own = fs.readdirSync(PARTS).filter(f => f.startsWith(`${pill}-`) && f !== baseFile).sort()
    const roles = own.filter(f => ROLE_PART.test(f))
    const glyphs = own.filter(f => !ROLE_PART.test(f))

    const clip = `overflow:hidden;border-radius:${RADIUS_BTN * ZOOM}px`
    const shoot = async (layers: string) => {
      await page.setContent(
        `<body style="margin:0;background:#f0f">` +
        `<div id="box" style="position:relative;width:${W}px;height:${H}px;${clip}">${layers}</div></body>`,
      )
      await page.waitForTimeout(160)
      return page.locator('#box').screenshot()
    }
    const img = (file: string, style: string) =>
      `<img src="/SVG/header/pills/${encodeURIComponent(file)}" style="${style}">`
    const INSET = 'position:absolute;inset:0;width:100%;height:100%;display:block'
    const BLEED = `position:absolute;left:${DECOR_LAYER_OFFSET};top:${DECOR_LAYER_OFFSET};` +
                  `width:${DECOR_LAYER_SIZE};height:${DECOR_LAYER_SIZE};display:block`

    const sheet = await shoot(img(`${pill}.svg`, INSET))
    const bare  = await shoot(img(`parts/${baseFile}`, INSET))
    const stack = await shoot(
      img(`parts/${baseFile}`, INSET) +
      roles.map(r => img(`parts/${r}`, BLEED)).join('') +
      glyphs.map(g => img(`parts/${g}`, INSET)).join(''),
    )

    await page.evaluate(
      `window.__A__ = ${JSON.stringify(sheet.toString('base64'))};` +
      `window.__B__ = ${JSON.stringify(stack.toString('base64'))};` +
      `window.__C__ = ${JSON.stringify(bare.toString('base64'))};` +
      `window.__W__ = ${W}; window.__H__ = ${H}; window.__T__ = ${TOLERANCE};`,
    )
    const { plant, missing } = await page.evaluate(MISSING) as { plant: number; missing: number }
    const ratio = plant ? missing / plant : 1
    const ok = plant > 0 && ratio <= MAX_MISSING
    if (!ok) failed++
    console.log(
      `${ok ? '✓' : '✗'} ${pill.padEnd(14)} base + ${roles.length} layer(s)  ` +
      `sheet plant left bare: ${(ratio * 100).toFixed(2)}% of ${plant} px ` +
      `(limit ${(MAX_MISSING * 100).toFixed(0)}%)`,
    )
  }

  // The bar's cover plants are not checked here any more, and are not generated
  // either: they are the `decor/` exports drawn as they are and placed by CSS
  // (components/ui/coverPlants.ts). There is no mapping left to get wrong — an
  // anchored <img> at its own aspect either loads or it does not, and
  // `verify:header-hover` measures what the page actually renders.

  await browser.close()
  srv.close()
  if (failed) {
    console.error(`\n${failed} layer(s) do not reproduce the hand-off — a decoration moved or went missing`)
    process.exit(1)
  }
  console.log('\nheader art OK — every pill rebuilds its own sheet')
}

main().catch(e => { console.error(e); process.exit(1) })
