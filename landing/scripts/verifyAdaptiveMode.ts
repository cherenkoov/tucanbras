// Guard: every adaptive text must SAMPLE THE LIVE BACKDROP, on every engine.
//
// The failure this catches is silent — nothing throws, nothing looks broken in a build,
// the glyphs just start colouring themselves from the wrong part of the background. It has
// happened once already: adding the `duotone` palette prop (8626ce6/1ce1538, 2026-08-08)
// gated the WebKit built-in chain behind `filterId === INK_FILTER_ID`, the default palette
// moved off `ink`, and every phone quietly fell to the static composite reconstruction —
// which drifts against the parallaxing art (measured: a heading reconstructing L=0.78 over
// a background that is really L=0.13, a full flip across the 0.70 threshold).
//
// So this asserts the MECHANISM, not the pixels: zero elements on the static path, and the
// chain each engine gets is one it can actually paint —
//   WebKit  → BACKDROP_BUILTIN_BRAND: binarise, a blur BARRIER, then two tint stages.
//             WebKit paints nothing for url(#) inside backdrop-filter and does not pass its
//             backdrop image through the element's own filter, so the palette has to be
//             built out of built-in functions — and those are inert unless a blur forces
//             the rasterisation that restores clamping (all measured on a real iPhone,
//             2026-08-09). Lose the tint or the barrier and the phone silently reverts to
//             black-and-white headings, which is what this asserts.
//   others  → the exact url(#adaptive-duotone-*) palette chain, phone or desktop.
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

async function run(c: Case) {
  const browser = await c.type.launch()
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
        // useAdaptiveDuotone) clip with their own border-box and have none. Both must end
        // up on the same chain so a phone never shows mono dots beside tinted headings.
        text: live.filter(e => !!e.style.getPropertyValue('mask') || !!e.style.getPropertyValue('-webkit-mask')).length,
        shapes: live.filter(e => !e.style.getPropertyValue('mask') && !e.style.getPropertyValue('-webkit-mask')).length,
        // Static mode is the one that puts `filter: url(#…)` on the TEXT element itself
        // (the host, never the overlay) — count only hosts so the re-colour pass above
        // is not mistaken for a fallback.
        static: [...document.querySelectorAll<HTMLElement>('[style*="filter: url"]')]
          .filter(e => !e.style.getPropertyValue('backdrop-filter')).length,
      }
    }).catch(() => null)
    if (r && (r.live || r.static)) { seen = r; break }
  }
  await browser.close()

  const fails: string[] = []
  if (seen.live === 0) fails.push('no adaptive text reached a live backdrop chain at all')
  if (seen.static > 0) fails.push(`${seen.static} element(s) fell back to the static reconstruction`)
  for (const chain of seen.chains) {
    const isBuiltin = chain.startsWith(BINARISE)
    const isPalette = /url\(["']?#adaptive-duotone/.test(chain)
    if (c.webkit && !isBuiltin) fails.push(`WebKit got a chain it cannot paint: "${chain}"`)
    if (!c.webkit && !isPalette) fails.push(`non-WebKit lost the exact palette: "${chain}"`)
    // WebKit reaches the brand palette only through the tint stages, and those are inert
    // without a blur barrier to restore the clamp WebKit skips between filter functions
    // (device-verified). Losing either silently drops the phone back to black-and-white.
    if (c.webkit && isBuiltin && !/sepia\(/.test(chain)) {
      fails.push(`WebKit chain lost its tint — headings go black/white: "${chain}"`)
    }
    if (c.webkit && isBuiltin && !/blur\(/.test(chain)) {
      fails.push(`WebKit chain lost its blur barrier — the tint after it is inert: "${chain}"`)
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
  for (const c of CASES) ok = (await run(c)) && ok
  if (!ok) {
    console.error('\nAdaptive text is not live-sampling everywhere — see useAdaptiveText.ts gate.')
    process.exit(1)
  }
  console.log('\nAll engines live-sample the backdrop.')
}
main()
