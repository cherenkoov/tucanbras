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

// The instance's axis-aligned box in CARD coordinates, straight from the node.
const PLANTS = [
  { key: 'learn',    file: 'Flower 3 - Become.svg',      left: 361.21,  top: -114.41,  w: 425.864, h: 443.369 },
  { key: 'practice', file: 'Flower 1 - Tutors.svg',      left: 235.00,  top: -254.998, w: 863.240, h: 756.678 },
  { key: 'train',    file: 'Flower 2 - CELPE-BRAS.svg',  left: 337.19,  top: -233.92,  w: 550.616, h: 636.046 },
  { key: 'help',     file: 'Flower 1 - Cover.svg',       left: -19.72,  top: -116.72,  w: 880.435, h: 830.630 },
  { key: 'plan',     file: 'Flower - Plans.svg',         left: 237.72,  top:  -47.03,  w: 476.426, h: 549.326 },
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

async function fit(plant) {
  const ref = await alpha(await sharp(path.join(REF, `${plant.key}.png`)).png().toBuffer())
  // The rectangle of the card this reference covers, and its scale.
  const rx0 = Math.max(0, plant.left)
  const ry0 = Math.max(0, plant.top)
  const ppu = ref.width / (Math.min(CARD_W, plant.left + plant.w) - rx0)

  let best = null
  const score = async (flipY, deg) => {
    const rot = await alpha(await raster(plant.file, flipY, deg))
    const box = inkBox(rot)
    // Uniform scale only: the ink has to fill the instance's box on BOTH axes, so a
    // candidate whose aspect is wrong is the wrong angle, not a stretch to apply.
    const s = plant.w / box.w
    const aspectErr = Math.abs(box.h * s - plant.h) / plant.h
    if (aspectErr > 0.06) return null

    const f = s * ppu // raster px → reference px
    const rw = Math.max(1, Math.round(rot.width * f))
    const rh = Math.max(1, Math.round(rot.height * f))
    const scaled = await alpha(await sharp(await raster(plant.file, flipY, deg))
      .resize(rw, rh, { fit: 'fill' }).png().toBuffer())
    const offX = (plant.left - rx0) * ppu - box.x * f
    const offY = (plant.top - ry0) * ppu - box.y * f

    let inter = 0, union = 0
    for (let y = 0; y < ref.height; y++) {
      for (let x = 0; x < ref.width; x++) {
        const sx = Math.round(x - offX)
        const sy = Math.round(y - offY)
        const mine = (sx >= 0 && sy >= 0 && sx < scaled.width && sy < scaled.height
          && scaled.a[sy * scaled.width + sx] >= 128) ? 1 : 0
        const theirs = ref.a[y * ref.width + x] >= 128 ? 1 : 0
        if (mine & theirs) inter++
        if (mine | theirs) union++
      }
    }
    return { iou: union ? inter / union : 0, deg, flipY, s, box, canvas: { w: rot.width, h: rot.height } }
  }

  for (const flipY of [false, true]) {
    for (let deg = 0; deg < 360; deg += 2) {
      const r = await score(flipY, deg)
      if (r && (!best || r.iou > best.iou)) best = r
    }
  }
  if (!best) throw new Error(`${plant.key}: no angle produced the instance's proportions`)
  for (let deg = best.deg - 2; deg <= best.deg + 2; deg += 0.1) {
    const r = await score(best.flipY, Math.round(deg * 100) / 100)
    if (r && r.iou > best.iou) best = r
  }

  // The image's own centre, which is what the CSS places. Rotation is about it, so
  // the offset from the ink's box to the raster's centre is the only term that carries.
  const centre = {
    x: plant.left + (best.canvas.w / 2 - best.box.x) * best.s,
    y: plant.top + (best.canvas.h / 2 - best.box.y) * best.s,
  }

  return {
    key: plant.key,
    file: plant.file,
    iou: best.iou,
    right: +(((CARD_W - centre.x) / CARD_H) * 100).toFixed(3),
    top: +((centre.y / CARD_H) * 100).toFixed(3),
    w: +(((RASTER * best.s) / CARD_H) * 100).toFixed(3),
    rotate: best.deg,
    flipY: best.flipY,
  }
}

for (const plant of PLANTS) {
  const r = await fit(plant)
  const flag = r.iou >= 0.97 ? '✓' : '✗'
  console.log(`${flag} ${r.key.padEnd(9)} IoU ${r.iou.toFixed(3)}  `
    + `{ file: '${r.file}', right: ${r.right}, top: ${r.top}, w: ${r.w}, `
    + `rotate: ${r.rotate}${r.flipY ? ', flipY: true' : ''} }`)
}
