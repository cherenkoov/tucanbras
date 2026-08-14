// The Hero's anthurium hangs off the CTA's top-right corner, sized in `cqw` of the
// button's wrapper, and every way that can fail is silent — the page still renders, tsc
// and lint still pass, the flower is just the wrong size in the wrong place:
//
//   • preflight's `max-width: 100%` beats a width, so a plant asked for 34% of its
//     container can quietly draw at 100% and land nowhere near its corner;
//   • the flower's box is spelled out as literal Tailwind (it needs a `max-[500px]:`
//     variant), so it can drift away from HERO_ANTHURIUM in heroPlants.ts with nothing
//     to notice;
//   • an arbitrary value Tailwind cannot read literally generates NO rule at all, and
//     the element simply sits still;
//   • the flower is painted over the CTA's right end, so losing `pointer-events: none`
//     eats taps on the button with no visible symptom.
//
// So this measures where the flower's anchor point actually landed, proves it paints
// over the button, proves clicks still reach it, and proves the hover lean moves.
// Run against a prod build (`npm run build && npm start`):
//
//   npm run verify:hero-plants                          → http://localhost:3000/ru
//   npm run verify:hero-plants -- http://host/pt        → custom URL (longest heading)
//   npm run verify:hero-plants -- http://host/ru 390x844 touch  → phone layout, and
//     `hover: none` — where the lean must NOT engage, or a tap would leave it stuck
import { chromium, type Page } from 'playwright'
import { HERO_ANTHURIUM, HERO_ANTHURIUM_LEAN, HERO_ANTHURIUM_SM } from '../components/ui/heroPlants'
import { TAP_BLOOM_MS } from '../components/ui/tapBloom'

const BASE = process.argv[2] ?? 'http://localhost:3000/ru'
const vpArg = /^(\d+)x(\d+)$/.exec(process.argv[3] ?? '')
const VIEWPORT = vpArg
  ? { width: Number(vpArg[1]), height: Number(vpArg[2]) }
  : { width: 1440, height: 900 }
// Chromium's mobile emulation is what flips `hover: none`, and that is what Tailwind's
// `hover` variant is gated behind — a narrow viewport alone is still a desktop.
const TOUCH = process.argv.includes('touch')
// `< 500`, not `<= 500`: Tailwind v4 compiles `max-[500px]:` to `@media not (min-width:
// 500px)`, which is EXCLUSIVE — at exactly 500px the card is still `w-fit` and the flower
// is still the desktop's 25cqw. The two sizes now differ by half again, so a run at the
// boundary would have failed on the width with nothing wrong with the page.
const SM = VIEWPORT.width < 500

// Subpixel layout plus a percentage of a fractional container width; 2px is well inside
// any real mistake (the smallest failure mode above is off by tens of px).
const TOL = 2

const PINK = [0xf5, 0x8b, 0x8c]
const PINK_TOL = 40
const CHANGED = 8

/**
 * What the phone's bloom is allowed to cost. HERO_ANTHURIUM_SM went to 36cqw — one and a
 * half times what it was — as a design call, and at that size it no longer fits inside
 * the two rules below. Both are budgets rather than switches, sized just past what was
 * measured at the moment of the change (3.0px past the edge, 0.6% of the label at 390px)
 * so locale and subpixel drift do not flip them, while the failures they were written
 * for — a flower placed by its box instead of its anchor, or scaled to land ON the words
 * — miss by tens of px and whole percent and still fail.
 *
 * Nothing here applies above the breakpoint: on desktop both remain hard zeroes.
 */
const SM_ALLOWANCE = {
  /** px of the tail past the page edge. `overflow-x: clip` crops it — never a scrollbar. */
  crop: 8,
  /** share of the CTA label's own box the bloom may tint at its right end. */
  labelPink: 0.02,
}

const failures: string[] = []
const ok: string[] = []

function near(label: string, got: number, want: number, tol = TOL) {
  if (Math.abs(got - want) > tol) failures.push(`${label}: ${got.toFixed(2)}px, expected ${want.toFixed(2)}px`)
  else ok.push(`${label} ${got.toFixed(1)}px ≈ ${want.toFixed(1)}px`)
}

async function main() {
  const browser = await chromium.launch()
  const page = await browser.newPage({
    viewport: VIEWPORT,
    deviceScaleFactor: 1,
    ...(TOUCH ? { isMobile: true, hasTouch: true } : {}),
  })
  // Without credentials Notion fails, page.tsx falls back to the snapshot AND renders
  // <NotionRetry/>, which calls location.reload() three times. Every Playwright context
  // starts with an empty sessionStorage, so EVERY run got the full storm: measurements
  // and screenshots landed at random points inside four page loads, which is where the
  // "Execution context was destroyed" errors and the nonsense pixel diffs came from —
  // a green run meant the timing happened to work, not that the page was right.
  // Pre-seeding the counter makes the run deterministic whether or not Notion answers.
  // Coupled to STORAGE_KEY/MAX_RETRIES in components/ui/NotionRetry.tsx by name.
  await page.addInitScript(() => {
    try { sessionStorage.setItem('notion_retry', '99') } catch { /* storage blocked */ }
  })
  // The dev server serves the devtools' own webfont from /__nextjs_font, and that request
  // can simply never settle — which holds `load` open forever and times the run out with
  // a perfectly healthy page underneath (seen on /ru while /en and /pt sailed through).
  // Aborting it is safe in a way that relaxing the wait below would not be: the route does
  // not exist in a production build, which is what this guard is written against.
  await page.route('**/__nextjs_font/**', route => route.abort())
  // `load`, not `domcontentloaded`: hydration is still landing at DOMContentLoaded and
  // an evaluate that straddles it has nothing useful to measure.
  await page.goto(BASE, { waitUntil: 'load', timeout: 60_000 })
  await page.waitForSelector('[data-hero-plant="anthurium"]', { timeout: 15_000 })
  // The plants are <img>; a box measured before decode is 0-sized.
  await page.evaluate(() => Promise.all(
    Array.from(document.querySelectorAll<HTMLImageElement>('[data-hero-plant]'))
      .map(i => (i.complete ? Promise.resolve() : i.decode().catch(() => {}))),
  ))
  await page.waitForTimeout(300)

  // Everything in here stays inline: a `const fn = () => …` inside an evaluate body gets
  // a name from esbuild, which then emits a `__name()` call that does not exist in the
  // browser — "__name is not defined", thrown from the page, with nothing to point at it.
  const m = await page.evaluate(() => {
    const btn = document.querySelector<HTMLElement>('#hero button')!
    const anth = document.querySelector<HTMLElement>('[data-hero-plant="anthurium"]')!
    const card = btn.closest<HTMLElement>('.glass')!
    const boxes: Record<string, { x: number; y: number; w: number; h: number; right: number; bottom: number }> = {}
    for (const [k, el] of [['btn', btn], ['anth', anth], ['card', card]] as [string, HTMLElement][]) {
      const b = el.getBoundingClientRect()
      boxes[k] = { x: b.x, y: b.y, w: b.width, h: b.height, right: b.right, bottom: b.bottom }
    }
    // The words the flower must stay off. Ranges, not element boxes: the CTA's label is
    // a bare text node in a full-width flex button, and a heading line is a `block` span
    // as wide as the h1 — neither element's own rect says anything about where the
    // letters are.
    const words: { name: string; x: number; y: number; right: number; bottom: number }[] = []
    for (const [name, el] of [
      ['CTA label', btn],
      ['heading line 1', document.querySelectorAll<HTMLElement>('#hero h1 span')[0]],
      ['heading line 2', document.querySelectorAll<HTMLElement>('#hero h1 span')[1]],
    ] as [string, HTMLElement][]) {
      if (!el) continue
      const range = document.createRange()
      range.selectNodeContents(el)
      const b = range.getBoundingClientRect()
      words.push({ name, x: b.x, y: b.y, right: b.right, bottom: b.bottom })
    }
    return {
      words,
      btn: boxes.btn, anth: boxes.anth, card: boxes.card,
      anthEvents: getComputedStyle(anth).pointerEvents,
      anthMaxW: getComputedStyle(anth).maxWidth,
      docOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      hoverable: matchMedia('(hover: hover)').matches,
    }
  })

  const u = m.btn.w / 100 // one cqw, in px
  const want = SM ? { ...HERO_ANTHURIUM, ...HERO_ANTHURIUM_SM } : HERO_ANTHURIUM

  // ── the anthurium: its stem point pinned inside the button's top-right corner.
  // Checked as the point, not as the box — that IS the contract, and it is the only
  // form of the check that stays true when the flower's width is retuned.
  near('anthurium width', m.anth.w, want.w * u)
  near(
    'anchor ↔ button right edge',
    m.btn.right - (m.anth.x + HERO_ANTHURIUM.anchor.x * m.anth.w),
    HERO_ANTHURIUM.inset,
  )
  near(
    'anchor ↔ button top edge',
    m.anth.y + HERO_ANTHURIUM.anchor.y * m.anth.h - m.btn.y,
    HERO_ANTHURIUM.inset,
  )
  if (m.anthMaxW !== 'none') failures.push(`anthurium max-width is "${m.anthMaxW}" — preflight is clamping it back`)
  if (m.anthEvents !== 'none') failures.push(`anthurium pointer-events is "${m.anthEvents}" — it will eat taps on the CTA`)
  else ok.push('anthurium is transparent to the pointer')

  // Overhanging the card is the point — that corner is meant to be broken. What is not
  // allowed is running off the page, which `overflow-x: clip` on <main> turns into a
  // silently cropped flower rather than a scrollbar.
  if (m.anth.right <= m.card.right) failures.push('anthurium does not overhang the card — that corner is meant to be broken')
  else ok.push(`anthurium overhangs the card by ${(m.anth.right - m.card.right).toFixed(1)}px`)
  const crop = m.anth.right - VIEWPORT.width
  const cropBudget = SM ? SM_ALLOWANCE.crop : 0
  if (crop > cropBudget) failures.push(`anthurium is cropped by the viewport — ${crop.toFixed(1)}px of it is off-page, budget ${cropBudget}px`)
  else if (crop > 0) ok.push(`anthurium tail runs ${crop.toFixed(1)}px past the page edge — inside the ${cropBudget}px the phone's bloom is allowed`)
  else ok.push(`anthurium clears the page edge by ${(-crop).toFixed(1)}px`)
  if (m.anth.y < 0) failures.push(`anthurium is cut off at the top of the page by ${(-m.anth.y).toFixed(1)}px`)
  if (m.docOverflow > 0) failures.push(`document scrolls horizontally by ${m.docOverflow}px`)

  // ── it decorates the words, it does not sit on them.
  //
  // This is the failure the measurements above cannot see, and the one that actually
  // happened twice: placed at the design's ratio the flower landed on the last word of
  // the H1, and scaled down for the phone it landed on the CTA's label. The layout was
  // right both times — this card simply hugs its text more tightly than the design's,
  // so the gap the flower was drawn into is not there.
  //
  // Counted in pixels, not boxes. A rectangle around the flower's paint is set by the
  // wide lobe at its foot while the part level with the heading is the thin tail far to
  // the right, so a box test calls an 11px overlap on art that is nowhere near the
  // letters. The flower's pink appears nowhere else in the Hero — not in the cream
  // type, the blue glass, the yellow CTA or its olive leaf — so asking whether any
  // pink lands inside a word's box answers the real question exactly.
  // One shot of the whole card, then each word is a rectangle inside it. Three separate
  // clipped screenshots is the same evidence and three chances for Chromium's
  // "Unable to capture screenshot" — which it does hand back, on perfectly ordinary
  // rects, often enough to make a guard that runs on every locale useless.
  const cardClip = clampClip({ x: m.card.x, y: m.card.y, width: m.card.w, height: m.card.h })
  if (!cardClip) throw new Error('the Hero card is not on screen')
  const cardShot = await shoot(page, cardClip)
  const shares = await pinkShare(page, cardShot, m.words.map(w => ({
    x: w.x - cardClip.x, y: w.y - cardClip.y, w: w.right - w.x, h: w.bottom - w.y,
  })))
  m.words.forEach((w, i) => {
    // Not zero: the edge of the art antialiases into a neighbouring box. The CTA's label
    // carries a budget on the phone and nowhere else — see SM_ALLOWANCE. The heading
    // lines keep the hard limit at every width: the bloom grows up and to the LEFT out of
    // the corner, so those are the boxes that say whether it grew too far.
    const budget = SM && w.name === 'CTA label' ? SM_ALLOWANCE.labelPink : 0.001
    if (shares[i] > budget) failures.push(`anthurium paints over "${w.name}" — ${(shares[i] * 100).toFixed(1)}% of it is flower pink, budget ${(budget * 100).toFixed(1)}%`)
    else if (shares[i] > 0.001) ok.push(`"${w.name}" is ${(shares[i] * 100).toFixed(1)}% flower pink — inside the ${(budget * 100).toFixed(1)}% the phone's bloom is allowed`)
    else ok.push(`"${w.name}" carries no flower pink`)
  })

  // ── it must PAINT over the button, and still let the click through
  const clip = clampClip({
    x: Math.max(m.btn.x, m.anth.x),
    y: Math.max(m.btn.y, m.anth.y),
    width: Math.min(m.btn.right, m.anth.right) - Math.max(m.btn.x, m.anth.x),
    height: Math.min(m.btn.bottom, m.anth.bottom) - Math.max(m.btn.y, m.anth.y),
  })
  if (!clip) {
    throw new Error('the anthurium and the CTA do not overlap on screen at all — '
      + `button ${JSON.stringify(m.btn)}, anthurium ${JSON.stringify(m.anth)}, viewport ${VIEWPORT.width}x${VIEWPORT.height}`)
  }
  const shown = await shoot(page, clip)
  await page.locator('[data-hero-plant="anthurium"]').evaluate(el => { (el as HTMLElement).style.visibility = 'hidden' })
  await page.waitForTimeout(80)
  const hidden = await shoot(page, clip)
  await page.locator('[data-hero-plant="anthurium"]').evaluate(el => { (el as HTMLElement).style.visibility = '' })

  const paint = await comparePngs(page, shown, hidden)
  if (paint.changed < 0.15) failures.push(`anthurium changes only ${(paint.changed * 100).toFixed(1)}% of the pixels over the button — it is painting UNDER it`)
  else ok.push(`anthurium repaints ${(paint.changed * 100).toFixed(0)}% of its overlap with the button`)
  if (!paint.pink) failures.push('no anthurium pink found over the button — wrong art, or it is drawn behind')

  const hit = await page.evaluate(pt => {
    const el = document.elementFromPoint(pt.x, pt.y)
    return { tag: el?.tagName ?? 'none', isButton: !!el?.closest('#hero button') }
  }, { x: clip.x + clip.width / 2, y: clip.y + clip.height / 2 })
  if (!hit.isButton) failures.push(`a click in the flower's overlap lands on <${hit.tag}>, not the CTA`)
  else ok.push('clicks in the overlap reach the CTA')

  // ── the lean. Reading the computed properties is what catches a class Tailwind never
  // generated: the element renders, nothing errors, and it simply never moves.
  //
  // Asserted against the expected VALUES, not against "did anything change". At rest
  // `scale` computes to the keyword `none`, so a before/after comparison scores
  // `none → 1` as movement and passes a hover that did not engage at all — which it
  // did, at 1920, and the guard called it a success.
  await page.mouse.move(0, 0)
  await page.waitForTimeout(400)
  const rest = await leanOf(page)
  // `locator.hover()` runs actionability checks and may scroll the element into view;
  // when it does, the pointer is left somewhere the button no longer is, `:hover` drops,
  // and 500ms later the lean has transitioned all the way back to scale 1 / rotate 0deg
  // — indistinguishable from a lean that never worked. Move to the live centre instead,
  // then confirm the pointer really is on the button before believing what it reports.
  const centre = await page.evaluate(() => {
    const b = document.querySelector<HTMLElement>('#hero button')!.getBoundingClientRect()
    return { x: b.x + b.width / 2, y: b.y + b.height / 2 }
  })
  await page.mouse.move(centre.x, centre.y)

  // Waited for, not slept on. `.pill-decor` is a 340ms transition, but the mouse-move →
  // hover → recalc chain can start it late enough that a fixed 500ms read lands
  // mid-flight: scale 1.044, rotate -2.73deg is a lean working correctly and reported as
  // broken. Polling for the settled value fails just as loudly when it never arrives.
  let leaning = true
  if (m.hoverable) {
    await page.waitForFunction(
      exp => {
        const el = document.querySelector('[data-hero-plant="anthurium"]')
        if (!el) return false
        const cs = getComputedStyle(el)
        return Math.abs(Number.parseFloat(cs.scale) - exp.scale) < 0.01
          && Math.abs(Number.parseFloat(cs.rotate) - exp.rotateDeg) < 0.5
      },
      HERO_ANTHURIUM_LEAN,
      { timeout: 4_000, polling: 100 },
    ).catch(() => { leaning = false })
  } else {
    // Nothing to wait for — the point is that it must NOT move. Give it more than the
    // transition's own duration to prove it.
    await page.waitForTimeout(800)
  }

  const onButton = await page.evaluate(
    pt => !!document.elementFromPoint(pt.x, pt.y)?.closest('#hero button'),
    centre,
  )
  if (!onButton) failures.push('the pointer slid off the CTA before the lean could be read — the page moved under it')
  const hovered = await leanOf(page)
  if (!m.hoverable) {
    leaning = Math.abs(Number.parseFloat(hovered.scale) - HERO_ANTHURIUM_LEAN.scale) < 0.01
  }
  if (m.hoverable && !leaning) {
    failures.push(`hovering the CTA leaves the anthurium at scale ${hovered.scale} / rotate ${hovered.rotate}, `
      + `expected ${HERO_ANTHURIUM_LEAN.scale} / ${HERO_ANTHURIUM_LEAN.rotateDeg}deg — check the peer-hover classes are literal`)
  } else if (!m.hoverable && (leaning || rest.scale !== hovered.scale)) {
    failures.push('the lean engages on a `hover: none` device — a tap would leave it stuck')
  } else {
    ok.push(m.hoverable ? `lean engages: scale ${hovered.scale}, rotate ${hovered.rotate}` : 'lean stays off where hover is unavailable')
  }

  // ── the tap, which is the phone's whole share of this gesture.
  //
  // The check above proves the HOVER rules stay inert here — by design, so a tap cannot
  // pin the flower open forever. That left the phone with no motion at all, and the same
  // lean is now armed on the button's pointerdown instead (`peer-data-tapped`,
  // tapBloom.ts). Two ways that comes apart silently, one assertion each:
  //
  //   • it never arrives. `peer-data-tapped` is a literal Tailwind class like every other
  //     one here; a variant Tailwind cannot read generates NO rule and the flower simply
  //     sits still. Read AFTER the finger has lifted — which is precisely what a
  //     `peer-active` implementation cannot pass, and what makes this worth measuring.
  //   • it never leaves. A timer that does not fire leaves the Hero permanently
  //     mid-gesture, which reads as a broken layout rather than as a stuck animation.
  if (!m.hoverable) {
    await page.locator('#hero button').tap()
    // Past the 340ms transition, well inside the 900ms hold.
    await page.waitForTimeout(500)
    const tapped = await leanOf(page)
    if (Math.abs(Number.parseFloat(tapped.scale) - HERO_ANTHURIUM_LEAN.scale) > 0.01
      || Math.abs(Number.parseFloat(tapped.rotate) - HERO_ANTHURIUM_LEAN.rotateDeg) > 0.5) {
      failures.push(`tapping the CTA leaves the anthurium at scale ${tapped.scale} / rotate ${tapped.rotate}, `
        + `expected ${HERO_ANTHURIUM_LEAN.scale} / ${HERO_ANTHURIUM_LEAN.rotateDeg}deg — check the peer-data-tapped classes are literal`)
    } else {
      ok.push(`tap leans the flower and holds it after the finger lifts: scale ${tapped.scale}, rotate ${tapped.rotate}`)
    }

    await page.waitForTimeout(TAP_BLOOM_MS + 800)
    const settled = await leanOf(page)
    const settledScale = settled.scale === 'none' ? 1 : Number.parseFloat(settled.scale)
    if (Math.abs(settledScale - 1) > 0.01) {
      failures.push(`the tap bloom never expires — the anthurium is still at scale ${settled.scale}`)
    } else {
      ok.push('the tap bloom expires on its own')
    }
  }

  await browser.close()

  ok.forEach(l => console.log(`✓ ${l}`))
  if (failures.length) {
    console.error('\n✗ ' + failures.join('\n✗ '))
    process.exit(1)
  }
  console.log(`\n✓ both Hero plants sized, placed, clipped and hover-wired at ${VIEWPORT.width}px${TOUCH ? ' (touch)' : ''}`)
}

/**
 * A screenshot clip trimmed to the viewport. Playwright refuses a clip that runs off
 * the page ("Clipped area is either empty or outside the resulting image"), and a
 * heading's own box legitimately does at narrow widths.
 */
function clampClip(r: { x: number; y: number; width: number; height: number }) {
  // Rounded, not just clamped: a fractional clip — which every one of these is, coming
  // from getBoundingClientRect — makes CDP answer "Unable to capture screenshot" on an
  // emulated mobile page, where the device pixel ratio turns the fraction into a
  // half-pixel row it cannot produce.
  const x = Math.max(0, Math.min(Math.floor(r.x), VIEWPORT.width - 1))
  const y = Math.max(0, Math.min(Math.floor(r.y), VIEWPORT.height - 1))
  const width = Math.floor(Math.min(r.width - (x - r.x), VIEWPORT.width - x))
  const height = Math.floor(Math.min(r.height - (y - r.y), VIEWPORT.height - y))
  return width >= 1 && height >= 1 ? { x, y, width, height } : null
}

/** Share of anthurium pink inside each rect, given in the shot's own coordinates. */
function pinkShare(page: Page, png: Buffer, rects: { x: number; y: number; w: number; h: number }[]) {
  return page.evaluate(
    async ({ b64, boxes, pinks, tol }) => {
      const img = new Image()
      await new Promise<void>(res => { img.onload = () => res(); img.src = 'data:image/png;base64,' + b64 })
      const c = document.createElement('canvas')
      c.width = img.width
      c.height = img.height
      const ctx = c.getContext('2d')!
      ctx.drawImage(img, 0, 0)
      const out: number[] = []
      for (const b of boxes) {
        const x = Math.max(0, Math.round(b.x))
        const y = Math.max(0, Math.round(b.y))
        const w = Math.min(Math.round(b.w), c.width - x)
        const h = Math.min(Math.round(b.h), c.height - y)
        if (w < 1 || h < 1) { out.push(0); continue }
        const d = ctx.getImageData(x, y, w, h).data
        let hits = 0
        for (let i = 0; i < d.length; i += 4) {
          for (const p of pinks) {
            if (Math.abs(d[i] - p[0]) < tol && Math.abs(d[i + 1] - p[1]) < tol && Math.abs(d[i + 2] - p[2]) < tol) {
              hits++
              break
            }
          }
        }
        out.push(hits / (d.length / 4))
      }
      return out
    },
    { b64: png.toString('base64'), boxes: rects, pinks: [PINK, [0xf8, 0xab, 0xab]], tol: 24 },
  )
}

/**
 * Chromium hands back "Protocol error (Page.captureScreenshot): Unable to capture
 * screenshot" now and then on clips it has already accepted — the compositor has no
 * frame ready at that instant. It is not a fact about the page, and a guard meant to
 * run across every locale cannot fail on it. Retried, not swallowed: a clip that is
 * genuinely wrong still fails, just three times slower.
 */
async function shoot(page: Page, clip: { x: number; y: number; width: number; height: number }) {
  let last: unknown
  for (let i = 0; i < 3; i++) {
    try {
      return await page.screenshot({ clip })
    } catch (err) {
      last = err
      await page.waitForTimeout(250)
    }
  }
  throw last
}

function leanOf(page: Page) {
  return page.locator('[data-hero-plant="anthurium"]').evaluate(el => {
    const cs = getComputedStyle(el)
    return { scale: cs.scale, translate: cs.translate, rotate: cs.rotate }
  })
}

// No image decoder in node here, so the PNGs go back through a canvas in the page —
// same trick as verifyTutorDots / verifyPillArt.
function comparePngs(page: Page, a: Buffer, b: Buffer) {
  return page.evaluate(
    async ({ aB64, bB64, pink, pinkTol, changed }) => {
      const frames: Uint8ClampedArray[] = []
      for (const b64 of [aB64, bB64]) {
        const img = new Image()
        await new Promise<void>(res => { img.onload = () => res(); img.src = 'data:image/png;base64,' + b64 })
        const c = document.createElement('canvas')
        c.width = img.width
        c.height = img.height
        const ctx = c.getContext('2d')!
        ctx.drawImage(img, 0, 0)
        frames.push(ctx.getImageData(0, 0, c.width, c.height).data)
      }
      const [A, B] = frames
      let diff = 0
      let sawPink = false
      for (let i = 0; i < A.length; i += 4) {
        if (Math.abs(A[i] - B[i]) > changed || Math.abs(A[i + 1] - B[i + 1]) > changed || Math.abs(A[i + 2] - B[i + 2]) > changed) diff++
        if (!sawPink
          && Math.abs(A[i] - pink[0]) < pinkTol
          && Math.abs(A[i + 1] - pink[1]) < pinkTol
          && Math.abs(A[i + 2] - pink[2]) < pinkTol) sawPink = true
      }
      return { changed: diff / (A.length / 4), pink: sawPink }
    },
    { aB64: a.toString('base64'), bB64: b.toString('base64'), pink: PINK, pinkTol: PINK_TOL, changed: CHANGED },
  )
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
