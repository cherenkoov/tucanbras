// Regression guard: the Tutors carousel must not trap vertical page scroll on touch.
//
// History: `touch-action: pan-x` was put on the carousel, found to block vertical
// page scroll on iOS, removed (a9e0b44), then re-added — this time on the CARD too,
// which is the element a finger actually lands on (80d2f39). Two testers hit the
// wall and assumed the site ended at this section. Nothing guarded the fix, so it
// regressed silently. This script is that guard.
//
// `pan-x` means "touches beginning here may ONLY scroll horizontally" — the value
// does not fall through to ancestors, so the page can never scroll from a card.
//
// Both directions are asserted: vertical must reach the page, horizontal must still
// reach the carousel (so nobody "fixes" this by swinging to pan-y).
//
// Usage:
//   npm run verify:carousel-scroll                  → http://localhost:3000/ru
//   npm run verify:carousel-scroll http://host/en   → explicit URL
// Requires a running server (`npm run dev` or `npm start`).

import assert from 'node:assert/strict'
import { chromium, type CDPSession, type Page } from 'playwright'

const URL = process.argv[2] ?? 'http://localhost:3000/ru'
const VIEWPORT = { width: 390, height: 844 }

// A real touch-event stream, not a wheel and not Input.synthesizeScrollGesture:
//  - wheel never consults touch-action, so it passes on the broken code;
//  - synthesizeScrollGesture's touch source moves nothing in headless Chromium
//    (verified: 0px even outside the carousel, where scrolling plainly works).
// Only dispatchTouchEvent drives the gesture recognizer that honours touch-action.
async function swipe(page: Page, cdp: CDPSession, x: number, y: number, dx: number, dy: number) {
  const pt = (px: number, py: number) =>
    [{ x: Math.round(px), y: Math.round(py), radiusX: 5, radiusY: 5, force: 1, id: 1 }]
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pt(x, y) })
  const steps = 12
  for (let i = 1; i <= steps; i++) {
    await cdp.send('Input.dispatchTouchEvent',
      { type: 'touchMove', touchPoints: pt(x + (dx * i) / steps, y + (dy * i) / steps) })
    await page.waitForTimeout(16)
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await page.waitForTimeout(1000)
}

async function main() {
  const browser = await chromium.launch()
  const context = await browser.newContext({
    viewport: VIEWPORT, hasTouch: true, isMobile: true, deviceScaleFactor: 3,
  })
  const page = await context.newPage()
  const cdp = await context.newCDPSession(page)

  try {
    // Not `load`: the background collage pulls hundreds of KB of SVG, and a cold dev
    // compile costs ~90s. The locator waits below are the real readiness signal.
    await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 180_000 })

    const carousel = page.locator('[data-tutor-carousel]')
    await carousel.waitFor({ state: 'visible', timeout: 60_000 })
    await carousel.scrollIntoViewIfNeeded()
    await page.waitForTimeout(800)

    // The finger lands in the middle of a card — the exact spot users get stuck on.
    const card = page.locator('[data-tutor-card]').first()
    const box = await card.boundingBox()
    assert.ok(box, 'a tutor card is laid out')
    const x = Math.round(box.x + box.width / 2)
    const y = Math.round(Math.max(80, Math.min(box.y + box.height / 2, VIEWPORT.height - 80)))

    const room = await page.evaluate(() =>
      document.documentElement.scrollHeight - window.scrollY - window.innerHeight)
    assert.ok(room > 600, `precondition: page has room left to scroll (got ${room}px)`)

    const touchActions = await page.evaluate(() => ({
      carousel: getComputedStyle(document.querySelector('[data-tutor-carousel]')!).touchAction,
      card: getComputedStyle(document.querySelector('[data-tutor-card]')!).touchAction,
    }))
    const ta = `touch-action: carousel=${touchActions.carousel}, card=${touchActions.card}`

    // ── Control: the page scrolls from a point OUTSIDE the carousel ──
    // Without this, a harness that cannot scroll at all would read as a trapped page.
    const cbox = await carousel.boundingBox()
    assert.ok(cbox, 'the carousel is laid out')
    const outsideY = Math.max(60, Math.round(cbox.y - 40))
    const ctlBefore = await page.evaluate(() => window.scrollY)
    await swipe(page, cdp, x, outsideY, 0, -400)
    const ctlAfter = await page.evaluate(() => window.scrollY)
    assert.ok(
      ctlAfter - ctlBefore > 100,
      `control: a swipe OUTSIDE the carousel scrolls the page — moved ${ctlAfter - ctlBefore}px. ` +
      `If this fails the harness is broken, not the carousel.`,
    )

    // ── Vertical: must escape the carousel and scroll the page ──
    const beforeY = await page.evaluate(() => window.scrollY)
    await swipe(page, cdp, x, y, 0, -400)
    const afterY = await page.evaluate(() => window.scrollY)
    assert.ok(
      afterY - beforeY > 100,
      `vertical swipe on a card scrolls the PAGE — moved ${afterY - beforeY}px (${ta}). ` +
      `A pan-x on either element traps the user in this section.`,
    )

    // ── Horizontal: STATIC check, not a gesture ──
    // A synthesized touch drag cannot scroll this inner container in Playwright —
    // measured 0px in headless AND headed, under all three touch-action configs
    // INCLUDING pan-x, which permits horizontal panning explicitly. So a gesture
    // assertion here would be vacuous. Instead assert neither element pins panning
    // to a single axis: that is what would break the carousel (pan-y) or trap the
    // page (pan-x). Both axes free ⇒ the browser's native direction lock decides,
    // which is the arrangement that shipped before 80d2f39 added pan-x.
    const FREE_BOTH_AXES = ['auto', 'manipulation', 'pan-x pan-y']
    for (const [name, value] of Object.entries(touchActions)) {
      assert.ok(
        FREE_BOTH_AXES.includes(value),
        `${name} leaves both pan axes free — got touch-action:${value}. ` +
        `pan-x traps vertical page scroll; pan-y kills the carousel swipe. ` +
        `Allowed: ${FREE_BOTH_AXES.join(' | ')}.`,
      )
    }

    console.log(`✓ control swipe outside carousel scrolled page ${ctlAfter - ctlBefore}px`)
    console.log(`✓ vertical swipe on card scrolled page ${afterY - beforeY}px`)
    console.log(`✓ both pan axes left free (static check — see comment)`)
    console.log(`  ${ta}`)
    console.log('carousel scroll OK')
  } finally {
    await browser.close()
  }
}

main().catch(err => { console.error(err.message ?? err); process.exit(1) })
