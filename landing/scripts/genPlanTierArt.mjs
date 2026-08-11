// Тариф 4 — единственное место, где арт не берётся с общей полки decor/.
//
// Причина измерена: у `Flower 3 - Become.svg` модель «файл + поворот + равномерный
// масштаб» не восстанавливается (два разных кадра одного файла сошлись к РАЗНЫМ углам,
// 209.4 и 106.8; перебор со свободным масштабом упёрся в IoU 0.39). При этом наложение
// силуэтов показало, что рисунок ТОТ САМЫЙ — расходится только трансформ.
//
// Поэтому арт берётся готовым рендером инстанса из Figma. Но экспорт приходит ОБРЕЗАННЫМ
// плашкой макета, а обрезанный арт нельзя масштабировать: на hover полез бы срез. Ключевое
// наблюдение — clip-path геометрию НЕ удаляет, он её только накрывает. Значит достаточно
// снять клип и расширить viewBox, чтобы получить тот же рисунок ЦЕЛИКОМ, в той же системе
// координат. Тогда placement считается точно, а scale на hover открывает продолжение
// листа, а не обрез.
//
// Скрипт печатает готовые строки для planDecorPlants.ts.
//
//   npm run gen:plan-tier-art
import sharp from 'sharp'
import fs from 'node:fs'
import path from 'node:path'

sharp.cache(false)
sharp.concurrency(1)

const SRC = 'scripts/.figma-ref/plans'
const OUT = 'public/SVG/plans/decor'

// `win` — origin окна, которым Figma обрезала экспорт, в координатах контейнера:
// это max(0, left) и max(0, top) бокса инстанса. `box` — сам контейнер.
const JOBS = [
  { src: 'become2.svg',       out: 'tier4-plate-right.svg',  key: 'p3-plate-0', node: '3484:59802', win: [100.7, 0],   box: { w: 1100, h: 423 } },
  { src: 'become.svg',        out: 'tier4-plate-left.svg',   key: 'p3-plate-1', node: '3484:60356', win: [0, 18],      box: { w: 1100, h: 423 } },
  { src: 'tier4-m-top.svg',   out: 'tier4-m-top.svg',        key: 'm3-plate-0', node: '3499:46642', win: [0, 0],       box: { w: 354,  h: 494 } },
  { src: 'tier4-m-bottom.svg',out: 'tier4-m-bottom.svg',     key: 'm3-plate-1', node: '3499:46643', win: [0, 183],     box: { w: 354,  h: 494 } },
]

/** Бокс непрозрачных пикселей растра. */
function inkBox({ width, height, a }) {
  let x0 = width, y0 = height, x1 = -1, y1 = -1
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (a[y * width + x] < 128) continue
      if (x < x0) x0 = x
      if (x > x1) x1 = x
      if (y < y0) y0 = y
      if (y > y1) y1 = y
    }
  }
  if (x1 < 0) throw new Error('пустой растр')
  return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 }
}

/**
 * Тот же SVG с другим окном координат. Размер ХОЛСТА задаётся отдельно от viewBox: если
 * оставить их равными и отдать sharp `density: 300`, окно в 6000 юнитов раздувается в
 * растр 18750², и libvips отказывается его рисовать. Явный холст фиксирует масштаб и
 * снимает вопрос вовсе.
 */
const withViewBox = (svg, x, y, w, h, px) => {
  const cw = px ?? w
  const ch = px ? Math.max(1, Math.round(px * h / w)) : h
  return svg.replace(/^<svg[^>]*>/,
    `<svg width="${cw}" height="${ch}" viewBox="${x} ${y} ${w} ${h}" fill="none" xmlns="http://www.w3.org/2000/svg">`)
}

async function alphaOf(svg) {
  const img = sharp(Buffer.from(svg)).ensureAlpha()
  const { width, height } = await img.metadata()
  return { width, height, a: await img.extractChannel('alpha').raw().toBuffer() }
}

/** Бокс чернил в ИСХОДНЫХ координатах: рендер по заданному окну + пересчёт назад. */
async function measure(svg, win, px) {
  const [vx, vy, vw, vh] = win
  const r = await alphaOf(withViewBox(svg, vx, vy, vw, vh, px))
  const b = inkBox(r)
  const k = vw / r.width // единиц исходной системы на пиксель
  return { x: vx + b.x * k, y: vy + b.y * k, w: b.w * k, h: b.h * k }
}

const round = n => +n.toFixed(3)
const rows = []

for (const job of JOBS) {
  const raw = fs.readFileSync(path.join(SRC, job.src), 'utf8')
  if (!/clip-path="url\(#/.test(raw)) throw new Error(`${job.src}: клипа нет — экспорт изменился`)
  // Клип снимаем, определение clipPath оставляем: на него больше никто не ссылается.
  const open = raw.replace(/\s*clip-path="url\(#[^"]*\)"/g, '')

  // Два прохода: грубый по заведомо большому окну, затем точный по найденному боксу.
  const coarse = await measure(open, [-3000, -3000, 6000, 6000], 3000)
  const pad = 8
  const tight = await measure(open, [coarse.x - pad, coarse.y - pad, coarse.w + pad * 2, coarse.h + pad * 2], 2200)

  const vb = { x: round(tight.x), y: round(tight.y), w: round(tight.w), h: round(tight.h) }
  fs.writeFileSync(path.join(OUT, job.out), withViewBox(open, vb.x, vb.y, vb.w, vb.h))

  // Место арта в координатах контейнера: origin окна плюс его бокс в исходных координатах.
  const ax = job.win[0] + vb.x
  const ay = job.win[1] + vb.y
  const cx = ax + vb.w / 2
  const cy = ay + vb.h / 2
  const { w: BW, h: BH } = job.box
  const BAND = 0.05
  let anchorX, x
  if (Math.abs(cx - BW / 2) < BAND * BW) { anchorX = 'center'; x = cx - BW / 2 }
  else if (cx <= BW / 2) { anchorX = 'left'; x = cx }
  else { anchorX = 'right'; x = BW - cx }
  let anchorY, y
  if (Math.abs(cy - BH / 2) < BAND * BH) { anchorY = 'center'; y = cy - BH / 2 }
  else if (cy <= BH / 2) { anchorY = 'top'; y = cy }
  else { anchorY = 'bottom'; y = BH - cy }
  const u = v => round(v / BH * 100)

  console.log(`${job.key.padEnd(11)} ${job.node}  viewBox ${vb.x} ${vb.y} ${vb.w}×${vb.h}`
    + `  →  арт в контейнере (${round(ax)}, ${round(ay)}) ${round(vb.w)}×${round(vb.h)}`)
  rows.push(`  /* ${job.key}  ${job.node} — полный арт, клип снят */\n`
    + `  { file: '/SVG/plans/decor/${job.out}', anchorX: '${anchorX}', x: ${u(x)}, `
    + `anchorY: '${anchorY}', y: ${u(y)}, w: ${u(vb.w)}, rotate: 0 },`)
}

console.log('\n// planDecorPlants.ts — вставить как есть\n')
for (const r of rows) console.log(r)
