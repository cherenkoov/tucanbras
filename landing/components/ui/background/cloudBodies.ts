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
//   • Cloud 02 — measured, not drawn: off a 4× raster, in every column from the tail's left
//     tip to the arc's tip (x 554…757.4) the body spans the FIRST to the LAST opaque pixel
//     of the cloud itself, pixel CENTRES. So it can never reach past the art into the sky,
//     and the half-pixel it falls short of is under a stroke that paints after it. Taking
//     the last opaque pixel — not the first one below the arc — is what matters: it paints
//     back over the solid mass (harmless) and so leaves no seam behind any thin stroke.
//     The right edge closes vertically at the arc's tip: the sketch's outline just stops
//     there, and a straight drop to the mass invents the least.
//   • Cloud 03 — hand-fitted to the sketch: the top edge follows the ribbon's upper line,
//     the small arc, the short diagonal and the dome's underside; the bottom edge follows
//     the base line and the tail; only the right flank is drawn, because the sketch simply
//     trails off there. Cloud 02's per-column rule does NOT work here — this sketch is a
//     row of detached strokes, and spanning each column tears the body into slabs.
//
// What stays sky, deliberately: the two wide bays between Cloud 02's lobes (x 770…815 and
// x 904…966) and the gap between its two trailing curls (x 759…770). Those are open air in
// the silhouette, not holes in it — filling them would redraw the cloud, not repair it.
//
// The adaptive-text static fill reconstructs the background from the raw SVG assets, so it
// sees sky where the screen now shows cream. Harmless: both sit far above the 0.70 duotone
// threshold, so headings pick the same side either way.
export const CLOUD_BODIES: Record<string, string> = {
  'Cloud 02':
    'M554.1 135.9L556.6 133.2L560.1 131.2L563.4 130.2L577.1 128.4L590.1 122.7L592.6 122.2L606.4 122.4L619.1 105.4L622.4 102.4L624.9 101.2L630.1 99.9L637.6 99.9L652.9 101.9L654.9 100.4L658.4 93.4L663.1 90.2L667.6 91.2L672.4 93.7L674.6 93.7L679.9 86.7L681.6 85.7L684.1 85.4L684.9 67.9L686.9 63.9L692.1 57.9L692.9 55.9L693.4 43.9L694.6 40.9L698.4 36.2L703.6 31.7L722.1 18.7L732.6 13.9L736.1 13.2L743.9 13.4L752.6 15.4L757.4 17.9L757.4 130.9L743.9 132.9L716.4 139.4L707.4 140.9L631.9 140.9L615.6 142.2L592.6 145.4L580.6 145.4L563.1 143.9L558.9 142.4L554.1 138.2Z',
  'Cloud 03':
    'M303.2 380.4L308.6 374.2L316.7 372.6L324.4 371.9L332.2 371.7L340 371.9L346.5 367.6L353.2 363.4L357.4 360.4L361 357.6L365.7 355.6L371.8 354.7L380 355.2L386.2 355.2L390.3 354.4L395.6 354.2L397.6 352.6L399.6 349L402.7 344.8L405.8 340.6L408 339.9L413.7 340.3L418.4 339.5L421.3 336.2L424.3 327.2L427.4 319.5L431.4 317L435.8 315.2L440.4 313.9L445.1 313.1L449.9 312.5L454.6 312.2L463 315.2L467.6 316.3L472.1 318L476.3 320.1L480.4 322.6L484.1 325.6L488.4 328.8C490 337 486.5 350 478 359.5C468 371 452 382 435.6 387.8L428.8 387.3L421.8 387.4L415.1 386.1L411 382.9L410 381.9L402.2 382.3L394.5 383.3L386.8 384.5L379.1 385.7L371.5 386.8L363.7 387.9L356 388.4L348.2 388.7L340.5 388.9L332.7 388.9L324.9 388.8L317.2 388.3L309.5 387.2L302.4 384.9Z',
}
