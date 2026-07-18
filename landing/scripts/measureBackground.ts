// Probes the LIVE background on a production build and prints the geometry the
// wave-queue layout depends on. Not an assertion script — a measurement tool.
// Run against `npm run build && npm start` (dev-build numbers are not trustworthy).
//
//   npm run verify:bg-measure                       → http://localhost:3000/ru
//   npm run verify:bg-measure -- http://host/ru     → custom URL
import { chromium } from 'playwright'

const URL = process.argv[2] ?? 'http://localhost:3000/ru'
const WIDTHS = [375, 768, 1024, 1440, 1920, 2560]
const VIEWPORT_H = 900

interface Probe {
  width: number
  zoom: number              // container width % / 100
  focalTranslateX: number
  containerHeight: number   // rendered px (bgHeight in the coverage math)
  beachTop: number          // beach offset within the container == baseHeightPx
  beachHeight: number
  contentHeight: number     // main.offsetTop + main.offsetHeight
  fillHeight: number        // terminal flat band; 0 means parallax closed the gap
  waveCount: number
}

// Wrapped in an async IIFE (not top-level await): tsx transforms a plain `.ts` file
// as CommonJS whenever the nearest package.json lacks `"type": "module"` (true here —
// flipping that globally would touch every script/config in the project), and esbuild
// refuses top-level await under the cjs output format. Logic/values are unchanged.
async function main() {
  const browser = await chromium.launch()
  const page = await browser.newPage()

  const rows: Probe[] = []
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: VIEWPORT_H })
    // 'load', not 'networkidle': the page never goes network-quiet for 500ms — the
    // background keeps fetching SVG art and the SMIL surf holds connections — so
    // networkidle just burns the timeout. The real readiness signal is the baked
    // queue appearing in the DOM, which is the waitForSelector below.
    await page.goto(URL, { waitUntil: 'load' })
    // The beach SVG is fetched + baked client-side; wait for the queue to exist.
    // state: 'attached' (not the default 'visible'): these are SVG <g> elements, and
    // Playwright's visibility heuristic times out on them even once attached with a
    // real layout box (confirmed via a throwaway probe — 14 present, getBoundingClientRect
    // non-empty) — the same "no reliable CSS box" quirk noted for SVG <g> elsewhere in
    // this codebase. Geometry reads below use getBoundingClientRect directly, unaffected.
    await page.waitForSelector('.beach-wave', { state: 'attached', timeout: 15_000 })
    // Scroll to the bottom so the parallax transform settles at its extreme.
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.waitForTimeout(600)

    const probe = await page.evaluate(() => {
      const container = document.querySelector<HTMLElement>('.background-canvas')!
      const main = document.querySelector<HTMLElement>('main')!
      const beach = container.querySelector<HTMLElement>('[data-bg-layer="beach"]')
      const cRect = container.getBoundingClientRect()
      const bRect = beach?.getBoundingClientRect()
      const widthStyle = container.style.width
      const zoom = widthStyle.endsWith('%') ? parseFloat(widthStyle) / 100 || 1 : 1
      const m = container.style.transform.match(/translateX\(([-\d.]+)px\)/)
      // The terminal fill band is the only absolutely-positioned child at top:100%.
      const fill = container.querySelector<HTMLElement>(':scope > div[style*="top: 100%"]')
      return {
        zoom,
        focalTranslateX: m ? parseFloat(m[1]) : 0,
        containerHeight: cRect.height,
        beachTop: bRect ? bRect.top - cRect.top : -1,
        beachHeight: bRect ? bRect.height : -1,
        contentHeight: main.offsetTop + main.offsetHeight,
        fillHeight: fill ? fill.getBoundingClientRect().height : 0,
        waveCount: container.querySelectorAll('.beach-wave').length,
      }
    })
    rows.push({ width, ...probe })
  }

  await browser.close()

  const r = (n: number) => Math.round(n)
  console.log('width\tzoom\tfocalX\tcontainerH\tbeachTop\tbeachH\tcontentH\tfillH\twaves')
  for (const p of rows) {
    console.log(
      [p.width, p.zoom.toFixed(3), r(p.focalTranslateX), r(p.containerHeight),
       r(p.beachTop), r(p.beachHeight), r(p.contentHeight), r(p.fillHeight), p.waveCount].join('\t'),
    )
  }
}

main()
