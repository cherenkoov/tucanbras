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

- [ ] **Step 1: Fetch the five isolated Figma renders**

Use the Figma MCP `get_screenshot` tool, once per node, with `contentsOnly: true` and `maxDimension: 2048`, then `curl` each returned URL into `landing/scripts/.figma-ref/`. The node ids and the file each one is fitted against:

| ref filename | Figma node | local file |
|---|---|---|
| `learn.png` | `3479:44720` | `Flower 3 - Become.svg` |
| `practice.png` | `3476:44596` | `Flower 1 - Tutors.svg` |
| `train.png` | `3479:44896` | `Flower 2 - CELPE-BRAS.svg` |
| `help.png` | `3479:44998` | `Flower 1 - Cover.svg` |
| `plan.png` | `3479:44971` | `Flower - Plans.svg` |

The URLs expire in ~7 days; that is fine, this script is a one-off.

- [ ] **Step 2: Ignore the reference dir**

Append to `landing/.gitignore`:

```
# one-off Figma renders used by scripts/fitFeaturePlants.mjs
scripts/.figma-ref/
```

- [ ] **Step 3: Write the fit script**

Create `landing/scripts/fitFeaturePlants.mjs`:

```js
// Four of the five feature-card plants were exported from instances that already
// carried a rotation, so the file's box has nothing to do with the design's. This
// fits each file to its own isolated Figma render — sweeping angles, scoring
// silhouette overlap — and prints what featureCardPlants.ts should hold.
//
//   npm run build is irrelevant here; this is pure raster work.
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
const MASK = 256   // both silhouettes are normalised to this box before scoring

// The instance's axis-aligned box in CARD coordinates, straight from the node.
const PLANTS = [
  { key: 'learn',    file: 'Flower 3 - Become.svg',      left: 361.21,  top: -114.41,  w: 425.864, h: 443.369 },
  { key: 'practice', file: 'Flower 1 - Tutors.svg',      left: 235.00,  top: -254.998, w: 863.240, h: 756.678 },
  { key: 'train',    file: 'Flower 2 - CELPE-BRAS.svg',  left: 337.19,  top: -233.92,  w: 550.616, h: 636.046 },
  { key: 'help',     file: 'Flower 1 - Cover.svg',       left: -19.72,  top: -116.72,  w: 880.435, h: 830.630 },
  { key: 'plan',     file: 'Flower - Plans.svg',         left: 237.72,  top:  -47.03,  w: 476.426, h: 549.326 },
]

/** Alpha-trimmed ink box of a PNG buffer, plus the canvas it was found in. */
async function ink(buf) {
  const img = sharp(buf).ensureAlpha()
  const { width, height } = await img.metadata()
  const a = await img.extractChannel('alpha').raw().toBuffer()
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
  return { canvas: { width, height }, box: { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 } }
}

/** A silhouette normalised into MASK×MASK, as a Uint8Array of 0/1. */
async function silhouette(buf, box) {
  const a = await sharp(buf)
    .ensureAlpha()
    .extract({ left: box.x, top: box.y, width: box.w, height: box.h })
    .resize(MASK, MASK, { fit: 'fill' })
    .extractChannel('alpha')
    .raw()
    .toBuffer()
  const out = new Uint8Array(MASK * MASK)
  for (let i = 0; i < out.length; i++) out[i] = a[i] >= 128 ? 1 : 0
  return out
}

function iou(a, b) {
  let inter = 0, union = 0
  for (let i = 0; i < a.length; i++) {
    if (a[i] & b[i]) inter++
    if (a[i] | b[i]) union++
  }
  return union ? inter / union : 0
}

/** The local file rasterised, optionally flipped, then rotated — flip first, as the CSS does. */
function raster(file, flipY, deg) {
  let p = sharp(path.join(DECOR, file), { density: 300 }).resize({ width: RASTER })
  if (flipY) p = p.flip()
  return p.rotate(deg, { background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer()
}

async function fit(plant) {
  const refBuf = await sharp(path.join(REF, `${plant.key}.png`)).png().toBuffer()
  const ref = await ink(refBuf)
  const refSil = await silhouette(refBuf, ref.box)

  let best = null
  for (const flipY of [false, true]) {
    for (let deg = 0; deg < 360; deg += 2) {
      const buf = await raster(plant.file, flipY, deg)
      const got = await ink(buf)
      const score = iou(refSil, await silhouette(buf, got.box))
      if (!best || score > best.score) best = { score, deg, flipY, buf, got }
    }
  }
  for (let deg = best.deg - 2; deg <= best.deg + 2; deg += 0.1) {
    const buf = await raster(plant.file, best.flipY, deg)
    const got = await ink(buf)
    const score = iou(refSil, await silhouette(buf, got.box))
    if (score > best.score) best = { score, deg: Math.round(deg * 100) / 100, flipY: best.flipY, buf, got }
  }

  // Card units per reference pixel, then per local raster pixel.
  const k = plant.w / ref.canvas.width
  const s = (ref.box.w * k) / best.got.box.w

  // Where the image's own centre lands. Rotation is about that centre, so the offset
  // from the ink's centre to the canvas centre is the only term that carries it.
  const inkCentre = {
    x: plant.left + (ref.box.x + ref.box.w / 2) * k,
    y: plant.top + (ref.box.y + ref.box.h / 2) * k,
  }
  const drift = {
    x: (best.got.box.x + best.got.box.w / 2 - best.got.canvas.width / 2) * s,
    y: (best.got.box.y + best.got.box.h / 2 - best.got.canvas.height / 2) * s,
  }
  const centre = { x: inkCentre.x - drift.x, y: inkCentre.y - drift.y }

  return {
    key: plant.key,
    file: plant.file,
    iou: best.score,
    right: +(((CARD_W - centre.x) / CARD_H) * 100).toFixed(3),
    top: +((centre.y / CARD_H) * 100).toFixed(3),
    w: +(((RASTER * s) / CARD_H) * 100).toFixed(3),
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
```

- [ ] **Step 4: Run the fit**

Run: `node scripts/fitFeaturePlants.mjs`
Expected: five lines, every one `✓` (IoU ≥ 0.97).

`train` is the control — its file already matches the design's proportions (0.591 vs 0.594), so it must come back near `rotate: 29.21` with `flipY: false`. If it does not, the script is wrong, not the art. Fix the script before trusting the other four.

A row below 0.97 means the local file is **not** the drawing the design uses. Stop and re-export that asset from Figma; do not nudge the number by eye.

- [ ] **Step 5: Sanity-check the centres against the spec**

Compare each printed `right`/`top` against spec §3's anchor table (Learn `15.813` / `68.240`, Practice `−43.015` / `78.461`, Train `−8.586` / `53.501`, Help `113.551` / `189.946`, Plan `78.287` / `144.805`). They are derived two different ways and must agree within ~2 cqh. A larger gap means the fit landed on a wrong angle that happens to score well — re-run with a finer sweep before continuing.

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
