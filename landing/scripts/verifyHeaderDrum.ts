// Regression guard for the desktop header pill cylinder (components/sections/Header.tsx).
//
// The four section pills share one coordinate space. Position 0 is the slot in the
// header bar, position -1 rides one step ABOVE it, positions 1..2 hang below, and
// the "become a tutor" pill is parked at 3. The active section holds the slot and
// the others follow in CYCLIC order, so the pill above is always the section you
// just left and the one peeking below is always the next. Scrolling rotates the
// cylinder; the pill that was above wraps around to the foot of the column.
//
// Seven things must hold, none of them obvious from reading the code:
//
//   1. The order is cyclic, not "the list minus the active one". Sorting the column
//      in plain list order looks almost right and puts the wrong pill in the peek
//      for three of the four sections.
//   2. The pill ABOVE the slot is the previous section, and it stays on screen.
//      page.tsx drops the desktop header to lg:pt-[60px] purely to make room for it;
//      at the old 43px a full 60px step shaved its rounded top off the viewport.
//   3. The index LATCHES in the gaps. Inside #comparison the slot must keep holding
//      About with Tutors peeking, and swap only when #tutors arrives. A midpoint
//      rule would flip halfway through #comparison instead.
//   4. Two gaps, both borrowed from the flags dropdown: 64px steps around the
//      slot (48px pill + mt-4), 56px once ⋮ unrolls the rest (48px + gap-2).
//   5. Three pills visible at rest, five with the menu open — and "become a tutor"
//      is never one of the three. The two that ⋮ hides do not merely fade: they
//      lie TUCKED in the peek pill's own box (deckMotion), so ⋮ deals them out
//      from under it instead of switching them on where they already stood.
//   5b. #tutors is the exception: there the extra pill comes out on its own, one
//      wide step under the peek — the same pill the ⋮ column ends with, so opening
//      the menu pushes it down to the foot rather than adding a second copy.
//      Part 3 asserts the phone's half of that offer, plus the thing that made it
//      dangerous to add: the closed burger column used to be a stack of invisible
//      TAPPABLE links across the top-right corner.
//   6. Every pill HUGS its own label with one shared side padding, and the column
//      is centred on one axis. The box takes the SLOT pill's width, which is what
//      makes "Connect" slide as the drum turns; a stretched-to-uniform column
//      would hold it still.
//   7. Clicking a pill parks it in the slot for the length of the scroll tween.
//
// Usage:
//   npm run verify:header-drum                      → http://localhost:3000/ru
//   npm run verify:header-drum http://host/en       → explicit URL
// Requires a running server (`npm run dev` or `npm start`).

import assert from 'node:assert/strict'
import { chromium, type Browser } from 'playwright'
import { activeSectionIndex, type SectionBox } from '../hooks/useActiveSection'
import { BECOME_TEACHER_ID } from '../lib/uiLabels'

const URL      = process.argv[2] ?? 'http://localhost:3000/ru'
const VIEWPORT = { width: 1440, height: 900 }

// Part 3 runs the same page as a phone: no drum at all down here, and the
// header allows itself 136px instead of 164 (headerOffset() in AnchorScrollHandler).
const MOBILE_VIEWPORT = { width: 390, height: 844 }
const MOBILE_OFFSET   = 136
const PILL_H      = 48
const PITCH       = 64                    // 48px pill + the flags' 16px drop (mt-4)
const TIGHT_PITCH = 56                    // 48px pill + the flags' 8px stack (gap-2)
const RESTING_VISIBLE = 1

// Pixels from the slot — mirrors offsetOf() in Header.tsx. The three pills that
// stand on their own keep the wide step; what ⋮ unrolls is packed tighter.
const offsetOf = (pos: number) =>
  pos <= RESTING_VISIBLE ? pos * PITCH : PITCH + (pos - RESTING_VISIBLE) * TIGHT_PITCH
const PAD_X    = 16                       // PILL_PAD_X in Header.tsx
const OFFSET   = 164                      // HEADER_OFFSET — the probe's header allowance
const NAV_IDS  = ['about', 'tutors', 'celpe-bras', 'plans']
const EXTRA_ID = 'become-tutor'
const EXTRA_POS = 3
// Where the extra pill stands when #tutors calls it out with the menu shut: one
// WIDE step under the peek, not the tight step an open column would give it.
const HINT_OFFSET = (RESTING_VISIBLE + 1) * PITCH

// ── Part 1: the latch ────────────────────────────────────────────────────────
// A stand-in page: four 2000px nav sections, with a 1500px #comparison (plus an
// 80px flex gap either side) sitting in the gap between the first two.
{
  const boxes: SectionBox[] = [
    { top: 1000, bottom: 3000 },   // #about
    { top: 4660, bottom: 6660 },   // #tutors
    { top: 6740, bottom: 8740 },   // #celpe-bras
    { top: 8820, bottom: 10820 },  // #plans
  ]
  const at = (probe: number, current: number | null) => activeSectionIndex(boxes, probe, current)

  // Inside a section → that index, whatever was latched before.
  assert.equal(at(2000, null), 0, 'inside #about → 0')
  assert.equal(at(5500, 0),    1, 'inside #tutors → 1')
  assert.equal(at(7500, 1),    2, 'inside #celpe-bras → 2')
  assert.equal(at(9500, 2),    3, 'inside #plans → 3')
  assert.equal(at(2000, 3),    0, 'scrolling back up to #about → 0')

  // The gaps hold. This is the behaviour the owner asked for: the swap happens
  // when the section lands in the viewport, not partway through #comparison.
  for (const p of [3100, 3800, (3000 + 4660) / 2, 4200, 4600]) {
    assert.equal(at(p, 0), 0, `#comparison at ${p} keeps the latched About`)
  }
  assert.equal(at(500, 0),   0, '#hero above #about keeps About')
  assert.equal(at(20000, 3), 3, 'the footer keeps Plans')
  assert.equal(at(6700, 1),  1, 'the 80px gap between adjacent sections holds too')

  // No history — a reload with restored scroll, or a deep link into a gap.
  assert.equal(at(3800, null),  0, 'no history inside #comparison → the section above (About)')
  assert.equal(at(6700, null),  1, 'no history in the tutors→celpe gap → Tutors')
  assert.equal(at(500, null),   0, 'no history in #hero → About')
  assert.equal(at(20000, null), 3, 'no history in the footer → Plans')

  // Degenerate geometry must not resolve to the last section.
  assert.equal(activeSectionIndex([{ top: 0, bottom: 0 }, ...boxes.slice(1)], 9500, 1), 1,
    'a zero-height section holds the latch instead of picking Plans')
  assert.equal(activeSectionIndex([], 9500, null), 0, 'no sections at all → 0')
}
console.log('✓ latch: 4 stops, both ends, #comparison holds, no-history fallback, degenerate input')

// The cylinder: position of section i when `active` is in the slot. The last
// position wraps ABOVE the slot — mirrors cylinderPos() in Header.tsx.
const posOf = (i: number, active: number) => {
  const raw = (i - active + NAV_IDS.length) % NAV_IDS.length
  return raw === NAV_IDS.length - 1 ? -1 : raw
}

// ── Part 2: what actually reaches the DOM ────────────────────────────────────
async function main() {
  const browser = await chromium.launch()
  const context = await browser.newContext({ viewport: VIEWPORT })

  const page = await context.newPage()

  try {
    // Not `load`: the background collage is hundreds of KB of SVG and a cold dev
    // compile costs ~90s. The locator wait below is the real readiness signal.
    await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 180_000 })
    await page.locator('[data-drum-pill]').first().waitFor({ state: 'attached', timeout: 60_000 })

    const readPills = () => page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>('[data-drum-pill]')].map(el => {
        const r  = el.getBoundingClientRect()
        const cs = getComputedStyle(el)
        return {
          id:      el.dataset.drumPill!,
          pos:     Number(el.dataset.drumPos),
          y:       new DOMMatrixReadOnly(cs.transform).f,
          top:     r.top,
          centre:  r.left + r.width / 2,
          width:   r.width,
          padL:    parseFloat(cs.paddingLeft),
          padR:    parseFloat(cs.paddingRight),
          label:   el.textContent!.trim(),
          opacity: Number(cs.opacity),
          current: el.getAttribute('aria-current'),
          inert:   el.hasAttribute('inert'),
        }
      }))

    const sectionsOf = (pills: Awaited<ReturnType<typeof readPills>>) =>
      pills.filter(p => p.id !== EXTRA_ID)

    // The SLOT pill specifically: a tucked one renders at DECK.TUCK_SCALE, which
    // is the deal's depth cue and not the cylinder's step.
    const cellH = await page.evaluate(() =>
      document.querySelector('[data-drum-pill][data-drum-pos="0"]')!.getBoundingClientRect().height)
    assert.ok(Math.abs(cellH - PILL_H) < 0.5,
      `the slot pill is ${PILL_H}px tall (got ${cellH}) — the cylinder step depends on it`)

    // Scroll so the probe — the centre of the content viewport, which is what the
    // hook samples — lands on a section's midpoint, then wait for the slot pill to
    // finish travelling. Polling for the EXACT resting transform rather than "the
    // number stopped changing": headless Chromium renders at roughly a fifth of
    // 60Hz, and the tail of an eased transform reads as a stop.
    const TOL = 0.01
    const scrollToMidpointOf = (id: string) => page.evaluate(([sel, off]) => {
      const r   = document.querySelector(sel as string)!.getBoundingClientRect()
      const mid = r.top + window.scrollY + r.height / 2
      // probe = scrollY + (OFFSET + innerHeight) / 2  ⇒  solve for scrollY
      window.scrollTo({ top: mid - ((off as number) + window.innerHeight) / 2, behavior: 'instant' })
    }, [`#${id}`, OFFSET] as const)

    const parkOnMidpointOf = async (id: string, expectSlot: string) => {
      await scrollToMidpointOf(id)

      let pills = await readPills()
      for (let i = 0; i < 60; i++) {                 // ≤ 6s
        await page.waitForTimeout(100)
        pills = await readPills()
        const slot = pills.find(p => p.id === expectSlot)
        if (slot && slot.pos === 0 && Math.abs(slot.y) < TOL) {
          await page.waitForTimeout(200)            // confirm it rests there
          pills = await readPills()
          const again = pills.find(p => p.id === expectSlot)
          if (again && again.pos === 0 && Math.abs(again.y) < TOL) return pills
        }
      }
      return pills
    }

    // ── Every section: the right pill in the slot, previous above, cyclic below ──
    for (const [i, id] of NAV_IDS.entries()) {
      const pills = await parkOnMidpointOf(id, id)
      const byPos = Object.fromEntries(sectionsOf(pills).map(p => [p.pos, p.id]))

      const prev = NAV_IDS[(i - 1 + NAV_IDS.length) % NAV_IDS.length]
      const next = NAV_IDS[(i + 1) % NAV_IDS.length]

      assert.equal(byPos[0], id, `#${id}: its own pill holds the slot (got ${byPos[0]})`)
      assert.equal(byPos[-1], prev,
        `#${id}: the pill ABOVE the slot is the previous section — expected ${prev}, got ${byPos[-1]}`)
      assert.equal(byPos[1], next,
        `#${id}: the peek is the NEXT section cyclically — expected ${next}, got ${byPos[1]}`)

      for (const p of sectionsOf(pills)) {
        const want = posOf(NAV_IDS.indexOf(p.id), i)
        // ⋮ is closed here, so anything past the peek is tucked in the peek's box.
        const restY = offsetOf(Math.min(want, RESTING_VISIBLE))
        assert.equal(p.pos, want, `#${id}: ${p.id} is at cylinder position ${want}`)
        assert.ok(Math.abs(p.y - restY) < 0.5,
          `#${id}: ${p.id} sits at translateY ${restY}px, got ${p.y.toFixed(2)}px` +
          (want > RESTING_VISIBLE ? ' — undealt cards wait under the peek pill' : ''))
        assert.ok(p.top >= 0,
          `#${id}: ${p.id} stays on screen (top ${p.top.toFixed(1)}px) — the header was ` +
          `lowered to 60px precisely so the pill above the slot is not clipped`)
      }
      assert.equal(pills.find(p => p.pos === 0)!.current, 'true',
        `#${id}: the slot pill is marked aria-current`)
    }
    console.log('✓ every section: own pill in the slot, previous above, next peeking, cyclic order')

    // ── The header itself must never be transformed ──
    const headerTransform = await page.evaluate(() =>
      getComputedStyle(document.querySelector('#header')!).transform)
    assert.ok(headerTransform === 'none',
      `the header is never pushed to make room — got transform: ${headerTransform}`)
    console.log('✓ header carries no transform')

    // ── Hug: each pill as wide as its own label, all centred on one axis ──
    {
      await parkOnMidpointOf('tutors', 'tutors')
      // Deal the column out first: a tucked card renders at DECK.TUCK_SCALE, and
      // this measures what each pill's own label asks for, not the depth cue.
      await page.locator('button[aria-label="Ещё пункты меню"]').click()
      // The box width glides for DRUM_WIDTH_MS after the pills themselves have
      // landed — measure once it has actually arrived, not mid-transition.
      await page.waitForTimeout(900)
      const pills = await readPills()
      // Width the label actually needs, measured in the pill's own typography.
      const needed = await page.evaluate(([labels, pad]) => {
        const pill  = document.querySelector<HTMLElement>('[data-drum-pill]')!
        const cs    = getComputedStyle(pill)
        const probe = document.createElement('span')
        Object.assign(probe.style, {
          position: 'absolute', visibility: 'hidden', whiteSpace: 'nowrap',
          fontFamily: cs.fontFamily, fontWeight: cs.fontWeight,
          fontSize: cs.fontSize, letterSpacing: cs.letterSpacing,
        })
        document.body.appendChild(probe)
        const out = (labels as string[]).map(t => {
          probe.textContent = t
          return probe.getBoundingClientRect().width + 2 * (pad as number)
        })
        probe.remove()
        return out
      }, [pills.map(p => p.label), PAD_X] as const)

      pills.forEach((p, i) => {
        assert.ok(Math.abs(p.width - needed[i]) < 1.5,
          `${p.id} hugs its label: needs ${needed[i].toFixed(1)}px, renders ${p.width.toFixed(1)}px`)
        assert.equal(p.padL, PAD_X, `${p.id}: ${PAD_X}px padding on the left`)
        assert.equal(p.padR, PAD_X, `${p.id}: ${PAD_X}px padding on the right`)
      })

      const centres = pills.map(p => p.centre)
      assert.ok(Math.max(...centres) - Math.min(...centres) < 0.5,
        `every pill is centred on the same axis — got ${centres.map(c => c.toFixed(1)).join(', ')}`)

      // The static Connect pill shares the family's padding, and the drum box is
      // sized by the slot pill — that pairing is what walks Connect left and right.
      const connect = await page.evaluate(() => {
        const el = document.querySelector<HTMLElement>('[data-nav-pill="connect"]')!
        const cs = getComputedStyle(el)
        return { padL: parseFloat(cs.paddingLeft), padR: parseFloat(cs.paddingRight) }
      })
      assert.equal(connect.padL, PAD_X, 'Connect shares the pill padding')
      assert.equal(connect.padR, PAD_X, 'Connect shares the pill padding')

      const boxW = await page.evaluate(() =>
        document.querySelector('[data-drum-pill]')!.parentElement!.getBoundingClientRect().width)
      const slotW = pills.find(p => p.pos === 0)!.width
      assert.ok(Math.abs(boxW - slotW) < 1.5,
        `the drum box hugs the slot pill (box ${boxW.toFixed(1)}px vs pill ${slotW.toFixed(1)}px) — ` +
        `this is the width the nav re-flows around`)
      console.log('✓ hug: every pill fits its own label, shared padding, one centre axis')

      await page.keyboard.press('Escape')      // back to rest for the checks below
      await page.waitForTimeout(600)
    }

    // ── Visibility: 3 at rest, 5 when the menu opens ──
    // Away from #tutors, which is the one section that deals the extra pill out on
    // its own — that case has its own block below.
    const visibleCount = (pills: Awaited<ReturnType<typeof readPills>>) =>
      pills.filter(p => p.opacity > 0.5).length
    const extraOf = (pills: Awaited<ReturnType<typeof readPills>>) =>
      pills.find(p => p.id === EXTRA_ID)!

    await parkOnMidpointOf('celpe-bras', 'celpe-bras')
    let pills = await readPills()
    assert.equal(visibleCount(pills), 3,
      `at rest exactly 3 pills are visible (above + slot + peek) — got ${visibleCount(pills)}`)
    assert.ok(!extraOf(pills).opacity,
      '"become a tutor" is hidden until ⋮ opens — anywhere but #tutors')
    for (const p of pills) {
      assert.equal(p.inert, p.pos > 1,
        `${p.id} at position ${p.pos}: hidden pills are inert, visible ones are not`)
    }

    await page.locator('button[aria-label="Ещё пункты меню"]').click()
    await page.waitForTimeout(900)
    pills = await readPills()
    assert.equal(visibleCount(pills), NAV_IDS.length + 1,
      `the menu reveals all ${NAV_IDS.length + 1} pills — got ${visibleCount(pills)}`)
    assert.ok(pills.every(p => !p.inert), 'with the menu open no pill is inert')
    assert.ok(pills.every(p => p.top >= 0), 'the open column stays on screen')

    const extra = extraOf(pills)
    assert.equal(extra.pos, EXTRA_POS, '"become a tutor" is parked at the foot of the column')
    assert.ok(extra.top > Math.max(...sectionsOf(pills).map(p => p.top)),
      '"become a tutor" sits below every section pill, whichever section is active')
    console.log(`✓ 3 pills at rest, ${NAV_IDS.length + 1} with the menu open, extra pill last`)

    await page.keyboard.press('Escape')
    // The tuck is a deal, not a fade: DECK.IN_MS plus one stagger step per card,
    // and the crossfade rides the same ease-IN curve — a card is still more than
    // half opaque two thirds of the way home. 400ms landed inside that tail.
    await page.waitForTimeout(700)
    assert.equal(visibleCount(await readPills()), 3, 'Escape closes the column')
    console.log('✓ Escape closes the column')

    // ── #tutors calls "become a tutor" out on its own ────────────────────────────
    // Scrolling onto the section the pill is about must show it without the reader
    // opening anything — and it is the SAME pill the ⋮ column ends with, not a
    // second copy: opening the menu there moves it down a step rather than adding
    // one. It stands alone under the peek, so it keeps the bar's WIDE 64px air; the
    // tight 56px step is what an open column packs its own cards with.
    {
      pills = await parkOnMidpointOf('tutors', 'tutors')
      const hint = extraOf(pills)
      assert.ok(hint.opacity > 0.5, 'on #tutors the extra pill comes out with ⋮ untouched')
      assert.ok(!hint.inert, 'and it is clickable — the hint exists to be taken')
      assert.equal(visibleCount(pills), 4, `#tutors shows 4 pills — got ${visibleCount(pills)}`)
      assert.equal(pills.filter(p => p.id === EXTRA_ID).length, 1,
        'one "become a tutor" pill in the drum, never a second copy for the hint')

      const peek = pills.find(p => p.pos === RESTING_VISIBLE && p.id !== EXTRA_ID)!
      assert.ok(Math.abs(hint.y - (peek.y + PITCH)) < 0.5,
        `the hint keeps the resting 64px step under the peek — peek at ${peek.y.toFixed(1)}px, ` +
        `hint at ${hint.y.toFixed(1)}px`)
      assert.ok(hint.top > Math.max(...sectionsOf(pills).map(p => p.top)),
        'the hint hangs below the whole cylinder')

      // ⋮ on #tutors: a section card lands under the peek and the hint gives way.
      await page.locator('button[aria-label="Ещё пункты меню"]').click()
      await page.waitForTimeout(900)
      pills = await readPills()
      assert.equal(visibleCount(pills), NAV_IDS.length + 1, '⋮ on #tutors still reveals all 5')
      const pushed = extraOf(pills)
      assert.equal(pushed.pos, EXTRA_POS, 'opening ⋮ moves the hint down to the foot of the column')
      assert.ok(Math.abs(pushed.y - offsetOf(EXTRA_POS)) < 0.5,
        `and onto the column's tight step — expected ${offsetOf(EXTRA_POS)}px, got ${pushed.y.toFixed(2)}px`)

      await page.keyboard.press('Escape')
      await page.waitForTimeout(700)
      pills = await readPills()
      assert.equal(visibleCount(pills), 4, 'closing ⋮ on #tutors leaves the hint standing')
      assert.ok(Math.abs(extraOf(pills).y - HINT_OFFSET) < 0.5,
        `the hint returns to ${HINT_OFFSET}px, got ${extraOf(pills).y.toFixed(2)}px`)

      // …and leaving the section tucks it away again.
      pills = await parkOnMidpointOf('celpe-bras', 'celpe-bras')
      assert.ok(!extraOf(pills).opacity, 'scrolling off #tutors tucks the hint back under the peek')
      assert.ok(extraOf(pills).inert, 'and it stops taking clicks')
      console.log('✓ #tutors deals the extra pill out on its own, ⋮ pushes it down, leaving hides it')
    }

    // ── #comparison: the latch, end to end ──
    // Coming down from #about, the slot must still hold About while the reader
    // crosses #comparison, with Tutors peeking — and swap on arrival at #tutors.
    await parkOnMidpointOf('about', 'about')
    await scrollToMidpointOf('comparison')
    await page.waitForTimeout(800)
    const gapByPos = Object.fromEntries(sectionsOf(await readPills()).map(p => [p.pos, p.id]))
    assert.equal(gapByPos[0], 'about',
      `mid-#comparison the slot still holds About (got ${gapByPos[0]}) — no half state`)
    assert.equal(gapByPos[1], 'tutors', 'and Tutors is the one peeking, ready to swap')
    console.log('✓ #comparison holds About in the slot with Tutors peeking')

    const swapped = await parkOnMidpointOf('tutors', 'tutors')
    const swappedByPos = Object.fromEntries(sectionsOf(swapped).map(p => [p.pos, p.id]))
    assert.equal(swappedByPos[0], 'tutors', 'arriving at #tutors swaps it into the slot')
    assert.equal(swappedByPos[-1], 'about', 'and About climbs to the position above the slot')
    console.log('✓ arriving at #tutors performs the swap')

    // ── Click pins the target for the length of the scroll tween ──
    // Without the pin the probe sweeps every section during the 2.8s tween and the
    // cylinder spins the whole way instead of landing on the clicked pill.
    // The menu has to be open first: a pill below the peek is invisible AND inert,
    // so it correctly ignores clicks — reach it the way a reader does.
    await page.locator('button[aria-label="Ещё пункты меню"]').click()
    await page.waitForTimeout(600)
    await page.locator('[data-drum-pill="plans"]').click()
    for (const wait of [150, 900, 1800]) {
      await page.waitForTimeout(wait)
      const now = await readPills()
      const slot = now.find(p => p.pos === 0)!
      assert.equal(slot.id, 'plans',
        `${wait}ms into the tween the slot still holds the clicked pill (got ${slot.id})`)
    }
    console.log('✓ clicking a pill parks it in the slot and holds it through the tween')

    await checkMobileHint(browser)

    console.log('header drum OK')
  } finally {
    await browser.close()
  }
}

// ── Part 3: the phone ────────────────────────────────────────────────────────
// No drum down here — the burger column is the whole nav, and "become a tutor" is
// its last row. Two things must hold:
//
//   a. On #tutors the same pill stands under the plate on its own, in the slot the
//      column's first pill ("Конект") occupies when the burger opens. It yields to
//      an open burger rather than doubling up, and it goes away off the section.
//   b. The CLOSED column must not be tappable. Every pill in it is fully
//      transparent but kept in the layout (the stack must not reflow as it
//      reveals), and each one used to claim `pointer-events-auto` unconditionally
//      — ≈450px of invisible links inside the fixed header, over whatever the
//      reader was looking at. This is the half of the fix that is easy to undo by
//      copy-pasting a pill, so it is asserted at every pill's own centre rather
//      than at one sampled point.
async function checkMobileHint(browser: Browser) {
  const context = await browser.newContext({
    viewport: MOBILE_VIEWPORT, hasTouch: true, isMobile: true, deviceScaleFactor: 3,
  })
  const page = await context.newPage()

  try {
    await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 180_000 })
    await page.locator('[data-mobile-hint]').waitFor({ state: 'attached', timeout: 60_000 })

    const read = () => page.evaluate(() => {
      const column = document.querySelector('[data-mobile-column]')!
      const hint   = document.querySelector('[data-mobile-hint]')!

      // Both copies of "become a tutor", measured identically — and measured INLINE.
      // A named helper here (`const box = el => …`) is compiled by tsx into a
      // __name() call that exists in Node and not in the page: "ReferenceError:
      // __name is not defined". Every evaluate in this file stays free of them.
      const pills = [
        column.querySelector('[data-mobile-pill="become-tutor"]'),
        hint.querySelector('[data-mobile-pill="become-tutor"]'),
        column.querySelector('[data-mobile-pill="connect"]'),
      ].map(el => {
        if (!el) return null
        const r  = el.getBoundingClientRect()
        const cs = getComputedStyle(el)
        return {
          top: r.top, right: r.right, width: r.width,
          opacity:       Number(cs.opacity),
          pointerEvents: cs.pointerEvents,
        }
      })

      // What a finger would actually reach at the centre of each pill's box, plus
      // the language switcher's — the column's own elements must be unreachable
      // while it is shut. `inertTarget` is what a tap would land on instead, and
      // whether THAT is interactive: a tap test is only meaningful over dead page
      // pixels, so the point is chosen from this rather than guessed.
      const probes = [...column.children].map(el => {
        const r = el.getBoundingClientRect()
        const x = Math.round(r.left + r.width / 2)
        const y = Math.round(r.top + r.height / 2)
        const hitEl = document.elementFromPoint(x, y)
        return {
          id:       (el as HTMLElement).dataset.mobilePill ?? 'lang-switcher',
          inColumn: !!hitEl?.closest('[data-mobile-column]'),
          onLink:   !!hitEl?.closest('a, button, input, textarea, select, label, [role="button"]'),
          onScreen: y > 0 && y < window.innerHeight,
          x, y,
        }
      })

      return {
        columnInert: column.hasAttribute('inert'),
        hintInert:   hint.hasAttribute('inert'),
        colExtra:    pills[0],
        hintPill:    pills[1],
        colFirst:    pills[2],
        probes,
        // The drum is display:none at this width but still rendered, so its slot
        // pill is a free read-out of what the hook currently thinks is active —
        // which turns "the hint is missing" into a message that says why.
        activeSection: document.querySelector<HTMLElement>('[data-drum-pill][data-drum-pos="0"]')
          ?.dataset.drumPill ?? 'none',
        scrollY: window.scrollY,
        burgerOpen: document.querySelector('[data-burger]')?.getAttribute('aria-expanded'),
      }
    })

    const scrollToMidpointOf = (id: string) => page.evaluate(([sel, off]) => {
      const r   = document.querySelector(sel as string)!.getBoundingClientRect()
      const mid = r.top + window.scrollY + r.height / 2
      window.scrollTo({ top: mid - ((off as number) + window.innerHeight) / 2, behavior: 'instant' })
    }, [`#${id}`, MOBILE_OFFSET] as const)

    // Park on a section and wait for the hook to agree AND STAY agreeing, rather
    // than sleeping a round number. Two reasons, both learned here:
    //  • the phone's layout settles late (fonts, the tutor cards) and the hook
    //    re-measures when it does, so a fixed wait either raced it or padded runs;
    //  • the stack sections (#celpe-bras, #plans) change height as you scroll INTO
    //    them, which moves the very midpoint being scrolled to — one shot landed,
    //    the layout settled, and the probe slid back into the previous section.
    // So: re-aim every attempt (scrolling to an unchanged target is a no-op), and
    // only accept a reading that survives a second look.
    const parkOn = async (id: string) => {
      for (let i = 0; i < 25; i++) {                       // ≤ ~20s
        await scrollToMidpointOf(id)
        await page.waitForTimeout(250)
        if ((await read()).activeSection !== id) continue
        await page.waitForTimeout(400)
        if ((await read()).activeSection !== id) continue   // drifted — aim again
        await page.waitForTimeout(300)                      // the pill's 300ms fade
        return read()
      }
      const last = await read()
      assert.equal(last.activeSection, id,
        `the hook settles on #${id} at ${MOBILE_VIEWPORT.width}px — it holds #${last.activeSection} ` +
        `at scrollY ${last.scrollY}`)
      return last
    }

    // By attribute, not by aria-label: the label flips to "Закрыть меню" the moment
    // it opens, so a label locator can only ever address one half of the toggle.
    const burger = page.locator('[data-burger]')

    // Wait for a STATE rather than for a duration. The pills' fade is 300ms of
    // transition, which in dev — Fast Refresh, the background collage, a phone
    // profile — is regularly a lot more than 300ms of wall clock; every fixed wait
    // here failed at least once before this existed. The timeout message carries
    // the whole reading, so a real regression still says what it saw.
    const until = async (
      what: string,
      ok: (m: Awaited<ReturnType<typeof read>>) => boolean,
    ) => {
      for (let i = 0; i < 30; i++) {                       // ≤ 6s
        const now = await read()
        if (ok(now)) return now
        await page.waitForTimeout(200)
      }
      const last = await read()
      return assert.fail(
        `timed out waiting for ${what} — hint opacity ${last.hintPill!.opacity}, ` +
        `column copy ${last.colExtra!.opacity}, burger aria-expanded=${last.burgerOpen}, ` +
        `slot #${last.activeSection}`)
    }

    // ── b. the closed column is dead to the touch ──
    await page.waitForTimeout(600)
    let m = await read()
    assert.ok(m.columnInert, 'burger shut → the column is inert (tab order, a11y tree)')
    assert.equal(m.colExtra!.pointerEvents, 'none',
      'and every pill in it drops pointer-events — a transparent link must not be tappable')
    for (const p of m.probes) {
      if (!p.onScreen) continue
      assert.ok(!p.inColumn,
        `a tap at the centre of the hidden "${p.id}" must fall THROUGH to the page, ` +
        `not land in the burger column`)
    }
    assert.ok(m.probes.some(p => p.onScreen), 'precondition: the probe found pills on screen')
    console.log(`✓ mobile: the shut burger column is untappable (${m.probes.length} pills probed)`)

    // ── a. the hint ──
    assert.ok(!m.hintPill!.opacity, 'on #hero the hint is hidden')
    assert.ok(m.hintInert, 'and inert with it')

    m = await parkOn('tutors')
    assert.ok(m.hintPill!.opacity > 0.5,
      `on #tutors the hint stands on its own, no burger needed — opacity ` +
      `${m.hintPill!.opacity} while the slot holds #${m.activeSection}`)
    assert.equal(m.hintPill!.pointerEvents, 'auto', 'and it is tappable')
    assert.ok(!m.hintInert, 'and not inert')
    assert.ok(!m.colExtra!.opacity, 'the column copy stays hidden — never two visible at once')
    // Under the plate, not further down the column: 43px wrapper padding + 85px bar
    // + 16px container padding ≈ 144px.
    assert.ok(m.hintPill!.top > 128 && m.hintPill!.top < 220,
      `the hint sits right under the plate — got top ${m.hintPill!.top.toFixed(1)}px`)
    // Right edge: shared with the column, and compared against the column rather
    // than against the viewport — both are inset by the fixed wrapper's own px-s600
    // (24px), so a viewport-relative number would just re-derive the page padding.
    // The lift below does not touch x, so a hidden pill is a fair ruler here.
    assert.ok(Math.abs(m.hintPill!.right - m.colFirst!.right) < 0.5,
      `the hint shares the column's right edge — hint ${m.hintPill!.right.toFixed(1)}px, ` +
      `column ${m.colFirst!.right.toFixed(1)}px`)
    const hintTop = m.hintPill!.top
    console.log('✓ mobile: #tutors puts the hint under the plate, on the column\'s axis')

    // Opening the burger hands the job to the column's own copy.
    await burger.click()
    m = await until('the burger to take the corner over from the hint',
      s => !s.hintPill!.opacity && s.colExtra!.opacity > 0.5)
    assert.ok(m.hintInert, 'the yielding hint goes inert while the menu owns the corner')
    assert.ok(!m.columnInert, 'and the open column is interactive')
    // The slot, now that both have been seen SETTLED: the hint stands exactly where
    // the column's first pill ("Конект") comes to rest, which is what makes it read
    // as the object the burger hands over rather than a second widget. Measured with
    // the menu open on purpose — a hidden pill is lifted 12px by the reveal
    // transform, so comparing against it would be comparing against the animation.
    assert.ok(Math.abs(hintTop - m.colFirst!.top) < 0.5,
      `the hint occupies the column's first row — hint rested at ${hintTop.toFixed(1)}px, ` +
      `"Конект" rests at ${m.colFirst!.top.toFixed(1)}px`)

    await burger.click()                                   // same button, now "Закрыть меню"
    m = await until('the hint to come back once the burger is shut',
      s => s.hintPill!.opacity > 0.5 && !s.colExtra!.opacity)
    assert.equal(m.burgerOpen, 'false', 'the second press actually closed the burger')
    console.log('✓ mobile: the hint and the burger take turns, never both')

    m = await parkOn('celpe-bras')
    assert.ok(!m.hintPill!.opacity,
      `leaving #tutors hides the hint — opacity ${m.hintPill!.opacity} while the slot ` +
      `holds #${m.activeSection}`)
    assert.ok(m.hintInert, 'and it stops taking taps')
    console.log('✓ mobile: the hint is #tutors only')

    // ── a REAL tap where the ghosts used to be ──
    // The DOM checks above say the pills are switched off; this says a finger agrees.
    // The point comes from the probe, not from a guess: it has to be over dead page
    // pixels, or a legitimate link underneath would navigate and the test would pass
    // or fail for the wrong reason. Late in the run because a tap that DOES land
    // somewhere moves the page under everything after it.
    const dead = m.probes.find(p => p.onScreen && !p.onLink)
    if (!dead) {
      console.log('… mobile: no dead pixel under the shut column at this scroll — tap test skipped')
    } else {
      const before = await page.evaluate(() => window.scrollY)
      await page.touchscreen.tap(dead.x, dead.y)
      await page.waitForTimeout(1500)                      // longer than a 2.8s tween's start
      assert.equal(await page.evaluate(() => window.scrollY), before,
        `a tap at (${dead.x},${dead.y}) — the centre of the hidden "${dead.id}" — must not ` +
        `move the page`)
      console.log(`✓ mobile: a real tap over the hidden "${dead.id}" goes nowhere`)
    }

    // ── the point of the pill: it preselects the teacher branch of onboarding ──
    // Last, because it also scrolls the page to the footer.
    await parkOn('tutors')
    const picked = page.evaluate(() => new Promise<number>((resolve, reject) => {
      window.addEventListener('tutor-selected', e => resolve((e as CustomEvent).detail as number), { once: true })
      setTimeout(() => reject(new Error('no tutor-selected event within 3s')), 3000)
    }))
    await page.locator('[data-mobile-hint] [data-mobile-pill="become-tutor"]').click()
    assert.equal(await picked, BECOME_TEACHER_ID,
      'tapping the hint preselects the footer form\'s "I want to teach" pseudo-tutor')
    console.log('✓ mobile: the hint preselects the teacher branch in the footer form')
  } finally {
    await context.close()
  }
}

main().catch(err => { console.error(err.message ?? err); process.exit(1) })
