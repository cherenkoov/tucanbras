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
// The duotone filter's two output colors (see AdaptiveDuotoneFilter) — what the
// staticFill manual override paints directly.
const INK = '#323031'
const CREAM = '#fffce5'

const BACKDROP = 'grayscale(1) url(#adaptive-duotone)'
// Built-in-function equivalent of #adaptive-duotone for the LIVE backdrop on WebKit,
// which parses-then-drops url(#) reference filters inside backdrop-filter (the reason the
// static path exists). Reproduces the same map WITHOUT an SVG filter, so iOS renders it:
//   grayscale(1)      → luminance L
//   brightness(0.714) → L·0.714  (so the 0.70 threshold lands on contrast's 0.5 pivot)
//   contrast(50)      → binarise: L≥0.70 → white, L<0.70 → black
//   invert(1)         → L≥0.70 → INK (dark), L<0.70 → CREAM (light)   [same direction]
// Near-white/near-black rather than the exact cream/ink hexes — device-validated on a real
// iPhone (2026-07-19) as the touch DEFAULT, replacing the old static composite-reconstruction
// (now only a fallback) and removing the reason for the extreme mobile crop (it existed only
// to shrink static-fill drift).
const BACKDROP_BUILTIN = 'grayscale(1) brightness(0.714) contrast(50) invert(1)'
const FIND_TIMEOUT_FRAMES = 300
const SVGNS = 'http://www.w3.org/2000/svg'

// True when the engine PARSES an SVG reference filter inside backdrop-filter. Engines
// that can't (WebKit rejects the whole declaration) leave the inline style empty — we
// probe that instead of CSS.supports so those devices fall back to static-fill rather
// than painting transparent (invisible) glyphs. Note this only detects parse-level
// rejection: an engine may accept the value and still render the chain partially
// (grayscale-only ⇒ gray letters) — not detectable from JS, verify on real devices.
function supportsBackdrop(): boolean {
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
function supportsBuiltinBackdrop(): boolean {
  if (typeof CSS === 'undefined' || !CSS.supports) return false
  return CSS.supports('backdrop-filter', 'grayscale(1)') ||
    CSS.supports('-webkit-backdrop-filter', 'grayscale(1)')
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
    const useBuiltin = touch && supportsBuiltinBackdrop()
    const canBackdrop = !reduced && !forceStatic && (
      useBuiltin ? !imageSrc : supportsBackdrop() && !touch
    )

    // Manual override (staticFill prop): paint the requested duotone side directly and
    // skip the whole fill machinery — no observers, no per-frame work.
    if (staticFill && !canBackdrop) {
      const color = staticFill === 'ink' ? INK : CREAM
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
        text.style.filter = 'url(#adaptive-duotone)'
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
        // Built-in-function chain on touch/WebKit (drops the url reference); url(#) chain
        // on desktop engines that render it exactly.
        const chain = useBuiltin ? BACKDROP_BUILTIN : BACKDROP
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
      if (near) kickFollow()
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

    // Apply as soon as possible. Backdrop needs no art source; static waits for one.
    let frames = 0
    const boot = () => {
      if (cancelled) return
      if (decide()) attach()
      else if (++frames < FIND_TIMEOUT_FRAMES) requestAnimationFrame(boot)
      // else: give up — element keeps its solid-ink fallback.
    }
    boot()

    return () => {
      cancelled = true
      window.removeEventListener('scroll', onScroll)
      if (rafId !== null) cancelAnimationFrame(rafId)
      io?.disconnect()
      ro?.disconnect()
      clearAll()
    }
  }, [textRef, overlayRef, maskRef, maskId, imageSrc, imageRef, staticFill])
}
