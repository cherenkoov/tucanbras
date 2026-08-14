'use client'

import { useEffect, type RefObject } from 'react'

// Adaptive duotone text over the moving background. Two proven techniques, chosen by
// engine capability:
//  • backdrop-filter (engines that parse url(#) reference filters in it): the
//    compositor samples the LIVE backdrop each frame → reflects the moving sprites;
//    glyphs cut out by an SVG <text> mask. Content-agnostic — correct over any
//    background region.
//  • static-fill (touch / reduced-motion / no reference-filter support):
//    background-clip:text fills the glyphs with a STACK of background layers replicating
//    what is actually painted behind them — cover surfaces (glass cards, the wave band;
//    see data-adaptive-cover below) interleaved by z with the slice of the background
//    art — each kept aligned to its own on-screen box (handles any number of lines).
// Both run the result through the shared #adaptive-duotone filter (ink↔cream).
//
// The background is layered: the collage (top) and the beach (below). Static-fill picks
// whichever art SVG is vertically behind the text; if neither is (plain page), it leaves
// the solid-ink fallback.
// `bg` is the solid ground painted UNDER the fill image (clipped to the glyphs too), so
// the fill matches the rendered background where the art is transparent. The beach uses
// a backdrop-stripped copy (main2-fill.svg) over the brown ground that BackgroundCanvas
// re-paints as its own z8 layer; the collage art is opaque so it needs no ground.
// Ordered by PAINT order, topmost first. The beach is raised INTO the collage and
// painted ABOVE it (its brown ground + art cover the jungle), so wherever both rects
// contain the text, the beach is what the eye sees — checking the collage first made
// texts in the overlap zone sample the hidden jungle, and the pick even FLIPPED
// mid-scroll (the parallax slides the art relative to the content, so the collage's
// bottom edge crosses a heading while you scroll): dark jungle → cream glyphs over
// the light mosaic = the Comparison quote "disappearing".
const SOURCES = [
  // The live beach svg's viewBox HEIGHT is rewritten at runtime (the sea injection —
  // surf or static — EXTENDS it downward, e.g. 3614 → 4560, art staying top-anchored),
  // so match by prefix, and size the fill image by the ART's own aspect (artW/artH),
  // never by the on-screen element height — that would stretch the fill vertically.
  {
    match: 'svg[viewBox^="0 0 1027 "]',
    src: '/SVG/background/main2-fill.svg',
    artW: 1027, artH: 3614,
    bg: '#77533E',
  },
  {
    match: 'svg[viewBox="0 0 800 2047"]',
    src: '/SVG/background/background-collage.svg',
    artW: 800, artH: 2047,
    bg: 'transparent',
  },
] as const

// Cover surfaces (data-adaptive-cover="<css-color>") — opaque rects that may be painted
// between the art and the text (glass cards in the content layer) or under the art's
// transparent gaps (the wave band behind the beach). The static fill splices them into
// the glyphs' background stack by z (data-adaptive-cover-z, default 100 = content layer;
// the picked art sits at z 10 within the background composite, its `bg` ground below
// everything). The duotone only cares which SIDE of its 0.70 luminance threshold a pixel
// lands on, so one solid color per surface is exact enough — on touch the glass cards
// literally render their --glass-solid color (globals.css strips the blur there).
const COVER_ATTR = 'data-adaptive-cover'
const COVER_Z_ATTR = 'data-adaptive-cover-z'
const COVER_DEFAULT_Z = 100
const ART_Z = 10
// The collage's front sprites (roads, houses, humans, front set, bushes, big tree —
// everything BackgroundCanvas paints above z10) baked at their rest positions, the
// rest of the canvas transparent. In the beach↔collage raise band those sprites hang
// OVER the beach art, so when the picked art is the beach this image is layered above
// its slice — the transparency composites per-pixel what z-order does live.
// Regenerate after an art re-export: npm run gen:front-fill.
const FRONT_FILL_SRC = '/SVG/background/collage-front-fill.svg'
// The duotone filter's output colors (see AdaptiveDuotoneFilter) — what the staticFill
// manual override paints directly. Each palette maps a DARK background to one and a LIGHT
// background to the other. The `blue` palette (default) runs green↔blue:
//   BLUE        = --color-blue, the LIGHT-background side. 5.49:1 over cream — the best
//                 of the brand colours over the collage's pale stretches.
//   LIGHT_GREEN = --color-green, the DARK-background side (replaced cream).
// GREEN = --color-green-dark, the light side of the `green` palette (green↔green, the
// previous default): 3.53:1 over cream, where the brand green is only 1.75:1.
// INK / CREAM belong to the legacy `ink` palette, kept as the near-black escape hatch.
export const INK = '#323031'
export const GREEN = '#6a906e'
export const LIGHT_GREEN = '#8fd096'
export const BLUE = '#2e67b2'
export const CREAM = '#fffce5'

// The `ink` palette's filter — the hook's default `filterId`, kept so a caller that passes
// no palette still names a real filter. It no longer gates anything: the built-in chain
// used to be restricted to this palette (it can only reach near-white/near-black), and
// that restriction is what silently pushed every phone onto the static reconstruction once
// the default palette moved off `ink`. See the gate in the effect.
const INK_FILTER_ID = 'adaptive-duotone'
// Exported for SHAPE consumers (useAdaptiveDuotone): a solid box whose own border-radius
// is the mask needs the chain and the probes, but none of the glyph machinery below.
// Runs the DEFAULT palette, same as the text — the shapes are part of that system, so this
// id and AdaptiveText's DEFAULT_DUOTONE must be changed together.
// Фильтр ДЕФОЛТНОЙ палитры (`DEFAULT_DUOTONE = 'blue'` в AdaptiveText.tsx — импортировать
// оттуда нельзя, там встречный импорт). Имя нужно в двух местах: собрать `BACKDROP` для
// фигур и — ниже, в эффекте — понять, та ли это палитра, под которую фитована
// `BACKDROP_BUILTIN_BRAND`. Меняется вместе с `DEFAULT_DUOTONE`.
const BRAND_FILTER_ID = 'adaptive-duotone-blue'
export const BACKDROP = `grayscale(1) url(#${BRAND_FILTER_ID})`
// Built-in-function equivalent of #adaptive-duotone for the LIVE backdrop on WebKit,
// which parses-then-drops url(#) reference filters inside backdrop-filter (the reason the
// static path exists). Reproduces the same map WITHOUT an SVG filter, so iOS renders it:
//   grayscale(1)      → luminance L
//   brightness(0.714) → L·0.714  (so the 0.70 threshold lands on contrast's 0.5 pivot)
//   contrast(50)      → binarise: L≥0.70 → white, L<0.70 → black
//   invert(1)         → L≥0.70 → INK (dark), L<0.70 → CREAM (light)   [same direction]
// Mono near-white/near-black — device-validated on a real iPhone (2026-07-19) and kept as
// the ?duomono=1 escape hatch. No longer the WebKit default: see BACKDROP_BUILTIN_BRAND.
export const BACKDROP_BUILTIN = 'grayscale(1) brightness(0.714) contrast(50) invert(1)'
// WebKit DEFAULT — the full brand palette from a live sample, no SVG filter anywhere.
// Renders #8fd096 over a dark backdrop and #2e68b1 over a light one (targets --color-green
// #8fd096 and --color-blue #2e67b2; the blue is 1/255 off, invisible).
//
// THE CLAMP IS THE WHOLE TRICK. WebKit does not clamp between filter functions (Chromium
// does), so contrast(50) leaves ±20-ish values that ride the rest of the chain and only
// clamp at the very end — which is why a tint appended to the mono chain was inert on a
// real iPhone, painting white/black everywhere except a seam where the backdrop luminance
// sits inside contrast's in-range band. A blur() forces rasterisation, and rasterising
// clamps: device-verified 2026-08-09. With clamping back, the reachable set changes
// completely, because a clamp is a per-channel non-linearity:
//   • one stage after the barrier still gives ONE hue at two lightnesses (both poles stay
//     on a single ray) — that is the green↔green-dark limit measured earlier;
//   • TWO stages break it. The second contrast lifts the pair off the ray and the second
//     matrix supplies an independent direction, which is enough for two different hues.
// Fitted numerically (npm run fit:duotone-chain) and confirmed in a real compositor, not
// just modelled.
//
// contrast(50) TWICE is deliberate. One pass has slope 50, so a 1/50 = 2% band of backdrop
// luminance lands in range and tints into intermediate colours — a visible seam wherever
// the background crosses the threshold (this is exactly the third colour reported from the
// device). Squaring the slope collapses that band: measured over a black→white gradient,
// the transition goes from 5 intermediate shades to a hard pixel-to-pixel edge.
//
// The parameters ENCODE THE PALETTE. Change DUOTONES and this string is stale — refit with
// `npm run fit:duotone-chain` and re-measure. Guard: npm run verify:adaptive-mode.
export const BACKDROP_BUILTIN_BRAND =
  'grayscale(1) brightness(0.714) contrast(50) contrast(50) invert(1) blur(0.5px) ' +
  'contrast(0.538) sepia(0.105) saturate(7.9) hue-rotate(115.5deg) brightness(1.697) blur(0.5px) ' +
  'contrast(0.69) sepia(0.135) saturate(8) hue-rotate(75.5deg) brightness(0.857)'
const FIND_TIMEOUT_FRAMES = 300
const SVGNS = 'http://www.w3.org/2000/svg'

// True when the engine PARSES an SVG reference filter inside backdrop-filter — a
// NECESSARY, NOT sufficient condition for it to render.
// MEASURED 2026-08-09 (Playwright WebKit, agreeing with the device note on
// BACKDROP_BUILTIN below): WebKit returns TRUE here and then paints NOTHING — it parses
// the reference and drops it at paint. So this probe cannot detect WebKit, and an earlier
// version of this comment claiming it does ("WebKit rejects the whole declaration") was
// wrong. Anything that must avoid WebKit's empty paint has to name the engine — see
// isWebKit() — because painting an unrendered chain leaves the glyphs TRANSPARENT.
export function supportsBackdrop(): boolean {
  const probe = document.createElement('span')
  probe.style.setProperty('backdrop-filter', BACKDROP)
  probe.style.setProperty('-webkit-backdrop-filter', BACKDROP)
  return (
    probe.style.getPropertyValue('backdrop-filter').includes('url(') ||
    probe.style.getPropertyValue('-webkit-backdrop-filter').includes('url(')
  )
}

// True when the engine renders a BUILT-IN-function chain in backdrop-filter — all modern
// engines including iOS Safari, which rejects only url(#) reference filters (the reason the
// static path existed). Gates the touch default below so an engine without any backdrop-
// filter support still falls back to static-fill rather than invisible glyphs.
export function supportsBuiltinBackdrop(): boolean {
  if (typeof CSS === 'undefined' || !CSS.supports) return false
  return CSS.supports('backdrop-filter', 'grayscale(1)') ||
    CSS.supports('-webkit-backdrop-filter', 'grayscale(1)')
}

// The one thing here that CANNOT be feature-detected: WebKit accepts url(#) inside
// backdrop-filter and renders it as nothing (see supportsBackdrop). Every iOS browser is
// WebKit (Chrome/Firefox on iOS included), and so is desktop Safari — which is why this
// asks about the ENGINE and not about touch. `(hover: none)` used to stand in for it, and
// that proxy is what made every non-iOS phone fall to the static reconstruction while
// leaving desktop Safari on a chain it never paints.
export function isWebKit(): boolean {
  const ua = navigator.userAgent
  // Every iOS/iPadOS browser is WebKit whatever it brands itself (CriOS, FxiOS, EdgiOS),
  // so test the platform BEFORE the brand — an `Edg`/`Chrome` exclusion alone would hand
  // Edge-on-iOS the url(#) chain it cannot paint. iPadOS asks for the desktop UA
  // (Macintosh, no iPad token); its touch points give it away.
  if (/iPhone|iPad|iPod/.test(ua)) return true
  if (/Macintosh/.test(ua) && typeof navigator.maxTouchPoints === 'number' && navigator.maxTouchPoints > 1) return true
  // Desktop Safari: WebKit with no Chromium/Gecko brand token.
  return /AppleWebKit/.test(ua) && !/Chrome|Chromium|Edg|OPR|SamsungBrowser|Firefox/.test(ua)
}

// Measure the element's rendered lines so the glyph mask matches the browser's own
// wrapping at any width / line count. Walks every text-node child character by
// character (Range rects) — JSX like `&ldquo;{text}&rdquo;` renders as SEVERAL sibling
// text nodes, so stopping at the first would mask only the opening quote. Buckets chars
// by rounded top → one entry per visual line, each with its text + left-x +
// vertical-centre-y in the element's local px box.
function measureLines(el: HTMLElement): {
  lines: { text: string; x: number; y: number }[]
  // How far the glyph INK overflows the element's (tight) line box, top and bottom. The
  // backdrop-filter overlay is inset:0 = that box, so it must grow by this or it clips the
  // glyph edges (device-reported 2026-07-19: caps in a lineHeight:1.1 heading overflow ~5px).
  padTop: number
  padBottom: number
} {
  const textNodes = Array.from(el.childNodes).filter(
    (n): n is Text => n.nodeType === Node.TEXT_NODE && !!n.textContent?.trim(),
  )
  if (textNodes.length === 0) return { lines: [], padTop: 0, padBottom: 0 }
  const elRect = el.getBoundingClientRect()
  const range = document.createRange()
  const buckets = new Map<number, { text: string; left: number; top: number; bottom: number }>()
  let minTop = Infinity
  let maxBottom = -Infinity
  for (const textNode of textNodes) {
    const full = textNode.textContent ?? ''
    for (let i = 0; i < full.length; i++) {
      range.setStart(textNode, i)
      range.setEnd(textNode, i + 1)
      const r = range.getBoundingClientRect()
      if (r.width === 0 && r.height === 0) continue // collapsed whitespace at a wrap
      if (r.top < minTop) minTop = r.top
      if (r.bottom > maxBottom) maxBottom = r.bottom
      const key = Math.round(r.top)
      let b = buckets.get(key)
      if (!b) { b = { text: '', left: Infinity, top: r.top, bottom: r.bottom }; buckets.set(key, b) }
      b.text += full[i]
      if (r.top < b.top) b.top = r.top
      if (r.bottom > b.bottom) b.bottom = r.bottom
      if (!/\s/.test(full[i]) && r.left < b.left) b.left = r.left // ignore spaces for the left edge
    }
  }
  const lines = Array.from(buckets.values())
    .filter(b => b.left !== Infinity) // drop whitespace-only lines
    .sort((a, b) => a.top - b.top)
    .map(b => ({ text: b.text.trim(), x: b.left - elRect.left, y: (b.top + b.bottom) / 2 - elRect.top }))
  const padTop = minTop === Infinity ? 0 : Math.ceil(Math.max(0, elRect.top - minTop))
  const padBottom = maxBottom === -Infinity ? 0 : Math.ceil(Math.max(0, maxBottom - elRect.bottom))
  return { lines, padTop, padBottom }
}

export function useAdaptiveText({
  textRef,
  overlayRef,
  maskRef,
  maskId,
  imageSrc,
  imageRef,
  staticFill,
  filterId = INK_FILTER_ID,
  lightColor = INK,
  darkColor = CREAM,
}: {
  textRef: RefObject<HTMLElement | null>
  overlayRef: RefObject<HTMLSpanElement | null>
  maskRef?: RefObject<SVGTextElement | null>
  maskId?: string
  // Icon mode: the "glyphs" are the alpha of this image (CSS mask) instead of text; the
  // real <img> (imageRef) stays as the solid-ink fallback and is hidden while a mode runs.
  imageSrc?: string
  imageRef?: RefObject<HTMLImageElement | null>
  // Manual escape hatch for the static path: force the glyphs to one duotone side when
  // the layered fill can't resolve a spot. The backdrop path (per-pixel ground truth)
  // ignores it.
  staticFill?: 'ink' | 'cream'
  // Which #adaptive-duotone* filter to run (AdaptiveText's `duotone` palette).
  filterId?: string
  // That palette's two sides, so the staticFill override paints exactly what the filter
  // would have resolved to instead of the hardcoded ink/cream pair.
  lightColor?: string
  darkColor?: string
}): void {
  useEffect(() => {
    // Debug levers: ?noadaptive=1 keeps the solid-ink fallback (bisecting a mobile
    // crash with the adaptive machinery fully off); ?staticfill=1 forces the static
    // path on engines where backdrop works — desktop A/B against the backdrop ground
    // truth without a touch device. ?filldebug=1 pins a red-outlined strip under every
    // static-filled element painting the SAME layer stack unmasked/unfiltered — on a
    // device screenshot it bisects geometry bugs (strip misaligned with the live bg)
    // from clip-text/filter rendering bugs (strip aligned, glyphs still wrong).
    const params = new URLSearchParams(location.search)
    if (params.has('noadaptive')) return
    const forceStatic = params.has('staticfill')
    const fillDebug = params.has('filldebug')
    // WebKit levers. ?duowk=1 forces the WebKit path on ANY engine (Playwright WebKit
    // renders no backdrop-filter at all, headless or headed, so this is the only way to
    // measure that chain locally); ?duomono=1 drops back to the plain near-white/near-black
    // pair, the escape hatch if the brand chain ever misbehaves on a device.
    const forceWebkitPath = params.has('duowk')
    const monoDuotone = params.has('duomono')
    const text = textRef.current
    const overlay = overlayRef.current
    const maskText = maskRef?.current ?? null
    const img = imageRef?.current ?? null
    if (!text || !overlay || (!imageSrc && !maskText)) return
    const imageMask = imageSrc ? `url("${imageSrc}") 0 0 / 100% 100% no-repeat` : ''

    // Which duotone technique runs. DESKTOP: the url(#) reference filter in backdrop-filter
    // (exact ink/cream) — engines that parse it (supportsBackdrop). TOUCH/iOS: the built-in-
    // function chain (BACKDROP_BUILTIN), because WebKit renders url(#) reference filters in
    // backdrop-filter as NOTHING (real iPhone 12 mini 2026-07-15) — this is now the touch
    // DEFAULT, retiring the static composite-reconstruction to a fallback (device-validated
    // 2026-07-19). Fallbacks to static-fill: reduced-motion (backdrop's point is the MOVING
    // bg), ?staticfill (desktop A/B), engines with no backdrop-filter at all, and ICONS on
    // touch (image-mask + backdrop renders nothing on real iOS — the VS vanished).
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const touch = window.matchMedia('(hover: none)').matches
    // Split by ENGINE, not by input type. WebKit needs the built-in chain (it paints the
    // url(#) one as nothing); every other engine renders the url(#) chain exactly, phone
    // or desktop.
    //
    // REGRESSION THIS REPLACES (8626ce6 + 1ce1538, 2026-08-08): the built-in chain was
    // gated on `filterId === INK_FILTER_ID` because it cannot express a palette — all its
    // filters act on every channel alike, so the two poles can only be near-white and
    // near-black. When the default palette moved off `ink` (→ green, → blue) that gate went
    // permanently false, and the other branch refused touch outright (`&& !touch`), so
    // EVERY adaptive text on EVERY phone silently dropped off the live sample onto the
    // static reconstruction — the path retired on 2026-07-19 precisely because it drifts
    // against the parallaxing art. Measured on a 390×844 touch build: 9/9 texts static,
    // the CELPE-BRAS heading reconstructing L=0.78 where the live background is L=0.13 —
    // a full flip across the 0.70 threshold, i.e. glyphs coloured from the wrong region.
    //
    // So the gate no longer decides whether to SAMPLE — only which chain does it, and the
    // sample is never given up: `BACKDROP_BUILTIN_BRAND` since 2026-08-09 reproduces the
    // default palette out of built-in functions alone (blur barrier + two tone stages), so
    // WebKit gets the same green↔blue as everyone else. A caller that asks for one of the
    // OTHER palettes falls back to the mono chain instead — see the choice at
    // `builtinChain` — because that string's coefficients encode one palette and nothing
    // refits them per call. Chromium/Gecko render every palette exactly through url(#);
    // they were never the engine with the problem.
    const webkit = isWebKit() || forceWebkitPath
    const useBuiltin = webkit && supportsBuiltinBackdrop()
    // Icons: image-mask + backdrop-filter renders NOTHING on WebKit (the VS vanished on a
    // real iPhone), and touch icons kept that fallback before this change — hold both.
    const iconStatic = !!imageSrc && (webkit || touch)
    const canBackdrop = !reduced && !forceStatic && !iconStatic && (
      useBuiltin || (!webkit && supportsBackdrop())
    )

    // Manual override (staticFill prop): paint the requested duotone side directly and
    // skip the whole fill machinery — no observers, no per-frame work.
    if (staticFill && !canBackdrop) {
      const color = staticFill === 'ink' ? lightColor : darkColor
      if (imageSrc) {
        text.style.setProperty('mask', imageMask)
        text.style.setProperty('-webkit-mask', imageMask)
        text.style.backgroundColor = color
        img?.style.setProperty('visibility', 'hidden')
      } else {
        text.style.color = color
      }
      return () => {
        text.style.removeProperty('mask')
        text.style.removeProperty('-webkit-mask')
        text.style.backgroundColor = ''
        text.style.color = ''
        if (img) img.style.visibility = ''
      }
    }

    let mode: 'none' | 'static' | 'backdrop' = 'none'

    const clearAll = () => {
      text.style.backgroundImage = ''
      text.style.backgroundColor = ''
      text.style.backgroundRepeat = ''
      text.style.backgroundSize = ''
      text.style.backgroundPosition = ''
      text.style.removeProperty('-webkit-background-clip')
      text.style.removeProperty('background-clip')
      text.style.removeProperty('mask')
      text.style.removeProperty('-webkit-mask')
      text.style.filter = ''
      if (img) img.style.visibility = ''
      overlay.style.removeProperty('backdrop-filter')
      overlay.style.removeProperty('-webkit-backdrop-filter')
      overlay.style.removeProperty('filter')
      overlay.style.removeProperty('mask')
      overlay.style.removeProperty('-webkit-mask')
      // Undo any glyph-overflow growth so a later icon/static pass starts flush with the
      // element box. Reset to 0 (not removeProperty — the JSX sets these longhands inline).
      overlay.style.top = '0'
      overlay.style.bottom = '0'
      overlay.style.display = 'none'
      text.style.color = ''
      dbgEl?.remove()
      dbgEl = null
    }

    // Which background art SVG is vertically behind the text's centre (collage / beach)?
    // artFrac = the fraction of the LIVE viewBox height the art actually occupies
    // (top-anchored): 1 for the collage; artH/rewrittenH for the beach after the sea
    // injection extends its viewBox downward. Applied to the element's on-screen rect
    // so any container transforms (phones' scaleY stretch) are inherited correctly.
    const pickSource = (): { src: string | null; bg: string; rect: DOMRect; artFrac: number } | null => {
      const hr = text.getBoundingClientRect()
      // A hidden element (display:none breakpoint variant) measures 0×0 at (0,0) — its
      // fake centre would still land inside an art rect and enable a pointless fill.
      if (hr.width === 0 && hr.height === 0) return null
      const cy = hr.top + hr.height / 2
      for (const s of SOURCES) {
        const el = document.querySelector<SVGSVGElement>(s.match)
        if (!el) continue
        const rect = el.getBoundingClientRect()
        if (rect.width > 0 && cy >= rect.top && cy <= rect.bottom) {
          const liveH = el.viewBox.baseVal.height
          return { src: s.src, bg: s.bg, rect, artFrac: liveH > 0 ? s.artH / liveH : 1 }
        }
      }
      // Below both arts: the terminal fill band (solid; colour sampled from the beach's
      // bottom edge, carried on the data attribute by BackgroundCanvas). A solid base is
      // a trivially exact source — without it, texts over the band (phones now close the
      // whole coverage deficit with it) fell back to solid ink on the dark sea.
      const term = document.querySelector<HTMLElement>('[data-adaptive-terminal]')
      if (term) {
        const rect = term.getBoundingClientRect()
        if (rect.width > 0 && cy >= rect.top && cy <= rect.bottom) {
          const bg = term.getAttribute('data-adaptive-terminal') || 'transparent'
          return { src: null, bg, rect, artFrac: 1 }
        }
      }
      return null
    }

    // Cover surfaces present on the page. Collected outside the frame loop — the
    // attribute-selector scan walks the huge collage SVG DOM; rects ARE read per frame
    // (cards move with scroll/stack animation). Document order is kept as the
    // paint-order tie-break for equal z (later paints above).
    let covers: { el: HTMLElement; color: string; z: number }[] = []
    const collectCovers = () => {
      covers = Array.from(document.querySelectorAll<HTMLElement>(`[${COVER_ATTR}]`)).map(el => ({
        el,
        color: el.getAttribute(COVER_ATTR) || 'transparent',
        z: Number(el.getAttribute(COVER_Z_ATTR) ?? COVER_DEFAULT_Z),
      }))
    }

    // STATIC: fill glyphs with a stack of CSS background layers replicating the composite
    // behind them (first layer = topmost): covers above the art (cards) → the art slice →
    // covers below it (the wave band, visible through the beach art's transparent sea
    // gap) → pick.bg as the base ground. Each cover paints as a solid rect
    // (linear-gradient) sized/positioned to its on-screen box relative to the text.
    // Returns false until an art source is behind the text (otherwise: solid-ink
    // fallback) — covers alone never enable static mode.
    let lastKey = ''
    let dbgEl: HTMLDivElement | null = null // ?filldebug strip, see levers above
    const applyStatic = (): boolean => {
      const pick = pickSource()
      if (!pick) return false
      if (mode !== 'static') {
        clearAll()
        // First entry can precede attach() (boot applies before observers exist), so the
        // cover set must be fresh here; once per mode entry, not per frame.
        collectCovers()
        text.style.backgroundRepeat = 'no-repeat'
        if (imageSrc) {
          text.style.setProperty('mask', imageMask)
          text.style.setProperty('-webkit-mask', imageMask)
          if (img) img.style.visibility = 'hidden'
        } else {
          text.style.setProperty('-webkit-background-clip', 'text')
          text.style.setProperty('background-clip', 'text')
          text.style.color = 'transparent'
        }
        text.style.filter = `url(#${filterId})`
        mode = 'static'
        lastKey = ''
      }
      const hr = text.getBoundingClientRect()
      lastArtTop = pick.rect.top

      // Live geometry of BOTH arts. In the raise band the beach block paints OVER the
      // collage, and the collage's front sprites (bushes, big tree) paint over the
      // beach in turn — a text can STRADDLE the seam, so one picked slice can't serve
      // all its lines. The stack instead carries every overlapping piece in live paint
      // order; `pick` keeps deciding only the base colour and the no-art bail above.
      const overlap = (r: DOMRect) => r.width > 0 && r.bottom > hr.top && r.top < hr.bottom
      const artInfo = (s: (typeof SOURCES)[number]) => {
        const el = document.querySelector<SVGSVGElement>(s.match)
        if (!el) return null
        const r = el.getBoundingClientRect()
        if (!overlap(r)) return null
        const liveH = el.viewBox.baseVal.height
        return { src: s.src, rect: r, fillH: r.height * (liveH > 0 ? s.artH / liveH : 1) }
      }
      const beach = artInfo(SOURCES[0])
      const collage = artInfo(SOURCES[1])

      // Covers intersecting the text box. A cover is skipped while its own or its direct
      // wrapper's inline opacity fades it below 0.5 — the stack sections (CelpeBras/
      // Plans) hide past cards with inline opacity on the slot wrapper, not the card.
      const hits: { color: string; z: number; i: number; r: DOMRect }[] = []
      for (let i = 0; i < covers.length; i++) {
        const c = covers[i]
        const own = c.el.style.opacity
        const wrap = c.el.parentElement?.style.opacity ?? ''
        if ((own !== '' && parseFloat(own) < 0.5) || (wrap !== '' && parseFloat(wrap) < 0.5)) continue
        const r = c.el.getBoundingClientRect()
        if (r.width === 0 || r.height === 0) continue
        if (r.right <= hr.left || r.left >= hr.right || r.bottom <= hr.top || r.top >= hr.bottom) continue
        hits.push({ color: c.color, z: c.z, i, r })
      }
      hits.sort((a, b) => b.z - a.z || b.i - a.i)

      const images: string[] = []
      const sizes: string[] = []
      const positions: string[] = []
      const pushCover = (h: { color: string; r: DOMRect }) => {
        images.push(`linear-gradient(${h.color}, ${h.color})`)
        sizes.push(`${h.r.width}px ${h.r.height}px`)
        positions.push(`${h.r.left - hr.left}px ${h.r.top - hr.top}px`)
      }
      const pushImage = (src: string, r: DOMRect, h: number) => {
        images.push(`url("${src}")`)
        sizes.push(`${r.width}px ${h}px`)
        positions.push(`${r.left - hr.left}px ${r.top - hr.top}px`)
      }
      for (const h of hits) if (h.z >= ART_Z) pushCover(h)
      // Front sprites are only ABOVE the stack when the beach separates them from the
      // collage body; the collage slice below carries them baked otherwise.
      if (beach && collage) pushImage(FRONT_FILL_SRC, collage.rect, collage.fillH)
      if (beach) pushImage(beach.src, beach.rect, beach.fillH)
      // Wave band (z9) sits above the beach block's own brown ground (z8), both under
      // the beach art; the collage body is under the whole beach block.
      for (const h of hits) if (h.z < ART_Z) pushCover(h)
      if (beach) {
        images.push(`linear-gradient(${SOURCES[0].bg}, ${SOURCES[0].bg})`)
        sizes.push(`${beach.rect.width}px ${beach.rect.height}px`)
        positions.push(`${beach.rect.left - hr.left}px ${beach.rect.top - hr.top}px`)
      }
      if (collage) pushImage(collage.src, collage.rect, collage.fillH)

      const key = `${images.join(',')}|${sizes.join(',')}|${positions.join(',')}|${pick.bg}`
      if (key !== lastKey) {
        lastKey = key
        text.style.backgroundColor = pick.bg
        text.style.backgroundImage = images.join(', ')
        text.style.backgroundSize = sizes.join(', ')
        text.style.backgroundPosition = positions.join(', ')
      }
      if (fillDebug) {
        if (!dbgEl) {
          dbgEl = document.createElement('div')
          dbgEl.setAttribute('aria-hidden', 'true')
          Object.assign(dbgEl.style, {
            position: 'fixed',
            zIndex: '99999',
            pointerEvents: 'none',
            outline: '2px solid red',
            backgroundRepeat: 'no-repeat',
            font: '700 11px/1.2 monospace',
            color: '#d00',
            textShadow: '0 0 3px #fff, 0 0 3px #fff, 0 0 3px #fff',
            whiteSpace: 'pre-wrap',
          })
          document.body.appendChild(dbgEl)
        }
        // Same stack, same element-local background geometry, box pinned just below
        // the element: the strip must show a COPY of what is live behind the element.
        Object.assign(dbgEl.style, {
          left: `${hr.left}px`,
          top: `${hr.bottom + 4}px`,
          width: `${hr.width}px`,
          height: `${Math.min(hr.height, 120)}px`,
          backgroundColor: pick.bg,
          backgroundImage: images.join(', '),
          backgroundSize: sizes.join(', '),
          backgroundPosition: positions.join(', '),
        })
        const vv = window.visualViewport
        dbgEl.textContent =
          `hr ${hr.top.toFixed(0)}..${hr.bottom.toFixed(0)}` +
          ` beach ${beach ? `${beach.rect.top.toFixed(0)}..${beach.rect.bottom.toFixed(0)}` : 'нет'}` +
          ` col ${collage ? `${collage.rect.top.toFixed(0)}..${collage.rect.bottom.toFixed(0)}` : 'нет'}\n` +
          `sy ${window.scrollY.toFixed(0)} ih ${window.innerHeight}` +
          ` vv ${vv ? `${vv.height.toFixed(0)}@${vv.offsetTop.toFixed(0)}` : '-'}` +
          ` dpr ${window.devicePixelRatio}`
      }
      return true
    }

    // BACKDROP: overlay shows the live duotone of the backdrop, masked to the glyphs.
    // The mask carries one <tspan> per RENDERED line (measureLines), so it matches the
    // element's own wrapping at any width / line count and honours its text-align.
    const applyBackdrop = (): boolean => {
      const w = text.clientWidth
      const h = text.clientHeight
      if (w === 0 || h === 0) return false
      if (mode !== 'backdrop') {
        clearAll()
        overlay.style.display = ''
        // Built-in-function chain on WebKit (it drops the url reference); url(#) chain on
        // engines that render it exactly. The brand hue has to live INSIDE the backdrop
        // chain on WebKit — re-colouring the sample afterwards with the overlay's own
        // `filter: url(#…)` works in Chromium but was measured on a real iPhone
        // (2026-08-09) to do nothing at all: WebKit does not pass its backdrop image
        // through the element's filter, so every heading stayed black-and-white.
        // Брендовая цепочка ЗАКОДИРОВАЛА ОДНУ палитру (её коэффициенты фитованы под
        // зелёный↔синий), поэтому она идёт только дефолтному фильтру. Чужая палитра
        // (`ink`, `green`) получила бы на WebKit чужие цвета молча — ей достаётся mono,
        // то есть ровно то ухудшение, которое описано выше: живой сэмпл сохраняется,
        // теряется только тон. Гейта по палитре, погубившего телефоны 2026-08-08, это не
        // воскрешает — дефолт, которым идёт вся страница, остаётся на брендовой цепочке.
        const brandChain = filterId === BRAND_FILTER_ID && !monoDuotone
        const builtinChain = brandChain ? BACKDROP_BUILTIN_BRAND : BACKDROP_BUILTIN
        const chain = useBuiltin ? builtinChain : `grayscale(1) url(#${filterId})`
        overlay.style.setProperty('backdrop-filter', chain)
        overlay.style.setProperty('-webkit-backdrop-filter', chain)
        if (imageSrc) {
          overlay.style.setProperty('mask', imageMask)
          overlay.style.setProperty('-webkit-mask', imageMask)
          // Hide the fallback img so the backdrop samples the page background, not it.
          if (img) img.style.visibility = 'hidden'
        } else {
          overlay.style.setProperty('mask', `url(#${maskId})`)
          overlay.style.setProperty('-webkit-mask', `url(#${maskId})`)
          text.style.color = 'transparent'
        }
        mode = 'backdrop'
      }
      if (imageSrc || !maskText) return true
      const cs = getComputedStyle(text)
      maskText.setAttribute('dominant-baseline', 'central')
      maskText.setAttribute('font-family', cs.fontFamily)
      maskText.setAttribute('font-size', cs.fontSize)
      maskText.setAttribute('font-weight', cs.fontWeight)
      maskText.setAttribute('font-style', cs.fontStyle)
      maskText.setAttribute('letter-spacing', cs.letterSpacing)

      while (maskText.firstChild) maskText.removeChild(maskText.firstChild)
      const { lines, padTop, padBottom } = measureLines(text)
      // Grow the backdrop-filter overlay past the element box so iOS stops clipping the glyph
      // edges. Real iOS both clips the effect to the element's own box AND under-reports the
      // ink overflow in range rects (device 2026-07-19: the measured pad was 0-ish, the box
      // never grew, first-line caps stayed cut). So use a generous FONT-RELATIVE floor rather
      // than the measured overflow — 0.4em covers cap/ascender overshoot at any size, and
      // over-growth is harmless because the overlay is masked to the glyphs. The mask's
      // userSpace origin is the overlay top-left, which moved UP by padT, so shift every
      // glyph DOWN by padT to keep it registered. Left/width stay (only top/bottom change).
      const floorPad = Math.ceil(parseFloat(cs.fontSize) * 0.4)
      const padT = Math.max(padTop, floorPad)
      const padB = Math.max(padBottom, floorPad)
      overlay.style.top = `${-padT}px`
      overlay.style.bottom = `${-padB}px`
      if (lines.length === 0) {
        // No measurable text node (e.g. element children) → one centred line.
        maskText.setAttribute('text-anchor', 'middle')
        maskText.setAttribute('x', String(w / 2))
        maskText.setAttribute('y', String(h / 2 + padT))
        maskText.textContent = text.textContent
        return true
      }
      maskText.setAttribute('text-anchor', 'start')
      maskText.removeAttribute('x')
      maskText.removeAttribute('y')
      for (const ln of lines) {
        const tspan = document.createElementNS(SVGNS, 'tspan')
        tspan.setAttribute('x', String(ln.x))
        tspan.setAttribute('y', String(ln.y + padT))
        tspan.textContent = ln.text
        maskText.appendChild(tspan)
      }
      return true
    }

    // Returns true once a mode has actually been applied (so polling can stop).
    const decide = (): boolean => (canBackdrop ? applyBackdrop() : applyStatic())

    let cancelled = false
    let rafId: number | null = null
    let near = true
    let ro: ResizeObserver | null = null
    let io: IntersectionObserver | null = null
    // Static mode re-aligns / may switch source on scroll; backdrop auto-updates.
    // The re-align FOLLOWS THROUGH after the last scroll event: the background's
    // parallax is an eased rAF loop that keeps sliding the art (without firing any
    // scroll event) for up to ~a second after scrolling stops — a single re-align at
    // the event would freeze the fill at a mid-ease position. lastArtTop is written
    // by applyStatic from the picked art's rect; the loop runs until it stops moving.
    let lastArtTop = 0
    let followFrames = 0
    const FOLLOW_CAP = 300 // safety bound (~5s) against a jittering rect
    const follow = () => {
      rafId = null
      if (mode !== 'static' || !near) return
      const before = lastArtTop
      applyStatic()
      if (Math.abs(lastArtTop - before) > 0.25 && ++followFrames < FOLLOW_CAP) {
        rafId = requestAnimationFrame(follow)
      }
    }
    const kickFollow = () => {
      followFrames = 0
      if (rafId === null) rafId = requestAnimationFrame(follow)
    }
    const onScroll = () => {
      if (near && mode === 'static') kickFollow()
    }

    const attach = () => {
      // documentElement resize also fires when late-fetched layers (beach svg, waves)
      // grow the page — refresh the cover set there, never in the scroll frame.
      ro = new ResizeObserver(() => { collectCovers(); decide() })
      ro.observe(document.documentElement)
      ro.observe(text)
      io = new IntersectionObserver(
        entries => {
          // An instant scroll jump (anchor nav, scrollIntoView) can batch several
          // transitions into one callback — only the LAST entry is the current state;
          // reading the first left `near` stuck false and froze a stale mid-scroll fill.
          near = entries[entries.length - 1].isIntersecting
          if (near && mode === 'static') kickFollow()
        },
        { threshold: 0, rootMargin: '300px 0px' },
      )
      io.observe(text)
      window.addEventListener('scroll', onScroll, { passive: true })
    }

    // Observe BEFORE the first successful apply, not after it. An element that is
    // display:none at mount measures 0×0, so decide() fails for it — and while attach()
    // waited on success, the media query that later REVEALS such an element had nothing
    // listening, so it stayed on its flat fallback for the rest of the page's life. That
    // is the header logotype: four breakpoint spellings, only the one visible at mount
    // ever adapted (verified — resize past a breakpoint after boot()'s budget expires and
    // the revealed spelling is flat green). Attaching up front is safe: every callback
    // no-ops while mode === 'none'.
    attach()

    // Apply as soon as possible. Backdrop needs no art source; static waits for one.
    // NB the budget is 300 FRAMES, not 5s — this page runs at ~20fps, so it is ~15s, and
    // a test that resizes sooner than that will see the bug above already "fixed".
    let frames = 0
    let pollId: number | null = null
    const boot = () => {
      if (cancelled) return
      if (decide()) return
      if (++frames < FIND_TIMEOUT_FRAMES) { requestAnimationFrame(boot); return }
      // Budget exhausted and still no art source (e.g. the collage SVG is still being
      // fetched on a slow mobile connection — measured live on prod: the header logotype
      // stayed flat var(--color-blue) minutes after load, never recovering). The comment
      // above assumes "the observers keep watching", but BackgroundCanvas's Placeholder
      // pre-reserves the art's final box via aspect-ratio BEFORE the real SVG is fetched
      // in, so swapping the placeholder for the real content changes no element's size —
      // neither documentElement's height nor the art SVG's own box — and ResizeObserver
      // never fires. Nothing else calls decide() again, so the text was stuck forever.
      // Fall back to a slow poll (cheap: a couple getBoundingClientRect reads) until the
      // art actually lands.
      pollId = window.setInterval(() => {
        if (cancelled || decide()) {
          if (pollId !== null) window.clearInterval(pollId)
          pollId = null
        }
      }, 500)
    }
    boot()

    return () => {
      cancelled = true
      window.removeEventListener('scroll', onScroll)
      if (rafId !== null) cancelAnimationFrame(rafId)
      if (pollId !== null) window.clearInterval(pollId)
      io?.disconnect()
      ro?.disconnect()
      clearAll()
    }
  }, [textRef, overlayRef, maskRef, maskId, imageSrc, imageRef, staticFill, filterId, lightColor, darkColor])
}
