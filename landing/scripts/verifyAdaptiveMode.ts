// Guard: every adaptive text must end up on the chain its ENGINE was chosen for, and the
// colour must always be the brand palette.
//
// The failure this catches is silent — nothing throws, nothing looks broken in a build,
// the glyphs just start colouring themselves wrong. It has happened twice:
//   • 2026-08-08 (8626ce6/1ce1538): the `duotone` prop gated the WebKit built-in chain
//     behind `filterId === INK_FILTER_ID`, the default palette moved off `ink`, and EVERY
//     phone quietly fell to the static composite reconstruction — which drifts against the
//     parallaxing art (measured: a heading reconstructing L=0.78 over a background that is
//     really L=0.13, a full flip across the 0.70 threshold).
//   • 2026-08-17 (PR #13, in production): the replacement made the fitted built-in chain
//     the WebKit default, and on the owner's device its blur barrier did not clamp — the
//     headings came out light blue over dark backgrounds and near-black over light ones,
//     no brand colour anywhere. `npm run check:duotone-chain` has the arithmetic.
//
// So this asserts the MECHANISM per engine, which is now deliberately NOT the same one:
//   non-WebKit → the exact url(#adaptive-duotone-*) chain inside backdrop-filter, phone
//                AND desktop, and nothing on the static path. They render the reference
//                filter, so they get the live sample at exact palette colours.
//   WebKit     → the palette through the element's own `filter: url(#…)` (the static
//                path), which it DOES render — the live sample is given up on this engine
//                until the built-in chain is re-measured on a device. What must never come
//                back unattended is a tinted built-in chain: `sepia(` inside a
//                backdrop-filter here means the clamp-dependent fit went out by default
//                again. Shape consumers (carousel dots) have no static path and stay on
//                the MONO built-in chain — tint-free, so the same assertion covers them.
// Run against a prod build (`npm run build && npm start`):
//   npm run verify:adaptive-mode                     → http://localhost:3000/ru
//   npm run verify:adaptive-mode -- http://host/ru   → custom URL
import { chromium, webkit, type BrowserType } from 'playwright'

const BASE = process.argv[2] ?? 'http://localhost:3000/ru'
// Every WebKit chain opens with this binarise (the slope may be applied more than once to
// sharpen the threshold); what follows it is the barrier and the tint.
const BINARISE = 'grayscale(1) brightness(0.714) contrast(50)'

type Case = { name: string; type: BrowserType; viewport: { width: number; height: number }; touch: boolean; webkit: boolean }
const CASES: Case[] = [
  { name: 'chromium desktop', type: chromium, viewport: { width: 1440, height: 900 }, touch: false, webkit: false },
  { name: 'chromium phone',   type: chromium, viewport: { width: 390, height: 844 },  touch: true,  webkit: false },
  { name: 'webkit phone',     type: webkit,   viewport: { width: 390, height: 844 },  touch: true,  webkit: true },
]

async function run(c: Case): Promise<boolean | 'skipped'> {
  // A missing browser binary is an environment fact, not a verdict on the code — say so
  // out loud instead of either crashing or quietly reporting a pass for a case that never
  // ran. (The sandbox this was last edited in cannot download the WebKit build at all.)
  let browser
  try {
    browser = await c.type.launch()
  } catch {
    console.log(`SKIP  ${c.name.padEnd(17)} browser not installed — npx playwright install ${c.type.name()}`)
    return 'skipped'
  }
  const ctx = await browser.newContext({ viewport: c.viewport, hasTouch: c.touch })
  const page = await ctx.newPage()
  await page.goto(BASE, { waitUntil: 'load', timeout: 60_000 })

  // The hook applies a frame or three after hydration, and the page fires same-URL
  // navigations that can destroy an evaluate mid-flight — poll instead of sleeping once.
  let seen = { live: 0, static: 0, text: 0, shapes: 0, chains: [] as string[] }
  for (let t = 0; t < 25; t++) {
    await page.waitForTimeout(1_000)
    const r = await page.evaluate(() => {
      const live = [...document.querySelectorAll<HTMLElement>('[style*="backdrop-filter"]')]
      return {
        live: live.length,
        chains: [...new Set(live.map(e =>
          e.style.getPropertyValue('backdrop-filter') || e.style.getPropertyValue('-webkit-backdrop-filter')))],
        // TEXT overlays carry a glyph mask; the SHAPE consumers (carousel dots, via
        // useAdaptiveDuotone) clip with their own border-box and have none. On WebKit the
        // two deliberately part ways — texts take the palette filter, shapes keep a mono
        // live sample because they have no static path — so they are counted separately.
        text: live.filter(e => !!e.style.getPropertyValue('mask') || !!e.style.getPropertyValue('-webkit-mask')).length,
        shapes: live.filter(e => !e.style.getPropertyValue('mask') && !e.style.getPropertyValue('-webkit-mask')).length,
        // Static mode is the one that puts `filter: url(#…)` on the TEXT element itself
        // (the host, never the overlay) — count only hosts so the re-colour pass above
        // is not mistaken for a fallback.
        static: [...document.querySelectorAll<HTMLElement>('[style*="filter: url"]')]
          .filter(e => !e.style.getPropertyValue('backdrop-filter')).length,
      }
    }).catch(() => null)
    // Break on what this engine is SUPPOSED to reach, not on "anything applied": the
    // carousel dots go live within a frame while a heading still waits for the art to
    // land, so `live > 0` would let a WebKit run be judged before its texts had a mode.
    if (r) { seen = r; if (c.webkit ? r.static > 0 : r.live > 0) break }
  }
  await browser.close()

  const fails: string[] = []
  if (c.webkit) {
    // Headings: the element's own filter carries the palette. Overlays (live sample) are
    // for the shapes only — a masked live overlay here means a text went back to a
    // built-in chain, i.e. the clamp-dependent colours that shipped in PR #13.
    if (seen.static === 0) fails.push('no adaptive text reached the palette filter at all')
    if (seen.text > 0) fails.push(`${seen.text} text overlay(s) on a built-in backdrop chain — WebKit cannot tint one reliably`)
  } else {
    if (seen.live === 0) fails.push('no adaptive text reached a live backdrop chain at all')
    if (seen.static > 0) fails.push(`${seen.static} element(s) fell back to the static reconstruction`)
  }
  for (const chain of seen.chains) {
    const isBuiltin = chain.startsWith(BINARISE)
    const isPalette = /url\(["']?#adaptive-duotone/.test(chain)
    if (c.webkit && !isBuiltin) fails.push(`WebKit got a chain it cannot paint: "${chain}"`)
    if (!c.webkit && !isPalette) fails.push(`non-WebKit lost the exact palette: "${chain}"`)
    // The regression this now watches for is the OPPOSITE of the old one: a tint inside a
    // WebKit backdrop chain means the fitted, clamp-dependent palette went out by default
    // again (prod 2026-08-17: light blue over dark, near-black over light). It is reachable
    // on purpose with ?duobrand=1, which this guard never passes.
    if (c.webkit && isBuiltin && /sepia\(/.test(chain)) {
      fails.push(`WebKit is back on the clamp-dependent tint chain by default: "${chain}"`)
    }
  }
  const ok = fails.length === 0
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${c.name.padEnd(17)} live=${seen.live} (text ${seen.text}, shapes ${seen.shapes}) static=${seen.static}`)
  for (const chain of seen.chains) console.log(`        chain: ${chain}`)
  for (const f of fails) console.log(`        ✗ ${f}`)
  return ok
}

async function main() {
  let ok = true
  const skipped: string[] = []
  for (const c of CASES) {
    const r = await run(c)
    if (r === 'skipped') skipped.push(c.name)
    else ok = r && ok
  }
  if (!ok) {
    console.error('\nAdaptive text is not on the mode its engine was chosen for — see the gate in useAdaptiveText.ts.')
    process.exit(1)
  }
  console.log(`\nEvery engine is on its intended duotone path${skipped.length ? ` (NOT CHECKED: ${skipped.join(', ')})` : ''}.`)
}
main()
