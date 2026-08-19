// Guard: every SVG the adaptive text paints as a background-image must carry
// preserveAspectRatio="none".
//
// WHY THIS IS NOT COSMETIC. useAdaptiveText fills the glyphs by painting the art at
// `rect.width × (rect.height × artFrac)` — the art's ON-SCREEN box. On phones the
// background container carries scaleY(MOBILE_VSTRETCH), so that box is ~1.2× taller than
// the art's own aspect. An SVG without the attribute defaults to xMidYMid meet, which
// refuses to stretch: it fits by width and CENTRES the result, sliding the art down by half
// the leftover height and leaving transparent bands top and bottom.
//
// Measured on the live page at 390px before the fix (2026-08-19): the beach fill landed
// 569px low, so the Comparison heading sampled sand — #ecdbb5/#f3d099, L=0.76 — where the
// real background behind it is #3d1817 at L=0.24. That is a flip across the 0.70 threshold:
// a blue heading over a dark scene. Reproduced exactly by painting the same CSS with and
// without the attribute (0.762 vs 0.125), and it only ever showed on phones because
// vScale is 1 on desktop, where the two aspects agree.
//
// A file-level check on purpose: it costs no browser, and it fails the moment someone
// re-exports an asset from Figma — which is exactly how the attribute would get lost.
//
//   npm run verify:fill-assets
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// Kept in step with SOURCES / FRONT_FILL_SRC in components/ui/useAdaptiveText.ts.
const PAINTED_AS_BACKGROUND = [
  'main2-fill.svg',
  'background-collage.svg',
  'collage-front-fill.svg',
]

const fails: string[] = []
for (const name of PAINTED_AS_BACKGROUND) {
  const path = join('public', 'SVG', 'background', name)
  let head: string
  try {
    head = readFileSync(path, 'utf8').slice(0, 600)
  } catch {
    fails.push(`${name}: файла нет — таблица разошлась с useAdaptiveText.ts`)
    continue
  }
  const m = /preserveAspectRatio="([^"]*)"/.exec(head)
  if (!m) {
    fails.push(`${name}: нет preserveAspectRatio → умолчание xMidYMid meet, арт уедет вниз на телефонах`)
  } else if (m[1].trim() !== 'none') {
    fails.push(`${name}: preserveAspectRatio="${m[1]}", а нужен "none"`)
  } else {
    console.log(`OK  ${name}`)
  }
}

if (fails.length) {
  for (const f of fails) console.error(`✗ ${f}`)
  console.error('\nПерегенерировать: npm run gen:front-fill (он проставляет атрибут сам).')
  process.exit(1)
}
console.log('\nВсе fill-ассеты растягиваются вместе со своим боксом.')
