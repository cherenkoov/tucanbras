// Track centerlines + per-figure params for the human-walk animation.
// Coordinates are canvas space (viewBox 0 0 800 2047), verbatim from
// public/SVG/background/background human track + markers.svg.
// layerToggles ranges are computed from the colour markers in that file
// (see scripts/computeMarkerProgress.mjs and the design spec, 2026-05-31).

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
  /** layer when no toggle is active */
  baseZ: number
  /** +1 if the art faces travel direction at scaleX=+1; -1 to invert */
  faceSign: 1 | -1
  /** optional fine offset (canvas units) to seat feet exactly on the track start */
  offset?: { x: number; y: number }
  /** dynamic occlusion windows (empty = none) */
  layerToggles: LayerToggle[]
}

// NOTE: gait values (lap/A/B/omega/phase) are starting points — tune visually in dev.
// baseZ / faceSign / layerToggles are fixed by the spec and the verify script.
export const HUMANS: HumanConfig[] = [
  {
    id: 'human 1',
    d: 'M541.5 1431L645.5 1564L683 1525L464.5 1324.5C441.333 1323.83 389.2 1317.2 366 1296C337 1269.5 335 1265 335 1261C335 1257 339.5 1239 323.5 1239.5C307.5 1240 231 1251 214.5 1259C198 1267 160.5 1224 159 1176C161.8 1164 167.833 1156.67 170.5 1154.5C173.167 1152.33 164.5 1196 164.5 1196L88 1133L47 1176C62.8333 1183.17 95.4 1194.4 99 1182C103.5 1166.5 136.972 1158.86 149 1176C161.028 1193.14 179 1239 170.5 1267.5C163.7 1290.3 282.167 1236.5 323.5 1236.5L345.5 1279C408.167 1318.23 458.5 1313.11 482 1332C505.5 1350.89 541.5 1431 541.5 1431Z',
    lap: 22,
    A: 0.08,
    B: 0.05,
    omega: 7,
    phase: 0.0,
    baseZ: 6,
    faceSign: 1,
    layerToggles: [],
  },
  {
    id: 'human 2',
    d: 'M573.5 1445.5L461 1316.5C422 1308.17 342.8 1289.5 338 1281.5C332 1271.5 254 1300.5 267 1314C280 1327.5 398.5 1283.5 422.5 1304.5C441.7 1321.3 583.5 1416.5 652 1462L602 1505L587.75 1475.25L573.5 1445.5Z',
    lap: 18,
    A: 0.1,
    B: 0.06,
    omega: 8,
    phase: 0.35,
    baseZ: 4,
    faceSign: 1,
    layerToggles: [],
  },
  {
    id: 'human 3',
    d: 'M333.5 1295.5L422.5 1307L609.5 1530.5L660 1500.5L457 1329.5L417.5 1320.5C401.833 1312.83 365.5 1293.6 345.5 1278C320.5 1258.5 333.5 1208 345.5 1193.5C357.5 1179 398 1191 417.5 1196.5C437 1202 423.5 1211 410.5 1223.5C400.1 1233.5 374.167 1227.67 362.5 1223.5C354.333 1225 337.1 1230.4 333.5 1240C328.999 1252 336.5 1259.5 338 1270C339.2 1278.4 321.5 1282.5 312.5 1283.5C312.5 1283.5 275.836 1295.8 276 1314.5C276.205 1337.91 333.5 1295.5 333.5 1295.5Z',
    lap: 16,
    A: 0.09,
    B: 0.06,
    omega: 9,
    phase: 0.6,
    baseZ: 4,
    faceSign: 1,
    layerToggles: [{ range: [0.858, 1.0], z: 2 }], // behind house 6
  },
  {
    id: 'human 4',
    d: 'M174.463 1231.94C172.925 1232.87 130.6 1164.6 107 1155C77.5001 1143 46.5001 1130 47.0001 1124C47.5001 1118 90.5001 1123.5 107 1134.5C123.5 1145.5 133.5 1155 156 1176C178.5 1197 150.5 1148 174.5 1134.5C198.5 1121 199.5 1147 235 1151.5C263.4 1155.1 253.333 1157.67 244 1167C232.333 1169.17 205.3 1169.8 190.5 1155C175.7 1140.2 165.667 1153.83 162.5 1162.5V1196.5C167.172 1210.34 176 1231 174.463 1231.94Z',
    lap: 14,
    A: 0.11,
    B: 0.07,
    omega: 8,
    phase: 0.15,
    baseZ: 4,
    faceSign: 1,
    layerToggles: [{ range: [0.572, 0.87], z: 6 }], // in front of house 4
  },
]
