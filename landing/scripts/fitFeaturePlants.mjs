// Four of the five feature-card plants were exported from instances that already
// carried a rotation, so the file's box has nothing to do with the design's, and
// neither its angle nor its width can be read off the node.
//
// The angle is the ONLY unknown. The node pins everything else: at the right angle
// the file's ink box has to fill the instance's box exactly, which fixes the scale
// and the placement. So this sweeps the angle, and for each candidate composes the
// whole thing the way the browser will — rotate, scale the ink onto the instance's
// box, crop to the card — and scores that against Figma's own render of the card.
// A number that survives that is a number that draws the design.
//
//   node scripts/fitFeaturePlants.mjs
import sharp from 'sharp'
import path from 'node:path'

const DECOR = 'public/SVG/header/decor'
const REF = 'scripts/.figma-ref'
const CARD_W = 599
const CARD_H = 157.2
// The raster the local file is measured in. Big enough that a 0.1° step moves
// pixels, small enough that a 360-step sweep stays quick.
const RASTER = 900

// Per plant, from the node, in CARD coordinates:
//   left/top/w/h — the OUTER box, the axis-aligned box the rotation sweeps out.
//                  Only its CENTRE is used, and that centre is also the frame's.
//   fw/fh        — the instance's own FRAME, the box the art actually fills.
//                  This is what the rotated ink is matched against.
//   rot          — the rotation the design applies to that instance, in degrees.
//                  `flipY: true` on Learn is Figma's `-scale-y-100`, applied first.
const PLANTS = [
  { key: 'learn',    file: 'Flower 3 - Become.svg',      left: 361.21,  top: -114.41,  w: 425.864, h: 443.369, fw: 227.004, fh: 389.429, rot: 139.37 },
  { key: 'practice', file: 'Flower 1 - Tutors.svg',      left: 235.00,  top: -254.998, w: 863.240, h: 756.678, fw: 736.680, fh: 585.977, rot: -15 },
  { key: 'train',    file: 'Flower 2 - CELPE-BRAS.svg',  left: 337.19,  top: -233.92,  w: 550.616, h: 636.046, fw: 325.000, fh: 547.000, rot: 29.21 },
  { key: 'help',     file: 'Flower 1 - Cover.svg',       left: -19.72,  top: -116.72,  w: 880.435, h: 830.630, fw: 521.002, fh: 710.383, rot: 55.72 },
  { key: 'plan',     file: 'Flower - Plans.svg',         left: 237.72,  top:  -47.03,  w: 476.426, h: 549.326, fw: 372.001, fh: 472.606, rot: 165.82 },
]

/** Alpha plane of a PNG, plus its dimensions. */
async function alpha(buf) {
  const img = sharp(buf).ensureAlpha()
  const { width, height } = await img.metadata()
  return { width, height, a: await img.extractChannel('alpha').raw().toBuffer() }
}

/** Ink box of an alpha plane. */
function inkBox({ width, height, a }) {
  let x0 = width, y0 = height, x1 = -1, y1 = -1
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (a[y * width + x] < 128) continue
      if (x < x0) x0 = x
      if (x > x1) x1 = x
      if (y < y0) y0 = y
      if (y > y1) y1 = y
    }
  }
  if (x1 < 0) throw new Error('empty raster — nothing to fit')
  return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 }
}

/** The local file rasterised, optionally flipped, then rotated — flip first, as the CSS does. */
function raster(file, flipY, deg) {
  let p = sharp(path.join(DECOR, file), { density: 300 }).resize({ width: RASTER })
  if (flipY) p = p.flip()
  return p.rotate(deg, { background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer()
}

/** Cache: only the measured numbers are kept, never the pixels. The ψ sweep visits
 *  720 angles × 2 flips = 1440 distinct (file,flipY,deg) keys per plant; caching the
 *  full alpha plane for each (as an earlier version did) retains gigabytes across a
 *  run and OOMs vips. Once inkBox() has consumed the raster here, it is allowed to
 *  be garbage collected — only its box and dimensions survive into the cache. */
const boxCache = new Map()
async function measuredBox(file, flipY, deg) {
  const key = `${file}|${flipY}|${deg}`
  if (!boxCache.has(key)) {
    const rot = await alpha(await raster(file, flipY, deg))
    boxCache.set(key, { width: rot.width, height: rot.height, box: inkBox(rot) })
  }
  return boxCache.get(key)
}

async function fit(plant) {
  const ref = await alpha(await sharp(path.join(REF, `${plant.key}.png`)).png().toBuffer())
  // The rectangle of the card this reference covers, and its scale.
  const rx0 = Math.max(0, plant.left)
  const ry0 = Math.max(0, plant.top)
  const ppu = ref.width / (Math.min(CARD_W, plant.left + plant.w) - rx0)

  // What the reference shows: the visible ink's area and centroid, in reference px.
  let refArea = 0, refCx = 0, refCy = 0
  for (let y = 0; y < ref.height; y++) {
    for (let x = 0; x < ref.width; x++) {
      if (ref.a[y * ref.width + x] < 128) continue
      refArea++; refCx += x; refCy += y
    }
  }
  if (!refArea) throw new Error(`${plant.key}: the reference has no ink`)
  refCx /= refArea; refCy /= refArea

  const frameAspect = plant.fw / plant.fh

  // Compose a fully specified candidate into the reference's frame and measure it.
  // Renders on demand rather than through any cache: only a handful of candidates
  // ever reach this, each composed a few times over the fixed-point loop, so the
  // redundant re-render is cheap — and never accumulates like the sweep would.
  const compose = async (flipY, deg, w, cx, cy) => {
    const buf = await raster(plant.file, flipY, deg)
    const { width: rw, height: rh } = await sharp(buf).metadata()
    const f = (w * ppu) / RASTER // raster px → reference px
    const sw = Math.max(1, Math.round(rw * f))
    const sh = Math.max(1, Math.round(rh * f))
    const scaled = await alpha(await sharp(buf)
      .resize(sw, sh, { fit: 'fill' }).png().toBuffer())
    // The rotated canvas is centred on the image's centre, which is what CSS places.
    const offX = (cx - rx0) * ppu - sw / 2
    const offY = (cy - ry0) * ppu - sh / 2

    let inter = 0, union = 0, area = 0, mx = 0, my = 0
    for (let y = 0; y < ref.height; y++) {
      for (let x = 0; x < ref.width; x++) {
        const sx = Math.round(x - offX)
        const sy = Math.round(y - offY)
        const mine = (sx >= 0 && sy >= 0 && sx < scaled.width && sy < scaled.height
          && scaled.a[sy * scaled.width + sx] >= 128) ? 1 : 0
        const theirs = ref.a[y * ref.width + x] >= 128 ? 1 : 0
        if (mine) { area++; mx += x; my += y }
        if (mine & theirs) inter++
        if (mine | theirs) union++
      }
    }
    return { iou: union ? inter / union : 0, area, cx: area ? mx / area : 0, cy: area ? my / area : 0 }
  }

  // ψ is the turn that brings the file's art back to the orientation the design
  // draws it at rest — the angle at which the ink box IS the instance's frame. The
  // aspect test is what finds it, and it is the only thing being searched.
  const candidates = []
  for (const flipY of [false, true]) {
    for (let psi = 0; psi < 360; psi += 0.5) {
      const degPsi = Math.round(psi * 100) / 100
      const { box } = await measuredBox(plant.file, flipY, degPsi)
      const err = Math.abs(box.w / box.h - frameAspect) / frameAspect
      if (err < 0.02) candidates.push({ flipY, psi, box, err })
    }
  }
  if (!candidates.length) throw new Error(`${plant.key}: no turn makes the ink match the frame`)

  // Each surviving ψ fixes the scale outright: the ink at ψ measures the frame, so
  // one number converts raster pixels to card units, and the image's own width
  // follows. Only the centre is left, and the reference is what settles it.
  const scored = []
  for (const c of candidates) {
    const s = plant.fw / c.box.w                  // card units per raster px
    const w = RASTER * s                          // the image's width, in card units
    const deg = Math.round(((c.psi + plant.rot) % 360 + 360) % 360 * 100) / 100
    let cx = plant.left + plant.w / 2
    let cy = plant.top + plant.h / 2
    let m = null
    for (let i = 0; i < 4; i++) {
      m = await compose(c.flipY, deg, w, cx, cy)
      if (!m.area) break
      cx += (refCx - m.cx) / ppu
      cy += (refCy - m.cy) / ppu
    }
    if (!m || !m.area) continue
    m = await compose(c.flipY, deg, w, cx, cy)
    scored.push({ iou: m.iou, deg, psi: c.psi, flipY: c.flipY, w, cx, cy })
  }
  if (!scored.length) throw new Error(`${plant.key}: every candidate composed to nothing`)
  scored.sort((a, b) => b.iou - a.iou)
  const best = scored[0]

  return {
    key: plant.key,
    file: plant.file,
    iou: best.iou,
    psi: best.psi,
    runnersUp: scored.slice(1, 4).map(r => `${r.deg}${r.flipY ? 'F' : ''}@${r.iou.toFixed(3)}`),
    right: +(((CARD_W - best.cx) / CARD_H) * 100).toFixed(3),
    top: +((best.cy / CARD_H) * 100).toFixed(3),
    w: +((best.w / CARD_H) * 100).toFixed(3),
    rotate: best.deg,
    flipY: best.flipY,
  }
}

for (const plant of PLANTS) {
  const r = await fit(plant)
  const flag = r.iou >= 0.92 ? '✓' : '✗'
  console.log(`${flag} ${r.key.padEnd(9)} IoU ${r.iou.toFixed(3)}  psi ${r.psi}  next: ${r.runnersUp.join(' ')}\n`
    + `    { file: '${r.file}', right: ${r.right}, top: ${r.top}, w: ${r.w}, `
    + `rotate: ${r.rotate}${r.flipY ? ', flipY: true' : ''} },`)
}
