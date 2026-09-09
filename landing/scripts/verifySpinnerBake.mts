// Guard: the baked spinner rasters must match the art they were baked from.
//
// BackgroundCanvas no longer inlines the palm/umbrella markup — it renders
// public/PNG/background/spinners/* positioned by the boxes in beachSpinnerBake.ts. That
// makes main 2.svg a SOURCE, and sources drift: the art is re-exported from Figma by hand,
// and nothing about dropping a new file on disk re-bakes anything.
//
// A forgotten re-bake fails SILENTLY and invisibly in the worst way: the page keeps
// working, the beach shows the NEW art, and twenty palms from the OLD art hover over it at
// their old coordinates. That is exactly the class of staleness the project already guards
// (verify:fill-assets for the same reason on the same file), so it gets the same treatment.
//
// No browser and no rasterising here — two file reads and a hash compare, cheap enough to
// sit in front of every build.
//   npm run verify:spinner-bake
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
import {
  BAKED_SPINNERS,
  BEACH_BASE_SVG,
  SPINNER_BAKE_SOURCE_HASH,
} from '../components/ui/background/beachSpinnerBake'
import { BEACH_SPINNERS } from '../components/ui/background/beachSpinners'
import { BEACH_PREFIX } from '../components/ui/background/prepareBeachSvg'

const SRC = join('public', 'SVG', 'background', 'main 2.svg')
const fail = (msg: string): never => {
  console.error(`✗ ${msg}`)
  process.exit(1)
}

const actual = createHash('sha256').update(readFileSync(SRC)).digest('hex').slice(0, 16)
if (actual !== SPINNER_BAKE_SOURCE_HASH) {
  fail(
    `${SRC} changed since the spinners were baked ` +
      `(file ${actual}, bake ${SPINNER_BAKE_SOURCE_HASH}).\n` +
      `  Run: npm run bake:spinners\n` +
      `  Without it the beach shows the new art and the palms stay on the old one.`,
  )
}

// The hash catches a re-export; this catches a half-committed bake — the module updated but
// the rasters missing, or a slug renamed. Both files per sprite are load-bearing: `src` is
// what the page shows, `fill` is what the adaptive text samples to pick heading colours.
const missing: string[] = []
for (const b of BAKED_SPINNERS) {
  for (const rel of [b.src, b.fill]) {
    if (!existsSync(join('public', rel))) missing.push(rel)
  }
}
if (missing.length) {
  fail(
    `${missing.length} baked spinner file(s) missing — re-run \`npm run bake:spinners\`:\n` +
      missing.map(m => `  · ${m}`).join('\n'),
  )
}

// The stripped base must exist AND actually be stripped. A stale copy still carrying the
// groups is the expensive failure: the page renders correctly, so nothing looks wrong, and
// it silently ships 215 KB gzipped of markup it throws away on top of the rasters — which
// is exactly the regression the A/B on 2026-09-05 caught (1380 → 1529 KB).
const basePath = join('public', BEACH_BASE_SVG)
if (!existsSync(basePath)) {
  fail(`${basePath} missing — re-run \`npm run bake:spinners\``)
}
const baseSvg = readFileSync(basePath, 'utf8')
const stillThere = BEACH_SPINNERS.filter(cfg => baseSvg.includes(`<g id="${cfg.id}"`))
if (stillThere.length) {
  fail(
    `${basePath} still contains ${stillThere.length} baked spinner group(s) — it is stale.\n` +
      `  Run: npm run bake:spinners\n` +
      stillThere.map(cfg => `  · ${cfg.id}`).join('\n'),
  )
}

// And this catches the drift that neither of the above can see: a bake made against a
// DIFFERENT spinner list. BEACH_SPINNERS drives both the bake and the render, so a sprite
// added there without a re-bake would render as nothing at all.
const bakedIds = new Set(BAKED_SPINNERS.map(b => b.id))
const wanted = BEACH_SPINNERS.map(cfg => `${BEACH_PREFIX}${cfg.id}`)
const unbaked = wanted.filter(id => !bakedIds.has(id))
if (unbaked.length) {
  fail(
    `${unbaked.length} spinner(s) in BEACH_SPINNERS have no bake — re-run \`npm run bake:spinners\`:\n` +
      unbaked.map(id => `  · ${id}`).join('\n'),
  )
}

console.log(
  `✓ spinner bake current: ${BAKED_SPINNERS.length} sprites, source ${SPINNER_BAKE_SOURCE_HASH}`,
)
