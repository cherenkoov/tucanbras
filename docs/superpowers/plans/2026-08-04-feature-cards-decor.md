# CELPE-BRAS feature-card plants — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give each of the five CELPE-BRAS feature cards its decorative plant from Figma `3476:44591` — clipped by the card's rounded box, painted under the icon and label.

**Architecture:** A data module (`featureCardPlants.ts`) holds one entry per card — file, centre offsets, width, rotation — all measured in `cqh` of the card, so the crop matches the design at every card width. A presentational component (`FeatureCardDecor.tsx`) renders the clip layer that provides the `cqh` unit, the plant, and the inner highlight. Both the desktop grid (`CelpeBras.tsx`) and the mobile stack (`CelpeBrasStack.tsx`) mount it. Four of the five art files were exported already-rotated, so their angle and width are **fitted** against isolated Figma renders rather than copied from the node.

**Tech Stack:** Next 16 / React 19 server components, Tailwind v4, `sharp` for rasterising, Playwright for the guard, `tsx` for scripts.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-08-04-feature-cards-decor-design.md`. Read it first.
- All work happens under `landing/`. Run every command from `landing/`.
- **Refinement on spec §3:** the spec framed the fit as producing "the anchor's position inside the file's box as fractions". The fit below instead outputs the **image's own centre** in card units directly, which the CSS can place with `translate(50%, -50%)` and no extra term. The spec's anchor table stays as the expected value — the fit's centre must land within 2 cqh of it, and that agreement is a check on the fit.
- Card reference geometry from Figma, used by every calculation: **599 × 157.2**. One `cqh` = 1% of the card's height.
- Tailwind only emits rules for class names it can read **literally**. Every computed value here is an inline style. Never write `w-[${x}cqh]`.
- Tailwind's preflight sets `max-width: 100%` on `<img>`; it beats a `cqh` width. Every plant needs `max-w-none`.
- Never rasterise with Chromium when `sharp` will do.
- Playwright measurements require a production build with **no dev server running** — they share `.next`, and a stale build serves dead chunk hashes, which makes every computed style a browser default. Always: stop `next dev`, `rm -rf .next`, `npm run build`, `npm start`.
- Inside `page.evaluate`, never write a named arrow (`const f = () => …`) — esbuild emits a `__name()` call that does not exist in the browser. Keep bodies inline.
- The tree has unrelated in-flight work (`CelpeBrasCta.tsx`, `coverGlass.ts`, `Header.tsx`, `LanguageSwitcher.tsx`). Stage only the files each task names.

## File structure

| File | Responsibility |
|---|---|
| `scripts/fitFeaturePlants.mjs` (new) | One-off calibration: fits each local SVG against its isolated Figma render, prints the module's numbers. Not run by CI. |
| `scripts/genFeaturePlantArt.mjs` (new) | Generates the three recoloured copies and asserts both of their tones. |
| `public/SVG/header/decor/*.svg` (3 new) | The recoloured copies. |
| `components/ui/featureCardPlants.ts` (new) | The five plants as data + `featureCardPlantStyle`. No JSX. |
| `components/ui/FeatureCardDecor.tsx` (new) | The clip layer, the plant, the inner highlight. No data. |
| `components/sections/CelpeBras.tsx` (modify) | Desktop `FeatureCard` mounts the decor. |
| `components/sections/CelpeBrasStack.tsx` (modify) | Mobile card mounts the decor. |
| `scripts/verifyFeaturePlants.ts` (new) | The guard: geometry, clipping, paint order, art tones. |
| `package.json` (modify) | `verify:feature-plants`, `gen:feature-plant-art`. |

---

### Task 1: Fit the art to the design

Four files' box proportions do not match their design instances, so their angle and width cannot be read off the node. This task produces the numbers Task 3 hard-codes.

**Files:**
- Create: `landing/scripts/fitFeaturePlants.mjs`
- Modify: `landing/.gitignore`

**Interfaces:**
- Produces: printed per-card `{ file, right, top, w, rotate, flipY }` in `cqh`, plus an IoU score. Task 3 copies these verbatim.

- [ ] **Step 1: Check the five reference renders are in place**

They have already been fetched into `landing/scripts/.figma-ref/` — `learn.png`, `practice.png`, `train.png`, `help.png`, `plan.png`, from Figma nodes `3479:44720`, `3476:44596`, `3479:44896`, `3479:44998`, `3479:44971` respectively. Confirm all five exist and are non-empty; do not re-fetch (the URLs are one-shot).

**What they are, precisely:** each is the flower **as its card crops it** — not the instance's full box. Figma renders the node clipped by the card's `overflow-clip`, so `learn.png` is 238 × 158 for a flower whose own box is 425.864 × 443.369. Each image therefore maps to a known rectangle of the card:

```
rx0 = max(0, left)      ry0 = max(0, top)
rx1 = min(599, left+w)  ry1 = min(157.2, top+h)
```

That is *better* reference than an isolated render — it is the end-to-end result the implementation has to reproduce — but it means the ink centre cannot be read off it, and the fit below is built around that.

- [ ] **Step 2: Ignore the reference dir**

Append to `landing/.gitignore`:

```
# one-off Figma renders used by scripts/fitFeaturePlants.mjs
scripts/.figma-ref/
```

- [ ] **Step 3: Write the fit script**

Create `landing/scripts/fitFeaturePlants.mjs`:

**Match the rotated ink to the instance's INNER frame, not to its outer box.** Each flower sits in Figma as a rotated instance, and the node reports two boxes: the instance's own frame (`325 × 547` for Train — the art's box) and the outer box the rotation sweeps out (`550.616 × 636.046`). The art's ink fills the frame; it does not fill the swept box. Two earlier versions of this task got this wrong in opposite directions — one matched the swept box (which selects an angle ~2° off and a width ~30% too large), the other gave up and let angle, scale and position all float against the reference (which aliases: at IoU 0.968 a bigger leaf shifted sideways reproduces the same crop, and the scale diverged badly enough to exceed sharp's pixel limit).

With the frame as the target the problem is one-parameter and closed-form. Sweep the angle; at each angle the rotated ink box has to be *proportional to the frame*, which selects the angle and hands you the scale; the frame's centre coincides with the outer box's centre, which hands you the position. Nothing floats.

The control proves the formulation before you trust it: `Flower 2 - CELPE-BRAS.svg` is the one file that is not pre-rotated — its ink at 0° measures 900 × 1514, aspect 0.5945, against the frame's 325/547 = 0.5941 — so it must come back at ψ = 0, `rotate` = the design's own 29.21°, and `w` = 325 card units = 206.7 cqh.

The reference renders then have no free parameters left to absorb error, which makes the IoU a real verification rather than an objective to optimise.

```js
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

/** Cache: rotating is the expensive step and the sweep revisits angles. */
const rotCache = new Map()
async function rotated(file, flipY, deg) {
  const key = `${file}|${flipY}|${deg}`
  if (!rotCache.has(key)) rotCache.set(key, alpha(await raster(file, flipY, deg)))
  return rotCache.get(key)
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
  const compose = async (flipY, deg, w, cx, cy) => {
    const rot = await rotated(plant.file, flipY, deg)
    const f = (w * ppu) / RASTER // raster px → reference px
    const sw = Math.max(1, Math.round(rot.width * f))
    const sh = Math.max(1, Math.round(rot.height * f))
    const scaled = await alpha(await sharp(await raster(plant.file, flipY, deg))
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
      const rot = await rotated(plant.file, flipY, Math.round(psi * 100) / 100)
      const box = inkBox(rot)
      const err = Math.abs(box.w / box.h - frameAspect) / frameAspect
      if (err < 0.02) candidates.push({ flipY, psi, box, rot, err })
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
```

`plant.rot` is the design's own rotation for that instance, which the sweep adds to ψ to get the angle the CSS applies: Learn `139.37`, Practice `-15`, Train `29.21`, Help `55.72`, Plan `165.82`. Add them to the `PLANTS` rows as `rot`.

`w` is the image's width in card units before the final `cqh` conversion, which is why the printed `w` divides by `CARD_H` and not by `RASTER`.

- [ ] **Step 4: Run the fit**

Run: `node scripts/fitFeaturePlants.mjs`

**`train` is the control, and it now checks three numbers at once.** Its file is the one that is *not* pre-rotated — its ink aspect measures 0.5945 against the frame's 0.5941 — so all three of its outputs are known independently:

| output | required | why it is known |
|---|---|---|
| `psi` | ≈ `0` | the file already sits at the design's rest orientation |
| `rotate` | ≈ `29.21` | ψ = 0, so the CSS angle is the design's own |
| `w` | ≈ `206.7` | the frame is 325 card units over a 157.2 card |

All three must land, not just the angle. A run where `rotate` is right and `w` is 30% out is the aliasing failure this formulation exists to remove, and it means the scale is not coming from the frame. If any of the three misses, the script is wrong and the other four rows are worthless — fix the script first and do not report the other numbers as if they meant anything.

The control also sets the bar for the IoU. This is an end-to-end silhouette comparison between two different renderers at roughly one pixel per card unit, so a correct fit scores high but not 1.0; `train`'s score is what "correct" looks like for this art at this resolution. Read the five rows against it:

- **≥ 0.92, and within ~0.05 of the control** — good, take the numbers.
- **materially below the control** — that plant is not fitted. Widen the ψ aspect tolerance to 0.04 and re-run that plant first; if the winner does not move, the local file is not the drawing the design uses. Stop and re-export the asset from Figma. Do not nudge the number by eye.

Report all five scores in the task report whatever they are — the controller adjudicates a borderline row, the implementer does not.

- [ ] **Step 5: Sanity-check against the spec, and against the runners-up**

Two checks, and neither is a hard gate — they are how a wrong answer that scores well gets caught.

**The centres.** Spec §3's anchor table gives the instance box's centre: Learn `15.813` / `68.240`, Practice `−43.015` / `78.461`, Train `−8.586` / `53.501`, Help `113.551` / `189.946`, Plan `78.287` / `144.805`. For `train` — the only file that is not pre-rotated — the fitted centre should land within ~2 cqh of it. For the other four the image's box is not the instance's box, so a difference of tens of cqh is expected and fine; what would be suspicious is a difference of hundreds.

**The runners-up.** The script prints the next three angles and their scores. If the winner beats them by a comfortable margin the fit is decided. If several angles score within ~0.01 of each other, that plant's visible crop does not constrain the angle — say so in the report rather than picking one. `help` is the likely candidate: only a small corner of a large flower is inside its card.

- [ ] **Step 6: Commit**

```bash
git add scripts/fitFeaturePlants.mjs .gitignore
git commit -m "chore(celpe): скрипт подгонки декора feature-карточек к макету"
```

---

### Task 2: The three recoloured copies

Each file carries **one** `fill`; its lighter tone comes from a screen layer inside the drawing. So the darker of the two tones Figma renders **is** the fill to write, and the lighter one follows for free — which is exactly what makes it checkable.

**Files:**
- Create: `landing/scripts/genFeaturePlantArt.mjs`
- Create: `landing/public/SVG/header/decor/Flower 3 - Become - Feature Learn.svg`
- Create: `landing/public/SVG/header/decor/Flower 1 - Cover - Feature Help.svg`
- Create: `landing/public/SVG/header/decor/Flower - Plans - Feature Plan.svg`
- Modify: `landing/package.json`

**Interfaces:**
- Produces: the three filenames above, consumed by `FEATURE_CARD_PLANTS` in Task 3.

- [ ] **Step 1: Write the generator**

Create `landing/scripts/genFeaturePlantArt.mjs`:

```js
// Three of the five feature-card plants are drawn in a colour the shipped file does
// not carry. Same move as the CTA blooms (see celpeCtaPlants.ts): copy the file and
// replace its single fill — a CSS filter cannot do it, because the file is not flat.
//
// Its inner screen layer means one fill renders as TWO tones. The darker tone IS the
// fill; the lighter is the screen result at that file's own layer opacity. So the
// swap is a literal substitution, and the check is that BOTH tones land — a light
// tone that drifts means the blend did not survive the edit.
//
//   npm run gen:feature-plant-art
import sharp from 'sharp'
import fs from 'node:fs'
import path from 'node:path'

const DECOR = 'public/SVG/header/decor'

// `want` are Figma's rendered tones with the variant's own opacity divided back out
// (Learn's variant is opaque; Practice/Train/Help/Plan carry opacity 0.99).
const JOBS = [
  { src: 'Flower 3 - Become.svg', out: 'Flower 3 - Become - Feature Learn.svg', from: '#71673D', to: '#C8B76E', want: ['#c8b76e'] },
  { src: 'Flower 1 - Cover.svg',  out: 'Flower 1 - Cover - Feature Help.svg',   from: '#79743C', to: '#C9C272', want: ['#c9c272', '#d8d389'] },
  { src: 'Flower - Plans.svg',    out: 'Flower - Plans - Feature Plan.svg',     from: '#BEA94A', to: '#575030', want: ['#575030', '#665e3b'] },
]

const TOL = 4

/** The n most common fully-opaque colours in a rasterised SVG. */
async function tones(file, n) {
  const { data, info } = await sharp(fs.readFileSync(file))
    .resize({ width: 240, fit: 'inside' })
    .ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const counts = new Map()
  for (let i = 0; i < data.length; i += info.channels) {
    if (data[i + 3] < 200) continue
    const key = `${data[i]},${data[i + 1]},${data[i + 2]}`
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return [...counts].sort((a, b) => b[1] - a[1]).slice(0, n)
    .map(([k]) => '#' + k.split(',').map(v => (+v).toString(16).padStart(2, '0')).join(''))
}

const near = (a, b) => [1, 3, 5].every(i =>
  Math.abs(parseInt(a.slice(i, i + 2), 16) - parseInt(b.slice(i, i + 2), 16)) <= TOL)

let failed = false
for (const job of JOBS) {
  const src = path.join(DECOR, job.src)
  const out = path.join(DECOR, job.out)
  const svg = fs.readFileSync(src, 'utf8')
  const hits = svg.match(new RegExp(job.from, 'gi')) ?? []
  if (!hits.length) throw new Error(`${job.src}: no ${job.from} to replace — the asset changed`)
  fs.writeFileSync(out, svg.replace(new RegExp(job.from, 'gi'), job.to))

  const got = await tones(out, job.want.length)
  const ok = job.want.every(w => got.some(g => near(g, w)))
  console.log(`${ok ? '✓' : '✗'} ${job.out}  ${hits.length} fills → ${job.to}  renders ${got.join(' ')}  want ${job.want.join(' ')}`)
  if (!ok) failed = true
}
if (failed) process.exit(1)
```

- [ ] **Step 2: Add the npm script**

In `landing/package.json`, alongside `gen:pill-art`:

```json
"gen:feature-plant-art": "node scripts/genFeaturePlantArt.mjs",
```

- [ ] **Step 3: Run it and watch it fail honestly**

Run: `npm run gen:feature-plant-art`
Expected: three `✓` lines. The tone assertion is the test here — it fails loudly if a file's blend structure ever changes under it.

If a light tone misses by more than 4, do **not** widen `TOL`. It means the screen layer's opacity is not what the darker tone implies, and the correct fill has to be solved by bisection on that channel instead.

- [ ] **Step 4: Commit**

```bash
git add scripts/genFeaturePlantArt.mjs package.json "public/SVG/header/decor/Flower 3 - Become - Feature Learn.svg" "public/SVG/header/decor/Flower 1 - Cover - Feature Help.svg" "public/SVG/header/decor/Flower - Plans - Feature Plan.svg"
git commit -m "feat(celpe): перекрашенные копии декора для feature-карточек"
```

---

### Task 3: The plants module

**Files:**
- Create: `landing/components/ui/featureCardPlants.ts`

**Interfaces:**
- Consumes: Task 1's printed numbers, Task 2's filenames.
- Produces: `FeatureCardPlant`, `FEATURE_CARD_PLANTS: readonly FeatureCardPlant[]` (five entries, indexed to `data.cards`), `featureCardPlantStyle(p: FeatureCardPlant): CSSProperties`, re-exported `decorSrc(file: string): string`.

- [ ] **Step 1: Write the module**

Create `landing/components/ui/featureCardPlants.ts`. Replace every number in `FEATURE_CARD_PLANTS` with Task 1's output — the values below are the spec's anchors and a placeholder width, and shipping them unedited is a bug:

```ts
import type { CSSProperties } from 'react'

export { decorSrc } from '@/components/ui/heroPlants'

/**
 * The plant each CELPE-BRAS feature card is drawn with (Figma 3476:44591).
 *
 * ── Why cqh, and not cqw ──
 *
 * The design draws the card at 599 × 157.2. In production its width is whatever the
 * two-column row leaves it — ~490px at 1024, ~850px at 1720 — while its height stays
 * put. Sized in cqw the flower would grow by 40% across that range over a card that
 * grows by none, and what shows would be a steadily bigger crop of a leaf. Sized in
 * cqh the crop is the design's at every width, and a wider card simply shows more of
 * the flat colour on its left — which is where the label lives.
 *
 * The unit comes from the layer FeatureCardDecor puts inside the card, not from the
 * card: `container-type: size` makes an element's size independent of its contents,
 * and the card's height is set by its contents (the label wraps differently per
 * locale and width). An `inset-0` layer takes its size from the card, so it can carry
 * the containment the card itself cannot.
 *
 * ── Where the numbers come from ──
 *
 * `right`/`top` place the image's CENTRE, in cqh, from the card's right and top edges;
 * a negative `right` puts the centre past the right edge. The centre is the anchor
 * because rotation is about it — it is the one point the transform cannot move.
 *
 * `w` is the width of the FILE's own box, also in cqh. Height is never written: a
 * width plus `height: auto` takes the file's aspect, so nothing here can be squashed.
 *
 * Four of the five files were exported from instances that already carried a rotation,
 * so their box proportions are not the design's and `w`/`rotate` cannot be read off
 * the node. They were fitted instead — scripts/fitFeaturePlants.mjs sweeps angles
 * against an isolated Figma render of each instance and scores silhouette overlap.
 * `Flower 2 - CELPE-BRAS.svg` is the control: its aspect already matches (0.591 against
 * 0.594 drawn), and the fit returns the node's own 29.21°.
 *
 * Three of the files are recoloured copies — the design tints its instances, and the
 * drawings are not flat, so a CSS filter cannot stand in. See genFeaturePlantArt.mjs.
 *
 * Indexed to `data.cards` from Notion, which is NOT the order the variants are stacked
 * in Figma: the node runs Learn, Practice, Train, Help, Plan; the content runs Learn,
 * Practice, Train, **Plan, Help**.
 */
export type FeatureCardPlant = {
  /** file in `public/SVG/header/decor` */
  file: string
  /** centre offset from the card's RIGHT edge, in cqh. Negative = past the edge. */
  right: number
  /** centre offset from the card's TOP edge, in cqh */
  top: number
  /** width of the file's own box, in cqh. Height follows the file. */
  w: number
  /** degrees, about the image's centre, applied after the flip */
  rotate: number
  /** whether the file has to be turned over first */
  flipY?: boolean
}

export const FEATURE_CARD_PLANTS: readonly FeatureCardPlant[] = [
  /* 0 — «Разбираем структуру экзамена», cream card (Figma card=Learn, 3479:44720) */
  { file: 'Flower 3 - Become - Feature Learn.svg', right: 15.813, top: 68.240, w: 0, rotate: 0, flipY: true },
  /* 1 — «Практикуем реальные задачи», green card (card=Practice, 3476:44596) */
  { file: 'Flower 1 - Tutors.svg', right: -43.015, top: 78.461, w: 0, rotate: 0 },
  /* 2 — «Тренируем устную часть», blue card (card=Train, 3479:44896) */
  { file: 'Flower 2 - CELPE-BRAS.svg', right: -8.586, top: 53.501, w: 0, rotate: 0 },
  /* 3 — «Учебный план по CELPE-BRAS», orange card (card=Plan, 3479:44971) */
  { file: 'Flower - Plans - Feature Plan.svg', right: 78.287, top: 144.805, w: 0, rotate: 0 },
  /* 4 — «Помогаем записаться на экзамен», yellow card (card=Help, 3479:44998) */
  { file: 'Flower 1 - Cover - Feature Help.svg', right: 113.551, top: 189.946, w: 0, rotate: 0 },
]

/**
 * Where one plant's box has to sit for its centre to land `right`/`top` from the card's
 * corner.
 *
 * `right`/`top` place the box; the translate then pulls it back over its own centre.
 * The translate is written FIRST so it applies LAST — the flip and the rotation run
 * about the untranslated centre, which is what keeps `right`/`top` independent of the
 * angle. `scaleY(-1)` is written last so it applies FIRST, matching how Figma composes
 * the two (its `scale` acts before its `rotate`).
 *
 * Inline rather than in classes because these are computed values, and Tailwind only
 * generates rules for class names it can read literally.
 */
export function featureCardPlantStyle(p: FeatureCardPlant): CSSProperties {
  return {
    right: `${p.right}cqh`,
    top: `${p.top}cqh`,
    width: `${p.w}cqh`,
    transform: `translate(50%, -50%) rotate(${p.rotate}deg)${p.flipY ? ' scaleY(-1)' : ''}`,
  }
}
```

- [ ] **Step 2: Paste in Task 1's numbers**

Replace `w: 0, rotate: 0` on all five entries with the fitted values, and drop `flipY` from any entry the fit did not flag. Every `w` must be non-zero when you are done — a `0` here renders nothing and no tool will complain.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add components/ui/featureCardPlants.ts
git commit -m "feat(celpe): геометрия декора feature-карточек в cqh"
```

---

### Task 4: The decor layer, on both cards

**Files:**
- Create: `landing/components/ui/FeatureCardDecor.tsx`
- Modify: `landing/components/sections/CelpeBras.tsx` (the `FeatureCard` function and its five call sites)
- Modify: `landing/components/sections/CelpeBrasStack.tsx` (the card `div`)

**Interfaces:**
- Consumes: `FEATURE_CARD_PLANTS`, `featureCardPlantStyle`, `decorSrc`.
- Produces: `<FeatureCardDecor index={number} />`; DOM hooks `[data-feature-decor="<i>"]` on the layer and `[data-feature-plant="<i>"]` on the image, which Task 5 measures.

- [ ] **Step 1: Write the component**

Create `landing/components/ui/FeatureCardDecor.tsx`:

```tsx
import { FEATURE_CARD_PLANTS, featureCardPlantStyle, decorSrc } from '@/components/ui/featureCardPlants'

/**
 * The plant inside one feature card, clipped to it and painted under its contents.
 *
 * Three things are load-bearing:
 *
 * `container-type: size` lives on THIS layer, not on the card. The plants are measured
 * in cqh, and cqh needs a container whose size is not set by its contents — which the
 * card's is. An `inset-0` layer takes its size from the card, so it can carry the
 * containment without taking the card's height away.
 *
 * `max-w-none` on the image. Tailwind's preflight sets `max-width: 100%` on <img>, and
 * it beats a cqh width: the flower would quietly draw at the card's width and land
 * nowhere near where it was placed.
 *
 * The inner highlight is re-drawn here, on top. Figma paints it above the flower; a
 * box-shadow on the card would paint below the card's children, so the card keeps only
 * its drop shadow and the inset half moves here.
 */
export default function FeatureCardDecor({ index }: { index: number }) {
  const plant = FEATURE_CARD_PLANTS[index]
  if (!plant) return null

  return (
    <div
      aria-hidden
      data-feature-decor={index}
      className="absolute inset-0 overflow-hidden pointer-events-none"
      style={{ borderRadius: 'inherit', containerType: 'size' }}
    >
      <img
        src={decorSrc(plant.file)}
        alt=""
        data-feature-plant={index}
        className="absolute h-auto max-w-none select-none pointer-events-none"
        style={featureCardPlantStyle(plant)}
      />
      <div
        className="absolute inset-0"
        style={{ borderRadius: 'inherit', boxShadow: 'inset 0px 4px 4px 0px rgba(255,255,255,0.25)' }}
      />
    </div>
  )
}
```

- [ ] **Step 2: Mount it on the desktop card**

In `landing/components/sections/CelpeBras.tsx`, import the component and give `FeatureCard` an `index`. The three edits inside `FeatureCard`:

```tsx
function FeatureCard({ index, title, icon, bg, tint, text }: { index: number; title: string; icon: string; bg: string; tint: string; text: string }) {
  return (
    <div
      data-glass-center
      data-adaptive-cover={bg}
      className="glass relative flex flex-1 items-center gap-[48px] min-w-[300px] overflow-hidden rounded-[44px] px-[32px] py-[32px] hover:scale-[1.04] active:scale-[0.95]"
      style={{
        minHeight: '164px',
        '--glass-tint': tint,
        '--glass-solid': bg,
        boxShadow: '0px 2px 4px 0px rgba(0,0,0,0.18)',
      } as CSSProperties}
    >
      <FeatureCardDecor index={index} />

      {/* Icon — `relative` so it paints over the decor layer: an absolutely positioned
          sibling outranks a static one whatever the DOM order. */}
      <div className="relative shrink-0" style={{ width: 'clamp(48px, 6vw, 100px)', height: 'clamp(48px, 6vw, 100px)' }}>
        <img src={icon} alt="" className="w-full h-full object-contain pointer-events-none" />
      </div>

      {/* Label */}
      <p
        className="relative font-accent font-bold flex-1 min-w-0"
        style={{ fontSize: 'clamp(20px, 2vw, 36px)', lineHeight: '1.1', color: text, letterSpacing: '0.12em' }}
      >
        {title}
      </p>
    </div>
  )
}
```

Note the `boxShadow` lost its `inset 0px 4px 4px 0px rgba(255,255,255,0.25)` half — `FeatureCardDecor` draws it now.

- [ ] **Step 3: Pass the index at all five call sites**

Each of the five `<FeatureCard …>` calls gains `index={N}` matching its `CARD_CONFIG[N]`:

```tsx
<FeatureCard index={0} title={c0} icon={CARD_CONFIG[0].icon} text={CARD_CONFIG[0].text} bg={CARD_CONFIG[0].bg} tint={CARD_CONFIG[0].tint} />
```

…and so on through `index={4}` on the `c4` card in row 3.

- [ ] **Step 4: Mount it on the mobile card**

In `landing/components/sections/CelpeBrasStack.tsx`, import `FeatureCardDecor`, then inside the card `div` (the one with `className={\`glass flex items-center …\`}`): add `relative` to its class list, drop the `inset` half of its `boxShadow`, render `<FeatureCardDecor index={i} />` as its first child, and add `relative` to the icon wrapper and the `<p>`:

```tsx
<div
  data-adaptive-cover={cardConfig[i].bg}
  className={`glass relative flex items-center gap-[32px] w-fit max-w-full overflow-hidden rounded-[44px] px-[32px] py-[32px] hover:scale-[1.04] active:scale-[0.95] ${isActive ? 'is-center' : ''}`}
  style={{
    '--glass-tint': cardConfig[i].tint,
    '--glass-solid': cardConfig[i].bg,
    boxShadow: '0px 2px 4px 0px rgba(0,0,0,0.18)',
  } as CSSProperties}
>
  <FeatureCardDecor index={i} />
  <div className="relative shrink-0" style={{ width: 'clamp(48px, 6vw, 100px)', height: 'clamp(48px, 6vw, 100px)' }}>
    <img src={cardConfig[i].icon} alt="" className="w-full h-full object-contain pointer-events-none" />
  </div>
  <p
    className="relative font-accent font-bold flex-1 min-w-0"
    style={{ fontSize: 'clamp(20px, 2vw, 36px)', lineHeight: '1.1', color: cardConfig[i].text, letterSpacing: '0.12em' }}
  >
    {title}
  </p>
</div>
```

- [ ] **Step 5: Typecheck and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: both clean.

- [ ] **Step 6: See it**

Run: `npm run build && npm start`, then open `http://localhost:3000/ru` and scroll to CELPE-BRAS.
Expected: each card carries its flower, cut off by the card's rounded edge, behind the icon and the label. If a card is bare, its `w` is still `0` from Task 3.

- [ ] **Step 7: Commit**

```bash
git add components/ui/FeatureCardDecor.tsx components/sections/CelpeBras.tsx components/sections/CelpeBrasStack.tsx
git commit -m "feat(celpe): декор в feature-карточках — десктоп и мобильная стопка"
```

---

### Task 5: The guard

Every way this breaks is silent: the page still renders, `tsc` and lint still pass, and the flower is merely the wrong size, in the wrong place, or under the card's own paint.

Spec §5 lists five assertions. Four live here; the art-tone one stays in `gen:feature-plant-art` (Task 2), where the raster work already is — Task 6's full check re-runs it, so a copy that drifts from the design still fails a clean run.

**Files:**
- Create: `landing/scripts/verifyFeaturePlants.ts`
- Modify: `landing/package.json`

**Interfaces:**
- Consumes: `FEATURE_CARD_PLANTS` (imported, so the guard asserts the shipped numbers), `[data-feature-plant]`, `[data-glass-center]`.

- [ ] **Step 1: Write the guard**

Create `landing/scripts/verifyFeaturePlants.ts`:

```ts
// The five CELPE-BRAS feature cards each carry a flower, sized in cqh of a container
// layer inside the card. Everything that can go wrong here is invisible to tsc:
//
//   • preflight's `max-width: 100%` beats a cqh width, so a plant asked for 200% of
//     the card's height quietly draws at the card's WIDTH and lands nowhere;
//   • `container-type: size` on the wrong element takes the card's height away, or
//     resolves cqh against something that is not the card;
//   • the icon and the label only paint over the decor because they are positioned —
//     lose `relative` and the flower covers the words with nothing to notice;
//   • a `w` left at 0 renders an empty image and the card simply looks unchanged.
//
// Run against a PROD build with no dev server running (they share .next):
//
//   npm run build && npm start
//   npm run verify:feature-plants                       → http://localhost:3000/ru
//   npm run verify:feature-plants -- http://host/pt 390x844 touch
import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'
import { FEATURE_CARD_PLANTS } from '../components/ui/featureCardPlants'

const BASE = process.argv[2] ?? 'http://localhost:3000/ru'
const vpArg = /^(\d+)x(\d+)$/.exec(process.argv[3] ?? '')
const VIEWPORT = vpArg ? { width: Number(vpArg[1]), height: Number(vpArg[2]) } : { width: 1440, height: 900 }
const TOUCH = process.argv.includes('touch')
const TOL = 2

const failures: string[] = []
const ok: string[] = []

function near(label: string, got: number, want: number, tol = TOL) {
  if (Math.abs(got - want) > tol) failures.push(`${label}: ${got.toFixed(2)}px, expected ${want.toFixed(2)}px`)
  else ok.push(`${label} ${got.toFixed(1)}px ≈ ${want.toFixed(1)}px`)
}

async function main() {
  // ── art on disk. A missing file is a 404 the layout absorbs in silence.
  for (const p of FEATURE_CARD_PLANTS) {
    const f = path.join('public/SVG/header/decor', p.file)
    if (!fs.existsSync(f)) failures.push(`missing art: ${p.file}`)
    else ok.push(`${p.file} is on disk`)
    if (!(p.w > 0)) failures.push(`${p.file}: w is ${p.w} — the plant renders as nothing`)
  }

  const browser = await chromium.launch()
  const page = await browser.newPage({
    viewport: VIEWPORT,
    deviceScaleFactor: 1,
    ...(TOUCH ? { isMobile: true, hasTouch: true } : {}),
  })
  // NotionRetry reloads the page three times when Notion is unreachable, which lands
  // measurements at random points inside four page loads. Same pre-seed as
  // verifyHeroPlants; coupled to STORAGE_KEY in components/ui/NotionRetry.tsx.
  await page.addInitScript(() => {
    try { sessionStorage.setItem('notion_retry', '99') } catch { /* storage blocked */ }
  })
  await page.goto(BASE, { waitUntil: 'load', timeout: 60_000 })
  await page.waitForSelector('[data-feature-plant]', { timeout: 15_000 })
  await page.evaluate(() => Promise.all(
    Array.from(document.querySelectorAll<HTMLImageElement>('[data-feature-plant]'))
      .map(i => (i.complete ? Promise.resolve() : i.decode().catch(() => {}))),
  ))
  await page.waitForTimeout(300)

  const cards = await page.evaluate(() => {
    const out: Record<string, unknown>[] = []
    // Every rendered plant, desktop grid or mobile stack — whichever this viewport shows.
    for (const img of Array.from(document.querySelectorAll<HTMLImageElement>('[data-feature-plant]'))) {
      const layer = img.parentElement!
      const card = layer.parentElement!
      const ib = img.getBoundingClientRect()
      const cb = card.getBoundingClientRect()
      // Both card sets are always in the DOM — the desktop grid is `hidden lg:flex`
      // and the stack is `lg:hidden`. A `display` check on the card itself misses
      // this (the hidden element is its ancestor); a zero-sized rect does not.
      if (!(cb.width > 0 && cb.height > 0)) continue
      const cs = getComputedStyle(img)
      // The icon wrapper and the label are the card's non-decor element children.
      const kids = Array.from(card.children).filter(el => el !== layer)
      out.push({
        index: Number(img.getAttribute('data-feature-plant')),
        src: img.getAttribute('src'),
        natural: img.naturalWidth,
        // offsetWidth is the LAYOUT width — untouched by the rotation, which is what
        // `w` actually sets. The bounding rect is the rotated box and would never match.
        layoutW: img.offsetWidth,
        centre: { x: ib.x + ib.width / 2, y: ib.y + ib.height / 2 },
        box: { x: ib.x, y: ib.y, right: ib.right, bottom: ib.bottom },
        card: { x: cb.x, y: cb.y, w: cb.width, h: cb.height, right: cb.right, bottom: cb.bottom },
        maxW: cs.maxWidth,
        events: cs.pointerEvents,
        layerContain: getComputedStyle(layer).containerType,
        cardOverflow: getComputedStyle(card).overflow,
        kidPositions: kids.map(el => getComputedStyle(el).position),
      })
    }
    return out
  })

  if (!cards.length) failures.push('no feature plants rendered at all')

  for (const c of cards as any[]) {
    const p = FEATURE_CARD_PLANTS[c.index]
    const label = `card ${c.index}`
    const u = c.card.h / 100 // one cqh, in px

    if (!c.natural) failures.push(`${label}: ${c.src} did not load`)
    near(`${label} width`, c.layoutW, p.w * u)
    near(`${label} centre ↔ card right edge`, c.card.right - c.centre.x, p.right * u)
    near(`${label} centre ↔ card top edge`, c.centre.y - c.card.y, p.top * u)

    if (c.maxW !== 'none') failures.push(`${label}: max-width is "${c.maxW}" — preflight is clamping the plant back`)
    if (c.events !== 'none') failures.push(`${label}: pointer-events is "${c.events}" — the plant will eat taps on the card`)
    if (c.layerContain !== 'size') failures.push(`${label}: the decor layer's container-type is "${c.layerContain}", not "size" — cqh resolves against the wrong box`)
    if (c.cardOverflow === 'visible') failures.push(`${label}: the card does not clip — the plant will hang outside it`)

    // The art is drawn far larger than the card on purpose; if it fits, it is scaled wrong.
    if (c.box.right <= c.card.right && c.box.x >= c.card.x && c.box.y >= c.card.y && c.box.bottom <= c.card.bottom) {
      failures.push(`${label}: the plant sits entirely inside the card — the design crops it`)
    } else ok.push(`${label} plant is cropped by the card`)

    // Both the icon and the label must be positioned, or an absolutely positioned
    // earlier sibling paints OVER them.
    const unpositioned = c.kidPositions.filter((v: string) => v === 'static').length
    if (unpositioned) failures.push(`${label}: ${unpositioned} card child is position:static — the plant paints over it`)
    else ok.push(`${label} icon and label are positioned above the plant`)
  }

  const docOverflow = await page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth)
  if (docOverflow > 0) failures.push(`document scrolls horizontally by ${docOverflow}px`)

  await browser.close()

  ok.forEach(l => console.log(`✓ ${l}`))
  if (failures.length) {
    console.error('\n✗ ' + failures.join('\n✗ '))
    process.exit(1)
  }
  console.log(`\n✓ ${cards.length} feature plants sized, placed and clipped at ${VIEWPORT.width}px${TOUCH ? ' (touch)' : ''}`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
```

- [ ] **Step 2: Add the npm script**

In `landing/package.json`, after `verify:celpe-cta`:

```json
"verify:feature-plants": "tsx scripts/verifyFeaturePlants.ts"
```

- [ ] **Step 3: Prove it catches a real break**

Temporarily change one entry's `w` in `featureCardPlants.ts` (say Learn's, to `40`). Then stop the running server, `npm run build`, start it again with `npm start`, and in a second shell:

Run: `npm run verify:feature-plants`
Expected: FAIL — `card 0 width: …px, expected …px`.

Restore the value, stop the server, rebuild, restart, re-run.
Expected: PASS.

A guard that has never been seen to fail is not a guard.

- [ ] **Step 4: Run it at the real breakpoints**

With the prod build up:

```bash
npm run verify:feature-plants -- http://localhost:3000/ru 1920x1080
npm run verify:feature-plants -- http://localhost:3000/ru 1440x900
npm run verify:feature-plants -- http://localhost:3000/ru 1024x800
npm run verify:feature-plants -- http://localhost:3000/pt 1440x900
npm run verify:feature-plants -- http://localhost:3000/ru 390x844 touch
```

Expected: PASS on all five. `pt` is the long-label locale; `390x844 touch` is the mobile stack.

- [ ] **Step 5: Commit**

```bash
git add scripts/verifyFeaturePlants.ts package.json
git commit -m "test(celpe): гард геометрии декора feature-карточек"
```

---

### Task 6: The visual pass, and the mobile lever

The guard proves the numbers; it cannot say whether the composition reads. That is this task.

**Files:**
- Modify: `landing/components/ui/featureCardPlants.ts` (only if the mobile check demands it)
- Modify: `landing/CLAUDE.md`

- [ ] **Step 1: Compare against the design**

With the prod build up, screenshot the five desktop cards at 1440 and put each next to the Figma render of its variant (`get_screenshot` on `3476:44592`, `3476:44595`, `3476:44606`, `3476:44609`, `3476:44612`). The crop of each flower — which part of the plant the card's edge cuts through — should be the design's. A card whose crop is visibly a different part of the drawing means its `rotate` is off by more than the fit's tolerance; re-run Task 1 for that one with a 0.05° refine step.

- [ ] **Step 2: Check the phone**

Open `http://localhost:3000/ru` at 390×844 with touch emulation and scroll the CELPE-BRAS stack through all five cards.

The question is only this: does any flower reach the label's letters? The stack's cards are `w-fit`, so they are much narrower than the design's 599 while their height is nearly the same — the plant covers proportionally more of them.

- [ ] **Step 3: If it does, add one lever**

Only if Step 2 shows the art on the words. Add a single documented multiplier to `featureCardPlants.ts` and apply it in `FeatureCardDecor` when the mobile stack renders — one number for all five plants, not per-card nudges:

```ts
/**
 * The mobile stack's cards are `w-fit` — much narrower than the design's 599 at nearly
 * the same height — so a plant sized from the desktop ratio spends more of itself over
 * the label. This shrinks all five by one factor rather than re-fitting each: the
 * arrangement stays the design's, it is simply smaller.
 */
export const FEATURE_PLANT_STACK_SCALE = 1
```

Feed it through `featureCardPlantStyle(p, scale)` (multiplying `w`, `right` and `top`, so the composition scales about the card's top-right rather than sliding), pass `FEATURE_PLANT_STACK_SCALE` from `CelpeBrasStack`'s call site only, and update the guard to expect `p.w * scale * u` when it is measuring a stack card. Leave the constant at `1` and this task's diff is documentation.

- [ ] **Step 4: Write it down**

Add to `landing/CLAUDE.md`, in the CELPE-BRAS section: the cards carry decor from `featureCardPlants.ts`, the numbers are fitted by `scripts/fitFeaturePlants.mjs` against Figma `3476:44591`, three of the files are recoloured copies generated by `npm run gen:feature-plant-art`, and `npm run verify:feature-plants` is the guard.

- [ ] **Step 5: Full check**

```bash
npx tsc --noEmit
npm run lint
npm run gen:feature-plant-art
npm run build && npm start
npm run verify:feature-plants
```

Expected: all clean.

- [ ] **Step 6: Commit**

```bash
git add components/ui/featureCardPlants.ts CLAUDE.md
git commit -m "docs(celpe): декор feature-карточек — проверка на брейкпоинтах"
```
