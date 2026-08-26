// The CELPE-BRAS CTA is a dark bar with three flowers clipped into it, and every way
// the arrangement can break is silent — the page renders, tsc and lint pass, the flowers
// are just the wrong size in the wrong place:
//
//   • the sizes are `cqw` of the button, which only exist because the WRAPPER carries
//     `@container`. Lose it and every length resolves against the nearest ancestor that
//     is a container (or none), with nothing to point at it;
//   • preflight's `max-width: 100%` beats a width, so a flower asked for 46% of the
//     button can quietly draw at 100% and land nowhere near where it was measured;
//   • the flowers are painted over the button's whole face, so losing
//     `pointer-events: none` eats clicks on the CTA with no visible symptom;
//   • the label only clears them because it is `relative` — absolutely positioned
//     siblings paint over in-flow content otherwise, and the text vanishes behind a
//     petal at some widths and not others;
//   • `overflow: hidden` is what makes the flowers decor rather than three images
//     hanging off the button into the section around it.
//
// So this measures where each flower's centre actually landed against CELPE_CTA_PLANTS,
// proves the label is on top and the button still takes the click, and proves the box
// is clipped. Run against a prod build (`npm run build && npm start`):
//
//   npm run verify:celpe-cta                              → http://localhost:3000/ru
//   npm run verify:celpe-cta -- http://host/pt            → longest label
//   npm run verify:celpe-cta -- http://host/ru 390x844    → phone layout
import { chromium } from 'playwright'
import { CELPE_CTA_PLANTS } from '../components/ui/celpeCtaPlants'

const BASE = process.argv[2] ?? 'http://localhost:3000/ru'
const vpArg = /^(\d+)x(\d+)$/.exec(process.argv[3] ?? '')
const VIEWPORT = vpArg
  ? { width: Number(vpArg[1]), height: Number(vpArg[2]) }
  : { width: 1440, height: 900 }

const CTA = '#celpe-bras a[href="#footer"]'
// Sub-pixel layout plus a percentage of a fractional container width. The smallest real
// failure above is off by tens of px.
const TOL = 1.5

const INK = 'rgb(50, 48, 49)'      // --color-ink
const CREAM = 'rgb(255, 252, 229)' // --color-cream

const failures: string[] = []
const ok: string[] = []

function near(label: string, got: number, want: number, tol = TOL) {
  if (Math.abs(got - want) > tol) failures.push(`${label}: ${got.toFixed(2)}, expected ${want.toFixed(2)}`)
  else ok.push(`${label} ${got.toFixed(2)} ≈ ${want.toFixed(2)}`)
}

function is(label: string, got: unknown, want: unknown) {
  if (got !== want) failures.push(`${label}: ${String(got)}, expected ${String(want)}`)
  else ok.push(`${label} = ${String(want)}`)
}

async function main() {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: VIEWPORT, deviceScaleFactor: 1 })
  await page.goto(BASE, { waitUntil: 'load', timeout: 60_000 })
  await page.waitForSelector(`${CTA} img`, { timeout: 15_000 })
  // The plants are <img>; a box measured before decode is 0-sized.
  await page.evaluate((sel) => Promise.all(
    Array.from(document.querySelectorAll<HTMLImageElement>(`${sel} img`))
      .map(i => (i.complete ? Promise.resolve() : i.decode().catch(() => {}))),
  ), CTA)
  // The button has to be on screen for elementFromPoint to say anything.
  await page.locator(CTA).scrollIntoViewIfNeeded()
  await page.waitForTimeout(400)

  // Everything stays inline: a named arrow inside an evaluate body gets a `__name()`
  // call from esbuild that does not exist in the browser (see verifyHeroPlants.ts).
  const m = await page.evaluate((sel) => {
    const a = document.querySelector<HTMLElement>(sel)!
    const s = getComputedStyle(a)
    const b = a.getBoundingClientRect()
    const label = a.querySelector<HTMLElement>('span')!
    const lb = label.getBoundingClientRect()
    const wrapper = a.parentElement!
    // The hint + CTA column is meant to be exactly ONE column of the feature grid. That
    // grid is `hidden lg:flex`, so below lg its cards measure 0 and there is nothing to
    // compare against — the phone layout stacks instead (CelpeBrasStack).
    const card = document.querySelector<HTMLElement>('#celpe-bras .hidden.lg\\:flex > .flex-row > [data-adaptive-cover]')
    const gridVisible = !!card && card.getBoundingClientRect().width > 0
    return {
      btn: { x: b.x, y: b.y, w: b.width, h: b.height },
      gridVisible,
      cardW: gridVisible ? card!.getBoundingClientRect().width : 0,
      columnW: wrapper.parentElement!.getBoundingClientRect().width,
      bg: s.backgroundColor,
      overflow: s.overflowX,
      wrapperContainerType: getComputedStyle(wrapper).containerType,
      labelColor: getComputedStyle(label).color,
      labelPosition: getComputedStyle(label).position,
      // Who answers at the middle of the label, and at a point on the bar well clear of it.
      topAtLabel: (document.elementFromPoint(lb.x + lb.width / 2, lb.y + lb.height / 2) as HTMLElement | null)?.tagName,
      topAtEdge: (document.elementFromPoint(b.x + 12, b.y + b.height / 2) as HTMLElement | null)?.tagName,
      imgs: Array.from(a.querySelectorAll<HTMLImageElement>('img')).map(i => {
        const r = i.getBoundingClientRect()
        const cs = getComputedStyle(i)
        return {
          file: decodeURIComponent(i.currentSrc.split('/').pop() ?? ''),
          // offsetWidth is the UNROTATED layout box — what `w` describes. The rect is the
          // rotated AABB, whose centre is still the element's centre (rotation and skew
          // are both about it), which is what `dx`/`dy` describe.
          layoutW: i.offsetWidth,
          cx: r.x + r.width / 2,
          cy: r.y + r.height / 2,
          pointerEvents: cs.pointerEvents,
          maxWidth: cs.maxWidth,
          scale: cs.scale,
        }
      }),
    }
  }, CTA)

  const cq = m.btn.w / 100

  is('wrapper container-type', m.wrapperContainerType, 'inline-size')
  is('button background', m.bg, INK)
  is('button overflow', m.overflow, 'hidden')
  is('label colour', m.labelColor, CREAM)
  is('label position (must beat the absolute flowers)', m.labelPosition, 'relative')
  is('hit test at label centre', m.topAtLabel, 'SPAN')
  is('hit test on the bar (flowers must not eat the click)', m.topAtEdge, 'A')
  is('flower count', m.imgs.length, CELPE_CTA_PLANTS.length)
  // One column of the feature grid, to the pixel — the whole point of the `calc` width.
  if (m.gridVisible) near('hint+CTA column = one feature card', m.columnW, m.cardW)
  else ok.push('feature grid not rendered at this width (phone stack) — column width not compared')

  CELPE_CTA_PLANTS.forEach((p, i) => {
    const im = m.imgs[i]
    if (!im) return
    is(`[${i}] file`, im.file, p.file)
    is(`[${i}] max-width (preflight would clamp the cqw width)`, im.maxWidth, 'none')
    is(`[${i}] pointer-events`, im.pointerEvents, 'none')
    near(`[${i}] width cqw`, im.layoutW / cq, p.w)
    near(`[${i}] dx cqw`, (im.cx - (m.btn.x + m.btn.w / 2)) / cq, p.dx)
    near(`[${i}] dy cqw`, (im.cy - (m.btn.y + m.btn.h / 2)) / cq, p.dy)
    is(`[${i}] scale at rest`, im.scale, 'none')
  })

  // ── Hover: the flowers grow, and they grow IN PLACE ────────────────────────
  //
  // The zoom is a Tailwind `scale-*`, which writes the `scale` PROPERTY. That composes
  // as translate → rotate → scale → `transform`, so it multiplies anything left in the
  // `transform` shorthand: fold the −50% anchor back in there and every flower slides
  // up and left by 7.5% of itself as it grows, with nothing else to notice. Re-measuring
  // dx/dy in cqw is what catches it — the button's own `.btn-press` growth cancels out
  // of that ratio, so these numbers must come back unchanged.
  // `page.hover()` never settles here — its actionability loop keeps re-running while
  // the scroll-driven background moves under the button. The pointer is moved directly
  // to the centre measured above instead, which is the same gesture without the wait.
  await page.mouse.move(m.btn.x + m.btn.w / 2, m.btn.y + m.btn.h / 2)
  // `.btn-press` is 120ms, `.pill-decor` 340ms. Wait past both.
  await page.waitForTimeout(700)
  const h = await page.evaluate((sel) => {
    const a = document.querySelector<HTMLElement>(sel)!
    const b = a.getBoundingClientRect()
    return {
      btn: { x: b.x, y: b.y, w: b.width, h: b.height },
      imgs: Array.from(a.querySelectorAll<HTMLImageElement>('img')).map(i => {
        const r = i.getBoundingClientRect()
        return { scale: getComputedStyle(i).scale, cx: r.x + r.width / 2, cy: r.y + r.height / 2 }
      }),
    }
  }, CTA)

  const hcq = h.btn.w / 100
  if (Math.abs(h.btn.w - m.btn.w) < 0.5) failures.push('hover: the button never grew — .btn-press did not engage, so the page is not in a hover state')
  else ok.push(`hover engaged (button ${m.btn.w.toFixed(1)} → ${h.btn.w.toFixed(1)})`)

  CELPE_CTA_PLANTS.forEach((p, i) => {
    const im = h.imgs[i]
    if (!im) return
    // `scale: 1.15` computes back as "1.15", and the transition has to have finished.
    is(`[${i}] scale on hover`, im.scale, '1.15')
    near(`[${i}] dx cqw on hover (must not drift)`, (im.cx - (h.btn.x + h.btn.w / 2)) / hcq, p.dx)
    near(`[${i}] dy cqw on hover (must not drift)`, (im.cy - (h.btn.y + h.btn.h / 2)) / hcq, p.dy)
  })

  await browser.close()

  console.log(`CELPE-BRAS CTA — ${BASE} @ ${VIEWPORT.width}x${VIEWPORT.height}`)
  console.log(`button ${m.btn.w.toFixed(1)}x${m.btn.h.toFixed(1)}`)
  for (const line of ok) console.log(`  ok   ${line}`)
  for (const line of failures) console.log(`  FAIL ${line}`)
  if (failures.length) {
    console.error(`\n${failures.length} failure(s)`)
    process.exit(1)
  }
  console.log('\nall good')
}

main()
