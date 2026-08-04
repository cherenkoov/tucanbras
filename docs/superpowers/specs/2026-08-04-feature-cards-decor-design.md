# CELPE-BRAS feature cards — decorative plants — design

**Date:** 2026-08-04
**Status:** approved (pending spec review)
**Area:** `landing/` — CELPE-BRAS section, feature cards
**Design:** Figma `3476:44591` — *Feature / Card* component set (five variants)

## Goal

Each of the five CELPE-BRAS feature cards gains a decorative plant, drawn from
`public/SVG/header/decor`, clipped by the card's rounded box and painted **under**
the icon and the label.

Nothing else about the card changes. The design node reproduces the current
geometry exactly — icon 100px, icon↔label gap 48px, padding 32px, radius 44px,
drop shadow `0 2 4 rgba(0,0,0,0.18)`, inner highlight `inset 0 4 4
rgba(255,255,255,0.25)` — so this is an addition, not a rebuild.

### Non-goals

- Typography. The rendered label uses `clamp(20px, 2vw, 36px)` / `line-height 1.1`
  / `letter-spacing 0.12em`; the node says 36px / 32px / 0. That divergence predates
  this work and stays.
- Card colours, card order, the `.glass` frosted→solid behaviour, the section's
  quote, hint and CTA.
- The mobile stack's scroll mechanics (`CelpeBrasStack`); it only receives the
  same decor its cards' desktop twins get.

## 1. Which plant goes on which card

Card order is the Notion order (`data.cards`), which is **not** the order the
variants are stacked in Figma. The pairing below is by card identity, not index
in the node.

| # | card | fill | Figma variant | file in `decor/` |
|---|---|---|---|---|
| 0 | Разбираем структуру | `#fffce5` | `card=Learn` | `Flower 3 - Become.svg` |
| 1 | Практикуем задачи | `#7cb082` | `card=Practice` | `Flower 1 - Tutors.svg` (anthurium) |
| 2 | Тренируем устную | `#2e67b2` | `card=Train` | `Flower 2 - CELPE-BRAS.svg` |
| 3 | Учебный план | `#f26434` | `card=Plan` | `Flower - Plans.svg` |
| 4 | Помогаем записаться | `#ffd376` | `card=Help` | `Flower 1 - Cover.svg` |

Figma draws the Practice flower as a loose vector group named *Pink Flower*
rather than an instance; it is the same anthurium the Hero wears, so the same
file serves. The fit in §3 confirms it before the number is trusted.

## 2. Three files need a recoloured copy

Sampling the node's render against the local files (every Figma reading below is
already corrected for the `opacity: 0.99` the variants carry, which multiplies
the whole card by ~0.99):

| card | file's own fill | Figma renders | verdict |
|---|---|---|---|
| Practice | `#F58B8C` + `#FDBB40` | `#f2898a` + `#fab93f` | matches — use as is |
| Train | `#465D3E` (+ `#59734F` blended) | `#455c3d` + `#58724e` | matches — use as is |
| Learn | `#71673D` | `#c8b76e` | **recolour** |
| Help | `#79743C` (+ `#918B4D` blended) | `#c7c071` + `#d6d187` | **recolour** |
| Plan | `#BEA94A` (+ `#CCB959` blended) | `#665e3b` + `#564f30` | **recolour** |

This is the same situation `celpeCtaPlants.ts` documents for the CTA blooms: each
file carries **one** `fill` value, and its second tone comes from a blend layer
inside the drawing (`mix-blend-screen`, visible in the node's own markup). A CSS
`filter` cannot hold two tones apart, and a `mask` + background would collapse
them to one. So: copies of the file with the single fill replaced.

Copies land next to the originals, named for their use:

- `Flower 3 - Become - Feature Learn.svg`
- `Flower 1 - Cover - Feature Help.svg`
- `Flower - Plans - Feature Plan.svg`

The replacement fill is **solved, not guessed**: the blend makes the mapping from
`fill` to rendered tones non-analytic, so the calibration script (§3) renders
candidate fills, measures the two dominant tones, and converges on the value whose
tones land on the Figma targets above. Both tones must match, not just the base —
that is what proves the blend survived the swap.

## 3. Geometry, and why it must be fitted

Figma places each flower as a rotated instance inside the 599 × 157.2 card. The
**centre** of that instance is rotation-invariant (rotating a box about its own
centre leaves the axis-aligned box centred on the same point), so the anchor
below is final and comes straight from the node:

| card | anchor from card's RIGHT edge | anchor from card's TOP | Figma instance | rotation |
|---|---|---|---|---|
| Learn | 24.86px → **15.813cqh** | 107.27px → **68.240cqh** | 227.004 × 389.429 | 139.37°, flipped on Y |
| Practice | −67.62px → **−43.015cqh** | 123.34px → **78.461cqh** | 736.680 × 585.977 | −15° |
| Train | −13.50px → **−8.586cqh** | 84.10px → **53.501cqh** | 325 × 547 | 29.21° |
| Help | 178.50px → **113.551cqh** | 298.60px → **189.946cqh** | 521.002 × 710.383 | 55.72° |
| Plan | 123.07px → **78.287cqh** | 227.63px → **144.805cqh** | 372.001 × 472.606 | 165.82° |

(`cqh` = the card's height; the px values are Figma's own, over 157.2. A negative
right-anchor means the centre sits outside the card, past its right edge.)

What is **not** final is the width and the angle, because four of the five files
were exported from instances that already carried a rotation — their box
proportions do not match the design's:

| file | file viewBox | design instance | aspect |
|---|---|---|---|
| `Flower 2 - CELPE-BRAS.svg` | 91 × 154 | 325 × 547 | 0.591 vs 0.594 — **already aligned** |
| `Flower 3 - Become.svg` | 171 × 133 | 227 × 389 | 1.286 vs 0.583 |
| `Flower 1 - Cover.svg` | 860 × 878 | 521 × 710 | 0.979 vs 0.733 |
| `Flower - Plans.svg` | 169 × 159 | 372 × 473 | 1.063 vs 0.787 |
| `Flower 1 - Tutors.svg` | 167 × 146 | 737 × 586 | 1.144 vs 1.257 |

`heroPlants.ts` hit this exact problem and settled it by fitting, not by
arithmetic. Same method here — a one-off `scripts/fitFeaturePlants.mjs`:

1. Pull an isolated render of each flower instance from Figma
   (`get_screenshot` with `contentsOnly`, nodes `3479:44720`, `3476:44596`,
   `3479:44896`, `3479:44998`, `3479:44971`).
2. Rasterise the local file with `sharp` over a sweep of candidate angles
   (and both Y-flips), trim each result to its ink.
3. Score silhouette IoU against the Figma render; keep the best.
4. Print, per flower: net `rotate`, whether the Y-flip is needed, the file box's
   width in `cqh`, and the anchor's position inside that box as fractions
   (`0.5, 0.5` when the fit shows symmetric margins).

A fit that does not reach IoU ≥ 0.97 means the file is not the drawing the design
uses — stop and re-source the asset rather than nudging numbers by eye.
`sharp` is used for rasterising, never Chromium.

## 4. Code

### `components/ui/featureCardPlants.ts` (new)

Built on `celpeCtaPlants.ts`, which is the closest precedent and whose comments
explain the same trade-offs. Exports:

- `FEATURE_CARD_PLANTS: readonly FeatureCardPlant[]` — five entries, **indexed to
  match `data.cards`**, each `{ file, right, top, w, rotate, flipY, anchor }`.
  `right`/`top` place the anchor in `cqh`; `w` is the file box's width in `cqh`;
  height is never written, so `height: auto` takes the file's own aspect and
  nothing can be squashed.
- `featureCardPlantStyle(p): CSSProperties` — turns one entry into
  `right`/`top`/`width`/`transform`. The translate is written first so it applies
  last, keeping the anchor independent of the angle, exactly as the CTA does.

Inline styles rather than classes, because Tailwind only generates rules for
class names it can read literally.

### `components/ui/FeatureCardDecor.tsx` (new)

One prop: the card's index. Renders

- a clip layer — `absolute inset-0`, `pointer-events-none`,
  `border-radius: inherit`, `container-type: size`. The layer, not the card, is
  the container: `container-type: size` needs a size that does not come from
  content, and the card's height **does** come from its content (label wrapping
  differs by locale and width). An `inset-0` layer takes its size from the card,
  so it is safe there and gives the `cqh` unit the plants are measured in.
- one `<img aria-hidden alt="" className="absolute h-auto max-w-none select-none
  pointer-events-none">` carrying `featureCardPlantStyle(...)`. `max-w-none` is
  required: Tailwind's preflight `max-width: 100%` would otherwise beat the
  `cqw`/`cqh` width and drag the flower left.
- the inner highlight on top — `absolute inset-0`, `border-radius: inherit`,
  `box-shadow: inset 0 4px 4px rgba(255,255,255,0.25)`. Figma paints that
  highlight above the flower; a `box-shadow` on the card itself would paint below
  its children. The card's own `boxShadow` therefore keeps only the drop shadow.

The card already has `overflow: hidden`, so the clip is the card's own.

### `components/sections/CelpeBras.tsx` — `FeatureCard`

Takes the card's index, renders `<FeatureCardDecor>` as its first child, and adds
`relative` to the icon wrapper and the label so both stay above the art.
`boxShadow` loses its `inset` half (now drawn by the decor layer).

### `components/sections/CelpeBrasStack.tsx`

Same three edits on the mobile card. The stack's cards are `w-fit` and narrower,
so the art covers proportionally more of them; if the 375px check in §5 shows it
reaching the label, the lever is a single documented sub-`lg` multiplier on `w`
in `featureCardPlants.ts` — not per-card nudges.

## 5. Verification

`scripts/verifyFeaturePlants.ts` + a `verify:feature-plants` npm script, in the
shape of `verifyHeroPlants.ts`. It asserts, against a **production build with no
dev server running** (they share `.next`, and a stale build serves dead chunk
hashes — every measurement then reads a browser default):

1. Every file named in `FEATURE_CARD_PLANTS` exists on disk.
2. The three recoloured copies render the tones from §2, within a small
   tolerance — sharp only, no browser.
3. Each card renders exactly one decor `<img>`, and its measured box matches what
   `featureCardPlantStyle` claims at that card's height. This is what catches the
   module's numbers drifting from the markup.
4. Every decor image is clipped: its box extends past the card's, and the card's
   computed `overflow` is not `visible`.
5. The label's computed colour is unchanged and the icon and label both paint
   above the art (checked by z-order/stacking, not by eye).

On top of the script: `npm run lint`, `tsc`, and a visual pass over a production
build at 375 / 768 / 1024 / 1440 / 1920, comparing each card against the Figma
render of its variant.

## 6. Risks

- **The anthurium may not be the right file.** `Flower 1 - Tutors.svg` is
  pre-rotated (heroPlants documents it), and the design draws its copy as loose
  vectors. The §3 fit is the gate: below IoU 0.97 the asset gets re-exported
  instead of forced.
- **A recolour that kills the second tone.** Caught by asserting both tones, not
  the base fill.
- **Mobile legibility.** Answered by the 375px pass in §5, with the sub-`lg`
  multiplier as the single lever.
- Payload is not a risk: the four files involved are 5.8–13.5 KB each.
