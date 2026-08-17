// Декор футера ломается молча: страница рендерится, tsc и lint проходят, растения просто
// не того размера и не в том углу.
//
//   • размеры и смещения — в `--footer-u`, а она резолвится только потому, что на слое
//     стоит `container-type: size`. Потеряли containment — длины считаются против
//     ближайшего предка-контейнера или ни против чего;
//   • preflight ставит `<img> { max-width: 100% }` и бьёт контейнерную ширину: пальма,
//     которой назначили 77.6% высоты карточки, тихо нарисуется во всю её ширину;
//   • у двух угловых срезов правый/нижний край файла И ЕСТЬ край карточки — это они
//     привезли из Figma вместе с клипом. Сползли на пиксель — видно шов;
//   • контент карточки обязан оставаться `relative`: абсолютно спозиционированный сосед
//     рисуется поверх статичного контента при любом порядке в DOM, и декор накрыл бы FAQ;
//   • свежая выгрузка из Figma приносит ПОДЛОЖКУ КАДРА — см. проверку исходников ниже.
//
// Гонять против ПРОД-сборки (`npm run build && npm start`) — dev и прод делят `.next`:
//
//   npm run verify:footer-decor                            → http://localhost:3000/ru
//   npm run verify:footer-decor -- http://host/ru 390x844  → телефон (единица едет на cqw)
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { FOOTER_DECOR, PHONE_BLOOM } from '../components/ui/footerDecorPlants'

const BASE = process.argv[2] ?? 'http://localhost:3000/ru'
const vp = /^(\d+)x(\d+)$/.exec(process.argv[3] ?? '')
const VIEWPORT = vp ? { width: Number(vp[1]), height: Number(vp[2]) } : { width: 1440, height: 900 }
const DESKTOP = VIEWPORT.width >= 1024

// Субпиксельная раскладка плюс проценты от дробной высоты карточки.
const TOL = 1.5

const fails: string[] = []

// ── Подложка кадра в самих файлах ────────────────────────────────────────────
// Figma выгружает срез вместе с окружением: тёмный rect холста, пунктирная рамка секции
// и КРЕМОВАЯ ЗАЛИВКА САМОЙ КАРТОЧКИ размером во весь viewBox. На странице она читается как
// белая плашка под растением и глушит стекло. Проверка идёт по исходнику, а не по рендеру:
// перевыгрузка вернёт ровно эти три элемента, и увидеть их можно, не поднимая браузер.
const DECOR_DIR = fileURLToPath(new URL('../public/SVG/footer/decor/', import.meta.url))
const BACKING = [
  ['fill="#1E1E1E"', 'холст Figma'],
  ['stroke="#8A38F5"', 'пунктирная рамка секции'],
  ['fill="#FFFCE5"', 'заливка карточки — та самая белая подложка'],
] as const

for (const file of readdirSync(DECOR_DIR).filter(f => f.endsWith('.svg'))) {
  const svg = readFileSync(DECOR_DIR + file, 'utf8')
  for (const [needle, what] of BACKING) {
    if (svg.includes(needle)) fails.push(`${file}: в файле осталась подложка кадра — ${what} (${needle})`)
  }
}

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: VIEWPORT, deviceScaleFactor: 1 })

// Страница сама перезагружается пачкой в первые секунды (замерено `framenavigated`: до
// восьми навигаций на один и тот же URL), и любой `page.evaluate` в этот момент падает с
// «Execution context was destroyed». Фиксированной паузы тут мало — пачка приходит не по
// расписанию, — поэтому ждём ТИШИНЫ по событию, а сам замер ещё и повторяем.
let lastNav = Date.now()
page.on('framenavigated', f => { if (f === page.mainFrame()) lastNav = Date.now() })

const settle = async (quietMs = 2_500, capMs = 40_000) => {
  const start = Date.now()
  while (Date.now() - lastNav < quietMs) {
    if (Date.now() - start > capMs) break
    await page.waitForTimeout(250)
  }
}

await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60_000 })
await settle()

// Весь замер — одной попыткой: перезагрузка в середине даёт не ошибку, а РАЗНЫЕ куски
// раскладки, склеенные в один результат. Картинки декора `loading="lazy"`, футер далеко
// ниже сгиба, так что каждая попытка заново прокручивает к нему и заново ждёт загрузку.
const snapshot = async () => {
  await page.waitForSelector('[data-footer-plant]', { state: 'attached', timeout: 20_000 })
  await page.evaluate(() => document.querySelector('#footer')?.scrollIntoView())
  await page.waitForTimeout(1_500)

  // Голый TimeoutError приходит с пустым логом и не говорит, какая картинка не доехала.
  let stuck: string[] = []
  try {
    await page.waitForFunction(
      () => [...document.querySelectorAll<HTMLImageElement>('[data-footer-plant]')]
        .every(i => i.complete && i.naturalWidth > 0),
      null, { timeout: 20_000 },
    )
  } catch {
    stuck = await page.evaluate(() => [...document.querySelectorAll<HTMLImageElement>('[data-footer-plant]')]
      .filter(i => !(i.complete && i.naturalWidth > 0))
      .map(i => `${i.dataset.footerPlant} ← ${i.getAttribute('src')}`))
  }

  // Слой, карточка и все растения — ОДИН evaluate: единица считается от карточки, а не от
  // вьюпорта, и мерить её отдельно от растений значит рисковать склейкой двух раскладок.
  const measured = await page.evaluate(() => {
    const layer = document.querySelector<HTMLElement>('[data-footer-decor]')
    if (!layer) return null
    const card = layer.parentElement as HTMLElement
    const ls = getComputedStyle(layer)
    const l = layer.getBoundingClientRect()
    return {
      layerW: layer.offsetWidth, layerH: layer.offsetHeight,
      cardW: card.offsetWidth, cardH: card.offsetHeight,
      containerType: ls.containerType,
      opacity: ls.opacity,
      overflow: ls.overflowX,
      // Каждый прямой ребёнок карточки, кроме слоя декора, обязан быть позиционированным.
      statics: [...card.children]
        .filter(el => el !== layer && getComputedStyle(el).position === 'static')
        .map(el => (el as HTMLElement).className.slice(0, 60)),
      // Размеры и якоря снимаются с РАСКЛАДКИ (`offset*`), а не с `getBoundingClientRect`:
      // у повёрнутого растения рект — это AABB повёрнутого бокса, он и шире, и выше, и
      // сравнивать его с макетными числами нечем. Трансформ проверяется отдельно, матрицей.
      plants: [...document.querySelectorAll<HTMLImageElement>('[data-footer-plant]')].map(img => {
        const b = img.getBoundingClientRect()
        const cs = getComputedStyle(img)
        return {
          file: img.dataset.footerPlant!,
          w: img.offsetWidth, h: img.offsetHeight,
          left: img.offsetLeft, top: img.offsetTop,
          right: layer.offsetWidth - img.offsetLeft - img.offsetWidth,
          bottom: layer.offsetHeight - img.offsetTop - img.offsetHeight,
          natural: img.naturalWidth / img.naturalHeight,
          transform: cs.transform,
          origin: cs.transformOrigin,
          // AABB — только для отчёта: по нему видно, вылезло ли повёрнутое растение за слой.
          aabbW: b.width, aabbH: b.height, aabbLeft: b.left - l.left, aabbTop: b.top - l.top,
        }
      }),
    }
  })

  return { stuck, measured }
}

type Snapshot = Awaited<ReturnType<typeof snapshot>>
let shot: Snapshot | null = null
for (let attempt = 1; attempt <= 4; attempt++) {
  const before = lastNav
  try {
    const s = await snapshot()
    // Навигация могла прийти уже ПОСЛЕ замера — тогда числа сняты с уходящей раскладки.
    if (lastNav !== before) throw new Error('перезагрузка пришла в середине замера')
    shot = s
    break
  } catch (e) {
    if (attempt === 4) { fails.push(`замер сорвался 4 раза подряд: ${String(e).split('\n')[0]}`); break }
    await settle()
  }
}

if (shot?.stuck.length) fails.push(`не загрузились за 20с: ${shot.stuck.join(', ')}`)
const frame = shot?.measured ?? null

if (!frame) {
  fails.push('слоя [data-footer-decor] нет в DOM')
} else {
  if (frame.containerType === 'normal') fails.push(`на слое нет containment: container-type=${frame.containerType} → --footer-u не резолвится`)
  if (frame.layerW !== frame.cardW || frame.layerH !== frame.cardH) {
    fails.push(`слой разошёлся с карточкой: ${frame.layerW}×${frame.layerH} против ${frame.cardW}×${frame.cardH}`)
  }
  if (Math.abs(Number(frame.opacity) - 0.8) > 0.01) fails.push(`opacity слоя ${frame.opacity}, ждали 0.8 (связка с .glass)`)
  if (frame.overflow === 'visible') fails.push('слой не клипует: срезы вылезут за скруглённый угол карточки')
  if (frame.statics.length) fails.push(`контент карточки потерял relative и уйдёт ПОД декор: ${frame.statics.join(' | ')}`)
}

// Опорная сторона: cqh на десктопе, cqw ниже lg — см. globals.css / footerDecorPlants.ts.
const U = frame ? (DESKTOP ? frame.cardH : frame.cardW) / 100 : 0

for (const want of FOOTER_DECOR) {
  const got = frame?.plants.find(p => p.file === want.file)

  if (!got) { fails.push(`${want.file}: нет в DOM`); continue }

  const near = (a: number, b: number, what: string) => {
    if (Math.abs(a - b) > TOL) fails.push(`${want.file}: ${what} ${a.toFixed(1)}, ждали ${b.toFixed(1)}`)
  }

  // У трёх мелких растений размер меряется своей единицей — `.footer-plant-big` в
  // globals.css ставит им `--footer-su: min(PHONE_BLOOM·1cqw, 1cqh)`. Порог
  // геометрический, а не по брейкпоинту, поэтому и ждём здесь то же сравнение сторон, а
  // не «ниже lg умножить»: на телефоне выигрывает ширина (карточка вытянута круче
  // PHONE_BLOOM:1), на планшете и десктопе — высота. Пальма считается по `--footer-u`,
  // то есть ловится и обратное — если подменённая единица протечёт на неё.
  const sizeU = want.big ? Math.min(PHONE_BLOOM * (frame!.cardW / 100), frame!.cardH / 100) : U
  near(got.w, want.w * sizeU, 'ширина')
  near(got.h, want.h * sizeU, 'высота')
  near(want.anchorX === 'left' ? got.left : got.right, want.x * U, `отступ от ${want.anchorX}`)
  // Вертикаль всегда в процентах ВЫСОТЫ карточки, независимо от опорной стороны. Подъём
  // сюда НЕ входит: он живёт в трансформе, а якоря сняты с раскладки.
  near(want.anchorY === 'top' ? got.top : got.bottom, (want.y / 100) * (frame?.cardH ?? 0), `отступ от ${want.anchorY}`)

  // ── Трансформ: подъём (только телефон) и поворот (все ширины) ──
  // Сравнивается матрица, а не «на сколько сдвинулся рект»: у повёрнутого бокса сдвиг из
  // ректа не вычитается однозначно, а матрица называет обе величины прямо. `translateY(-L)
  // rotate(θ)` даёт matrix(cos, sin, −sin, cos, 0, −L).
  const lift = DESKTOP ? 0 : (want.liftPhone ?? 0)
  const rot = ((want.rotate ?? 0) * Math.PI) / 180
  const wantM = [Math.cos(rot), Math.sin(rot), -Math.sin(rot), Math.cos(rot), 0, -lift]
  // Экспонента в ответе браузера — не редкость (cos 90° приходит как 6.12e-17), и наивное
  // `[\d.]+` разорвало бы такое число надвое.
  const NUM = /-?\d+(?:\.\d+)?(?:e[-+]?\d+)?/gi
  const gotM = got.transform === 'none' ? [1, 0, 0, 1, 0, 0] : (got.transform.match(NUM) ?? []).map(Number)
  if (gotM.length !== 6) {
    fails.push(`${want.file}: трансформ не разобрался — ${got.transform}`)
  } else if (wantM.some((v, i) => Math.abs(v - gotM[i]) > (i < 4 ? 0.001 : TOL))) {
    const fmt = (m: number[]) => m.map(v => v.toFixed(3)).join(', ')
    fails.push(`${want.file}: трансформ (${fmt(gotM)}), ждали (${fmt(wantM)}) — подъём ${lift}px, поворот ${want.rotate ?? 0}°`)
  }
  // Поворот считается от ЦЕНТРА бокса: сместится origin — растение уедет по дуге, а все
  // проверки выше этого не заметят, они смотрят на нетронутую трансформом раскладку.
  if (want.rotate) {
    const [ox, oy] = (got.origin.match(NUM) ?? []).map(Number)
    if (Math.abs(ox - got.w / 2) > TOL || Math.abs(oy - got.h / 2) > TOL) {
      fails.push(`${want.file}: transform-origin ${got.origin}, ждали центр бокса ${(got.w / 2).toFixed(1)}px ${(got.h / 2).toFixed(1)}px`)
    }
  }

  // Пропорция файла против назначенной: если w и h разъедутся, срез перекосит.
  const drawn = got.w / got.h
  if (Math.abs(drawn - got.natural) / got.natural > 0.01) {
    fails.push(`${want.file}: пропорция ${drawn.toFixed(4)} против файловой ${got.natural.toFixed(4)} — срез перекошен`)
  }
}

const tag = `${VIEWPORT.width}x${VIEWPORT.height}`
if (fails.length) {
  console.log(`FAIL ${tag}\n  ` + fails.join('\n  '))
} else {
  console.log(`PASS ${tag} — ${FOOTER_DECOR.length} срезов, единица ${DESKTOP ? 'cqh' : 'cqw'} = ${U.toFixed(2)}px, карточка ${frame!.cardW}×${frame!.cardH}`)
}

await browser.close()
process.exit(fails.length ? 1 : 0)
