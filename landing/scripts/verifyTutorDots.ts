// The Tutors carousel indicator must actually PAINT.
//
// It is a flat brand-green box now (2026-10-03). Before that it was a TRANSPARENT box
// tinted by a backdrop-filter duotone, which is the failure this guard was written for:
// an engine that silently drops the chain left the indicator invisible with nothing in
// the console to show it. The duotone is gone; the way a dot can still vanish is not.
// `opacity` dims the neighbours, a decor change can cover the row, and the colour is one
// token away from the headings — so the check stays as it was in shape: against the live
// page, the active dot must resolve to the brand green and every dot must change the
// pixels behind it. Run against a prod build (`npm run build && npm start`):
//
//   npm run verify:tutor-dots                                   → http://localhost:3000/ru
//   npm run verify:tutor-dots -- http://host/ru                 → custom URL
//   npm run verify:tutor-dots -- http://host/ru 390x844         → phone-width layout
//   npm run verify:tutor-dots -- http://host/ru 390x844 touch   → …and `hover: none`
//
// ?noanim=1 is forced: the two screenshots (dots shown / hidden) must see the SAME
// background, and the collage sprites move on their own otherwise.
import { chromium, type Page } from 'playwright'

const BASE = process.argv[2] ?? 'http://localhost:3000/ru'
const vpArg = /^(\d+)x(\d+)$/.exec(process.argv[3] ?? '')
const VIEWPORT = vpArg
  ? { width: Number(vpArg[1]), height: Number(vpArg[2]) }
  : { width: 1440, height: 900 }
// Chromium's mobile emulation is what flips `hover: none` / `any-hover: none`. Nothing in
// the indicator reads it any more, but the phone layout is still worth a pass.
const TOUCH = process.argv.includes('touch')

// --color-green, the one colour the indicator and the headings share (DOT_COLOR in
// Tutors.tsx). The active dot is fully opaque, so it must land on it exactly.
const GREEN = [0x8f, 0xd0, 0x96]
const COLOR_TOL = 8
// A dimmed dot composites `opacity(a)` of the green over the real backdrop; at a=0.2
// that is a faint ghost, so only a few levels of change are expected.
const PAINT_TOL = 6

type Px = [number, number, number]

function dist(a: Px, b: number[]): number {
  return Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2]))
}

// Sample the given page-space points out of a PNG screenshot, decoded through a canvas
// in the browser (same trick as verifyPillArt — no image decoder in node here).
async function samplePixels(
  page: Page,
  png: Buffer,
  origin: { x: number; y: number },
  points: { x: number; y: number }[],
): Promise<Px[]> {
  return page.evaluate(
    async ({ b64, pts }) => {
      const img = new Image()
      await new Promise<void>(res => { img.onload = () => res(); img.src = 'data:image/png;base64,' + b64 })
      const c = document.createElement('canvas')
      c.width = img.width
      c.height = img.height
      const ctx = c.getContext('2d')!
      ctx.drawImage(img, 0, 0)
      return pts.map(p => {
        const d = ctx.getImageData(Math.round(p.x), Math.round(p.y), 1, 1).data
        return [d[0], d[1], d[2]] as [number, number, number]
      })
    },
    {
      b64: png.toString('base64'),
      pts: points.map(p => ({ x: p.x - origin.x, y: p.y - origin.y })),
    },
  )
}

async function main() {
  const url = `${BASE}${BASE.includes('?') ? '&' : '?'}noanim=1`
  const browser = await chromium.launch()
  const page = await browser.newPage({
    viewport: VIEWPORT,
    deviceScaleFactor: 1,
    ...(TOUCH ? { isMobile: true, hasTouch: true } : {}),
  })

  // networkidle never settles (background layers keep fetching) — wait for the beach wave
  // layer, then walk the page so every lazy layer lands, as verifyStaticFill does.
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 })
  await page.waitForSelector('.beach-wave', { timeout: 15_000 }).catch(() => {})
  await page.waitForSelector('[data-tutor-dot]', { timeout: 15_000 })
  await page.evaluate(async () => {
    for (let y = 0; y <= document.body.scrollHeight; y += 800) {
      window.scrollTo(0, y)
      await new Promise(r => setTimeout(r, 60))
    }
  })
  await page.locator('[data-tutor-dot]').first().evaluate(el => el.scrollIntoView({ block: 'center' }))
  await page.waitForTimeout(1_200) // parallax easing settles

  const bg = await page.locator('[data-tutor-dot="0"]').evaluate(el => getComputedStyle(el).backgroundColor)
  console.log(`background: ${bg}`)

  const dots = await page.locator('[data-tutor-dot]').evaluateAll(els =>
    els.map(el => {
      const r = el.getBoundingClientRect()
      return { dist: Number(el.getAttribute('data-tutor-dot')), cx: r.x + r.width / 2, cy: r.y + r.height / 2 }
    }))
  if (dots.length === 0) throw new Error('no dots rendered')

  // Clip covering the whole row plus slack, and a control point above it — the control
  // must not move between the two shots or the background was still animating.
  const xs = dots.map(d => d.cx)
  const clip = {
    x: Math.max(0, Math.min(...xs) - 24),
    y: Math.max(0, dots[0].cy - 24),
    width: Math.min(VIEWPORT.width, Math.max(...xs) - Math.min(...xs) + 48),
    height: 48,
  }
  const control = { x: clip.x + 4, y: clip.y + 4 }
  const points = [...dots.map(d => ({ x: d.cx, y: d.cy })), control]

  const shown = await page.screenshot({ clip })
  await page.locator('[data-tutor-dot]').evaluateAll(els =>
    els.forEach(el => { (el as HTMLElement).style.visibility = 'hidden' }))
  await page.waitForTimeout(120)
  const hidden = await page.screenshot({ clip })

  const withDots = await samplePixels(page, shown, clip, points)
  const withoutDots = await samplePixels(page, hidden, clip, points)
  await browser.close()

  const failures: string[] = []
  const controlDrift = dist(withDots[withDots.length - 1], withoutDots[withoutDots.length - 1])
  if (controlDrift > PAINT_TOL) {
    failures.push(`background drifted between shots (control Δ${controlDrift}) — results unreliable`)
  }
  dots.forEach((d, i) => {
    const px = withDots[i]
    const bare = withoutDots[i]
    const delta = dist(px, bare)
    const label = `dot dist=${d.dist} rgb(${px.join(',')})`
    if (delta <= PAINT_TOL) {
      failures.push(`${label}: paints nothing — identical to the background behind it (${bare.join(',')})`)
      return
    }
    // The active dot is opaque, so it is the brand green exactly; the dimmed ones are a
    // blend with whatever is behind them and only have to differ from the bare background.
    if (d.dist === 0) {
      const off = dist(px, GREEN)
      if (off > COLOR_TOL) {
        failures.push(`${label}: not the brand green rgb(${GREEN.join(',')}) — Δ${off}`)
        return
      }
      console.log(`✓ ${label} → brand green`)
      return
    }
    console.log(`✓ ${label} → Δ${delta} vs background`)
  })

  if (failures.length) {
    console.error('\n✗ ' + failures.join('\n✗ '))
    process.exit(1)
  }
  console.log('\n✓ indicator paints the brand green at every distance')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
