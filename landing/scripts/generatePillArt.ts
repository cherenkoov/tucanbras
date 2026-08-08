/**
 * Splits each header pill sheet into the layers the hover motion needs.
 *
 * The hand-off sheets (`public/SVG/header/pills/*.svg`) are one flat image per
 * pill: a ground path in the pill's colour, then one Figma group per botanical
 * ("flower 1", "flower 2", …). A single <img> can only be moved as a whole, but
 * the hover wants the flowers to converge on the pill's centre independently —
 * so this writes the sheet out as:
 *
 *   parts/<pill>-base.svg   the sheet minus every flower (ground, plus anything
 *                           that is not a flower — about's "Head Frame" tucan)
 *   parts/<pill>-<role>.svg one flower on its own, ground removed
 *
 * Every part keeps the original viewBox and `preserveAspectRatio="slice"`, so
 * stacking them all at `absolute inset-0` puts each flower back exactly where the
 * flat sheet had it. Nothing else changes: ancestor <g> transforms, clip-paths
 * and <defs> are carried through untouched, because the flowers are positioned
 * by that ancestor transform and reference those filters.
 *
 * Roles come from measured geometry (x-centre of each group as a fraction of the
 * sheet): the outer pair converge, a middle one only scales. Run after any
 * re-export of the sheets:  npm run gen:pill-art
 */
import fs from 'node:fs'
import path from 'node:path'
import { DECOR_BLEED, bleedViewBox } from '../components/ui/pillArt'

const HEADER = path.resolve(__dirname, '../public/SVG/header')
const PILLS  = path.join(HEADER, 'pills')
const OUT    = path.join(PILLS, 'parts')

/**
 * The flag pills' plants (LanguageSwitcher). Nothing to split — the file IS the
 * decoration, the pill's ground is a CSS colour — but they still need the wider
 * window, so they get bled into `parts/` alongside their originals. Kept here so
 * one command owns every decoration's geometry.
 */
const FLAGS = path.resolve(__dirname, '../public/SVG/flags')

// The bar's cover plants are NOT generated. They are the `decor/` exports, drawn as
// they are and placed by CSS — see COVER_PLANTS in Header.tsx. Nothing to split (one
// file is one plant), nothing to re-seat (each is anchored to an edge of the bar at
// its own aspect rather than mapped onto the plate), and nothing to bleed (the file
// holds the whole plant, so a hover that grows it can never run out of art).

/**
 * Which Figma group plays which part, per sheet. The comments carry the measured
 * x-centre of each group as a fraction of the sheet — `left`/`right` are the
 * outer pair that converge, `mid` sits in the middle and only scales.
 *
 * `about` is the odd one: its two visible decorations are the tucan (Figma calls
 * that group "Head Frame") on the left and the plant on the right, so those are
 * the pair. Nothing here has to be a flower — it is whatever the eye reads as a
 * decoration at that end of the pill.
 */
const ROLES: Record<string, Record<string, string>> = {
  'connect':      { 'flower 1_3': 'left',  'flower 2_3': 'right' },               // 0.15 / 0.74
  'about':        { 'Head Frame': 'left',  'Flower 1':   'right' },               // 0.10 / 0.70
  'tutors':       { 'flower 2':   'left',  'flower 1':   'right' },               // 0.09 / 0.98
  'celpe':        { 'flower 2_2': 'left',  'flower 1_2': 'right' },               // 0.29 / 0.73
  'become-tutor': { 'flower 1_4': 'left',  'flower 3':   'mid', 'flower 2_4': 'right' }, // 0.07 / 0.47 / 0.75
  'plans':        { 'Flower':     'mid' },                                        // one plant, spans the pill
  // The ⋮ button. Its three plants are decorations like any other and grow with the
  // rest of the bar; what stays in the base is the ground and the dots themselves,
  // which are the glyph and must not move. Roles by measured x-centre, as above.
  '3dots':        { 'flower 1':   'mid',   'flower 3':   'left', 'flower 2': 'right' },  // 0.43 / 0.39 / 0.49
}

/**
 * Groups that belong ON TOP of the decorations instead of under them, and the layer
 * each one is written into.
 *
 * A sheet's own paint order is the design: `3dots` draws its ground, then the three
 * plants, then the dots. Splitting a sheet into base + decorations flattens that to
 * two layers and puts every decoration above everything else — which buried the dots
 * under the bouquet the moment the ⋮ became a pill like the others. So the parts that
 * were painted last are lifted back out, drawn after the decorations.
 *
 * The layers do not behave alike, which is the whole reason for splitting them. The ⋮
 * itself is three leaf-shaped marks, and each is a layer of its own so it can sway on
 * its own root when the button is clicked (BLADES in components/ui/dotsSway.ts) —
 * they are one Figma group, so as one file they could only ever move as a rigid body.
 * `dots` — the satellites around them — shrink instead, as the bouquet blooms
 * (PILL_GLYPH in Header.tsx). Order here is paint order.
 *
 * Ids exactly as the file spells them — Figma escapes the apostrophe on the way out.
 * An id may name a group NESTED inside another, `parent / child`: the three marks are
 * children of `dot's row`, and only that row is a direct child of the wrapper.
 */
const GLYPH: Record<string, Record<string, string[]>> = {
  '3dots': {
    'blade-1': ['dot&#39;s row / dot 1'],
    'blade-2': ['dot&#39;s row / dot 2'],
    'blade-3': ['dot&#39;s row / dot 3'],
    dots:      ['dot&#39;s child 1', 'dot&#39;s child 2', 'dot&#39;s child 3'],
  },
}

/**
 * Groups deleted from every output. `about` ships its plant twice — "Flower 2"
 * is a byte-identical copy of "Flower 1" stacked exactly on top of it (both are
 * 207 lines, same path data), invisible while they overlap but a second plant
 * left behind the moment the first one slides. Dropping it also saves ~17KB.
 */
const DROP: Record<string, string[]> = {
  'about': ['Flower 2'],
}

/**
 * The re-exported decorations: one uncropped file per plant, and where each one
 * sits on its pill in the pill's own viewBox units.
 *
 * The first hand-off shipped one flat SHEET per pill, so Figma cropped every plant
 * to the pill's frame on the way out — measured against these files, `about`'s
 * tucan had lost 39 units of width, `plans`' leaf 60 units of height, `become`'s
 * middle plant most of its outline. Splitting a sheet could only ever redistribute
 * art that was already gone, which is why the decorations showed a cut edge no
 * matter how wide a window they were given.
 *
 * What a per-node export does NOT carry is its position: Figma re-origins each file
 * to the node's own bbox. So the offsets below put it back. They were recovered
 * from the sheets, not eyeballed — a path that survived the crop intact has
 * identical geometry in both files, so the single constant mapping one onto the
 * other IS the placement. `verify:pill-art` re-checks the result against the sheet.
 *
 * `x`/`y` are the top-left of the export's own box in pill units; the file's
 * intrinsic width/height are used as-is (every export is `viewBox="0 0 w h"` with
 * matching width/height, so there is no scale to apply — only the translate).
 */
type Placed = { file: string; x: number; y: number }

const PLACED: Record<string, Record<string, Placed>> = {
  'about': {
    left:  { file: 'Tucan Head - About.svg',    x: -23.53, y:  -1.47 },
    right: { file: 'Flower - About.svg',        x:  23,    y: -45.12 },
  },
  'tutors': {
    left:  { file: 'Flower 2 - Tutors.svg',     x: -69,    y: -62    },
    right: { file: 'Flower 1 - Tutors.svg',     x:  32,    y: -29    },
  },
  'celpe': {
    left:  { file: 'Flower 2 - CELPE-BRAS.svg', x:   6,    y: -70.16 },
    right: { file: 'Flower 1 - CELPE-BRAS.svg', x:  87,    y: -34    },
  },
  'plans': {
    mid:   { file: 'Flower - Plans.svg',        x: -20,    y: -46    },
  },
  // Figma's file numbering does not follow the sheet's group names here: the
  // sheet's "flower 3" (2 paths) is `Flower 2 - Become.svg` and its "flower 2_4"
  // (56 paths) is `Flower 3 - Become.svg`. Paired by geometry, not by label.
  'become-tutor': {
    left:  { file: 'Flower 1 - Become.svg',     x: -51,    y: -16    },
    mid:   { file: 'Flower 2 - Become.svg',     x:  68,    y:  -4    },
    right: { file: 'Flower 3 - Become.svg',     x:  84,    y: -59    },
  },
  // `connect` has no re-export yet, so it still gets its decorations split out of
  // the old sheet — cropped art and all. Drop a `Flower N - Connect.svg` in and add
  // it here to bring it in line with the rest.
}

/** Where the per-node exports live — one uncropped file per plant. */
const EXPORTS = path.join(HEADER, 'decor')

/**
 * The wrapper <g …> a sheet opens with — Figma's artboard offset.
 *
 * Followed down, not assumed: a sheet cut out of the hand-off opens with one
 * `<g transform="translate(…)">` and the groups are its children, but a node exported
 * on its own (`3dots`) nests its variant name and its clip above them. A wrapper is
 * whatever has more than one child; anything above that is packaging.
 */
function wrapperStart(svg: string): number {
  const m = /<g\b/.exec(svg)
  if (!m) throw new Error('no wrapper <g>')
  let at = m.index
  for (;;) {
    const kids = childrenOf(svg, at)
    if (kids.length !== 1 || kids[0].tag !== 'g') return at
    at = kids[0].start
  }
}

/**
 * Span of the element that starts at `from`, honouring nesting. Handles both
 * `<path …/>` self-closers and `<g …> … </g>` subtrees.
 */
function elementSpan(svg: string, from: number): { start: number; end: number; tag: string } {
  const open = /<([a-zA-Z]+)\b/.exec(svg.slice(from))
  if (!open) throw new Error('no element at ' + from)
  const start = from + open.index
  const tag = open[1]

  // Self-closing?
  const gt = svg.indexOf('>', start)
  if (svg[gt - 1] === '/') return { start, end: gt + 1, tag }

  let depth = 0
  const re = new RegExp(`<${tag}\\b|</${tag}>`, 'g')
  re.lastIndex = start
  for (let m = re.exec(svg); m; m = re.exec(svg)) {
    if (m[0][1] === '/') {
      depth--
      if (depth === 0) return { start, end: m.index + m[0].length, tag }
    } else {
      // `<g …/>` would be self-closing and never opens a level.
      const close = svg.indexOf('>', m.index)
      if (svg[close - 1] !== '/') depth++
    }
  }
  throw new Error('unbalanced <' + tag + '> at ' + start)
}

/** Direct children of the element opening at `at`, in document order. */
function childrenOf(svg: string, at: number) {
  const inner = svg.indexOf('>', at) + 1
  const { end } = elementSpan(svg, at)
  const closeAt = svg.lastIndexOf('</', end)

  const kids: { start: number; end: number; tag: string; id: string | null }[] = []
  let cursor = inner
  while (true) {
    const next = svg.slice(cursor, closeAt).search(/<[a-zA-Z]/)
    if (next < 0) break
    const span = elementSpan(svg, cursor + next)
    const head = svg.slice(span.start, svg.indexOf('>', span.start))
    const id = /\bid="([^"]*)"/.exec(head)?.[1] ?? null
    kids.push({ ...span, id })
    cursor = span.end
  }
  return kids
}

type Span = { start: number; end: number }

/** `"a / b"` → `['a', 'b']`. A plain id is a path of one. */
const idPath = (id: string) => id.split('/').map(s => s.trim())

/**
 * The element an id path names, walked down from the element opening at `at`.
 * `null` if any step is missing — the caller turns that into the "cannot lift" error,
 * so a renamed group in a re-exported sheet fails loudly instead of writing a file
 * with nothing in it.
 */
function resolve(svg: string, at: number, path: string[]): Span | null {
  let node: Span = { start: at, end: 0 }
  for (const id of path) {
    const hit = childrenOf(svg, node.start).find(k => k.id === id)
    if (!hit) return null
    node = hit
  }
  return node
}

/**
 * Everything to cut so that only `paths` survive — the inverse of a selection.
 *
 * At each level it keeps the elements named by a path and cuts the rest; where a path
 * continues deeper it descends into that element and repeats, so a nested target loses
 * its siblings without losing the ancestor that positions it. That ancestor matters:
 * the marks inside `dot's row` are placed by the row's own transform and clipped by
 * the sheet's clip-path, and lifting one out of the tree by itself would move it.
 */
function isolate(svg: string, at: number, paths: string[][]): Span[] {
  const wanted = new Map<string, string[][]>()
  for (const [head, ...rest] of paths) {
    const deeper = wanted.get(head) ?? []
    if (rest.length) deeper.push(rest)
    wanted.set(head, deeper)
  }

  const cuts: Span[] = []
  for (const kid of childrenOf(svg, at)) {
    const deeper = kid.id === null ? undefined : wanted.get(kid.id)
    if (deeper === undefined) cuts.push(kid)                       // not on any path
    else if (deeper.length) cuts.push(...isolate(svg, kid.start, deeper))
    // …otherwise this element IS a target: keep it whole.
  }
  return cuts
}


/** Same sheet, seen through `box` instead of the one it declares. */
function through(svg: string, box: string): string {
  const m = /viewBox="([^"]+)"/.exec(svg)
  if (!m) throw new Error('sheet has no viewBox')
  return svg.replace(m[0], `viewBox="${box}"`)
}

/** The pill's own box, as its sheet declares it. */
function sheetViewBox(svg: string): string {
  const m = /viewBox="([^"]+)"/.exec(svg)
  if (!m) throw new Error('sheet has no viewBox')
  return m[1]
}

/**
 * One re-exported plant, put back on its pill.
 *
 * The export is origined at its own bbox, so a `translate` seats it — and nothing
 * else does: a pill's plants are placed 1:1 in Figma (`verify:pill-art` re-checks
 * every offset against the sheet), unlike the cover's, which is why those are cut
 * out of the frame instead of re-seated here.
 *
 * The root is re-aimed at the pill's own box widened by DECOR_BLEED, carrying the
 * `preserveAspectRatio` that box is drawn with. That is what makes `inset-0` line the
 * layer up with the pill instead of the layer's own aspect deciding where the art
 * goes. The bleed survives it: inflate box and viewBox by the same k and both the
 * scale and the origin come out unchanged.
 *
 * Everything inside is carried through untouched — these exports have no <defs>, no
 * clip-paths and no filters, only the two inline <mask>s on the tucan head, and a
 * mask moves with the <g> that wraps it.
 */
function reseat(p: Placed, box: string): string {
  const src = fs.readFileSync(path.join(EXPORTS, p.file), 'utf8')
  const open = /<svg\b[^>]*>/.exec(src)
  if (!open) throw new Error(`${p.file}: no <svg> root`)
  const body = src.slice(open.index + open[0].length, src.lastIndexOf('</svg>'))
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${bleedViewBox(box)}"` +
    ` preserveAspectRatio="xMidYMid slice" fill="none">` +
    `<g transform="translate(${p.x} ${p.y})">${body}</g></svg>`
  )
}

/** Original with the given spans cut out. Cut back-to-front so offsets hold. */
function without(svg: string, spans: { start: number; end: number }[]): string {
  return [...spans]
    .sort((a, b) => b.start - a.start)
    .reduce((acc, s) => acc.slice(0, s.start) + acc.slice(s.end), svg)
}

function main() {
  fs.mkdirSync(OUT, { recursive: true })
  const manifest: Record<string, string[]> = {}

  for (const [pill, roles] of Object.entries(ROLES)) {
    const file = path.join(PILLS, `${pill}.svg`)
    const svg = fs.readFileSync(file, 'utf8')
    const wrapAt = wrapperStart(svg)
    const kids = childrenOf(svg, wrapAt)

    const decor = kids.filter(k => k.id && k.id in roles)
    const missing = Object.keys(roles).filter(id => !decor.some(f => f.id === id))
    if (missing.length) throw new Error(`${pill}: sheet has no group(s) ${missing.join(', ')}`)

    const dropIds = DROP[pill] ?? []
    const dropped = kids.filter(k => k.id && dropIds.includes(k.id))
    if (dropped.length !== dropIds.length) throw new Error(`${pill}: cannot drop ${dropIds.join(', ')}`)

    // The ground is the pill-coloured rounded rect: the one direct <path> child.
    const grounds = kids.filter(k => k.tag === 'path')
    if (grounds.length !== 1) throw new Error(`${pill}: expected 1 ground path, found ${grounds.length}`)

    const box = sheetViewBox(svg)

    // Whatever the sheet paints after its decorations goes into layers of its own,
    // drawn after them (GLYPH). Out of the base, or it would show through from
    // underneath as well.
    // A lifted layer is the whole document with everything BUT its groups cut out, so
    // it keeps the wrapper transform, the clip-path and the <defs> the art depends on.
    // What comes out of the base is the resolved target itself — for a nested one that
    // is the child, not its parent, so a row whose marks are all lifted is left behind
    // as an empty <g> rather than taking an unlifted sibling with it.
    const lifted: Span[] = []
    for (const [layer, ids] of Object.entries(GLYPH[pill] ?? {})) {
      const paths  = ids.map(idPath)
      const groups = paths.map(p => resolve(svg, wrapAt, p))
      if (groups.some(g => g === null)) throw new Error(`${pill}: cannot lift ${ids.join(', ')}`)
      fs.writeFileSync(path.join(OUT, `${pill}-${layer}.svg`),
        without(svg, isolate(svg, wrapAt, paths)))
      lifted.push(...groups as Span[])
    }

    fs.writeFileSync(path.join(OUT, `${pill}-base.svg`),
      without(svg, [...decor, ...dropped, ...lifted]))

    const placed = PLACED[pill]
    const written: string[] = []

    if (placed) {
      // Re-exported art: one uncropped file per plant, re-seated on the pill by
      // its measured offset. The window is the pill's own box widened by
      // DECOR_BLEED and the header draws the layer in a box inflated to match, so
      // the plant lands exactly where the sheet had it while still having art in
      // hand when the hover leans it sideways — see components/ui/pillArt.ts.
      for (const [role, p] of Object.entries(placed)) {
        fs.writeFileSync(path.join(OUT, `${pill}-${role}.svg`), reseat(p, box))
        written.push(role)
      }
      console.log(`${pill}: base + ${written.join(', ')}${lifted.length ? ' + ' + Object.keys(GLYPH[pill] ?? {}).join(', ') : ''} (re-exported art, window ×${DECOR_BLEED})`)
    } else {
      for (const f of decor) {
        const role = roles[f.id!]
        // No re-export for this pill yet: fall back to carving the decoration out
        // of the sheet, which means it keeps the crop Figma baked into that sheet.
        // Everything else goes — not just the ground and the other plants: a sheet
        // may carry art that is neither (the ⋮ dots), and it belongs to the base
        // alone or it is drawn once per layer and travels with each of them.
        fs.writeFileSync(
          path.join(OUT, `${pill}-${role}.svg`),
          through(without(svg, kids.filter(k => k !== f)), bleedViewBox(box)),
        )
        written.push(role)
      }
      console.log(`${pill}: base + ${written.join(', ')}${lifted.length ? ' + ' + Object.keys(GLYPH[pill] ?? {}).join(', ') : ''} (LEGACY split from sheet — art still cropped)`)
    }
    manifest[pill] = written
  }

  // The flag plants: same window, no split.
  const flagOut = path.join(FLAGS, 'parts')
  fs.mkdirSync(flagOut, { recursive: true })
  for (const f of fs.readdirSync(FLAGS).filter(n => /^bloom-.*\.svg$/.test(n))) {
    const svg = fs.readFileSync(path.join(FLAGS, f), 'utf8')
    fs.writeFileSync(path.join(flagOut, f), through(svg, bleedViewBox(sheetViewBox(svg))))
    console.log(`${f}: bled window ×${DECOR_BLEED}`)
  }

  console.log('\n→ ' + path.relative(process.cwd(), OUT))
  console.log(JSON.stringify(manifest, null, 2))
}

main()
