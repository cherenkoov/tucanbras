// The Tutors carousel indicator must actually PAINT. In duotone mode a dot is a
// TRANSPARENT box that gets its colour from backdrop-filter (its border-radius doing the
// clipping), so an engine that silently drops the chain — or an `opacity()` term it does
// not honour — leaves the indicator invisible with nothing in the console to show it.
// This asserts, against the live page: a duotone chain is in the computed style, the
// active dot resolves to INK or CREAM, and every dimmed dot still changes the pixels
// behind it. Run against a prod build (`npm run build && npm start`):
//
//   npm run verify:tutor-dots                       → http://localhost:3000/ru
//   npm run verify:tutor-dots -- http://host/ru      → custom URL
//   npm run verify:tutor-dots -- http://host/ru 390x844         → phone-width layout
//   npm run verify:tutor-dots -- http://host/ru 390x844 touch   → …and `hover: none`
//
// NB `touch` no longer changes the duotone. The hook picks its chain by ENGINE, not by
// input type (WebKit is the only one that drops url(#) inside backdrop-filter, and a
// Chromium phone renders the exact palette) — so a touch viewport still expects the
// palette. To check the chain iOS gets, append ?duowk=1 to the URL, which forces the
// WebKit path on any engine; expectations below follow that flag, and ?duobrand=1 with it
// asks for the fitted brand chain that is no longer the WebKit default.
//
// ?noanim=1 is forced: the two screenshots (dots shown / hidden) must see the SAME
// background, and the collage sprites move on their own otherwise.
import { chromium, type Page } from 'playwright'

const BASE = process.argv[2] ?? 'http://localhost:3000/ru'
const vpArg = /^(\d+)x(\d+)$/.exec(process.argv[3] ?? '')
const VIEWPORT = vpArg
  ? { width: Number(vpArg[1]), height: Number(vpArg[2]) }
  : { width: 1440, height: 900 }
// Chromium's mobile emulation is what flips `hover: none` / `any-hover: none`, and that
// media query is how the hook picks the touch chain — a viewport alone stays a desktop.
const TOUCH = process.argv.includes('touch')

// The duotone's two outputs. Engines that render url(#) inside backdrop-filter run the
// default palette (AdaptiveText DUOTONES.blue, which BACKDROP names): blue over a light
// scene, light green over a dark one.
// WebKit cannot: it drops url(#) inside backdrop-filter, and the built-in chain that
// rebuilt the same pair is only correct where its blur barrier clamps — which production
// showed it does not everywhere (2026-08-17, see BACKDROP_BUILTIN_BRAND). A SHAPE has no
// static fallback to escape to, unlike the headings, so WebKit keeps the live sample in
// MONO: near-white over a dark scene, near-black over a light one. Dots on iOS are
// therefore black/white while the headings are palette-coloured — that is the trade, not
// a bug. ?duobrand=1 puts the fitted pair back for a device re-measurement.
const BLUE = [0x2e, 0x67, 0xb2]
const LIGHT_GREEN = [0x8f, 0xd0, 0x96]
const WK_BLUE = [0x2e, 0x68, 0xb1]
const MONO_LIGHT = [0xff, 0xff, 0xff]
const MONO_DARK = [0x00, 0x00, 0x00]
const WEBKIT_PATH = BASE.includes('duowk')
const BRAND_LEVER = BASE.includes('duobrand')
const SIDES: [string, number[]][] = WEBKIT_PATH
  ? BRAND_LEVER
    ? [['blue (webkit, ?duobrand)', WK_BLUE], ['light green (webkit, ?duobrand)', LIGHT_GREEN]]
    : [['near-black (webkit mono)', MONO_DARK], ['near-white (webkit mono)', MONO_LIGHT]]
  : [['blue', BLUE], ['light green', LIGHT_GREEN]]
const DUOTONE_TOL = 32
// A dimmed dot composites `opacity(a)` of the duotone over the real backdrop; at a=0.2
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

  const chain = await page.locator('[data-tutor-dot="0"]').evaluate(el => {
    const cs = getComputedStyle(el)
    return cs.backdropFilter || cs.getPropertyValue('-webkit-backdrop-filter')
  })
  const bg = await page.locator('[data-tutor-dot="0"]').evaluate(el => getComputedStyle(el).backgroundColor)
  console.log(`chain: ${chain}\nbackground: ${bg}`)

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
  // No chain = the flat-ink fallback (?staticfill, ?noadaptive, an engine without
  // backdrop-filter). Report but do not assert: a 0.2-alpha ink dot over the dark cliff
  // IS all but invisible there — that weakness is the reason the duotone path exists.
  const duotone = !!chain && chain !== 'none'
  if (!duotone) console.log('no duotone chain — flat blue fallback, measuring only')

  dots.forEach((d, i) => {
    const px = withDots[i]
    const bare = withoutDots[i]
    const delta = dist(px, bare)
    const label = `dot dist=${d.dist} rgb(${px.join(',')})`
    if (duotone && delta <= PAINT_TOL) {
      failures.push(`${label}: paints nothing — identical to the background behind it (${bare.join(',')})`)
      return
    }
    // The full-strength dot is pure duotone (or the flat fallback colour), so it must land
    // on one of the two ends; dimmed ones are a blend and only have to differ from the
    // bare background.
    if (d.dist === 0) {
      const measured = SIDES.map(([name, rgb]) => [name, dist(px, rgb)] as const)
      const best = measured.reduce((a, b) => (b[1] < a[1] ? b : a))
      if (best[1] > DUOTONE_TOL) {
        failures.push(`${label}: no palette side matched (${measured.map(m => `${m[0]} Δ${m[1]}`).join(', ')})`)
        return
      }
      console.log(`✓ ${label} → ${best[0]}`)
      return
    }
    console.log(`${duotone ? '✓' : '·'} ${label} → Δ${delta} vs background`)
  })

  if (failures.length) {
    console.error('\n✗ ' + failures.join('\n✗ '))
    process.exit(1)
  }
  console.log(duotone
    ? `\n✓ indicator paints a ${SIDES.map(s => s[0]).join('/')} duotone at every distance`
    : '\n✓ fallback indicator is flat blue (no duotone technique here)')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
