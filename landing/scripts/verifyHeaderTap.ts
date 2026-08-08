/**
 * Guard for the header's motion ON A PHONE.
 *
 * `verify:header-hover` asserts the same art moves under a cursor. This is the other
 * half, and it catches a different silent failure: every gesture in the bar was
 * written as `group-hover`, which on a touch device is not a weaker trigger but no
 * trigger at all. The pills pressed, and the plants, the tucan and the plate sat
 * still — the header simply had no decorative motion on the device most readers
 * arrive on, with nothing failing anywhere.
 *
 * The fix is `[data-tapped]`, armed on pointerdown and released on a timer
 * (components/ui/tapBloom.ts), so the two things asserted here are the two ways it
 * can quietly come apart:
 *
 *   • THE BLOOM SURVIVES THE TOUCH. The obvious implementation is `group-active`,
 *     and it looks right in a desktop browser with touch emulation held down. On a
 *     real tap `:active` is gone in ~120ms while `.pill-decor` takes 340ms to open,
 *     so the art starts back before it arrives. Every check below is made AFTER the
 *     finger has lifted, which is exactly what `group-active` cannot pass.
 *   • THE BLOOM LETS GO. A timer that never fires (or an attribute nothing removes)
 *     leaves the header permanently mid-gesture, which reads as a layout bug rather
 *     than as a stuck animation. Asserted by waiting it out.
 *
 * No exact magnitudes, for the reason given in verifyHeaderHover.ts: 1.15 is a
 * design knob. What is asserted is that the thing moves like a decoration and then
 * stops.
 *
 *   npm run verify:header-tap                    → http://localhost:3000/ru
 *   npm run verify:header-tap http://host/en     → explicit URL
 */
import { chromium, type Page } from 'playwright'
import { TAP_BLOOM_MS } from '../components/ui/tapBloom'

const URL      = process.argv[2] ?? 'http://localhost:3000/ru'
const VIEWPORT = { width: 390, height: 844 }   // iPhone 12-ish, below the lg breakpoint

/** Past the longest decoration transition (340ms) but well inside the hold. */
const OPEN_MS  = 500
/** Past the hold AND the relax that follows it. */
const OVER_MS  = TAP_BLOOM_MS + 800

const BURGER = '[data-burger]'
const BRAND  = '#header a[href="#hero"]'
const BAR    = '[data-cover-plants="mobile"]'

// Same threshold as the hover guard: between a button's 1.02 press and a
// decoration's 1.15 bloom, so "moved" cannot be satisfied by the press alone.
const GREW = 1.08

const fails: string[] = []
function check(ok: boolean, what: string) {
  if (!ok) fails.push(what)
}

/**
 * Largest `scale` among the elements matching `selector`. 'none' means no rule
 * applied at all — the silent-death case this file exists for.
 *
 * Evaluate bodies stay inline and use function expressions, never named arrows:
 * tsx's transform injects a `__name` helper that does not exist in the browser.
 */
async function maxScale(page: Page, selector: string): Promise<number> {
  return page.evaluate(sel => {
    const els = Array.from(document.querySelectorAll(sel))
    let best = 1
    for (const el of els) {
      const s = getComputedStyle(el).scale
      const n = s === 'none' ? 1 : parseFloat(s)
      if (Number.isFinite(n) && n > best) best = n
    }
    return best
  }, selector)
}

/** A real tap: pointerdown + pointerup, which is what arms and then releases the bloom. */
async function tap(page: Page, selector: string) {
  await page.locator(selector).first().tap()
}

async function main() {
  const browser = await chromium.launch()
  const context = await browser.newContext({ viewport: VIEWPORT, hasTouch: true, isMobile: true })
  const page = await context.newPage()

  try {
    await page.goto(URL, { waitUntil: 'networkidle', timeout: 180_000 })
    await page.waitForSelector('#header', { timeout: 60_000 })
    // Wait for HYDRATION, not just markup — `bloomOnTap` is a React handler, and
    // until React has attached, a tap fires DOM listeners and nothing else. The old
    // `domcontentloaded` + fixed 2s was enough while the dev server was quick; once
    // the CMS went slow this guard failed about two runs in three, and every failure
    // read as "the bloom does not work" rather than "the page was not ready yet".
    await page.waitForFunction(
      () => Object.keys(document).some(k => k.startsWith('__reactContainer')),
      null, { timeout: 120_000 },
    )
    await page.waitForTimeout(2500)

    // ── 1. At rest the phone's header carries no transform ───────────────────
    check(await maxScale(page, `${BAR} img`) < GREW, 'the plate\'s plants are already bloomed at rest')
    check(await maxScale(page, '#header .art-zoom') < GREW, 'the tucan is already zoomed at rest')
    console.log('✓ at rest the header carries no tap transform')

    // ── 2. Tapping the brand zooms the tucan, and it is still zoomed after ────
    // The gesture that has no touch equivalent at all: the head answers to
    // `group-hover/brand`, and a phone never hovers anything.
    await tap(page, BRAND)
    await page.waitForTimeout(OPEN_MS)
    check(await maxScale(page, '#header .art-zoom') > GREW,
      'tapping the logo does not zoom the tucan — the brand gesture is desktop-only')
    console.log('✓ brand: the tucan zooms on a tap and holds after the finger lifts')

    // ── 3. …and the plate wakes with it ──────────────────────────────────────
    // `coverHot` used to drop every non-mouse pointer, so the phone's plate never
    // went solid and its cover plants never grew. The brand is inside the bar, so
    // the tap above is also the plate's.
    check(await maxScale(page, `${BAR} img`) > GREW,
      'tapping the bar does not grow the plate\'s cover plants (coverHot ignores touch, or pointerleave cancels it on lift)')
    console.log('✓ plate: the cover plants grow on a tap of the bar')

    // ── 4. It lets go ────────────────────────────────────────────────────────
    await page.waitForTimeout(OVER_MS)
    check(await maxScale(page, '#header .art-zoom') < GREW,
      'the tucan stays zoomed — the bloom never expires')
    check(await maxScale(page, `${BAR} img`) < GREW,
      'the plate stays bloomed — coverHot is never released on touch')
    console.log('✓ the bloom expires on its own')

    // ── 5. A burger pill blooms too, and only its own art ────────────────────
    // The column is the phone's whole nav, and its pills carry the same split art
    // as the desktop bar's. A tap here also closes the menu, which is fine: the
    // pill only fades, it is never unmounted.
    await tap(page, BURGER)
    await page.waitForTimeout(OPEN_MS)
    const opened = await page.locator('[data-mobile-pill]').count()
    check(opened > 0, 'the burger column has no pills')

    const ABOUT   = '[data-mobile-pill="about"]'
    const CONNECT = '[data-mobile-pill="connect"]'
    await tap(page, ABOUT)
    await page.waitForTimeout(OPEN_MS)
    check(await maxScale(page, `${ABOUT} img[src*="-left"]`) > GREW,
      'tapping a burger pill does not bloom its plants')
    check(await maxScale(page, `${CONNECT} img[src*="-left"]`) < GREW,
      'tapping one burger pill blooms another — the group is unnamed')
    console.log('✓ burger pill: its own plants bloom, its neighbour\'s do not')

    // ── 6. The burger's own bars bloom on the tap that opens the menu ────────
    await page.waitForTimeout(OVER_MS)
    await tap(page, BURGER)
    await page.waitForTimeout(OPEN_MS)
    check(await maxScale(page, '[data-burger-decor]') > GREW,
      'the burger\'s flowers do not bloom on a tap')
    console.log('✓ burger: its three flowers bloom on the tap that opens it')
  } finally {
    await browser.close()
  }

  if (fails.length) {
    console.error('\n✗ header tap FAILED\n  - ' + fails.join('\n  - '))
    process.exit(1)
  }
  console.log('\nheader tap OK')
}

main().catch(e => { console.error(e); process.exit(1) })
