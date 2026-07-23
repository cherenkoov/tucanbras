// A/B screenshots of every adaptive text/icon: backdrop (the per-pixel ground truth,
// desktop path) vs forced static fill (?staticfill=1 — what touch devices get). Not an
// assertion script — pixel-diffing is meaningless (backdrop reflects live moving
// sprites); eyeball the pairs for the INK/CREAM side of each glyph. Run against a prod
// build (`npm run build && npm start`):
//
//   npm run verify:staticfill                       → http://localhost:3000/ru
//   npm run verify:staticfill -- http://host/ru     → custom URL
//   npm run verify:staticfill -- http://host/ru 390x844   → phone-width layout
//     (the engine still hovers → backdrop stays available as the ground truth)
//
// Output: verify-staticfill[-WxH]/<index>-<variant>.png (paired by index).
import { chromium, type Page } from 'playwright'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

const BASE = process.argv[2] ?? 'http://localhost:3000/ru'
const vpArg = /^(\d+)x(\d+)$/.exec(process.argv[3] ?? '')
const VIEWPORT = vpArg
  ? { width: Number(vpArg[1]), height: Number(vpArg[2]) }
  : { width: 1440, height: 900 }
const OUT = vpArg ? `verify-staticfill-${VIEWPORT.width}x${VIEWPORT.height}` : 'verify-staticfill'
const PAD = 48 // context around the element in the shot

// Tag every adaptive element with a stable data-verify index. Backdrop mode marks the
// overlay <span> (backdrop-filter: ...adaptive-duotone) — take its parent; static mode
// marks the text element itself (filter: url(#adaptive-duotone)).
async function tagAdaptiveElements(p: Page): Promise<number> {
  return p.evaluate(() => {
    const els = new Set<HTMLElement>()
    document.querySelectorAll<HTMLElement>('[style*="adaptive-duotone"]').forEach(el => {
      // Backdrop mode marks the overlay <span> (backdrop-filter) — take its parent (the
      // host); static mode marks the host itself (filter), keep it as is.
      const isOverlay = el.getAttribute('style')?.includes('backdrop-filter')
      els.add(isOverlay && el.parentElement ? el.parentElement : el)
    })
    let i = 0
    for (const el of els) el.setAttribute('data-verify-idx', String(i++))
    return i
  })
}

async function shoot(page: Page, variant: 'backdrop' | 'static') {
  const url = variant === 'static' ? `${BASE}${BASE.includes('?') ? '&' : '?'}staticfill=1` : BASE
  // networkidle never settles here (background layers keep fetching) — wait for the
  // beach wave layer instead, it mounts after the collage/beach SVGs land.
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 })
  await page.waitForSelector('.beach-wave', { timeout: 15_000 }).catch(() => {})
  await page.waitForTimeout(1_500)
  // Walk the page once so late-fetched layers land and every hook has booted.
  await page.evaluate(async () => {
    for (let y = 0; y <= document.body.scrollHeight; y += 800) {
      window.scrollTo(0, y)
      await new Promise(r => setTimeout(r, 60))
    }
    window.scrollTo(0, 0)
  })
  await page.waitForTimeout(800)

  const count = await tagAdaptiveElements(page)
  console.log(`${variant}: ${count} adaptive elements`)
  for (let i = 0; i < count; i++) {
    const el = page.locator(`[data-verify-idx="${i}"]`)
    await el.evaluate(node => node.scrollIntoView({ block: 'center' }))
    await page.waitForTimeout(600) // let the parallax easing settle
    const box = await el.boundingBox()
    if (!box) continue
    await page.screenshot({
      path: join(OUT, `${String(i).padStart(2, '0')}-${variant}.png`),
      clip: {
        x: Math.max(0, box.x - PAD),
        y: Math.max(0, box.y - PAD),
        width: Math.min(VIEWPORT.width, box.width + PAD * 2),
        height: Math.min(VIEWPORT.height, box.height + PAD * 2),
      },
    })
  }
  return count
}

async function main() {
  mkdirSync(OUT, { recursive: true })
  const browser = await chromium.launch()
  const page = await browser.newPage()
  await page.setViewportSize(VIEWPORT)
  const a = await shoot(page, 'backdrop')
  const b = await shoot(page, 'static')
  if (a !== b) console.warn(`⚠ element count differs: backdrop=${a} static=${b}`)
  console.log(`done → ${OUT}/`)
  await browser.close()
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
