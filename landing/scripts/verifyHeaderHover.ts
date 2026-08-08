/**
 * Guard for the header's hover motion.
 *
 * It exists because the failure it catches is silent. Every gesture in the header
 * is a Tailwind utility, and Tailwind generates a rule only for class names it can
 * read LITERALLY in the source — so the moment someone tidies
 *
 *     'motion-safe:group-hover/pill:scale-[1.15]'
 *   → `motion-safe:group-hover/pill:scale-[${DECOR_SCALE}]`
 *
 * the class still lands in the DOM, the build still passes, the types still check,
 * and the decoration simply stops moving. Nothing fails; the header just goes
 * quietly dead. (That is not hypothetical — it is how this file came to exist.)
 *
 * So the assertions are made in a real browser against computed style, not by
 * grepping the CSS: what matters is that hovering the thing MOVES the thing.
 *
 * Deliberately NO exact magnitudes. 1.04 → 1.15 → whatever reads best is a design
 * knob and will keep moving; a guard pinned to the number of the day is a guard
 * that gets deleted. What is asserted here is the shape of the gesture, which is
 * the part that must not regress:
 *
 *   • decorations move at all, and only for their OWN pill
 *   • the outer pair converges — left goes right, right goes left
 *   • the ground under them stays put
 *   • icons (the ⋮ glyph, the flag) do not zoom; they only ride the button
 *   • decorations SETTLE AFTER the button, never with it
 *
 *   npm run verify:header-hover                    → http://localhost:3000/ru
 *   npm run verify:header-hover http://host/en     → explicit URL
 */
import { chromium, type Page } from 'playwright'
import { DECOR_BLEED } from '../components/ui/pillArt'
import { BLADES, DOTS_SWAY_MS } from '../components/ui/dotsSway'

const URL      = process.argv[2] ?? 'http://localhost:3000/ru'
const VIEWPORT = { width: 1440, height: 900 }

// Comfortably past the longest decoration transition.
const SETTLE_MS = 900

const NAV_PILL  = '[data-nav-pill="connect"]'
const DRUM_SLOT = '[data-drum-pos="0"]'
const DOTS      = 'button[aria-haspopup="true"]'
const LANG      = 'button[aria-haspopup="listbox"]'

type Motion = { scale: string; translate: string; durations: string }

async function motionOf(page: Page, selector: string): Promise<Motion | null> {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel)
    if (!el) return null
    const cs = getComputedStyle(el)
    return { scale: cs.scale, translate: cs.translate, durations: cs.transitionDuration }
  }, selector)
}

/** Whether `needle` is the last <img> painted inside `selector` — DOM order is z order here. */
async function lastPaintedIs(page: Page, selector: string, needle: string): Promise<boolean> {
  return page.evaluate(([sel, want]) => {
    const el = document.querySelector(sel as string)
    if (!el) return false
    const imgs = Array.from(el.querySelectorAll('img'))
    const last = imgs[imgs.length - 1]
    return !!last && (last.getAttribute('src') ?? '').includes(want as string)
  }, [selector, needle])
}

async function hover(page: Page, selector: string) {
  await page.locator(selector).first().hover()
  await page.waitForTimeout(SETTLE_MS)
}

async function rest(page: Page) {
  // Well below the header, so nothing in it is hovered.
  await page.mouse.move(VIEWPORT.width / 2, VIEWPORT.height - 40)
  await page.waitForTimeout(SETTLE_MS)
}

const fails: string[] = []
function check(ok: boolean, what: string) {
  if (!ok) fails.push(what)
}

/** `scale` reads 'none' when no rule applies — that is the silent-death case. */
function scaleOf(m: Motion | null): number {
  if (!m || m.scale === 'none') return 1
  return parseFloat(m.scale)
}

/**
 * A layer's `rotate`, in degrees. 'none' is 0 — and it is also exactly what a blade
 * reads when the keyframe never ran, which is why the sway is asserted by magnitude
 * rather than by the attribute being present.
 */
async function rotateOf(page: Page, selector: string): Promise<number> {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel)
    if (!el) return 0
    const r = getComputedStyle(el).rotate
    return !r || r === 'none' ? 0 : parseFloat(r)
  }, selector)
}

/** Longest entry in a computed `transition-duration` list, in ms. */
function slowestMs(m: Motion | null): number {
  if (!m) return 0
  return Math.max(...m.durations.split(',').map(d => parseFloat(d) * 1000 || 0))
}

// A decoration grows 1.15 and a button 1.02, so this sits between them: it means
// "moved like a decoration", not "moved at all". Raised off 1.02 when the pills'
// own press came down to that — at the old value a button that merely pressed
// counted as a decoration that bloomed.
const GREW = 1.08

async function main() {
  const browser = await chromium.launch()
  const context = await browser.newContext({ viewport: VIEWPORT })
  const page = await context.newPage()

  try {
    await page.goto(URL, { waitUntil: 'networkidle', timeout: 180_000 })
    await page.waitForSelector('#header', { timeout: 60_000 })
    // Wait for HYDRATION, not just for markup. React attaches `__reactContainer$…`
    // to the element it hydrates; until that lands the header is inert — a click
    // fires DOM listeners and no React handler at all, which part 7 would read as a
    // dead animation rather than as a page that was not ready. `domcontentloaded`
    // plus a fixed 2s was enough while the dev server was quick and is not once the
    // CMS is slow, and the failure looked exactly like a broken gesture.
    await page.waitForFunction(
      () => Object.keys(document).some(k => k.startsWith('__reactContainer')),
      null, { timeout: 120_000 },
    )
    await page.waitForTimeout(2500)

    const decor = (pill: string, side: string) => `${pill} img[src*="-${side}"]`

    // ── 1. At rest nothing in the header is transformed ──────────────────────
    await rest(page)
    for (const side of ['left', 'right', 'base']) {
      check(scaleOf(await motionOf(page, decor(NAV_PILL, side))) < GREW,
        `at rest the nav pill's ${side} layer is already scaled`)
    }
    console.log('✓ at rest the header carries no hover transform')

    // ── 2. A labelled pill: its outer decorations converge and grow ──────────
    // The whole point of splitting the sheet — if these sit still, the split is
    // there but the motion that justified it is gone.
    await hover(page, NAV_PILL)
    const left  = await motionOf(page, decor(NAV_PILL, 'left'))
    const right = await motionOf(page, decor(NAV_PILL, 'right'))
    const base  = await motionOf(page, decor(NAV_PILL, 'base'))
    check(left !== null && right !== null && base !== null,
      'the nav pill is not drawn as base + decoration layers')
    check(scaleOf(left)  > GREW, `left decoration does not grow (scale ${left?.scale})`)
    check(scaleOf(right) > GREW, `right decoration does not grow (scale ${right?.scale})`)
    // Converging: the left one travels right (+), the right one travels left (−).
    check(/^\d/.test(left?.translate ?? ''),
      `left decoration does not lean towards the centre (translate ${left?.translate})`)
    check(/^-/.test(right?.translate ?? ''),
      `right decoration does not lean towards the centre (translate ${right?.translate})`)
    check(scaleOf(base) < GREW, 'the ground moves with the decorations — it must stay put')
    console.log('✓ nav pill: outer decorations converge and grow, ground stays put')

    // ── 3. The decoration outlasts the button ────────────────────────────────
    // Matched timings read as one rigid object being scaled; the plants have to
    // still be travelling once the button has landed. Asserted on the declared
    // durations rather than by sampling, so it cannot flake on frame timing.
    const buttonMs = slowestMs(await motionOf(page, NAV_PILL))
    const decorMs  = slowestMs(left)
    check(buttonMs > 0, 'the pill itself declares no transition')
    check(decorMs > buttonMs,
      `the decoration settles with the button, not after it (button ${buttonMs}ms, decoration ${decorMs}ms)`)
    console.log(`✓ decoration settles after the button (${buttonMs}ms → ${decorMs}ms)`)

    // ── 4. …and only its own. A pill must not answer to a neighbour's hover ──
    check(scaleOf(await motionOf(page, decor(DRUM_SLOT, 'left'))) < GREW,
      'hovering one pill moves another pill — the group is unnamed')
    console.log('✓ a pill answers to its own hover only')

    await hover(page, DRUM_SLOT)
    check(scaleOf(await motionOf(page, decor(DRUM_SLOT, 'left'))) > GREW,
      'the drum slot pill does not animate its decorations')
    console.log('✓ the drum slot pill animates like the nav pill')

    // ── 5. Icon pills: the plant moves, the icon does not ────────────────────
    // The ⋮ is a split pill like the rest — its three plants bloom, and the dots
    // stay put ON TOP of them. Both halves are asserted: the glyph buried under the
    // bouquet is what a base/decoration split does to a sheet that paints its label
    // last, and it is invisible to anything that only checks the plants moved.
    await hover(page, DOTS)
    check(scaleOf(await motionOf(page, 'img[src*="3dots-mid"]')) > GREW,
      'the ⋮ plants do not grow — they are decorations like every other in the bar')
    for (const b of BLADES) {
      check(scaleOf(await motionOf(page, `img[src*="3dots-${b.part}"]`)) < GREW,
        `the ⋮ ${b.part} zooms — the marks are the button's label and must only ride it`)
    }
    // …and their satellites go the other way, giving room to the bloom behind them.
    check(scaleOf(await motionOf(page, 'img[src*="3dots-dots"]')) < 0.99,
      'the ⋮ dot satellites do not shrink as the bouquet grows')
    check(await lastPaintedIs(page, DOTS, '3dots-dots'),
      'the ⋮ dots are not the last thing drawn — the bouquet is painted over them')
    console.log('✓ ⋮: the plants grow, the marks hold, their satellites give way')

    await hover(page, LANG)
    check(scaleOf(await motionOf(page, `${LANG} img[src*="bloom-"]`)) > GREW,
      'the plant behind the flag does not grow')
    check(scaleOf(await motionOf(page, `${LANG} img[src*="flag-"]`)) < GREW,
      'the flag zooms — it should only ride the button')
    console.log('✓ flag pill: the plant grows, the flag rides the button')

    // ── 6. Every decoration layer is actually DECOR_BLEED× its own box ───────
    // The layer is the window the art is drawn through: DECOR_LAYER offsets it by
    // -25% and sizes it 150%, so the plant keeps art in hand when the hover leans
    // it sideways. Sized in a stylesheet, and therefore quietly overridable —
    // Tailwind's preflight puts `max-width: 100%` on every <img>, a max-width beats
    // a width, and the layer took the offset while computing 100% wide. Every
    // decoration in the header sat a quarter of its box to the left of where it
    // belongs, ~30px on a pill and ~380px across the plate, with nothing failing.
    //
    // Measured against the layer's own containing block, not against a number: the
    // ratio is the contract, DECOR_BLEED is free to move.
    await rest(page)
    const boxes = await page.evaluate(`(() => {
      var out = [];
      var imgs = document.querySelectorAll('#header img[class*="w-[150%]"]');
      for (var i = 0; i < imgs.length; i++) {
        var im = imgs[i];
        var r = im.getBoundingClientRect();
        var p = im.offsetParent && im.offsetParent.getBoundingClientRect();
        if (!p || !p.width || !p.height || !r.width) continue;
        out.push({ src: im.getAttribute('src'), w: r.width / p.width, h: r.height / p.height });
      }
      return out;
    })()`) as { src: string; w: number; h: number }[]

    check(boxes.length > 0, 'no decoration layers found — DECOR_LAYER is not reaching the DOM')
    for (const b of boxes) {
      const name = b.src.slice(b.src.lastIndexOf('/') + 1)
      check(Math.abs(b.w - DECOR_BLEED) < 0.01,
        `${name}: layer is ${b.w.toFixed(2)}× its box wide, not ${DECOR_BLEED}× ` +
        `(a max-width is beating w-[150%] — DECOR_LAYER needs max-w-none)`)
      check(Math.abs(b.h - DECOR_BLEED) < 0.01,
        `${name}: layer is ${b.h.toFixed(2)}× its box tall, not ${DECOR_BLEED}×`)
    }
    console.log(`✓ ${boxes.length} decoration layers measure ${DECOR_BLEED}× their own box`)

    // ── 7. A click puts a gust through the ⋮'s marks ─────────────────────────
    // The one gesture in this bar that is neither hover nor scroll. The three marks
    // are leaves, each rooted at its own lower tip, and a click leans them — in
    // DIFFERENT directions, which is the whole difference between grass moving and a
    // signpost swinging on one hinge. Three ways it dies quietly:
    //
    //   • the keyframe never runs. `swayDots` arms `[data-swaying]` on the button and
    //     the rule is `[data-swaying] .dot-blade`; a renamed class, a custom property
    //     that never reaches the layer, or a blade that lost `.dot-blade` all leave
    //     `rotate: none` behind with nothing failing anywhere.
    //   • they lean together. One shared keyframe drives all three, so a `--sway` that
    //     is not reaching them individually reads as the old rigid glyph — which is
    //     precisely what splitting the sheet was for.
    //   • it never lets go. A timer that does not fire leaves the marks mid-lean, and
    //     a crooked ⋮ reads as art exported wrong rather than as a stuck animation.
    //
    // Sampled at PEAK_MS: past the last blade's start (120ms) and near the first
    // keyframe stop for all three, so every one is at or approaching its own peak.
    const PEAK_MS = 250
    const blade = (part: string) => `img[src*="3dots-${part}"]`

    await rest(page)
    for (const b of BLADES) {
      check(Math.abs(await rotateOf(page, blade(b.part))) < 0.5,
        `the ⋮ ${b.part} is leaning at rest — the sway is stuck on`)
    }

    await page.locator(DOTS).click()
    await page.waitForTimeout(PEAK_MS)
    const leans = await Promise.all(BLADES.map(b => rotateOf(page, blade(b.part))))

    BLADES.forEach((b, i) => {
      check(Math.abs(leans[i]) > 0.5,
        `the ⋮ ${b.part} does not lean on a click — the gust never reaches it ` +
        `(rotate: ${leans[i]}deg)`)
    })
    check(new Set(leans.map(d => Math.sign(d))).size > 1,
      'every ⋮ mark leans the same way — they are moving as one glyph, not as grass ' +
      `(${leans.map(d => d.toFixed(1)).join(', ')})`)
    console.log(`✓ ⋮ click: the marks lean apart (${leans.map(d => d.toFixed(1) + '°').join(', ')})`)

    // Past the last blade's start plus a whole pass, plus room for the timer.
    await page.waitForTimeout(DOTS_SWAY_MS + 600)
    for (const b of BLADES) {
      check(Math.abs(await rotateOf(page, blade(b.part))) < 0.5,
        `the ⋮ ${b.part} stays leant — the sway never expires`)
    }
    console.log('✓ ⋮ click: the gust passes and the marks come back to rest')

    // NOTE: the plate's cover plants are deliberately NOT asserted here yet. They
    // are mid-refactor off `group-hover` and onto `coverHot` — the pointer being
    // on the plate's actual silhouette (`pointerOnPlate`), because the drum's
    // column hangs below the bar inside its DOM subtree and an ancestor hover woke
    // the plate whenever the pointer crossed a floating pill. Until COVER_PARTS /
    // COVER_DECOR are actually rendered, the flat sheet carries no scale rule and
    // the plants do not react at all. Add a case here once that lands — the shape
    // to assert is the same as the pills': outer pair converges, middle only grows.
  } finally {
    await browser.close()
  }

  if (fails.length) {
    console.error('\n✗ header hover FAILED\n  - ' + fails.join('\n  - '))
    process.exit(1)
  }
  console.log('\nheader hover OK')
}

main().catch(e => { console.error(e); process.exit(1) })
