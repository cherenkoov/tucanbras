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
 * so their box proportions are not the design's and none of these numbers could be
 * read off the node. They were fitted by `scripts/fitFeaturePlants.mjs`, which turns
 * each file until its ink box matches the instance's own FRAME — not the bigger box
 * the rotation sweeps out, which is the trap: this art is thin diagonal slivers, and
 * the bounding box of a sliver does not transform like a rotated rectangle.
 *
 * `Flower 2 - CELPE-BRAS.svg` is the control, and it is why the rest are trusted: it
 * is the one file NOT pre-rotated, so all three of its outputs are known in advance —
 * and the fit returns them together, ψ 0 / 29.21° / 206.743 cqh at IoU 0.996, with a
 * centre 0.3 cqh from where the node's own geometry independently puts it.
 *
 * Three files are recoloured copies — the design tints its instances, and the drawings
 * are not flat, so a CSS filter cannot stand in. See `scripts/genFeaturePlantArt.mjs`.
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
  { file: 'Flower 3 - Become - Feature Learn.svg', right: 14.713, top: 71.648, w: 296.722, rotate: 212.87 },
  /* 1 — «Практикуем реальные задачи», green card (card=Practice, 3476:44596).
     The fit lands on ~0° net rotation, which is the same answer heroPlants.ts records
     for this file: its export already carries the design's own −15°. */
  { file: 'Flower 1 - Tutors.svg', right: -111.533, top: 135.735, w: 546.326, rotate: 359.5, flipY: true },
  /* 2 — «Тренируем устную часть», blue card (card=Train, 3479:44896). The control. */
  { file: 'Flower 2 - CELPE-BRAS.svg', right: -8.848, top: 53.549, w: 206.743, rotate: 29.21 },
  /* 3 — «Учебный план по CELPE-BRAS», orange card (card=Plan, 3479:44971) */
  { file: 'Flower - Plans - Feature Plan.svg', right: 79.993, top: 144.724, w: 379.639, rotate: 105.82 },
  /* 4 — «Помогаем записаться на экзамен», yellow card (card=Help, 3479:44998) */
  { file: 'Flower 1 - Cover - Feature Help.svg', right: 114.056, top: 190.202, w: 546.307, rotate: 96.72 },
]

/**
 * Placement and art are split across two elements, and the split is what lets the
 * plant bloom on hover.
 *
 * The card's greenery answers to the pill's gesture (`.pill-decor`, 340ms), and that
 * bloom is a Tailwind `scale-[1.15]` — which in Tailwind v4 writes the `scale`
 * PROPERTY, not a `transform` function. The individual properties compose as
 * `translate · rotate · scale · transform`, so a `scale` applied to an element whose
 * `transform` already carries `translate(50%, -50%)` scales that offset too: the
 * flower would slide out of its corner as it grew, by 7.5% of its own width.
 *
 * So the OUTER box owns the placement — including the centring translate, which never
 * changes — and the INNER image owns the rotation. The bloom's `scale` then lands on
 * the image alone, about its own centre, where rotation is also centred. Both are
 * centred on the same point, so they commute and the plant grows exactly in place.
 *
 * It is the same split `globals.css` describes for the ⋮ blades: keep the gesture on a
 * different property from the art's own placement, and neither can cancel the other.
 */
export function featureCardPlantBoxStyle(p: FeatureCardPlant): CSSProperties {
  return {
    right: `${p.right}cqh`,
    top: `${p.top}cqh`,
    width: `${p.w}cqh`,
    transform: 'translate(50%, -50%)',
  }
}

/**
 * The art's own orientation, on the image inside that box.
 *
 * `scaleY(-1)` is written after the rotation so it applies FIRST, matching how Figma
 * composes the two (its `scale` acts before its `rotate`).
 *
 * Inline rather than in classes because these are computed values, and Tailwind only
 * generates rules for class names it can read literally.
 */
export function featureCardPlantArtStyle(p: FeatureCardPlant): CSSProperties {
  return {
    transform: `rotate(${p.rotate}deg)${p.flipY ? ' scaleY(-1)' : ''}`,
  }
}
