// Cream bodies for the two clouds the Figma export draws as an OPEN OUTLINE.
//
// Most clouds in `background-collage.svg` are closed silhouettes: sky never shows inside
// them. Two are line sketches instead — `Cloud 02` (its left half is one long arc over the
// solid mass) and `Cloud 03` (a wisp: a base line, two small arcs and a dome). While the
// page ground was cream those bellies read as cloud; since the ground became sky-blue
// (`--color-sky`, 2026-09) they read as holes punched through the art.
//
// The paths below fill exactly those bellies and are painted UNDER the group's own paths,
// so the exported beige strokes stay untouched and only the see-through part changes.
// Coordinates are the collage's own canvas units (viewBox 0 0 800 2047).
//
// How they were fitted (redo it the same way after an art re-export, `Vector_*` ids drift):
//   • Cloud 02 — measured, not drawn. Off a 4× raster, every column across the whole cloud
//     (x 554…976) spans the FIRST to the LAST opaque pixel of the cloud itself, pixel
//     CENTRES. So the body can never reach past the art into the sky, and the half-pixel it
//     falls short of is under a stroke that paints after it. Taking the LAST opaque pixel —
//     not the first one below the arc — is what matters: it paints back over the solid mass
//     (harmless) and so leaves no seam behind any thin stroke.
//     Two corrections on top of that raw silhouette, both about the cloud being drawn as
//     SEPARATE pieces with sky between them:
//       – narrow, deep notches in the top edge (grey opening along x, window 12, only where
//         the edge plunges more than 10) are bridged. That is the hairline of sky between
//         the arc's tip and the trailing curls: the pieces overlap in x, so the raw top
//         drops to the mass and climbs back within a couple of units.
//       – the wide bay between the two lobes (x 814…905, mass floor at y≈90) is capped
//         DELIBERATELY, so the fill is one continuous body instead of two cream cliffs
//         flanking a blue canyon (owner's call, 2026-09-09: «соединить зоны A и B в одну»).
//         The cap runs from one lobe's edge to the other with a parabolic sag of 35 — a
//         straight chord reads as a ruler, a polyline as a dent; the sag keeps the
//         two-lobe silhouette legible. Ends are anchored ON the art, so no cream sits
//         above a stroke. The sag is the only free number in the whole fit — everything
//         else is measured — so a flatter or deeper cap is one constant away when refitting.
//   • Cloud 03 — hand-fitted to the sketch: the top edge follows the ribbon's upper line,
//     the small arc, the short diagonal and the dome's underside; the bottom edge follows
//     the base line and the tail; only the right flank is drawn, because the sketch simply
//     trails off there. Cloud 02's per-column rule does NOT work here — this sketch is a
//     row of detached strokes, and spanning each column tears the body into slabs.
//
// The adaptive-text static fill reconstructs the background from the raw SVG assets, so it
// sees sky where the screen now shows cream. Harmless: both sit far above the 0.70 duotone
// threshold, so headings pick the same side either way.
export const CLOUD_BODIES: Record<string, string> = {
  'Cloud 02':
    'M554.1 135.9L556.6 133.2L560.1 131.2L563.4 130.2L577.1 128.4L590.1 122.7L592.6 122.2L606.4 122.4L619.1 105.4L622.4 102.4L624.9 101.2L630.1 99.9L637.6 99.9L652.9 101.9L654.9 100.4L658.4 93.4L663.1 90.2L667.6 91.2L672.4 93.7L674.6 93.7L679.9 86.7L681.6 85.7L684.1 85.4L684.6 68.9L685.9 65.4L690.6 60.2L692.6 56.7L693.1 44.9L695.6 39.4L698.4 36.2L703.6 31.7L722.1 18.7L728.4 15.4L736.1 13.2L742.1 13.2L754.1 15.9L756.9 17.4L757.6 19.4L760.9 19.9L765.1 22.2L769.4 27.2L769.6 24.9L770.1 24.9L770.4 29.9L772.9 27.2L775.9 25.2L780.9 24.9L785.9 26.4L788.4 28.9L791.4 33.7L793.1 34.4L795.9 34.2L802.1 31.4L808.1 31.4L814.4 34.9L824.9 46.1L835.4 53.4L840.6 55.7L846.1 57.1L851.6 57.4L856.9 56.7L864.1 54.2L871.4 50L878.4 44.1L885.6 36.3L894.6 24L903.4 9.5L904.6 7.2L907.6 -4.3L908.6 -5.6L917.4 -11.1L925.9 -13.8L932.9 -13.6L945.9 -10.3L951.1 -20.6L953.9 -24.6L957.9 -28.8L966.4 -34.1L976.4 -37.8L976.4 143.9L956.9 144.2L952.4 143.4L946.9 141.2L944.4 139.4L940.4 135.4L937.1 130.9L931.4 134.2L925.4 135.9L919.9 135.7L913.6 133.9L902.1 142.9L884.1 148.2L849.4 150.4L838.4 150.4L826.1 148.4L823.9 147.4L820.4 144.4L813.9 143.9L808.1 145.4L792.9 151.7L781.9 149.7L774.9 146.7L771.9 143.9L769.6 139.9L767.9 132.7L762.9 130.9L756.9 130.9L746.4 132.4L716.4 139.4L707.4 140.9L631.9 140.9L615.6 142.2L592.6 145.4L580.6 145.4L563.1 143.9L558.9 142.4L554.1 138.2Z',
  'Cloud 03':
    'M303.2 380.4L308.6 374.2L316.7 372.6L324.4 371.9L332.2 371.7L340 371.9L346.5 367.6L353.2 363.4L357.4 360.4L361 357.6L365.7 355.6L371.8 354.7L380 355.2L386.2 355.2L390.3 354.4L395.6 354.2L397.6 352.6L399.6 349L402.7 344.8L405.8 340.6L408 339.9L413.7 340.3L418.4 339.5L421.3 336.2L424.3 327.2L427.4 319.5L431.4 317L435.8 315.2L440.4 313.9L445.1 313.1L449.9 312.5L454.6 312.2L463 315.2L467.6 316.3L472.1 318L476.3 320.1L480.4 322.6L484.1 325.6L488.4 328.8C490 337 486.5 350 478 359.5C468 371 452 382 435.6 387.8L428.8 387.3L421.8 387.4L415.1 386.1L411 382.9L410 381.9L402.2 382.3L394.5 383.3L386.8 384.5L379.1 385.7L371.5 386.8L363.7 387.9L356 388.4L348.2 388.7L340.5 388.9L332.7 388.9L324.9 388.8L317.2 388.3L309.5 387.2L302.4 384.9Z',
}
