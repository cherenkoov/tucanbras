// `main 2.svg` (the beach/boulevard scene) is a STANDALONE Figma export. Three problems
// to fix before inlining it next to the collage:
//
//  1) ID COLLISIONS. Figma numbers its auto-ids from the same base in every export
//     (clip0_0_1, paint0_linear_0_1, filter0_…), so the beach and the collage define
//     identical ids. In one DOM `url(#…)` resolves to the FIRST match — the collage,
//     painted above — so the beach's `clip-path="url(#clip0_0_1)"` grabbed the COLLAGE's
//     clip and the whole scene got clipped away, leaving only its backdrop rect (the
//     grey slab). We namespace every id + every reference (url(#…), [xlink:]href="#…")
//     with a unique prefix so the beach points only at its own defs.
//  2) FIXED SIZE. It keeps its OWN viewBox (1027×3614); we drop the fixed width/height
//     so it fills 100% width, derive height from the viewBox, and `display:block` to
//     kill the inline-SVG baseline gap so it sits flush under the collage.
//  3) OPAQUE BACKDROPS. Figma exports TWO full-frame backdrop rects behind the scene:
//     an outer <rect …fill="#1E1E1E"/> (the Figma frame) and an inner
//     <rect …fill="#77533E"/> (the brown ground added in the latest export). Both make
//     the beach opaque and would hide the wave layer behind it (z9), so we strip BOTH.
//     The brown is re-rendered as its OWN layer at z8 (BELOW the waves) — see the
//     `brownRef` backdrop in BackgroundCanvas — so the beach keeps a solid brown base
//     everywhere while the animated waves still show through the transparent sea-gap. NB:
//     the <clipPath> ALSO holds a 1027×3614 rect, but with fill="white"; removing that one
//     clips the whole scene away (main2 vanishes), so the fill MUST be part of each match.
export const BEACH_PREFIX = 'b2-'
// Brown ground stripped from the beach SVG and painted on its own z8 layer (below waves).
export const BEACH_GROUND_COLOR = '#77533E'

export function prepareBeachSvg(svgString: string): string {
  return svgString
    .replace(/\bid="([^"]+)"/g, `id="${BEACH_PREFIX}$1"`)
    .replace(/url\(#([^)]+)\)/g, `url(#${BEACH_PREFIX}$1)`)
    .replace(/((?:xlink:)?href)="#([^"]+)"/g, `$1="#${BEACH_PREFIX}$2"`)
    .replace(/<rect width="1027" height="3614" fill="#1E1E1E"\/>/g, '')
    .replace(/<rect width="1027" height="3614" fill="#77533E"\/>/g, '')
    .replace(
      /(<svg\b[^>]*?)\swidth="[^"]*"\s+height="[^"]*"/,
      '$1 width="100%" style="display:block"'
    )
}
