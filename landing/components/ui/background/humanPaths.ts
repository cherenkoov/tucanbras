// Track centerlines + per-figure params for the human-walk animation.
// Coordinates are canvas space (viewBox 0 0 800 2047), verbatim from
// public/SVG/background/background human track + markers.svg.
//
// Layer model (see BackgroundCanvas z-stack). Houses 4/5/6 get their own layers;
// every other house sits in the front layer ABOVE all figures. The figure's z is
// driven by colour markers, split into a big arc (default) + a small arc (toggle):
//   RED    = above house 4, 5 & 6   -> z 40  (baseZ / big arc)
//   YELLOW = house 4,6 < human < 5  -> z 30  (small arc, between the two groups)
//   BLUE   = below house 4, 5 & 6   -> z 20  (small arc, behind everything)
// House layers: house 6 = z25, house 4 = z25, house 5 = z35.
// Small-arc ranges are computed from the markers (scripts/computeMarkerProgress.mjs).

export const Z_RED = 40
export const Z_YELLOW = 30
export const Z_BLUE = 20

export type LayerToggle = {
  /** progress window [from, to] in 0..1 where `z` applies */
  range: [number, number]
  /** zIndex inside the window */
  z: number
}

export type HumanConfig = {
  id: 'human 1' | 'human 2' | 'human 3' | 'human 4'
  /** closed track path in canvas (800×2047) coords */
  d: string
  /** seconds per full lap */
  lap: number
  /** squash/stretch height amplitude (taller on stretch) */
  A: number
  /** squash/stretch width amplitude (narrower on stretch) */
  B: number
  /** gait angular frequency (rad/s) */
  omega: number
  /** start phase in 0..1 (offsets lap position and gait) */
  phase: number
  /** layer on the big arc (RED = above house 4/5/6) */
  baseZ: number
  /** +1 if the art faces travel direction at scaleX=+1; -1 to invert */
  faceSign: 1 | -1
  /** optional fine offset (canvas units) to seat feet exactly on the track start */
  offset?: { x: number; y: number }
  /** dynamic occlusion windows — the small arc (empty = whole loop is RED) */
  layerToggles: LayerToggle[]
}

// NOTE: gait values (lap/A/B/omega/phase) are starting points — tune visually in dev.
// baseZ / faceSign / layerToggles are fixed by the spec + the verify script.
export const HUMANS: HumanConfig[] = [
  {
    id: 'human 1',
    d: 'M543 1430.82L647 1563.82L684.5 1524.82L466 1324.32C442.833 1323.65 390.7 1317.02 367.5 1295.82C338.5 1269.32 336.5 1264.82 336.5 1260.82C336.5 1256.82 341 1238.82 325 1239.32C309 1239.82 232.5 1250.82 216 1258.82C199.5 1266.82 162 1223.82 160.5 1175.82C163.3 1163.82 169.333 1156.49 172 1154.32C174.667 1152.15 166 1195.82 166 1195.82L89.5 1132.82L48.5 1175.82C64.3333 1182.99 96.9 1194.22 100.5 1181.82C105 1166.32 138.472 1158.68 150.5 1175.82C162.528 1192.96 180.5 1238.82 172 1267.32C165.2 1290.12 198.667 1293 240 1293L322.5 1286.5C386 1291 460 1312.93 483.5 1331.82C507 1350.71 543 1430.82 543 1430.82Z',
    lap: 22,
    A: 0.08,
    B: 0.05,
    omega: 7,
    phase: 0.0,
    baseZ: Z_RED,
    faceSign: 1,
    layerToggles: [{ range: [0.362, 0.465], z: Z_YELLOW }], // small arc: below house 5
  },
  {
    id: 'human 2',
    d: 'M575 1445.32L462.5 1316.32C423.5 1307.99 344.3 1289.32 339.5 1281.32C333.5 1271.32 255.5 1300.32 268.5 1313.82C281.5 1327.32 400 1283.32 424 1304.32C443.2 1321.12 585 1416.32 653.5 1461.82L603.5 1504.82L589.25 1475.07L575 1445.32Z',
    lap: 18,
    A: 0.1,
    B: 0.06,
    omega: 8,
    phase: 0.35,
    baseZ: Z_RED,
    faceSign: 1,
    layerToggles: [], // whole loop is RED (above house 4/5/6)
  },
  {
    id: 'human 3',
    d: 'M335 1295.32L424 1306.82L611 1530.32L661.5 1500.32L458.5 1329.32L419 1320.32C403.333 1312.65 367 1293.42 347 1277.82C322 1258.32 335 1207.82 347 1193.32C359 1178.82 399.5 1190.82 419 1196.32C438.5 1201.82 425 1210.82 412 1223.32C401.6 1233.32 375.667 1227.49 364 1223.32C355.833 1224.82 340 1232 335 1239.82C328.095 1250.62 331.5 1254.5 333 1265C334.2 1273.4 323 1282.32 314 1283.32C314 1283.32 277.336 1295.62 277.5 1314.32C277.705 1337.74 335 1295.32 335 1295.32Z',
    lap: 16,
    A: 0.09,
    B: 0.06,
    omega: 9,
    phase: 0.6,
    baseZ: Z_RED,
    faceSign: 1,
    layerToggles: [{ range: [0.662, 0.863], z: Z_BLUE }], // small arc: behind house 6
  },
  {
    id: 'human 4',
    d: 'M175.963 1231.76C174.425 1232.69 132.1 1164.42 108.5 1154.82C79.0001 1142.82 48.0001 1129.82 48.5001 1123.82C49.0001 1117.82 92.0001 1123.32 108.5 1134.32C125 1145.32 135 1154.82 157.5 1175.82C180 1196.82 152 1147.82 176 1134.32C200 1120.82 201 1146.82 236.5 1151.32C264.9 1154.92 254.833 1157.49 245.5 1166.82C233.833 1168.99 206.8 1169.62 192 1154.82C177.2 1140.02 167.167 1153.65 164 1162.32V1196.32C168.672 1210.16 177.5 1230.82 175.963 1231.76Z',
    lap: 14,
    A: 0.11,
    B: 0.07,
    omega: 8,
    phase: 0.15,
    baseZ: Z_RED,
    faceSign: 1,
    layerToggles: [{ range: [0.572, 0.87], z: Z_BLUE }], // small arc: behind house 4
  },
]
