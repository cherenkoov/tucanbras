// Часть растений тарифов нарисована в цвете, которого шиппящийся файл не несёт. Тот же
// приём, что у блумов CTA (celpeCtaPlants.ts) и карточек CELPE-BRAS: копия файла с
// заменой единственной заливки. CSS-фильтр не годится — рисунок не плоский: внутренние
// слои screen/multiply дают из одной заливки два тона.
//
// Тона сняты с собственного рендера макета (Figma 3484:60740). Из пары тонов заливкой
// является ТЁМНЫЙ — светлый получается блендингом на непрозрачности слоя:
//   тариф 0, плашка   #CE59CC → #EBC065   (рендерит #efd7a3 / #eacc90)
//   тариф 1, кнопка   #BEA94A → #E4E2D4   (рендерит #e4e2d4 / #ebe9de)
//   тариф 2, плашка   #465D3E → #E6E3B5   (рендерит #e6e3b5 / #eeecc8)
//   тариф 2, кнопка   #465D3E → #3C7EC6   (рендерит #3c7ec6)
//
// `Flower 4 - Cover.svg` (тариф 1, плашка) копии НЕ требует: файл уже #556F8C, ровно
// тот тон, которым его рисует макет.
//
//   npm run gen:plan-decor-art
import sharp from 'sharp'
import fs from 'node:fs'
import path from 'node:path'

const DECOR = 'public/SVG/header/decor'

const JOBS = [
  { src: 'Flower 2 - Tutors.svg',     out: 'Flower 2 - Tutors - Plans Cream.svg',    from: '#CE59CC', to: '#EBC065' },
  { src: 'Flower - Plans.svg',        out: 'Flower - Plans - Plan Button.svg',       from: '#BEA94A', to: '#E4E2D4' },
  { src: 'Flower 1 - CELPE-BRAS.svg', out: 'Flower 1 - CELPE-BRAS - Plans Pale.svg', from: '#465D3E', to: '#E6E3B5' },
  { src: 'Flower 1 - CELPE-BRAS.svg', out: 'Flower 1 - CELPE-BRAS - Plans Blue.svg', from: '#465D3E', to: '#3C7EC6' },
  { src: 'Flower 3 - Become.svg',     out: 'Flower 3 - Become - Plans Olive.svg',    from: '#71673D', to: '#8C7C36' },
  { src: 'Flower 3 - Become.svg',     out: 'Flower 3 - Become - Plans Pale.svg',     from: '#71673D', to: '#EBE9BD' },
]

const TOL = 6

/** n самых частых полностью непрозрачных цветов растеризованного SVG. */
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
  if (!hits.length) throw new Error(`${job.src}: заменять нечего — ${job.from} в файле нет, ассет изменился`)
  fs.writeFileSync(out, svg.replace(new RegExp(job.from, 'gi'), job.to))

  // Проверяется, что подставленный тон реально доехал до пикселей: это ловит и «заменили
  // не ту заливку», и «регулярка не сработала». Второй, светлый тон здесь не требуется —
  // он зависит от подложки, а файл растеризуется на прозрачном.
  const got = await tones(out, 4)
  const ok = got.some(g => near(g, job.to.toLowerCase()))
  console.log(`${ok ? '✓' : '✗'} ${job.out}\n    ${hits.length} заливок ${job.from} → ${job.to}   рендерит ${got.join(' ')}`)
  if (!ok) failed = true
}
if (failed) process.exit(1)
