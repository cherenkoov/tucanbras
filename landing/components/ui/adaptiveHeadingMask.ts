// Pure geometry for the adaptive-heading mask. No DOM, no React — unit-verified by
// scripts/verifyAdaptiveMask.ts. The mask reveals the flip-color heading layer only
// inside a background figure's silhouette; CSS image masks use the ALPHA channel, so
// the silhouette is filled opaque (#000) and a Gaussian blur feathers the edge.

// A Gaussian blur's visible halo reaches ~3*stdDeviation; pad the viewBox by that much
// so the feathered edge is not clipped by the mask image's intrinsic box.
const PAD_MULTIPLIER = 3

export interface Bbox {
  x: number
  y: number
  w: number
  h: number
}

export interface SilhouetteMask {
  /** Ready-to-assign CSS value for `mask-image` / `-webkit-mask-image`. */
  dataUri: string
  /** Padding added around the figure bbox, in figure SVG units. The caller mirrors
   *  this in `computeMaskPlacement` so size/position stay consistent with the viewBox. */
  padUnits: number
}

export function buildSilhouetteMask(opts: {
  paths: string[]
  bbox: Bbox
  featherUnits: number
}): SilhouetteMask {
  const { paths, bbox, featherUnits } = opts
  const pad = Math.ceil(featherUnits * PAD_MULTIPLIER)
  const vb = `${bbox.x - pad} ${bbox.y - pad} ${bbox.w + 2 * pad} ${bbox.h + 2 * pad}`
  const d = paths.map(p => `<path d="${p}"/>`).join('')
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}">` +
    `<filter id="f" x="-50%" y="-50%" width="200%" height="200%">` +
    `<feGaussianBlur stdDeviation="${featherUnits}"/>` +
    `</filter>` +
    `<g filter="url(#f)" fill="#000">${d}</g>` +
    `</svg>`
  return { dataUri: `url("data:image/svg+xml,${encodeURIComponent(svg)}")`, padUnits: pad }
}

export interface Rect {
  left: number
  top: number
  width: number
  height: number
}

export interface MaskPlacement {
  sizeW: number
  sizeH: number
  posX: number
  posY: number
}

// Map the figure's on-screen rect to CSS mask-size + mask-position relative to the
// (masked) heading layer's box. Assumes uniform scale (the figure keeps its aspect).
export function computeMaskPlacement(opts: {
  figureRect: Rect
  headingOrigin: { left: number; top: number }
  bbox: Bbox
  padUnits: number
}): MaskPlacement {
  const { figureRect, headingOrigin, bbox, padUnits } = opts
  const scale = figureRect.width / bbox.w
  const padPx = padUnits * scale
  return {
    sizeW: figureRect.width + 2 * padPx,
    sizeH: figureRect.height + 2 * padPx,
    posX: figureRect.left - padPx - headingOrigin.left,
    posY: figureRect.top - padPx - headingOrigin.top,
  }
}
