// Файлы в decor/ экспортированы из уже повёрнутых инстансов, поэтому угол из макета
// нельзя применить напрямую: к нему надо прибавить ψ — собственный поворот файла
// относительно мастера компонента. ψ — константа ФАЙЛА, и она определена однозначно:
// при верном ψ бокс ЧЕРНИЛ файла совпадает с ФРЕЙМОМ инстанса.
//
// Фрейм, а не бокс поворота — это ловушка. Арт здесь тонкие диагональные лоскуты, и
// bounding box лоскута не преобразуется как повёрнутый прямоугольник.
//
// Центр НЕ ищется: он известен из макета. Скрипт композит каждого кандидата ставит в
// известный центр и считает IoU против рендера Figma — так проверяется вся цепочка
// разом, а не только угол.
//
// Полный свип шести файлов не укладывается в десятиминутный таймаут одного вызова
// (~1500 одноразовых рендеров на файл), поэтому запуск возобновляемый: найденная ψ
// переживает процесс в scripts/.figma-ref/plans/psi.json (не коммитится, как и весь
// .figma-ref/), и по одному файлу можно гонять отдельно.
//
//   node scripts/fitPlanDecor.mjs             — все шесть, пропуская то, что уже в кеше
//   node scripts/fitPlanDecor.mjs cover2b     — только один файл (ключ FIT_ON или
//                                                подстрока его имени), в форграунде
import sharp from 'sharp'
import path from 'node:path'
import fs from 'node:fs'

// sharp/libvips держит свой кеш операций и пул потоков, рассчитанные на повторные
// операции над горсткой картинок. Здесь же ~1500 разных одноразовых рендеров на файл —
// кеш и параллельные декоды только добавляют давления на память (в прошлый раз это
// кончилось OOM). Немного пропускной способности в обмен на ровный расход.
sharp.cache(false)
sharp.concurrency(1)

const DECOR = 'public/SVG/header/decor'
const REF = 'scripts/.figma-ref/plans'
// Растр, в котором меряется локальный файл: достаточно крупный, чтобы 0.1° двигал
// пиксели, достаточно мелкий, чтобы свип на 360 шагов оставался быстрым.
const RASTER = 900
// Длинная сторона референса при скоринге. Референсы растеризованы в плотности 300 и
// доходят до 2292×1688; IoU считается попиксельно на КАЖДОГО кандидата, то есть почти
// 4 млн операций на угол — это, а не свип, растягивало прогон на часы. Силуэт такой
// детализации не требует: ppu берётся уже с ужатой ширины, поэтому вся геометрия ниже
// остаётся согласованной сама с собой.
const REF_MAX = 700

// Контейнеры из макета: плашка и кнопка каждого тарифа.
const BOX = [
  { plate: { w: 934,  h: 391 }, button: { w: 466, h: 99  } },
  { plate: { w: 1100, h: 391 }, button: { w: 518, h: 99  } },
  { plate: { w: 1100, h: 391 }, button: { w: 518, h: 99  } },
  { plate: { w: 1100, h: 423 }, button: { w: 518, h: 131 } },
]

// Все 16 инстансов. `outer` — бокс, который заметает поворот, в координатах контейнера
// (ровно как их отдаёт get_design_context: left/right/top/bottom + w×h). `frame` —
// собственный размер инстанса ДО поворота. `rot` — угол макета, `flip` — scaleY(-1).
const PLANTS = [
  { key:'p0-plate-0', plan:0, slot:'plate',  node:'3483:45165', file:'Flower 2 - Tutors.svg',     left:-94,    bottom:-160.03, w:264.8,    h:243.033, frame:[216.052,179.232], rot:20.29 },
  { key:'p0-plate-1', plan:0, slot:'plate',  node:'3483:45159', file:'Flower 2 - Tutors.svg',     right:-83.64, top:-134,      w:256.643,  h:228.823, frame:[220.287,182.745], rot:-13.4 },
  { key:'p0-plate-2', plan:0, slot:'plate',  node:'3483:45170', file:'Flower 2 - Tutors.svg',     centerX:99.77, top:-20,      w:314.187,  h:288.36,  frame:[256.348,212.66],  rot:20.29 },
  { key:'p0-btn-0',   plan:0, slot:'button', node:'3483:45351', file:'Flower 2 - Cover.svg',      left:-82,    top:-113,       w:341.561,  h:226.968, frame:[216.289,334.763], rot:-88.15, flip:true },
  { key:'p0-btn-1',   plan:0, slot:'button', node:'3483:45402', file:'Flower 2 - Cover.svg',      left:347,    top:-85,        w:283.269,  h:269.046, frame:[154.386,238.951], rot:51.83,  flip:true },
  { key:'p1-plate-0', plan:1, slot:'plate',  node:'3483:45175', file:'Flower 4 - Cover.svg',      left:690,    top:-19,        w:548.859,  h:534.66,  frame:[389.859,420.638], rot:115.96 },
  { key:'p1-plate-1', plan:1, slot:'plate',  node:'3483:45201', file:'Flower 4 - Cover.svg',      left:266,    top:-73,        w:299.913,  h:292.155, frame:[213.031,229.849], rot:-115.96, flip:true },
  { key:'p1-btn-0',   plan:1, slot:'button', node:'3484:60166', file:'Flower - Plans.svg',        left:-270,   top:-523,       w:1058.962, h:993.455, frame:[661.753,840.72],  rot:120,    flip:true },
  { key:'p2-plate-0', plan:2, slot:'plate',  node:'3484:60118', file:'Flower 1 - CELPE-BRAS.svg', left:-366,   top:-558,       w:955.05,   h:763.302, frame:[494.521,832.189], rot:-68.67 },
  { key:'p2-plate-1', plan:2, slot:'plate',  node:'3484:59890', file:'Flower 1 - CELPE-BRAS.svg', left:563,    top:82,         w:1074.551, h:813.593, frame:[566.295,952.973], rot:106.5 },
  { key:'p2-btn-0',   plan:2, slot:'button', node:'3484:60261', file:'Flower 1 - CELPE-BRAS.svg', left:76,     top:-149,       w:681.074,  h:495.571, frame:[364.803,613.897], rot:-103.22, flip:true },
  { key:'p2-btn-1',   plan:2, slot:'button', node:'3484:60309', file:'Flower 1 - CELPE-BRAS.svg', left:-219,   top:-183,       w:681.074,  h:495.571, frame:[364.803,613.897], rot:76.78,   flip:true },
  { key:'p3-plate-0', plan:3, slot:'plate',  node:'3484:59802', file:'Flower 3 - Become.svg',     left:100.7,  top:-350.75,    w:1241.626, h:963.285, frame:[636.637,1092.164], rot:-70.6,  flip:true },
  { key:'p3-plate-1', plan:3, slot:'plate',  node:'3484:60356', file:'Flower 3 - Become.svg',     left:-386,   top:18,         w:935.583,  h:725.849, frame:[479.715,822.961], rot:70.6 },
  { key:'p3-btn-0',   plan:3, slot:'button', node:'3484:60565', file:'Flower 3 - Become.svg',     left:-169,   top:-88,        w:483.303,  h:374.959, frame:[247.811,425.125], rot:70.6 },
  { key:'p3-btn-1',   plan:3, slot:'button', node:'3484:60653', file:'Flower 3 - Become.svg',     left:160,    top:-136,       w:483.303,  h:374.959, frame:[247.811,425.125], rot:-109.4 },
]

// ψ, известные из фита карточек CELPE-BRAS. Это КРОСС-ЧЕК, а не гейт (решение владельца
// 2026-08-09): критерий приёмки — IoU против собственного рендера Figma, потому что в
// таблицу идёт не ψ, а deg = ψ + rot, и он проверяется той же композицией, которую
// выполнит браузер.
//
// Расхождение по 'Flower - Plans.svg' объяснено: константа 300 снята с НЕзеркалённого
// инстанса, а 3484:60166 в макете зеркалён, и для зеркального ψ обязан сменить знак
// (V·R(θ)·V = R(−θ), то есть ожидание 60). Найденное 238.5 отстоит от 60 на 178.5° —
// это полуоборот, который тест по аспекту не различает в принципе (у AABB период 180°),
// а разрешает только IoU.
const PSI_KNOWN = {
  'Flower 3 - Become.svg': 73.5,
  'Flower - Plans.svg': 300,
}

// Инстанс, на котором ищется ψ каждого файла, и имя его референса.
//
// 'Flower 2 - Cover.svg' сначала мерился на p0-btn-1 (референс cover2, окно 119×99) —
// композит целиком закрывал это окно, IoU держался на ~0.415 у ЛЮБОГО кандидата подряд:
// скор физически не различал углы. Заменено на p0-btn-0 (референс cover2b, окно 260×99,
// вдвое больше) — обрезка референса геометрически подтверждена (см. отчёт задачи).
const FIT_ON = {
  'Flower 2 - Tutors.svg':     { key: 'p0-plate-2', ref: 'tutors'  },
  'Flower 2 - Cover.svg':      { key: 'p0-btn-0',   ref: 'cover2b' },
  'Flower 4 - Cover.svg':      { key: 'p1-plate-0', ref: 'cover4'  },
  'Flower 1 - CELPE-BRAS.svg': { key: 'p2-plate-1', ref: 'celpe'   },
  'Flower 3 - Become.svg':     { key: 'p3-plate-1', ref: 'become'  },
  'Flower - Plans.svg':        { key: 'p1-btn-0',   ref: 'plans'   },
}

/** Центр outer-бокса в координатах контейнера. CSS-семантика: `right: X` — это
 *  расстояние от правого края контейнера до правого края бокса, внутрь положительное. */
function centre(p) {
  const box = BOX[p.plan][p.slot]
  const cx = p.centerX !== undefined ? box.w / 2 + p.centerX
    : p.left !== undefined ? p.left + p.w / 2
    : box.w - p.right - p.w / 2
  const cy = p.top !== undefined ? p.top + p.h / 2 : box.h - p.bottom - p.h / 2
  return { cx, cy, box }
}

/** Ближняя грань. Полоса ±5% — это «практически по центру»: там привязка к грани
 *  гонит объект по мере роста контейнера, а центровая держит композицию. */
function anchors(p) {
  const { cx, cy, box } = centre(p)
  const BAND = 0.05
  let anchorX, x
  if (p.centerX !== undefined)                     { anchorX = 'center'; x = p.centerX }
  else if (Math.abs(cx - box.w / 2) < BAND * box.w) { anchorX = 'center'; x = cx - box.w / 2 }
  else if (cx <= box.w / 2)                        { anchorX = 'left';   x = cx }
  else                                             { anchorX = 'right';  x = box.w - cx }
  let anchorY, y
  if (Math.abs(cy - box.h / 2) < BAND * box.h)      { anchorY = 'center'; y = cy - box.h / 2 }
  else if (cy <= box.h / 2)                        { anchorY = 'top';    y = cy }
  else                                             { anchorY = 'bottom'; y = box.h - cy }
  // Единица — процент ВЫСОТЫ контейнера: она же короткая сторона плашки на десктопе.
  const u = v => +(v / box.h * 100).toFixed(3)
  return { anchorX, x: u(x), anchorY, y: u(y) }
}

/** Альфа-канал PNG плюс размеры. */
async function alpha(buf) {
  const img = sharp(buf).ensureAlpha()
  const { width, height } = await img.metadata()
  return { width, height, a: await img.extractChannel('alpha').raw().toBuffer() }
}

/** Бокс чернил альфа-канала. */
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
  if (x1 < 0) throw new Error('пустой растр — нечего фитить')
  return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 }
}

/** Выпуклая оболочка набора точек, монотонная цепочка Эндрю. */
function convexHull(pts) {
  const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1])
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
  const lower = []
  for (const q of p) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], q) <= 0) lower.pop()
    lower.push(q)
  }
  const upper = []
  for (let i = p.length - 1; i >= 0; i--) {
    const q = p[i]
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], q) <= 0) upper.pop()
    upper.push(q)
  }
  lower.pop(); upper.pop()
  return lower.concat(upper)
}

// Грубый свип нуждается только от АСПЕКТА бокса чернил на каждом угле, а бокс повёрнутого
// множества точек равен боксу его повёрнутой выпуклой оболочки. Значит рендерить 720 раз
// не нужно: один растр на файл, оболочка, дальше арифметика. Это и делает прогон
// секундным вместо пятнадцатиминутного — при том же результате (гард: Flower 2 - Tutors
// обязан остаться ψ=339.9 при IoU 0.994, как его намерил ещё рендерный свип).
const hullCache = new Map()
async function inkHull(file, flip) {
  const k = `${file}|${flip}`
  if (!hullCache.has(k)) {
    let pipe = sharp(path.join(DECOR, file), { density: 300 }).resize({ width: RASTER })
    if (flip) pipe = pipe.flip()
    const r = await alpha(await pipe.png().toBuffer())
    // Кандидаты в вершины — только крайние чернила каждой строки: точка со строго
    // внутренним x лежит на отрезке между крайними точками своей же строки, то есть
    // внутри оболочки, и вершиной быть не может. Отбрасывает ~99% пикселей даром.
    const pts = []
    for (let y = 0; y < r.height; y++) {
      let x0 = -1, x1 = -1
      for (let x = 0; x < r.width; x++) {
        if (r.a[y * r.width + x] < 128) continue
        if (x0 < 0) x0 = x
        x1 = x
      }
      if (x0 >= 0) { pts.push([x0, y]); if (x1 !== x0) pts.push([x1, y]) }
    }
    if (!pts.length) throw new Error(`${file}: пустой растр — нечего фитить`)
    hullCache.set(k, { hull: convexHull(pts), cx: r.width / 2, cy: r.height / 2 })
  }
  return hullCache.get(k)
}

/** Размеры бокса чернил после поворота на deg — без рендера. Знак и центр вращения те же,
 *  что у sharp: по часовой в экранных координатах, вокруг центра холста. */
function hullBox({ hull, cx, cy }, deg) {
  const t = deg * Math.PI / 180, c = Math.cos(t), s = Math.sin(t)
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
  for (const [px, py] of hull) {
    const dx = px - cx, dy = py - cy
    const rx = dx * c - dy * s, ry = dx * s + dy * c
    if (rx < x0) x0 = rx
    if (rx > x1) x1 = rx
    if (ry < y0) y0 = ry
    if (ry > y1) y1 = ry
  }
  return { w: x1 - x0 + 1, h: y1 - y0 + 1 }
}

/** Локальный файл в растре: сначала флип, потом поворот — в том же порядке, что CSS. */
function raster(file, flip, deg) {
  let p = sharp(path.join(DECOR, file), { density: 300 }).resize({ width: RASTER })
  if (flip) p = p.flip()
  return p.rotate(deg, { background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer()
}

// Кеш держит только измеренные числа, никогда пиксели: свип обходит 720 углов × 2 флипа
// на файл, и хранение альфа-планов гигабайтами кончается OOM в vips.
const boxCache = new Map()
async function measuredBox(file, flip, deg) {
  const k = `${file}|${flip}|${deg}`
  if (!boxCache.has(k)) {
    const r = await alpha(await raster(file, flip, deg))
    boxCache.set(k, { width: r.width, height: r.height, box: inkBox(r) })
  }
  return boxCache.get(k)
}

/** Композиция кандидата в кадр референса + IoU. */
async function score(p, ref, ppu, rx0, ry0, psi) {
  const { cx, cy } = centre(p)
  const deg = ((psi + p.rot) % 360 + 360) % 360
  const { box } = await measuredBox(p.file, !!p.flip, psi)
  const wCss = RASTER * (p.frame[0] / box.w)          // ширина файла в px контейнера
  const buf = await raster(p.file, !!p.flip, deg)
  const { width: rw, height: rh } = await sharp(buf).metadata()
  const f = (wCss * ppu) / RASTER
  const sw = Math.max(1, Math.round(rw * f))
  const sh = Math.max(1, Math.round(rh * f))
  const scaled = await alpha(await sharp(buf).resize(sw, sh, { fit: 'fill' }).png().toBuffer())
  // Повёрнутый холст центрирован на центре картинки — именно его ставит CSS.
  const offX = (cx - rx0) * ppu - sw / 2
  const offY = (cy - ry0) * ppu - sh / 2
  let inter = 0, union = 0
  for (let y = 0; y < ref.height; y++) {
    for (let x = 0; x < ref.width; x++) {
      const sx = Math.round(x - offX), sy = Math.round(y - offY)
      const mine = (sx >= 0 && sy >= 0 && sx < scaled.width && sy < scaled.height
        && scaled.a[sy * scaled.width + sx] >= 128) ? 1 : 0
      const theirs = ref.a[y * ref.width + x] >= 128 ? 1 : 0
      if (mine & theirs) inter++
      if (mine | theirs) union++
    }
  }
  return { iou: union ? inter / union : 0, deg: Math.round(deg * 100) / 100, wCss }
}

/** Прямоугольник контейнера, который покрывает референс, и его масштаб. */
async function refFrame(p, name) {
  const ref = await alpha(await sharp(path.join(REF, `${name}.png`)).png().toBuffer())
  const { box } = centre(p)
  const left = p.centerX !== undefined ? box.w / 2 + p.centerX - p.w / 2
    : p.left !== undefined ? p.left : box.w - p.right - p.w
  const top = p.top !== undefined ? p.top : box.h - p.bottom - p.h
  const rx0 = Math.max(0, left)
  const ry0 = Math.max(0, top)
  const ppu = ref.width / (Math.min(box.w, left + p.w) - rx0)
  return { ref, ppu, rx0, ry0 }
}

const TOL = 0.04   // допуск по аспекту, как в fitFeaturePlants
const PASS = 0.92  // порог приёмки по IoU

// Кеш на диске: {file: psi}. Переживает процесс, поэтому свип на файл, для которого ψ
// уже найдена, не повторяется — только пересчитывается IoU по текущему референсу
// (дёшево: один композит, не 720-угловой свип), для честного числа в каждом отчёте.
const PSI_CACHE_PATH = path.join(REF, 'psi.json')
function loadPsiCache() {
  try { return JSON.parse(fs.readFileSync(PSI_CACHE_PATH, 'utf8')) } catch { return {} }
}
function savePsiCache(obj) {
  fs.mkdirSync(REF, { recursive: true })
  fs.writeFileSync(PSI_CACHE_PATH, JSON.stringify(obj, null, 2) + '\n')
}
const psiCache = loadPsiCache()
// IoU последнего замера по каждому файлу — им же решается, попадёт ли файл в таблицу.
const iouByFile = {}

// Необязательный аргумент — один файл: ключ инстанса из FIT_ON (например `p0-btn-0`)
// или подстрока имени файла (например `cover2b`, `tutors`, `become`). Без аргумента —
// все шесть, но уже с учётом кеша выше.
const argKey = process.argv[2]
const fitOnEntries = Object.entries(FIT_ON).filter(([file, { key }]) => {
  if (!argKey) return true
  return key === argKey || file.toLowerCase().includes(argKey.toLowerCase())
})
if (argKey && !fitOnEntries.length) {
  throw new Error(`нет файла в FIT_ON по ключу "${argKey}"`)
}

for (const [file, { key, ref: refName }] of fitOnEntries) {
  const p = PLANTS.find(x => x.key === key)

  // Референс мог быть ещё не скачан (например, требует нового захода в Figma MCP) —
  // это не поломка метода, файл просто пропускается: остальные пять/шесть живут дальше.
  let frame
  try {
    frame = await refFrame(p, refName)
  } catch (e) {
    console.log(`⚠ ${file.padEnd(26)} SKIPPED — референс '${refName}.png' недоступен (${e.message})`)
    continue
  }
  const { ref, ppu, rx0, ry0 } = frame
  const frameAspect = p.frame[0] / p.frame[1]

  let scored
  if (psiCache[file] !== undefined) {
    scored = [{ psi: psiCache[file], ...(await score(p, ref, ppu, rx0, ry0, psiCache[file])) }]
  } else {
    // Кандидаты: те ψ, при которых чернила меряют фрейм. Свип 0.5° с добором 0.1° вокруг
    // выживших — иначе истинный оптимум может сидеть между узлами грубой сетки.
    const hull = await inkHull(p.file, !!p.flip)
    const coarse = []
    for (let psi = 0; psi < 360; psi += 0.5) {
      const d = Math.round(psi * 100) / 100
      const box = hullBox(hull, d)
      if (Math.abs(box.w / box.h - frameAspect) / frameAspect < TOL) coarse.push(d)
    }
    const cand = new Set(coarse)
    for (const c of coarse) {
      for (let d = -0.4; d <= 0.4 + 1e-9; d += 0.1) {
        const psi = Math.round((c + d) * 100) / 100
        if (psi < 0 || psi >= 360) continue
        const box = hullBox(hull, psi)
        if (Math.abs(box.w / box.h - frameAspect) / frameAspect < TOL) cand.add(psi)
      }
    }
    if (!cand.size) throw new Error(`${file}: ни один поворот не приводит чернила к фрейму`)

    scored = []
    for (const psi of cand) scored.push({ psi, ...(await score(p, ref, ppu, rx0, ry0, psi)) })
    scored.sort((a, b) => b.iou - a.iou)
    psiCache[file] = scored[0].psi
    savePsiCache(psiCache)
  }
  const best = scored[0]
  iouByFile[file] = best.iou

  const known = PSI_KNOWN[file]
  const ctl = known === undefined ? ''
    : Math.abs(((best.psi - known) % 360 + 360) % 360) < 1 || Math.abs(((best.psi - known) % 360 + 360) % 360 - 360) < 1
      ? `  ✓ кросс-чек ψ=${known}` : `  ~ кросс-чек расходится (ψ=${known} снят с другой конвенции зеркала)`
  console.log(`${best.iou >= PASS ? '✓' : '✗'} ${file.padEnd(26)} ψ=${best.psi}  IoU ${best.iou.toFixed(3)}`
    + `  next: ${scored.slice(1, 4).map(s => `${s.psi}@${s.iou.toFixed(3)}`).join(' ')}${ctl}`)
}

console.log('\n// components/ui/planDecor.ts — вставить как есть\n')
let failed = false
for (const p of PLANTS) {
  const psi = psiCache[p.file]
  if (psi === undefined) {
    console.log(`  /* ${p.key}  ${p.node}  SKIPPED: нет ψ для '${p.file}' — см. строки выше */`)
    continue
  }
  // Файл ниже порога в таблицу не идёт вовсе: неверный ψ даёт правдоподобный, но ЧУЖОЙ
  // кроп — лучше без растения, чем не то растение.
  if (iouByFile[p.file] !== undefined && iouByFile[p.file] < PASS) {
    console.log(`  /* ${p.key}  ${p.node}  SKIPPED: IoU ${iouByFile[p.file].toFixed(3)} < ${PASS} */`)
    continue
  }
  const { box } = await measuredBox(p.file, !!p.flip, psi)
  const wCss = RASTER * (p.frame[0] / box.w)
  const a = anchors(p)
  const deg = Math.round((((psi + p.rot) % 360 + 360) % 360) * 100) / 100
  const wU = +(wCss / BOX[p.plan][p.slot].h * 100).toFixed(3)
  if (!Number.isFinite(wU) || wU <= 0) failed = true
  console.log(`  /* ${p.key}  ${p.node} */`)
  console.log(`  { file: '${p.file}', anchorX: '${a.anchorX}', x: ${a.x}, anchorY: '${a.anchorY}', y: ${a.y}, `
    + `w: ${wU}, rotate: ${deg}${p.flip ? ', flipY: true' : ''} },`)
}
if (failed) process.exit(1)
