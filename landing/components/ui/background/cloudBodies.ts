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
//   • Cloud 02 — measured, not drawn: the belly is the gap between the arc's underside
//     (`Vector_73`) and the top edge of the mass, sampled per column off a 4× raster and
//     reaching ~1px INTO both so no sky seam is left. The lower edge stops 6px short of the
//     arc's tip, so the body closes on a slanted shoulder instead of a straight cut.
//   • Cloud 03 — hand-fitted to the sketch: the top edge follows the ribbon's upper line,
//     the small arc, the short diagonal and the dome's underside; the bottom edge follows
//     the base line and the tail; only the right flank is drawn, because the sketch simply
//     trails off there.
//
// The adaptive-text static fill reconstructs the background from the raw SVG assets, so it
// sees sky where the screen now shows cream. Harmless: both sit far above the 0.70 duotone
// threshold, so headings pick the same side either way.
export const CLOUD_BODIES: Record<string, string> = {
  'Cloud 02':
    'M556.1 136.6L559.4 132.6L562.6 130.8L565.9 129.8L569.1 129.3L572.4 129.1L575.6 128.8L578.9 128.8L582.1 127.3L585.4 125.0L588.6 123.5L591.9 122.8L595.1 122.3L598.4 122.5L601.6 122.8L604.9 123.3L608.1 123.5L611.4 118.5L614.6 111.8L617.9 107.3L621.1 104.3L624.4 102.3L627.6 101.0L630.9 100.5L634.1 100.5L637.4 100.5L640.6 101.0L643.9 101.3L647.1 101.8L650.4 102.3L653.6 102.3L656.9 100.0L660.1 93.0L663.4 91.0L666.6 91.0L669.9 92.5L673.1 94.5L676.4 94.0L679.6 89.0L682.9 85.5L686.1 85.0L689.4 85.0L692.6 61.0L695.9 43.5L699.1 38.5L702.4 35.0L705.6 32.3L708.9 29.6L712.1 27.1L715.4 24.1L718.6 21.6L721.9 19.6L725.1 17.6L728.4 16.1L731.6 14.8L734.9 14.1L738.1 13.6L741.4 13.6L744.6 13.8L747.9 14.6L751.1 15.8L754.4 16.8L751.1 46.2L747.9 47.2L744.6 48.5L741.4 50.2L738.1 53.2L734.9 79.0L731.6 82.5L728.4 88.0L725.1 94.7L721.9 115.2L718.6 113.7L715.4 112.5L712.1 111.5L708.9 110.7L705.6 110.2L702.4 110.7L699.1 111.7L695.9 113.7L692.6 116.7L689.4 119.5L686.1 119.2L682.9 119.0L679.6 118.5L676.4 118.2L673.1 118.2L669.9 120.0L666.6 122.0L663.4 125.0L660.1 129.4L656.9 131.7L653.6 132.4L650.4 132.7L647.1 132.9L643.9 132.7L640.6 132.7L637.4 132.4L634.1 132.2L630.9 131.9L627.6 131.7L624.4 131.7L621.1 131.4L617.9 131.4L614.6 131.4L611.4 131.4L608.1 131.4L604.9 131.7L601.6 131.7L598.4 131.9L595.1 132.2L591.9 132.4L588.6 132.7L585.4 133.2L582.1 133.4L578.9 133.9L575.6 134.7L572.4 135.2L569.1 135.9L565.9 136.9L562.6 137.9L559.4 138.9L556.1 140.2Z',
  'Cloud 03':
    'M303.2 380.4L308.6 374.2L316.7 372.6L324.4 371.9L332.2 371.7L340 371.9L346.5 367.6L353.2 363.4L357.4 360.4L361 357.6L365.7 355.6L371.8 354.7L380 355.2L386.2 355.2L390.3 354.4L395.6 354.2L397.6 352.6L399.6 349L402.7 344.8L405.8 340.6L408 339.9L413.7 340.3L418.4 339.5L421.3 336.2L424.3 327.2L427.4 319.5L431.4 317L435.8 315.2L440.4 313.9L445.1 313.1L449.9 312.5L454.6 312.2L463 315.2L467.6 316.3L472.1 318L476.3 320.1L480.4 322.6L484.1 325.6L488.4 328.8C490 337 486.5 350 478 359.5C468 371 452 382 435.6 387.8L428.8 387.3L421.8 387.4L415.1 386.1L411 382.9L410 381.9L402.2 382.3L394.5 383.3L386.8 384.5L379.1 385.7L371.5 386.8L363.7 387.9L356 388.4L348.2 388.7L340.5 388.9L332.7 388.9L324.9 388.8L317.2 388.3L309.5 387.2L302.4 384.9Z',
}
