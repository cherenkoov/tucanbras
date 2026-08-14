// Three of the five feature-card plants are drawn in a colour the shipped file does
// not carry. Same move as the CTA blooms (see celpeCtaPlants.ts): copy the file and
// replace its single fill — a CSS filter cannot do it, because the file is not flat.
//
// Its inner screen layer means one fill renders as TWO tones. The darker tone IS the
// fill; the lighter is the screen result at that file's own layer opacity, which
// differs per file (~0.29 for Plans, ~0.37 for Cover). So the swap is a literal
// substitution, and the check is that BOTH tones land — a light tone that drifts
// means the blend did not survive the edit.
//
//   npm run gen:feature-plant-art
import sharp from 'sharp'
import fs from 'node:fs'
import path from 'node:path'

const DECOR = 'public/SVG/header/decor'

// `want` are Figma's rendered tones with the variant's own opacity divided back out.
// The Learn variant is opaque; Practice/Train/Help/Plan carry opacity 0.99 over the
// board's #1e1e1e, i.e. measured = 0.99·true + 0.3.
const JOBS = [
  { src: 'Flower 3 - Become.svg', out: 'Flower 3 - Become - Feature Learn.svg', from: '#71673D', to: '#C8B76E', want: ['#c8b76e'] },
  { src: 'Flower 1 - Cover.svg',  out: 'Flower 1 - Cover - Feature Help.svg',   from: '#79743C', to: '#C9C272', want: ['#c9c272', '#d8d389'] },
  { src: 'Flower - Plans.svg',    out: 'Flower - Plans - Feature Plan.svg',     from: '#BEA94A', to: '#575030', want: ['#575030', '#665e3b'] },
]

const TOL = 4

/** The n most common fully-opaque colours in a rasterised SVG. */
async function tones(file, n) {
  const { data, info } = await sharp(fs.readFileSync(file))
    .resize({ width: 240, fit: 'inside' })
    .ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const counts = new Map()
  for (let i = 0; i < data.length; i += info.channels) {
    if (data[i + 3] < 200) continue
    const key = `${data[i]},${data[i + 1]},${data[i + 2]}`
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return [...counts].sort((a, b) => b[1] - a[1]).slice(0, n)
    .map(([k]) => '#' + k.split(',').map(v => (+v).toString(16).padStart(2, '0')).join(''))
}

const near = (a, b) => [1, 3, 5].every(i =>
  Math.abs(parseInt(a.slice(i, i + 2), 16) - parseInt(b.slice(i, i + 2), 16)) <= TOL)

let failed = false
for (const job of JOBS) {
  const src = path.join(DECOR, job.src)
  const out = path.join(DECOR, job.out)
  const svg = fs.readFileSync(src, 'utf8')
  const hits = svg.match(new RegExp(job.from, 'gi')) ?? []
  if (!hits.length) throw new Error(`${job.src}: no ${job.from} to replace — the asset changed`)
  fs.writeFileSync(out, svg.replace(new RegExp(job.from, 'gi'), job.to))

  const got = await tones(out, job.want.length)
  const ok = job.want.every(w => got.some(g => near(g, w)))
  console.log(`${ok ? '✓' : '✗'} ${job.out}\n    ${hits.length} fills → ${job.to}   renders ${got.join(' ')}   want ${job.want.join(' ')}`)
  if (!ok) failed = true
}
if (failed) process.exit(1)
