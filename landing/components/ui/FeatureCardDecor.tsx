import {
  FEATURE_CARD_PLANTS,
  featureCardPlantBoxStyle,
  featureCardPlantArtStyle,
  decorSrc,
} from '@/components/ui/featureCardPlants'

/**
 * The plant inside one feature card, clipped to it and painted under its contents.
 *
 * Four things are load-bearing:
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
 * The bloom is the header pills' own gesture, on the pills' own `.pill-decor` timing
 * (340ms, cubic-bezier(0.22, 1, 0.36, 1)), so a card's greenery and the header's move
 * with one vocabulary. It answers to `group-hover/card` for a cursor and to
 * `group-data-tapped/card` for a finger — `:active` is not a substitute, because it
 * dies with the touch about 200ms before the art has finished opening (see
 * components/ui/tapBloom.ts). The classes are spelled out literally: Tailwind only
 * generates rules for class names it can read, and an interpolated one produces no
 * rule at all while everything still builds and lints clean.
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
      {/* Placement only — never animated, so the bloom cannot drag the flower out of
          its corner. */}
      <div
        className="absolute"
        style={featureCardPlantBoxStyle(plant)}
      >
        <img
          src={decorSrc(plant.file)}
          alt=""
          data-feature-plant={index}
          className="pill-decor block w-full h-auto max-w-none select-none pointer-events-none motion-safe:group-hover/card:scale-[1.15] motion-safe:group-data-tapped/card:scale-[1.15]"
          style={featureCardPlantArtStyle(plant)}
        />
      </div>

      <div
        className="absolute inset-0"
        style={{ borderRadius: 'inherit', boxShadow: 'inset 0px 4px 4px 0px rgba(255,255,255,0.25)' }}
      />
    </div>
  )
}
