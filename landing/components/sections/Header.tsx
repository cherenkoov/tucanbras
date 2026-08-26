'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type { CSSProperties } from 'react'
import type { HeaderProps } from '@/types'
import { uiLabels, BECOME_TEACHER_ID } from '@/lib/uiLabels'
import { useActiveSection } from '@/hooks/useActiveSection'
import { SCROLL_DURATION_MS } from '@/components/ui/AnchorScrollHandler'
import LanguageSwitcher from '@/components/ui/LanguageSwitcher'
import AdaptiveText from '@/components/ui/AdaptiveText'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { DECK, ICON_PILL_HOVER, PILL_H, PITCH, TIGHT_PITCH, PRESS_MS } from '@/components/ui/deckMotion'
import { bloomOnTap, TAP_BLOOM_MS } from '@/components/ui/tapBloom'
import { DECOR_LAYER } from '@/components/ui/pillArt'
import { coverGlass, GLASS_TRANSITION } from '@/components/ui/coverGlass'
import { BLADES, bladeStyle, swayDots } from '@/components/ui/dotsSway'
import { BAR_H, COVER_DESKTOP, COVER_MOBILE, plantBox, type Plant } from '@/components/ui/coverPlants'
import { BURGER_FLOWER, BURGER_LINES, burgerFlowerBox, type BurgerLine } from '@/components/ui/burgerArt'


// Nav pill colors — index-matched to NAV_LINKS order, uses CSS tokens from globals.css.
// `art` is that pill's painted background, split out of the hand-off sheet
// `public/SVG/header/pills/Links Pills.svg`; `bg` stays as the colour underneath it.
// Label colours are the ones the sheet draws its own labels in.
const NAV_PILL_STYLES = [
  { bg: 'var(--color-green)',  text: 'var(--color-ink)',   art: '/SVG/header/pills/about.svg'  }, // О тукане
  { bg: 'var(--color-yellow)', text: 'var(--color-cream)', art: '/SVG/header/pills/tutors.svg' }, // Туторы
  { bg: 'var(--color-blue)',   text: 'var(--color-cream)', art: '/SVG/header/pills/celpe.svg'  }, // CELPE-BRAS
  { bg: 'var(--color-orange)', text: 'var(--color-cream)', art: '/SVG/header/pills/plans.svg'  }, // Тарифы
] as const

// Every Tailwind class in this file is spelled out in full, never assembled from
// a constant. Tailwind scans source text for COMPLETE class names, so
// `scale-[${PILL_SCALE}]` compiles to a class it never generates — the rule is
// simply absent and the element sits still, with nothing failing loudly.
// `npm run verify:header-hover` is the guard: it hovers each pill in a browser
// and asserts the art actually moved.
const PILL_HOVER = 'hover:scale-[1.02] active:scale-[0.98]'

// ─── Decorative art on hover ──────────────────────────────────────────────────
// Three gestures, and every group here is NAMED: an unnamed `group-hover:`
// matches ANY `.group` ancestor, so every pill in the header would bloom at once
// the moment the cursor touched the bar.
//
//   pill   → the plants painted into a pill, off that pill  (`group/pill`)
//   brand  → the tucan, off the logo link                   (`group/brand`)
//   plate  → the cover plants, off `coverHot` — a hover the bar cannot express,
//            because the drum's column is its DOM child but hangs below it

// A pill's plants start on the same gesture the press does, but outlast it: the
// button is done in 120ms, the plants keep easing for 340 (`.pill-decor`) and
// settle after it. They read as greenery drifting into place behind the button
// rather than as one rigid object being scaled.
//
// …and the outer pair also leans in, by 6% of the pill's own width, so a wide
// pill and a narrow one lean by the same proportion rather than the same pixels.
// Written as 4%, not 6%: a `translate` percentage resolves against the element's
// OWN border box, and the layer is DECOR_BLEED (1.5×) the pill — so the class has
// to carry 6 / 1.5. Spelling 6% here was worth 9% of the pill.
// `translate-x-*` writes the `translate` property and `scale-*` the `scale` one,
// which is why `.pill-decor` transitions both — and why neither disturbs the
// pill's own `transform`.

// …and each of those rules is written TWICE, once for the cursor and once for the
// finger. A phone has no hover at all, so without the second copy every decoration
// in this header is desktop-only art — the pill presses and nothing else moves.
// `[data-tapped]` is armed for TAP_BLOOM_MS by `bloomOnTap` on pointerdown
// (components/ui/tapBloom.ts); `group-active` is NOT the substitute it looks like,
// because it expires with the touch, a third of the way into a 340ms bloom.
//
// Both spellings in full, as everywhere else in this file: Tailwind reads class
// names as text, and a variant it cannot read literally compiles to no rule at all.

/** left / right converge on the centre; a middle decoration only scales. */
const PILL_DECOR = {
  left:  'pill-decor motion-safe:group-hover/pill:translate-x-[4%] motion-safe:group-hover/pill:scale-[1.15] motion-safe:group-data-tapped/pill:translate-x-[4%] motion-safe:group-data-tapped/pill:scale-[1.15]',
  right: 'pill-decor motion-safe:group-hover/pill:-translate-x-[4%] motion-safe:group-hover/pill:scale-[1.15] motion-safe:group-data-tapped/pill:-translate-x-[4%] motion-safe:group-data-tapped/pill:scale-[1.15]',
  mid:   'pill-decor motion-safe:group-hover/pill:scale-[1.15] motion-safe:group-data-tapped/pill:scale-[1.15]',
} as const

type DecorRole = keyof typeof PILL_DECOR

// Sheets split into base + decoration layers by `npm run gen:pill-art`, in the
// order they stack. A sheet missing here is drawn flat, as one <img>.
const PILL_PARTS: Record<string, readonly DecorRole[]> = {
  'connect':      ['left', 'right'],
  'about':        ['left', 'right'],
  'tutors':       ['left', 'right'],
  'celpe':        ['left', 'right'],
  'plans':        ['mid'],
  'become-tutor': ['left', 'mid', 'right'],
  // The ⋮ button is a pill like any other: its three plants grow with the bar.
  '3dots':        ['left', 'mid', 'right'],
}

// The ⋮ dots' satellites shrink by exactly what grows around them. The plants take
// 1.15 and the button 1.02, and this layer rides the button — so 1 / (1.15 × 1.02) =
// 0.853 leaves them at 1/1.15 of their resting size on screen, the mirror of the
// bloom. Written as the literal Tailwind needs; `verify:header-hover` checks it
// actually shrinks rather than merely carrying the class.
const DOT_SHRINK = 'pill-decor motion-safe:group-hover/pill:scale-[0.853] motion-safe:group-data-tapped/pill:scale-[0.853]'

/**
 * Sheets whose last-painted groups are lifted back above the decorations, and what
 * each of those layers does (GLYPH in scripts/generatePillArt.ts). Drawn in order,
 * after every decoration.
 *
 * The ⋮ is the only one, and its halves part company on hover: the marks themselves
 * are the button's label and hold still, while their satellites give way to the
 * bouquet coming up behind them.
 *
 * The label is three layers, not one, because a click sends a gust through it: each
 * mark is a leaf rooted at its own tip and leans its own way (`.dot-blade`,
 * components/ui/dotsSway.ts). As one file they could only rotate rigidly about a
 * single point. Order here is paint order, and it is the sheet's own.
 */
const PILL_GLYPH: Record<string, readonly { part: string; motion: string; style?: CSSProperties }[]> = {
  '3dots': [
    ...BLADES.map(b => ({ part: b.part, motion: 'dot-blade', style: bladeStyle(b) })),
    { part: 'dots', motion: DOT_SHRINK },
  ],
}

// The tucan keeps the bar's slower, showier timing — it is the one piece of art
// that is allowed to overflow the header, so it is not bound to a button — but
// it grows by the same 1.15 as every other decoration in here.
const HEAD_ZOOM = 'art-zoom motion-safe:group-hover/brand:scale-[1.15] motion-safe:group-data-tapped/brand:scale-[1.15]'

// The plate's cover plants do what "become a tutor" does — the outer pair
// converges on the centre, the middle one only grows — on the pills' own
// `.pill-decor` timing, so the whole header moves as one gesture.
//
// Not a `group-hover`: the drum's column hangs BELOW the bar and is still part
// of its DOM subtree, so an ancestor hover woke the plate whenever the pointer
// crossed a floating pill. These ride `coverHot` instead — the pointer actually
// being ON the plate's silhouette. Spelled out in full for Tailwind.
//
// 6% here, where a pill leans by 4%: a pill's decoration is drawn on a layer
// DECOR_BLEED× its box, and a `translate` percentage resolves against the layer's
// own border box. A cover plant IS its box, so it takes the number as written.
const COVER_DECOR = {
  left:  'motion-safe:translate-x-[6%] motion-safe:scale-[1.15]',
  right: 'motion-safe:-translate-x-[6%] motion-safe:scale-[1.15]',
  mid:   'motion-safe:scale-[1.15]',
} as const

// Where the cover plants sit in the static fill's layer stack: above the plate they are
// painted on (`data-adaptive-cover-z="200"` on both plates), below nothing else here.
const COVER_PLANT_Z = 210

/**
 * The bar's plants: one <img> per file from `public/SVG/header/decor`, sized off the
 * bar's height and pinned to an edge (see coverPlants.ts). No window, no bleed —
 * each file holds a whole plant, so growing one on hover only ever shows more of it.
 */
function CoverPlants({ plants, u, hot }: { plants: readonly Plant[]; u: number; hot: boolean }) {
  return (
    <>
      {plants.map(p => <CoverPlant key={p.file} p={p} u={u} hot={hot} />)}
    </>
  )
}

/**
 * A mirrored plant (`flipY`) shows the file turned over, and a CSS background layer —
 * which is what the static fill paints a cover with — has no way to flip an image. So the
 * fill is handed its own copy: the same file wrapped in one flipping <g>, as a blob URL.
 * FETCHED rather than re-authored, and rather than shipped as a second asset, so the copy
 * cannot drift from the art the <img> actually shows; the file is already in cache by then,
 * the <img> above fetched it.
 * Measured before this existed (390px, /en): the fill reconstructed the logotype's
 * background from the UNFLIPPED file, landed on a transparent band of it, and reported
 * plain cream plate — the logotype stayed blue over petals the live sample reads as green.
 */
const flippedPlant = new Map<string, Promise<string>>()
function flippedPlantUrl(src: string): Promise<string> {
  let made = flippedPlant.get(src)
  if (!made) {
    made = fetch(src)
      .then(r => r.text())
      .then(txt => {
        // The art's own canvas, read from the markup — a hardcoded size goes stale the
        // moment the file is re-exported, and the flip would then be off by the difference.
        const box = txt.match(/<svg[^>]*viewBox="([-\d.]+)\s+([-\d.]+)\s+([\d.]+)\s+([\d.]+)"/)
        if (!box) throw new Error(`no viewBox in ${src}`)
        const [, x, y, w, h] = box
        return URL.createObjectURL(new Blob(
          [`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${x} ${y} ${w} ${h}">` +
           `<g transform="translate(0,${Number(y) * 2 + Number(h)}) scale(1,-1)">${txt}</g></svg>`],
          { type: 'image/svg+xml' },
        ))
      })
    flippedPlant.set(src, made)
  }
  return made
}

function CoverPlant({ p, u, hot }: { p: Plant; u: number; hot: boolean }) {
  const src = `/SVG/header/decor/${encodeURIComponent(p.file)}`
  // A mirrored plant declares its cover IMPERATIVELY, once the flipped copy is built, and
  // the fill notices through its cover MutationObserver (see useAdaptiveText). Not React
  // state: measured on the built page, the effect that would have held it is torn down
  // before the fetch resolves — every mirrored plant kept `alive === false` and the
  // attribute never appeared. A module-level promise per file survives that, and the
  // blob is built once for the whole page however often the bar re-renders.
  // Until it lands the plant declares NO cover: the fill then reads the plate it hides,
  // which is the answer it had before any of this — a cover painted from the wrong side
  // of the art would be a WRONG answer instead of a missing one.
  const declareCover = useCallback((el: HTMLImageElement | null) => {
    if (!el) return
    if (!p.flipY) { el.setAttribute('data-adaptive-cover-src', src); return }
    flippedPlantUrl(src).then(u => el.setAttribute('data-adaptive-cover-src', u)).catch(() => {})
  }, [src, p.flipY])
  return (
        <img
          ref={declareCover}
          src={src}
          alt=""
          aria-hidden
          // The plants are what the LOGOTYPE is written over — the plate is cream
          // everywhere, so without them the static fill sees one flat light surface and
          // the logotype is blue at every scroll position, whatever is painted under it.
          // Desktop samples them live (backdrop) and has always adapted; this is what
          // gives the phone the same reading. As an IMAGE cover, not a rect: a flower is
          // mostly transparent inside its box, and a solid rect would claim the whole
          // corner is flower-coloured.
          // z above the plate's own 200 — these paint over it, in the same order.
          // `-clip`: the box is ~3.6 bar heights tall and the plate shows only the slice
          // inside itself. The promise that buys is narrow and exact — a text ENTIRELY
          // inside the plate (the logotype is, by construction) gets the flowers; anything
          // scrolling under the bar keeps just the flat plate cover, which is the truth
          // there because the flowers are cut at its edge.
          // Deliberately NOT `-live`: these move only during the hover/tap bloom (~340ms,
          // a few percent of scale), so a permanent 8fps tick under a header that is
          // always on screen would cost far more than the colour it could change.
          data-adaptive-cover-z={COVER_PLANT_Z}
          data-adaptive-cover-clip=""
          className={`pill-decor pointer-events-none select-none ${hot ? COVER_DECOR[p.role] : ''}`}
          style={plantBox(p, u)}
        />
  )
}

/**
 * One bar of the mobile burger: the green ground, with the "Туторы" plant painted
 * on top of it and clipped to the bar (`overflow-hidden rounded-xsm`) — the same
 * ground-plus-art-inside-the-shape every pill in this header is made of.
 *
 * The bloom is the pills' too, on the pills' own `.pill-decor` timing, and it
 * answers to `group/pill` on the button so all three bars grow together as one
 * object. Three triggers, because this control only exists on a phone, where there
 * is no hover to speak of and a tap is the whole gesture: `group-active` catches
 * the press instantly but dies with it, `group-data-tapped` holds the bloom open
 * afterwards (see PILL_DECOR), and `group-hover` is there for a touch laptop. They
 * all write the same 1.15, so overlapping costs nothing.
 * Every class name spelled out in full: Tailwind generates a rule only for names it
 * can read literally in the source, and an assembled one lands in the DOM with no
 * rule behind it and nothing failing (see the note on PILL_HOVER above).
 *
 * Geometry lives in components/ui/burgerArt.ts; `alt=""` + `aria-hidden` because the
 * button already says what it is.
 */
function BurgerFlower({ line }: { line: BurgerLine }) {
  return (
    <img
      src={BURGER_FLOWER}
      alt=""
      aria-hidden
      data-burger-decor
      className="pill-decor pointer-events-none select-none motion-safe:group-hover/pill:scale-[1.15] motion-safe:group-active/pill:scale-[1.15] motion-safe:group-data-tapped/pill:scale-[1.15]"
      style={burgerFlowerBox(line)}
    />
  )
}

const ART_LAYER = 'pointer-events-none absolute inset-0 block h-full w-full select-none'

// ─── The plate's silhouette ───────────────────────────────────────────────────
// One outline, three jobs: the painted plate, the clip that keeps the frosting
// and the plants inside it, and the hit test behind `coverHot`. Shared so the
// hover can never disagree with what the eye sees. Authored on a 1728×120 box
// and stretched with preserveAspectRatio="none", which makes page → plate a
// plain linear map.
const PLATE_PATH = 'M4 30C4 14.536 16.536 2 32 2L756.869 2.00001L804.893 2.00002L1696 2.00001C1711.46 2.00001 1724 14.536 1724 30V59.4483C1724 74.9123 1711.46 87.4483 1696 87.4483H984.43C947.439 89.1205 967.761 105.772 941.058 118.084C938.054 119.469 934.712 120 931.405 120L32 120C16.536 120 4 107.464 4 92L4 30Z'
const PLATE_W = 1728
const PLATE_H = 120

// Below this the bar wears the mobile plate — a plain rounded rect, and no
// pointer that hovers anyway.
const PLATE_SILHOUETTE_FROM = 1024

/** Lazily built once: hit-testing a path needs a 2D context, nothing more. */
let plateHit: { ctx: CanvasRenderingContext2D; path: Path2D } | null = null

function pointerOnPlate(x: number, y: number, w: number, h: number): boolean {
  if (w < PLATE_SILHOUETTE_FROM) return true          // mobile plate fills its box
  if (!plateHit) {
    const ctx = document.createElement('canvas').getContext('2d')
    if (!ctx) return true                              // no canvas → box is close enough
    plateHit = { ctx, path: new Path2D(PLATE_PATH) }
  }
  return plateHit.ctx.isPointInPath(plateHit.path, (x / w) * PLATE_W, (y / h) * PLATE_H)
}

/**
 * A pill's painted face: a ground with the decorations taken out, plus one layer
 * per decoration (`npm run gen:pill-art`). The ground sits on the pill's own
 * viewBox at `inset-0`; each decoration is a re-exported, UNCROPPED plant re-seated
 * on that same box, on a viewBox widened by DECOR_BLEED in a layer inflated to
 * match. At rest the stack reads as the hand-off (`verify:pill-art`); on hover each
 * decoration leans and grows with art still in hand on every side.
 *
 * The pill clips (`overflow-hidden rounded-btn`), which is what shapes the button —
 * see the note on DECOR_BLEED in components/ui/pillArt.ts for why that only works
 * now that the plants are no longer cropped.
 *
 * A sheet that paints something AFTER its decorations (PILL_GLYPH) gets that back on
 * top, unmoved. Splitting a sheet in two flattens its paint order to "everything,
 * then every decoration", which is right for a plant behind a label and wrong for the
 * ⋮ — its dots are drawn last in the sheet, and two layers buried them under the
 * bouquet.
 *
 * A pill with nothing to split (or one that failed to generate) falls back to the
 * flat image, which is what this always used to be.
 */
function PillArt({ art }: { art: string }) {
  const name  = art.slice(art.lastIndexOf('/') + 1, -'.svg'.length)
  const parts = PILL_PARTS[name]
  const dir   = art.slice(0, art.lastIndexOf('/'))

  if (!parts) return <img src={art} alt="" aria-hidden className={ART_LAYER} />

  return (
    <>
      <img src={`${dir}/parts/${name}-base.svg`} alt="" aria-hidden className={ART_LAYER} />
      {parts.map(role => (
        <img
          key={role}
          src={`${dir}/parts/${name}-${role}.svg`}
          alt=""
          aria-hidden
          className={`${DECOR_LAYER} ${PILL_DECOR[role]}`}
        />
      ))}
      {(PILL_GLYPH[name] ?? []).map(({ part, motion, style }) => (
        <img
          key={part}
          src={`${dir}/parts/${name}-${part}.svg`}
          alt=""
          aria-hidden
          className={`${ART_LAYER} ${motion}`}
          style={style}
        />
      ))}
    </>
  )
}

// Anchor hrefs are hardcoded — labels come from the CMS via page.tsx

// Inner shadow overlay used on nav pills (from Figma "Round Inner" effect → --shadow-round-inner)
const PILL_INNER_SHADOW = 'var(--shadow-round-inner)'

// Shared pill typography — every pill in the header uses it, so the drum's sizer
// measures the same box the pill itself renders into.
const PILL_TEXT = {
  fontSize:   'clamp(14px, 1.35vw, 26px)',
  lineHeight: '32px',
} as const

// Every pill hugs its own label, so the only thing keeping them a family is one
// shared side padding. Anything that renders a label in this header uses it.
const PILL_PAD_X = 16

// Cylinder geometry and the deal itself both come from `deckMotion` — the drum is
// the same gesture on the same edge as the flags dropdown next to it (a column
// unrolling from under the pill that stays put), so the two share one rhythm:
// PILL_H tall cells, PITCH between the bar and what hangs off it, TIGHT_PITCH
// once the column is only there because ⋮ opened it.

// Cylinder positions. The slot is 0; the column runs from ABOVE (one step over the
// header bar, in the gap page.tsx opens with its lg:pt-[60px]) down to EXTRA_POS.
// At rest ABOVE…RESTING_VISIBLE show — the previous section, the current one, and
// the next peeking under the bar. ⋮ reveals the remainder.
const ABOVE           = -1
const RESTING_VISIBLE = 1
const EXTRA_POS       = 3   // "become a tutor" — parked below the cylinder, never rotates

// …and where that same pill stands when #tutors calls it out on its own, with no
// column around it: straight under the peek, on the bar's own wide step rather
// than the dropdown's tight one. It is a fourth pill standing alone, not the last
// row of a menu, so it keeps the rhythm the three resting pills already have —
// which is why it needs an offset of its own instead of offsetOf(HINT_POS).
const HINT_POS    = RESTING_VISIBLE + 1
const HINT_OFFSET = HINT_POS * PITCH

/**
 * Where section `i` sits when `active` holds the slot. The cylinder is cyclic, so
 * the pill that would land on the last position is the one you just scrolled past —
 * it belongs ABOVE the slot, not at the bottom of the column. That single wrap is
 * the whole difference between a column and a revolver.
 */
function cylinderPos(i: number, active: number, n: number): number {
  const raw = (i - active + n) % n
  return raw === n - 1 ? ABOVE : raw
}

/**
 * Cylinder position → pixels from the slot. Not a single pitch: the three pills
 * that stand on their own (above, slot, peek) keep the bar's 16px air, while the
 * ones ⋮ unrolls close up to 8px so the open column reads as one dropdown rather
 * than four loose pills drifting down the page.
 */
function offsetOf(pos: number): number {
  return pos <= RESTING_VISIBLE
    ? pos * PITCH
    : PITCH + (pos - RESTING_VISIBLE) * TIGHT_PITCH
}

// ─── Tucan bird logo ─────────────────────────────────────────────────────────
// Two-layer approach matching the original design:
//   1. Body SVG  — clipped to header bar height via overflow-hidden
//   2. Head SVG  — overflows above the bar; head+beak all animated together
//
// Path assignments (from Tucan Container.svg):
//   BODY  → dark silhouette only  (M139 134.77…)
//   HEAD  → everything else: head feathers, face, eyes, + all 5 beak parts:
//            Main (#F79138), Left side (#D05427 masked), Right side (#F47530 masked),
//            Tip dot (opacity 0.64 #25292B), Rim (#282B2E)

function TucanLogo({ bodyW }: { bodyW: number }) {
  const scale = bodyW / 139
  const svgH  = Math.round(175 * scale)
  const top   = Math.round(-35 * scale)

  const svgProps = {
    width: bodyW,
    height: svgH,
    viewBox: '0 0 139 175',
    fill: 'none',
    xmlns: 'http://www.w3.org/2000/svg',
  } as const

  return (
    <div className="relative h-full shrink-0 overflow-visible" style={{ width: bodyW }}>

      {/* ── 1. Body — clipped to header bar height ── */}
      <div className="absolute inset-0 overflow-hidden">
        <svg aria-hidden {...svgProps} className="absolute" style={{ left: 0, top }}>
          {/* NOT zoomed with the head. The body is a solid dark silhouette that
              already fills most of its clip box, so 1.2 turns it into a black
              rectangle instead of a bigger bird — the shape reads only by its
              cut-out edges, and the zoom pushes those outside the clip. */}
          <path d="M139 134.77C139 134.77 132.54 2.17215 27.5174 43.0428C27.3052 42.7794 -8.58012 77.0481 12.3214 112.373C14.0828 115.351 16.1738 119.132 20.943 121.218L20.7488 117.739C20.7488 117.739 21.0153 119.541 22.0902 119.851C23.1651 120.16 22.7631 120.411 23.4993 120.721C24.2354 121.03 24.0367 119.044 24.9761 120.223C25.9155 121.402 45.0683 121.944 47.5207 153.221H139V134.77Z" fill="#25292B"/>
        </svg>
      </div>

      {/* ── 2. Head + all beak parts — animated, overflows above bar ── */}
      <svg aria-hidden {...svgProps} className="absolute" style={{ left: -4, top, overflow: 'visible' }}>
        <style>{`
          @keyframes tucan-bob {
            0%,100% { transform: rotate(0deg); }
            25%      { transform: rotate(-5deg); }
            75%      { transform: rotate(4deg); }
          }
        `}</style>

        {/* `scale` and `transform` are separate properties — the hover zoom rides
            on top of the bob keyframe instead of cancelling it, and both pivot on
            the same transformOrigin. */}
        <g className={HEAD_ZOOM} style={{ transformOrigin: '57px 89px', animation: 'tucan-bob 5s ease-in-out infinite' }}>

          {/* Head — top feathers (bottom layer) */}
          <path d="M22.6182 47.3015C22.6182 47.3015 41.0355 -1.82855 80.4567 0.0526785C119.878 1.93818 106.643 36.2621 106.643 36.2621L95.5653 64.9337L22.6182 47.3015Z" fill="#282B2E"/>

          {/* Head — face oval */}
          <path d="M58.4549 89.0924C82.0145 89.0924 100.615 74.0055 100 55.3948C99.3856 36.7842 79.7884 21.6973 56.2288 21.6973C32.6692 21.6973 14.0686 36.7842 14.6834 55.3948C15.2981 74.0055 34.8953 89.0924 58.4549 89.0924Z" fill="#FEF1CA"/>

          {/* Head — right eye ring */}
          <path d="M107.386 42.2907C108.569 37.215 106.539 32.4907 102.853 31.7387C99.166 30.9866 95.2183 34.4917 94.0354 39.5674C92.8525 44.6431 94.8822 49.3675 98.569 50.1195C102.256 50.8715 106.203 47.3665 107.386 42.2907Z" fill="#D55C27"/>

          {/* Head — upper beak outline on face */}
          <path d="M56.1808 31.4791C56.1808 31.4791 49.4217 24.4628 59.2519 12.0422C69.0866 -0.378453 84.6979 15.8389 84.6979 15.8389L56.1762 31.4791H56.1808Z" fill="#F79235"/>

          {/* Head — beak ridge */}
          <path d="M67.3212 18.9786C70.059 14.7988 70.4833 10.3813 68.2688 9.11172C66.0544 7.84216 62.0398 10.2013 59.302 14.3811C56.5642 18.5609 56.1399 22.9784 58.3544 24.248C60.5688 25.5175 64.5834 23.1584 67.3212 18.9786Z" fill="#D55C27"/>

          {/* Eye — iris */}
          <path d="M66.7526 19.8412C69.1686 16.1527 69.5431 12.2544 67.5891 11.1341C65.635 10.0138 62.0924 12.0958 59.6763 15.7843C57.2603 19.4728 56.8858 23.3711 58.8399 24.4913C60.794 25.6116 64.3366 23.5297 66.7526 19.8412Z" fill="#3166B1"/>

          {/* Eye — pupil */}
          <path d="M60.6045 16.2563C58.8496 18.9371 58.8725 21.8232 60.5268 22.8878C62.9581 24.4527 65.0512 22.4944 66.8061 19.8136C68.561 17.1328 69.4247 14.2596 66.8838 13.1822C65.0557 12.4083 62.3594 13.5755 60.6045 16.2563Z" fill="#1E1617"/>

          {/* Eye — highlight */}
          <path d="M62.5848 17.4321C62.8284 17.0374 62.753 16.5701 62.4163 16.3882C62.0797 16.2064 61.6094 16.379 61.3658 16.7737C61.1223 17.1683 61.1977 17.6357 61.5343 17.8175C61.8709 17.9993 62.3413 17.8268 62.5848 17.4321Z" fill="#FBFADF"/>

          {/* Eye — brow detail */}
          <path d="M63.7658 15.646C63.7658 15.646 65.2465 13.7348 66.6678 13.9443C66.6678 13.9443 66.1194 13.1276 64.6113 13.8074C63.1032 14.4873 61.9195 15.5519 62.6005 15.9795C63.2814 16.407 63.7704 15.646 63.7704 15.646H63.7658Z" fill="#FBFADF"/>

          {/* Beak — Main (above face oval) */}
          <path d="M49.4826 60.8447L51.3609 48.5227C51.3609 48.5227 52.1332 39.4714 59.4224 31.4676C66.7116 23.4638 82.8393 18.3503 82.8393 18.3503C82.8393 18.3503 93.844 16.3152 100.649 19.727C107.449 23.1389 107.307 28.7783 107.307 28.7783L106.398 33.5028C106.398 33.5028 97.9022 64.0514 78.3973 95.6603C58.8877 127.269 38.2037 154.782 18.7627 156.411C18.7627 156.411 37.3171 121.091 43.4912 92.351C49.6654 63.611 49.4826 60.8447 49.4826 60.8447Z" fill="#F79138"/>

          {/* Beak — Left side (masked) */}
          <mask id={`mask0_tucan_${bodyW}`} style={{maskType:'luminance'}} maskUnits="userSpaceOnUse" x="-7" y="6" width="71" height="166">
            <path d="M63.124 6.88281C63.124 6.88281 51.2465 146.41 8.11434 168.775C-35.0178 191.141 31.8694 50.1511 31.8694 50.1511L63.124 6.88281Z" fill="white"/>
          </mask>
          <g mask={`url(#mask0_tucan_${bodyW})`}>
            <path d="M49.5695 60.6435L51.4478 48.3215C51.4478 48.3215 52.2201 39.2702 59.5093 31.2664C66.7986 23.2627 82.9263 18.1491 82.9263 18.1491C82.9263 18.1491 93.9309 16.114 100.736 19.5259C107.536 22.9377 107.394 28.5771 107.394 28.5771L106.485 33.3016C106.485 33.3016 97.9891 63.8502 78.4842 95.4591C58.9746 127.068 38.2906 154.581 18.8496 156.21C18.8496 156.21 37.404 120.89 43.5781 92.1499C49.7523 63.4098 49.5695 60.6435 49.5695 60.6435Z" fill="#D05427"/>
          </g>

          {/* Beak — Right side (masked) */}
          <mask id={`mask1_tucan_${bodyW}`} style={{maskType:'luminance'}} maskUnits="userSpaceOnUse" x="12" y="11" width="117" height="152">
            <path d="M100.343 11.7266C100.343 11.7266 99.2187 76.8299 12.959 161.819L33.5288 162.439L125.506 103.612L128.622 23.8819L100.338 11.7266H100.343Z" fill="white"/>
          </mask>
          <g mask={`url(#mask1_tucan_${bodyW})`}>
            <path d="M49.4787 60.9209L51.3569 48.5988C51.3569 48.5988 52.1293 39.5476 59.4185 31.5438C66.7077 23.54 82.8354 18.4265 82.8354 18.4265C82.8354 18.4265 93.8401 16.3913 100.645 19.8032C107.445 23.2151 107.303 28.8545 107.303 28.8545L106.394 33.5789C106.394 33.5789 97.8983 64.1275 78.3934 95.7365C58.8838 127.345 38.1998 154.858 18.7588 156.487C18.7588 156.487 37.3132 121.167 43.4873 92.4272C49.6615 63.6872 49.4787 60.9209 49.4787 60.9209Z" fill="#F47530"/>
          </g>

          {/* Beak — Tip dot */}
          <path opacity="0.64" d="M18.7627 156.415C18.7627 156.415 20.7461 155.846 42.3716 108.14C58.2799 73.0461 59.5275 104.741 55.7481 114.262C51.9687 123.784 39.8443 148.526 18.7627 156.415Z" fill="#25292B"/>

          {/* Beak — Rim (top layer) */}
          <path d="M49.3004 62.6278C49.3004 62.6278 52.1841 37.9276 67.6126 25.9773C83.2787 13.8388 107.276 15.7586 106.399 33.5023L106.54 32.6686C106.54 32.6686 112.427 21.0689 100.197 16.3614C87.963 11.6583 80.395 15.9381 74.943 17.751C69.4863 19.5596 53.9984 31.1679 51.5352 39.6507C49.0719 48.1292 48.1488 51.353 49.305 62.6278H49.3004Z" fill="#282B2E"/>

        </g>
      </svg>
    </div>
  )
}

// ─── Desktop nav pills ────────────────────────────────────────────────────────

interface Pill {
  id:    string   // stable handle: React key, [data-drum-pill], and what the guard asserts on
  label: string
  href:  string
  bg:    string
  text:  string
  art:   string   // painted background for this pill, split from the Figma sheet
  onClick?: () => void
}

function NavPill({ id, label, href, bg, text, art, onClick }: Pill) {
  return (
    <a
      href={href}
      data-nav-pill={id}
      onClick={onClick}
      onPointerDown={bloomOnTap}
      className={`group/pill relative flex items-center justify-center overflow-hidden rounded-btn font-semibold whitespace-nowrap select-none cursor-pointer transition-all duration-[240ms] ease-out ${PILL_HOVER}`}
      style={{
        backgroundColor: bg,
        color: text,
        boxShadow: PILL_INNER_SHADOW,
        ...PILL_TEXT,
        paddingTop: '8px',
        paddingBottom: '8px',
        paddingLeft: PILL_PAD_X,
        paddingRight: PILL_PAD_X,
      }}
    >
      {/* The sheet's art for this pill, with its baked label stripped — the label
          below is the live one, so it stays translated. The asset carries
          `preserveAspectRatio="slice"`, so it covers whatever width the label
          gives the pill; `bg` shows through only if it fails to load. */}
      <PillArt art={art} />
      <span className="relative">{label}</span>
    </a>
  )
}

// ─── Mobile floating pill ─────────────────────────────────────────────────────
// The phone has no drum, so it shows the same pills two ways: the burger column,
// and the lone "become a tutor" the Tutors section calls out from under the plate.
// One component for both — the hint is not a lookalike, it is the same pill with
// the same art, press, float shadow and typography.
//
// A hidden pill keeps its box. The column is a flex stack that must not reflow as
// it reveals, so hiding is opacity + a 12px lift, never an unmount — which is why
// an invisible pill has to be switched OFF twice over: it drops pointer-events
// here, and its container carries `inert` (see the note at the render site). The
// two do different jobs — pointer-events is what stops a tap landing on it,
// `inert` is what keeps it out of the tab order and the a11y tree — and neither
// implies the other.
function FloatingPill({ pill, visible, delayMs, onClick }: {
  pill:    Pill
  visible: boolean
  /** Stagger for the burger column's deal; the hint stands alone and passes 0. */
  delayMs: number
  onClick: () => void
}) {
  const reduceMotion = useReducedMotion()

  return (
    <a
      href={pill.href}
      // id, not href: Connect and "become a tutor" both point at #footer.
      data-mobile-pill={pill.id}
      onClick={onClick}
      // The phone's whole answer to hover: the pill's plants have no other way to
      // bloom here. See PILL_DECOR / components/ui/tapBloom.ts.
      onPointerDown={bloomOnTap}
      // `transition-all` is kept (not narrowed to opacity+transform) because the
      // press writes the separate `scale` property in Tailwind v4 — listing
      // properties by hand is how that hover silently stops animating.
      // `motion-reduce:transition-none` is the guarantee; the hook below only
      // decides whether the pill travels at all.
      //
      // pointer-events is the pill's OWN business, not the container's: the wrapper
      // is `pointer-events-none`, and a child that claims `auto` unconditionally
      // takes hit-testing back — which is exactly how a transparent pill stayed
      // tappable. Both class names spelled in full for Tailwind.
      className={`group/pill relative flex items-center justify-center overflow-hidden rounded-btn py-[18px] px-s400 font-semibold text-[22px] leading-[28px] transition-all duration-300 motion-reduce:transition-none cursor-pointer ${visible ? 'pointer-events-auto' : 'pointer-events-none'} ${PILL_HOVER}`}
      style={{
        backgroundColor: pill.bg,
        color:           pill.text,
        boxShadow:       'var(--shadow-pill-float)',
        transitionDelay: visible && !reduceMotion ? `${delayMs}ms` : '0ms',
        opacity:         visible ? 1 : 0,
        transform:       visible || reduceMotion ? 'translateY(0)' : 'translateY(-12px)',
      }}
    >
      <PillArt art={pill.art} />
      <span className="relative">{pill.label}</span>
    </a>
  )
}

// ─── Displayed drum ───────────────────────────────────────────────────────────
// The section pills as a revolver cylinder. One position — the slot — sits in the
// header bar. The section you just left rides one step ABOVE it, the rest hang
// below, so the reader can always see where they came from and where they are
// going without opening anything:
//
//   active = Tutors  →  above About,      slot Tutors, peek CELPE-BRAS, then Plans
//   active = Plans   →  above CELPE-BRAS, slot Plans,  peek About,      then Tutors
//
// Stepping down the page drops every position by one: the peek rises into the
// slot, the slot pill climbs over the bar, and the one that was above wraps around
// to the bottom of the column. They are the same elements throughout — the slot is
// a position the pills move through, not a separate widget with its own animation.
//
// `extra` ("become a tutor") is not a section and never rotates. It is parked at
// the foot of the column, and it comes out two ways: as the last card ⋮ deals,
// and — on #tutors alone (`hinted`) — on its own under the peek, because that is
// the one section where the reader is already looking at the people doing the job.
// Same pill either way, so opening ⋮ on #tutors doesn't add it, it only pushes it
// down a step to make room for the card that lands above it.
//
// Widths hug: every pill is exactly as wide as its own label and centred on the
// column's axis, so the stack reads as one object however ragged the labels are.
// The box takes the width of the pill in the SLOT, which is what walks "Connect"
// left and right as the drum turns — the nav is right-anchored, so a narrower slot
// pill pulls everything before it towards the ⋮ button.
//
// That width is animated, not snapped: intrinsic width is not transitionable, so
// it is measured off the invisible sizer and written back as an explicit px value.
// The glide is deliberately longer than the pills' own travel — a nav item sliding
// sideways is peripheral movement, and at 320ms it reads as a twitch.

const DRUM_TRAVEL_MS = 320   // a pill moving one position
const DRUM_WIDTH_MS  = 620   // the box (and with it Connect) settling on a new width
const DRUM_FADE_MS   = 200   // a card crossing the edge of the pill it hides behind

/** How deep in the tucked stack position `pos` lies: 0 is the first card ⋮ deals. */
const deckDepth = (pos: number) => Math.max(0, pos - RESTING_VISIBLE - 1)
const DEEPEST   = deckDepth(EXTRA_POS)

function DisplayedDrum({ sections, extra, active, open, hinted, onPick }: {
  sections: Pill[]
  extra:    Pill
  active:   number
  open:     boolean
  /** #tutors owns the viewport → `extra` comes out without ⋮ being touched. */
  hinted:   boolean
  onPick:   (index: number) => void
}) {
  const n = sections.length
  const reduceMotion = useReducedMotion()

  // The sizer holds the active label at its natural width (inline-block hugs its
  // text even once the box around it is given an explicit width). Measuring it
  // after paint turns the intrinsic width into an animatable number.
  const sizerRef = useRef<HTMLSpanElement>(null)
  const [boxWidth, setBoxWidth] = useState<number>()
  const activeLabel = sections[active]?.label

  useEffect(() => {
    const measure = () => {
      const w = sizerRef.current?.getBoundingClientRect().width
      if (w) setBoxWidth(w)
    }
    measure()
    // Involve loads late, and the fallback font measures differently — a width
    // pinned before the swap would leave the box the wrong size until the next
    // scroll. The label's font-size is a vw clamp, so resizes matter too.
    document.fonts?.ready.then(measure).catch(() => {})
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [activeLabel])

  const cell = (
    pill: Pill,
    pos: number,
    visible: boolean,
    // Which way this card is travelling. For every section that is simply `open`:
    // they are below the peek only while ⋮ holds them there. `extra` also comes
    // out on the hint, with the menu shut, so its timing has to follow its own
    // visibility rather than a menu that was never opened.
    dealt = open,
    // Where it rests, in px from the slot. Only the hint overrides it — see
    // HINT_OFFSET; everything else steps on the column's own pitch.
    offset = offsetOf(pos),
  ) => {
    // Below the peek and not dealt yet: the card lies in the peek pill's own box,
    // slightly small so that pill overhangs it, and is dealt down from under it.
    // Unlike the flags these pills hug their own labels, so a wide one tucked
    // under a narrow one would poke out either side — opacity covers that,
    // crossfading over the first part of the deal while it is still mostly hidden.
    const tucked = !visible
    const deal   = pos > RESTING_VISIBLE
    const delay  = reduceMotion
      ? 0
      : (dealt ? deckDepth(pos) : DEEPEST - deckDepth(pos)) * DECK.STAGGER_MS

    const travel = deal ? (dealt ? DECK.OUT_MS : DECK.IN_MS) : DRUM_TRAVEL_MS
    const ease   = dealt || !deal ? DECK.OUT_EASE : DECK.IN_EASE
    // The crossfade rides the SAME curve as the travel, or it runs off ahead of
    // it: tucking back is an ease-IN, so a plain fade emptied the card a third of
    // the way home and it evaporated in mid-air instead of sliding under the peek.
    const fade   = dealt ? DRUM_FADE_MS : DECK.IN_MS

    return (
    <a
      key={pill.id}
      href={pill.href}
      data-drum-pill={pill.id}
      data-drum-pos={pos}
      aria-current={pos === 0 ? 'true' : undefined}
      inert={!visible}
      onClick={pill.onClick}
      onPointerDown={bloomOnTap}
      className={`group/pill absolute top-0 left-1/2 w-max flex items-center justify-center overflow-hidden rounded-btn font-semibold whitespace-nowrap select-none cursor-pointer ${PILL_HOVER}`}
      style={{
        backgroundColor: pill.bg,
        color:           pill.text,
        // Seated in the barrel vs. hanging off it.
        boxShadow:       pos === 0 ? PILL_INNER_SHADOW : 'var(--shadow-pill-float)',
        ...PILL_TEXT,
        height:          PILL_H,
        paddingLeft:     PILL_PAD_X,
        paddingRight:    PILL_PAD_X,
        // -50% centres each pill on the column axis whatever its own width is.
        transform: tucked
          ? `translate(-50%, ${offsetOf(RESTING_VISIBLE)}px) scale(${DECK.TUCK_SCALE})`
          : `translate(-50%, ${offset}px) scale(1)`,
        opacity:         visible ? 1 : 0,
        // Whatever MOVES passes behind whatever sits still: travellers under the
        // slot pill, dealt cards under the peek they came from.
        zIndex:          n - Math.abs(pos),
        // `transform` carries the deal; the press writes the separate `scale`
        // property, which needs its own entry — sharing the deal's timing would
        // drag the press out to a third of a second, and leaving it off the list
        // (which is not the same as leaving it at its default) snaps it.
        transition: reduceMotion
          ? 'none'
          : `transform ${travel}ms ${ease}, scale ${PRESS_MS}ms ease-out, opacity ${fade}ms ${ease}, box-shadow 200ms ease`,
        transitionDelay: `${delay}ms`,
      }}
    >
      {/* Same painted background as NavPill — the drum draws its own cells, so it
          has to carry the art itself. Label stays live text above it. */}
      <PillArt art={pill.art} />
      <span className="relative">{pill.label}</span>
    </a>
    )
  }

  return (
    <div
      className="relative shrink-0"
      style={{
        width:      boxWidth,
        transition: `width ${DRUM_WIDTH_MS}ms cubic-bezier(.4,0,.2,1)`,
      }}
    >
      {/* Invisible sizer — one copy of the ACTIVE label. It sets the box width on
          the first paint (before JS measures) and stays the measuring stick after. */}
      <span
        ref={sizerRef}
        aria-hidden
        className="invisible inline-block align-top font-semibold whitespace-nowrap"
        style={{ ...PILL_TEXT, padding: `8px ${PILL_PAD_X}px` }}
      >
        {sections[active]?.label}
      </span>

      {sections.map((pill, i) => {
        const pos = cylinderPos(i, active, n)
        return cell(
          { ...pill, onClick: () => onPick(i) },
          pos,
          pos <= RESTING_VISIBLE || open,
        )
      })}

      {/* The hint only holds its own position while the menu is shut: once ⋮ deals
          a section card into the row under the peek, the extra pill steps down to
          the foot of the column where it always lives. */}
      {cell(
        extra,
        hinted && !open ? HINT_POS    : EXTRA_POS,
        hinted || open,
        hinted || open,
        hinted && !open ? HINT_OFFSET : offsetOf(EXTRA_POS),
      )}
    </div>
  )
}

// ─── Header component ─────────────────────────────────────────────────────────

export default function Header({ navLinks, locale }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [dotsOpen, setDotsOpen] = useState(false)

  const L = uiLabels(locale)

  // The 4 section pills — the drum's cylinder, colours index-matched to navLinks.
  const SECTIONS: Pill[] = navLinks.map((link, i) => ({
    id:    link.href.slice(1),
    label: link.label,
    href:  link.href,
    bg:    NAV_PILL_STYLES[i]?.bg   ?? 'var(--color-green)',
    text:  NAV_PILL_STYLES[i]?.text ?? 'var(--color-ink)',
    art:   NAV_PILL_STYLES[i]?.art  ?? '/SVG/header/pills/about.svg',
  }))

  // Scrolls to the footer form AND preselects its "I want to teach" pseudo-tutor,
  // which is the form's own signal to drop the plan field — the teacher branch of
  // onboarding has no tariff. The event is the one the Tutors carousel already
  // speaks; the sentinel id matches no real tutor, so no card lights up.
  const pickBecomeTutor = () => {
    window.dispatchEvent(new CustomEvent('tutor-selected', { detail: BECOME_TEACHER_ID }))
  }

  // "Connect" — anchor pill linking to the footer sign-up form (#footer). First
  // on the desktop X axis and first in the mobile burger column.
  const CONNECT: Pill = {
    id:    'connect',
    label: L.join,
    href:  '#footer',
    bg:    'var(--color-ink)',
    text:  'var(--color-cream)',
    art:   '/SVG/header/pills/connect.svg',
  }

  // "Become a tutor" — the only pill that is neither a section nor always present.
  const BECOME_TUTOR: Pill = {
    id:    'become-tutor',
    label: L.becomeTutor,
    href:  '#footer',
    bg:    'var(--color-ink)',
    text:  'var(--color-cream)',
    art:   '/SVG/header/pills/become-tutor.svg',
  }

  // Mobile burger column: Connect, the four sections, then the teacher route last.
  // It is only ever on screen while the burger is open, which is the rule the ⋮
  // enforces for the same pill on desktop.
  const PILLS = [CONNECT, ...SECTIONS, { ...BECOME_TUTOR, onClick: pickBecomeTutor }]

  const dotsRef    = useRef<HTMLButtonElement>(null)
  const drumBoxRef = useRef<HTMLDivElement>(null)
  const barRef     = useRef<HTMLDivElement>(null)

  // Whether the pointer is on the plate itself — what the cover plants answer to.
  const [coverHot, setCoverHot] = useState(false)

  // Which section owns the viewport → which pill sits in the slot.
  const { active, pin } = useActiveSection(navLinks.map(l => l.href))

  // …and the one section that also calls "become a tutor" out on its own — from
  // under the drum on desktop, from under the plate on a phone. One flag for both,
  // so the two layouts can never disagree about when the offer is on the table.
  //
  // Matched on the href rather than the index: the nav order is structural, but it
  // is data, and a reorder must move the hint with it. -1 (no such section) simply
  // never matches, so the pill stays a ⋮-only item.
  const tutorsIndex = SECTIONS.findIndex(s => s.href === '#tutors')
  const onTutors    = active === tutorsIndex

  // Clicking a pill must swap it into the slot straight away. The scroll itself is
  // a 2.8s tween (scrollToElement), and the probe sweeps through every section on
  // the way — so pin the target for the length of the tween, or the cylinder would
  // spin through the whole list before settling.
  const onPick = (index: number) => {
    setDotsOpen(false)
    pin(index, SCROLL_DURATION_MS)
  }

  useEffect(() => {
    document.body.classList.toggle('menu-open', menuOpen)
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => {
      document.body.classList.remove('menu-open')
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  // The plate's own hover, decided by where the pointer is rather than by what
  // it happens to be over — see the bar's comment below.
  const onBarPointer = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse') return
    const r = barRef.current?.getBoundingClientRect()
    if (!r) return
    const x = e.clientX - r.left
    const y = e.clientY - r.top
    const inside = x >= 0 && y >= 0 && x <= r.width && y <= r.height
    setCoverHot(inside && pointerOnPlate(x, y, r.width, r.height))
  }

  // …and the finger's version of it. The guard above drops every non-mouse pointer,
  // so on a phone the plate never woke at all: it stayed translucent and its cover
  // plants never grew, however the reader touched it. A tap arms it for
  // TAP_BLOOM_MS and a timer lets it go — the same deal `bloomOnTap` makes for the
  // pills, in React state rather than an attribute because the plate and its plants
  // are driven by props here, not by a CSS group.
  //
  // Note this is the MOBILE plate's hover, which is a colour transition; the desktop
  // plate's is a `backdrop-blur` toggle, and that one deliberately does not exist on
  // a phone (the blur buffers dropped the tab — see the plate below).
  const coverTimer = useRef<number>(undefined)
  const onBarTap = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse') return
    window.clearTimeout(coverTimer.current)
    setCoverHot(true)
    coverTimer.current = window.setTimeout(() => setCoverHot(false), TAP_BLOOM_MS)
  }
  useEffect(() => () => window.clearTimeout(coverTimer.current), [])

  // Close the ⋮ menu on outside click or Escape
  useEffect(() => {
    if (!dotsOpen) return
    const onPointer = (e: PointerEvent) => {
      if (dotsRef.current?.contains(e.target as Node)) return
      if (drumBoxRef.current?.contains(e.target as Node)) return
      setDotsOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setDotsOpen(false) }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [dotsOpen])

  return (
    // overflow-visible lets the tucan head peek above the bar
    <header id="header" className="relative z-50 w-full overflow-visible">

      {/* ── Main bar ──
          The cover wakes on POSITION, not on descendant hover: the drum's column
          is a DOM child of this bar but hangs below it, and a `group-hover` let a
          floating pill light the whole plate up. `pointerOnPlate` also honours
          the notch, so the corner the plate does not cover stays cold. */}
      <div
        ref={barRef}
        onPointerMove={onBarPointer}
        onPointerDown={onBarTap}
        // Mouse only, and that is the whole point: a touch pointer fires
        // `pointerleave` the instant the finger lifts (the implicit capture is
        // released there), so an unguarded handler cancelled every tap's bloom
        // ~100ms in — exactly the failure `:active` has, rebuilt in JS.
        onPointerLeave={e => { if (e.pointerType === 'mouse') setCoverHot(false) }}
        className={`relative h-[85px] lg:h-[96px] max-w-[1720px] mx-auto overflow-visible ${coverHot ? 'cover-hot' : ''}`}
      >

        {/* Background plate — mobile: простой прямоугольник с radius-card (glass → solid по ховеру бара).
            Без backdrop-blur: на телефонах блюр-буферы (размер элемента × DPR) роняли вкладку.

            data-adaptive-cover: this plate is what the LOGOTYPE actually sits on, so the
            adaptive static fill has to know about it. Without the hint that path
            reconstructs the background BEHIND the header — the collage art the plate
            hides, plus whatever content card happens to be sliding under the fixed bar —
            and picks the duotone side from it: over dark jungle the logotype went cream
            ON the cream plate, i.e. invisible (measured at scrollY≈1800, iPhone 12).
            The colour carries its real alpha; as a `linear-gradient` layer it composites
            over the layers below exactly as the live plate does.
            z 200, not the default 100: equal z ties break on document order and the
            header is early in the DOM, so content cards would otherwise paint over it —
            but this bar is `fixed` and covers them. Applies to every adaptive text that
            scrolls under the header, not just the logotype. */}
        <div
          aria-hidden
          data-adaptive-cover={coverHot ? '#fffce5' : 'rgba(255,252,229,0.72)'}
          data-adaptive-cover-z="200"
          className={`lg:hidden absolute inset-0 pointer-events-none rounded-card transition-colors duration-[600ms] ${
            coverHot ? 'bg-cream' : 'bg-[rgba(255,252,229,0.72)]'
          }`}
          style={{ boxShadow: 'var(--shadow-card)' }}
        />

        {/* Frosted backdrop — desktop: matte blur clipped to the plate silhouette, clears on hover.
            Blur не транзишенится (снимается мгновенно): анимация радиуса перефильтровывает
            весь backdrop-буфер каждый кадр. */}
        <div
          aria-hidden
          className={`hidden lg:block absolute inset-0 pointer-events-none ${
            coverHot ? 'backdrop-blur-none' : 'backdrop-blur-[4px]'
          }`}
          style={{ clipPath: 'url(#header-plate-clip)', WebkitClipPath: 'url(#header-plate-clip)' }}
        />

        {/* Background plate — desktop: inline SVG с кастомной формой.
            Same adaptive-cover hint as the mobile plate above; desktop normally runs the
            live backdrop path (which ignores covers and samples this plate for real), so
            this only carries reduced-motion, ?staticfill and engines that reject url(#)
            inside backdrop-filter. A cover is one solid colour over its bounding RECT, so
            the notch in PLATE_PATH is not modelled — good enough to pick a side of the
            0.70 threshold, not pixel-exact like the backdrop path. */}
        <svg
          aria-hidden
          data-adaptive-cover="#fffce5"
          data-adaptive-cover-z="200"
          className="hidden lg:block absolute pointer-events-none select-none w-full"
          style={{ top: 0, left: 0, height: '100%', overflow: 'visible' }}
          viewBox="0 0 1728 120"
          preserveAspectRatio="none"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <filter id="header-bg-filter" x="0" y="0" width="1728" height="130" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
              <feFlood floodOpacity="0" result="BackgroundImageFix"/>
              <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
              <feOffset dy="2"/>
              <feGaussianBlur stdDeviation="2"/>
              <feComposite in2="hardAlpha" operator="out"/>
              <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.18 0"/>
              <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow"/>
              <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow" result="shape"/>
              <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
              <feOffset dy="4"/>
              <feGaussianBlur stdDeviation="2"/>
              <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1"/>
              <feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.25 0"/>
              <feBlend mode="normal" in2="shape" result="effect2_innerShadow"/>
            </filter>

            {/* Same silhouette as the plate, normalised to 0..1 so it scales with
                the box (matches preserveAspectRatio="none"). Used to clip the
                frosted backdrop below to the custom shape. */}
            <clipPath id="header-plate-clip" clipPathUnits="objectBoundingBox">
              <path transform="scale(0.000578703704, 0.008333333333)" d={PLATE_PATH}/>
            </clipPath>
          </defs>
          <g opacity="0.99" filter="url(#header-bg-filter)">
            <path className="header-plate" d={PLATE_PATH} fill="#FFFCE5"/>
          </g>
        </svg>

        {/* Cover plants — mobile. Clipped by the plate's own rounded-card box.
            One plant per bottom corner, from the same `decor/` exports the desktop
            bar uses. This drew a single `flowers-mobile.svg` before, and that file
            does not exist — the phone had been showing a bare plate, silently, for
            as long as an <img> 404 is silent. */}
        <div
          aria-hidden
          // Both cover containers stay in the DOM at every width (one is merely
          // display:none), and a hidden element still reports the computed `scale`
          // its rules give it — so the tap guard has no way to tell which set of
          // plants it is measuring without being told.
          data-cover-plants="mobile"
          className="lg:hidden absolute inset-0 pointer-events-none rounded-card overflow-hidden"
        >
          <CoverPlants plants={COVER_MOBILE} u={BAR_H.mobile} hot={coverHot} />
        </div>

        {/* Cover plants — desktop. Clipped to the plate's SILHOUETTE, notch and all:
            a plain rounded rect would let the art hang past the notch on the bottom
            right, and `header-plate-clip` is the real outline.

            Each plant is drawn at its own aspect, sized off the bar's HEIGHT and
            pinned to an edge — the plate is the frame, not the coordinate system.
            Mapping them onto the plate instead (one window, preserveAspectRatio
            "none") welds them to the outline but stretches every leaf by whatever
            the window happens to be wide, and it has to be fitted: it was 1.35× too
            tall once and 1.8% too wide later. There is nothing left to fit — see
            COVER_DESKTOP in components/ui/coverPlants.ts. */}
        <div
          aria-hidden
          data-cover-plants="desktop"
          className="hidden lg:block absolute inset-0 pointer-events-none"
          style={{ clipPath: 'url(#header-plate-clip)', WebkitClipPath: 'url(#header-plate-clip)' }}
        >
          <CoverPlants plants={COVER_DESKTOP} u={BAR_H.desktop} hot={coverHot} />
        </div>

        {/* Content — padded so nothing touches the background edges */}
        <div className="relative flex items-center justify-between h-full px-0">

          {/* Brand — tucan bird + logotype, grouped left */}
          <a
            href="#hero"
            onPointerDown={bloomOnTap}
            className="group/brand relative z-10 flex items-center gap-0 shrink-0 overflow-visible h-full outline-none"
          >
            <div className="block lg:hidden h-full"><TucanLogo bodyW={100} /></div>
            <div className="hidden lg:block h-full"><TucanLogo bodyW={135} /></div>
            {/* `logo-lift` carries the -0.1em optical nudge (globals.css, next to the
                breakpoint spellings): it has to drop to zero below 460px, where
                .logo-xs shrinks the glyphs but the em the nudge is measured in stays
                pinned at the clamp's 28px floor — and an inline transform is not
                something a media query can override. */}
            <span
              className="flex items-center justify-center font-bold tracking-normal select-none font-accent h-full w-full ml-3 logo-lift"
              style={{ fontSize: 'clamp(28px, 4.69vw, 90px)', lineHeight: '1' }}
            >
              {/* One AdaptiveText per breakpoint spelling, not one around all four.
                  The hook masks to the element's own text, and this span carries
                  every spelling at once (CSS picks the one to show) — a single
                  wrapper would mask to their concatenation. Each variant is a flex
                  item, so its `display:inline` blockifies and the hook can measure
                  it; the hidden ones report 0×0 and simply no-op until a media
                  query reveals them, which the hook's ResizeObserver picks up. */}
              <AdaptiveText as="span" className="logo-xs">TUCAN</AdaptiveText>
              <AdaptiveText as="span" className="logo-mob">TucanBRAS</AdaptiveText>
              <AdaptiveText as="span" className="logo-sm">Tucan</AdaptiveText>
              <AdaptiveText as="span" className="logo-full">TucanBRAS</AdaptiveText>
            </span>
          </a>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Desktop nav + language switcher */}
          <nav
            className="relative z-10 hidden lg:flex w-fit items-start justify-start gap-3 pt-3 pb-4 px-3 shrink-0 h-full"
            aria-label="Основная навигация"
          >
            {/* Anchor pill */}
            <NavPill {...CONNECT} />

            {/* Displayed drum — the section in view, the one before it overhead,
                the rest of the cylinder below */}
            <div ref={drumBoxRef} className="shrink-0">
              <DisplayedDrum
                sections={SECTIONS}
                extra={{ ...BECOME_TUTOR, onClick: () => { setDotsOpen(false); pickBecomeTutor() } }}
                active={active}
                open={dotsOpen}
                hinted={onTutors}
                onPick={onPick}
              />
            </div>

            {/* ⋮ — trigger only; the menu itself unrolls from the drum */}
            <button
              ref={dotsRef}
              type="button"
              // The gust and the toggle, in that order and both synchronous: four
              // call sites in verify:header-drum click this button and expect the
              // column to answer on the same tick.
              onClick={e => { swayDots(e.currentTarget); setDotsOpen(v => !v) }}
              onPointerDown={bloomOnTap}
              // Ground comes from `coverGlass`, not from a flat --color-cream: the
              // button stands ON the plate and is made of the same glass, so it
              // frosts and fills in with it. The transition is hand-written because
              // the class it would otherwise need (`transition-colors`) sets the
              // same property as `transition-transform` and one of the two would win
              // outright — see GLASS_TRANSITION. `scale`, not `transform`: that is
              // the property Tailwind v4's `scale-*` writes.
              className={`group/pill relative flex items-center justify-center overflow-hidden rounded-btn font-semibold whitespace-nowrap select-none cursor-pointer shrink-0 ${coverGlass(coverHot)} ${ICON_PILL_HOVER}`}
              style={{
                color:  'var(--color-ink)',
                width:  `${PILL_H}px`,
                height: `${PILL_H}px`,
                transition: `scale ${PRESS_MS}ms ease-out, ${GLASS_TRANSITION}`,
              }}
              aria-haspopup="true"
              aria-expanded={dotsOpen}
              aria-label="Ещё пункты меню"
            >
              {/* Hand-off asset, authored 48×48 for exactly this button, split like
                  every other pill: the ground is the base, the three plants are
                  decorations and grow on hover with the rest of the bar.

                  The label is three layers of its own, one per mark, and it holds
                  still under a cursor — a glyph that drifts on hover stops being a
                  label. A CLICK is the exception: the marks are leaves, and the click
                  puts a gust through them (PILL_GLYPH above, `.dot-blade`). */}
              <PillArt art="/SVG/header/pills/3dots.svg" />
            </button>

            {/* `hot` is the plate's state, not the switcher's: the closed pill
                stands on the plate and firms up with it. Its dealt cards hang below
                the bar and answer for themselves — see coverGlass. */}
            <LanguageSwitcher variant="pill" dropDirection="down" hot={coverHot} />
          </nav>

          {/* Mobile burger — collapse animation.
              `data-burger` because its aria-label FLIPS with the state, so a guard
              that reaches for it by label can only ever address one half of it.

              Each bar is a pill in miniature: `bg-green` is the ground, the plant is
              drawn over it, and `overflow-hidden rounded-xsm` is the clip that shapes
              both — the same three ingredients as every other pill in this bar, only
              three grounds instead of one. The sizes stay literal Tailwind (Tailwind
              reads class names, it cannot be handed a constant); burgerArt.ts holds
              the matching numbers for the art alone. `group/pill` is NAMED — an
              unnamed one matches any `.group` ancestor and the whole header would
              bloom at once. */}
          <button
            data-burger
            className="group/pill relative z-[51] lg:hidden flex flex-col gap-[6px] items-end shrink-0 mr-[12px]"
            onClick={() => setMenuOpen((v) => !v)}
            onPointerDown={bloomOnTap}
            aria-label={menuOpen ? 'Закрыть меню' : 'Открыть меню'}
            aria-expanded={menuOpen}
          >
            <span className={`relative block overflow-hidden h-[12px] w-[40px] rounded-xsm bg-green transition-all duration-300 ease-in-out origin-center ${menuOpen ? 'translate-y-[21px] rotate-45' : ''}`}>
              <BurgerFlower line={BURGER_LINES[0]} />
            </span>
            <span className={`relative block overflow-hidden h-[18px] w-[48px] rounded-xsm bg-green transition-all duration-300 ease-in-out ${menuOpen ? 'opacity-0 scale-x-0' : ''}`}>
              <BurgerFlower line={BURGER_LINES[1]} />
            </span>
            <span className={`relative block overflow-hidden h-[12px] w-[40px] rounded-xsm bg-green transition-all duration-300 ease-in-out origin-center ${menuOpen ? '-translate-y-[21px] -rotate-45' : ''}`}>
              <BurgerFlower line={BURGER_LINES[2]} />
            </span>
          </button>

        </div>
      </div>

      {/* ── Click-catcher — закрывает меню при клике на контент ── */}
      {menuOpen && (
        <div className="lg:hidden fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
      )}

      {/* ── Floating pills — под хедером, без фона, 70% справа ──
          The column is `pointer-events-none`, but that wasn't reaching the pills:
          each one claimed `pointer-events-auto` back, and a child's own rule beats
          its parent's. So six fully transparent links — ≈450px of column, inside
          the FIXED header at z-50, hence over whatever the reader is looking at —
          stayed tappable, and a tap in the empty top-right corner navigated to
          #footer or a random section. Prime suspect for the phantom anchor jumps in
          landing/CLAUDE.md. The pills now gate their own pointer-events.

          `inert` here is the other half, and it is not redundant: it keeps a hidden
          pill out of the tab order and the a11y tree, which pointer-events does
          nothing about — a transparent link is still focusable and still announced.
          It is inherited, so it covers the language switcher too. Guard:
          `npm run verify:header-drum` (Part 3). */}
      <div
        data-mobile-column
        inert={!menuOpen}
        className="lg:hidden absolute top-full right-0 z-50 flex flex-col items-end gap-3 p-4 pointer-events-none"
      >
        {PILLS.map((pill, i) => (
          <FloatingPill
            // id, not href: Connect and "become a tutor" both point at #footer.
            key={pill.id}
            pill={pill}
            visible={menuOpen}
            delayMs={i * 60}
            onClick={() => { setMenuOpen(false); pill.onClick?.() }}
          />
        ))}
        {/* Mobile language switcher — same two-layer switch-off as the pills above:
            its wrapper drops pointer-events (its own buttons never claim any, so
            the wrapper's rule reaches them), and the column's `inert` handles the
            tab order. */}
        <LanguageSwitcher
          variant="pill"
          dropDirection="row"
          // Same plate state as the desktop switcher: on a phone `coverHot` is armed
          // by a tap on the bar — and the burger IS on the bar, so the column's flags
          // come out solid with the plate and settle back to glass with it.
          hot={coverHot}
          className={`transition-all duration-300 ${menuOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}
          style={{
            transitionDelay: menuOpen ? `${PILLS.length * 60}ms` : '0ms',
            opacity: menuOpen ? 1 : 0,
            transform: menuOpen ? 'translateY(0)' : 'translateY(-12px)',
          }}
        />
      </div>

      {/* ── "Стать тутором" on #tutors — the phone's answer to the drum's hint ──
          Same pill the desktop drum deals out under its column, on the same rule:
          the section is about the people doing the job, so the offer stands on the
          table while the reader is there.

          Its own container, deliberately: as a sixth row of the flex column above
          it would hang ~450px below the plate, over the cards. The classes are the
          column's, character for character, so the pill lands exactly in the slot
          "Конект" occupies when the burger opens — which is also why it has to
          yield to an open burger, whose own copy sits at the foot of that column.
          Two nodes, never two visible. */}
      <div
        data-mobile-hint
        inert={!(onTutors && !menuOpen)}
        className="lg:hidden absolute top-full right-0 z-50 flex flex-col items-end gap-3 p-4 pointer-events-none"
      >
        <FloatingPill
          pill={BECOME_TUTOR}
          visible={onTutors && !menuOpen}
          delayMs={0}
          onClick={() => { setMenuOpen(false); pickBecomeTutor() }}
        />
      </div>
    </header>
  )
}
