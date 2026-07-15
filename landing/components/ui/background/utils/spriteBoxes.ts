// Bounded sprite layers: measure each extracted group's box in canvas units so its
// overlay <svg> can carry a TIGHT viewBox instead of the whole canvas.
//
// Why: every extracted sprite used to be wrapped in a full-canvas svg (viewBox
// `0 0 800 2047` / the beach's own) at width:100% — i.e. every layer was a
// page-sized composited surface at DPR 3. ~90 of those (~1.5 GB of IOSurface
// backing) crashed the tab on an iPhone 12 mini regardless of the animations
// themselves (see the crash postmortem in BackgroundCanvas / project memory).
// A tight box shrinks each surface to the sprite's own footprint. The animations
// keep working unchanged because they transform the WRAPPER (translate/rotate/
// scale on the div) — the compositor moves the already-painted small surface, so
// no padding is needed for motion, only a small bleed for strokes/antialiasing.
// Precedent: the train / cable-car overlays already work exactly this way
// (useTrainAnimation / useCarAnimation).

export interface SpriteBox {
  x: number
  y: number
  w: number
  h: number
}

// Uniform bleed (canvas units) around measured boxes: covers stroke extents and
// getBoundingClientRect rounding. Cheap — 8 units ≈ 1% of the collage width.
export const BOX_BLEED = 8

/**
 * Measure the rendered bounding boxes of `ids` inside `svgText`, in the svg's own
 * viewBox units. Mounts the markup invisibly (opacity:0 — NOT display:none, which
 * makes all geometry read as 0, same caveat as useHumanAnimation's measure svg),
 * reads each group's getBoundingClientRect relative to the root, converts px →
 * canvas units, and unmounts. getBoundingClientRect (not getBBox) so the groups'
 * own transform attributes from the Figma export are included.
 * Ids may contain spaces and even trailing spaces — matched via [id="…"].
 */
export function measureGroupBoxes(svgText: string, ids: string[]): Map<string, SpriteBox> {
  const boxes = new Map<string, SpriteBox>()
  if (typeof document === 'undefined') return boxes
  const holder = document.createElement('div')
  holder.style.cssText =
    'position:absolute;top:0;left:0;width:800px;opacity:0;pointer-events:none;overflow:visible;'
  holder.setAttribute('aria-hidden', 'true')
  holder.innerHTML = svgText
  document.body.appendChild(holder)
  try {
    const root = holder.querySelector('svg')
    if (!root) return boxes
    const vb = root.viewBox.baseVal
    const rootRect = root.getBoundingClientRect()
    if (!vb || vb.width === 0 || rootRect.width === 0 || rootRect.height === 0) return boxes
    const sx = vb.width / rootRect.width
    const sy = vb.height / rootRect.height
    for (const id of ids) {
      const el = root.querySelector<SVGGraphicsElement>(`[id="${id}"]`)
      if (!el) continue
      const r = el.getBoundingClientRect()
      if (r.width === 0 && r.height === 0) continue
      boxes.set(id, {
        x: vb.x + (r.left - rootRect.left) * sx,
        y: vb.y + (r.top - rootRect.top) * sy,
        w: r.width * sx,
        h: r.height * sy,
      })
    }
  } finally {
    holder.remove()
  }
  return boxes
}

/** Grow a box by `pad` canvas units on every side. */
export function padBox(b: SpriteBox, pad: number): SpriteBox {
  return { x: b.x - pad, y: b.y - pad, w: b.w + pad * 2, h: b.h + pad * 2 }
}

/** Smallest box containing all of `list` (skips undefined — missing ids). */
export function unionBoxes(list: (SpriteBox | undefined)[]): SpriteBox | null {
  let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity
  for (const b of list) {
    if (!b) continue
    if (b.x < x1) x1 = b.x
    if (b.y < y1) y1 = b.y
    if (b.x + b.w > x2) x2 = b.x + b.w
    if (b.y + b.h > y2) y2 = b.y + b.h
  }
  if (x1 === Infinity) return null
  return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 }
}

/**
 * Wrap extracted group markup in a TIGHT svg: the viewBox is the sprite's own box,
 * so the composited surface is sprite-sized, not canvas-sized. The wrapper div is
 * positioned/sized to the same box (see boundedLayerStyle) — width/height 100% then
 * renders the art 1:1 in place. overflow:visible keeps any bleed outside the box
 * (strokes, rounding) painting instead of clipping.
 * NB: single template literal — a fully-constant `+` chain of literals gets its
 * tails dropped by the Turbopack prod minifier (see injectRailPath.ts).
 */
export function wrapSvgBounded(inner: string, box: SpriteBox): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box.x} ${box.y} ${box.w} ${box.h}" width="100%" height="100%" overflow="visible" style="display:block">${inner}</svg>`
}

/**
 * Percent position of `box` within its canvas viewBox, for an absolutely-positioned
 * wrapper div inside a host that spans the canvas (host: width 100% + aspect-ratio
 * of the canvas). Percentages survive resize and the cover-zoom without JS.
 */
export function boundedLayerStyle(
  box: SpriteBox,
  canvas: { x: number; y: number; w: number; h: number },
): { position: 'absolute'; left: string; top: string; width: string; height: string } {
  return {
    position: 'absolute',
    left: `${(((box.x - canvas.x) / canvas.w) * 100).toFixed(4)}%`,
    top: `${(((box.y - canvas.y) / canvas.h) * 100).toFixed(4)}%`,
    width: `${((box.w / canvas.w) * 100).toFixed(4)}%`,
    height: `${((box.h / canvas.h) * 100).toFixed(4)}%`,
  }
}
