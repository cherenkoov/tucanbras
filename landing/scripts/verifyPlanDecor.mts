// Декор тарифов ломается молча: страница рендерится, tsc и lint проходят, растения
// просто не того размера и не в том месте.
//
//   • размеры и смещения — в `--plan-u`, а она существует только потому, что на слое
//     стоит `container-type: size`. Потеряли containment — все длины резолвятся против
//     ближайшего предка-контейнера или ни против чего;
//   • preflight ставит `max-width: 100%` и бьёт контейнерную ширину: цветок, которому
//     назначили 60% высоты плашки, тихо нарисуется во всю её ширину;
//   • слой обязан совпадать с хозяином. Уже ловилось вживую: у кнопки не было
//     `position: relative`, и `absolute inset-0` отсчитался от колонки — лист вышел
//     вдвое шире кнопки и накрыл лейбл;
//   • лейбл кнопки перекрывается декором, если потерял `relative`: абсолютно
//     спозиционированный сосед рисуется поверх статичного контента при любом порядке
//     в DOM.
//
// Гонять против ПРОД-сборки (`npm run build && npm start`) — dev и прод делят `.next`:
//
//   npm run verify:plan-decor                            → http://localhost:3000/ru
//   npm run verify:plan-decor -- http://host/pt          → самые длинные подписи
//   npm run verify:plan-decor -- http://host/ru 390x844  → телефон
import { chromium } from 'playwright'
import { PLAN_DECOR, PLAN_DECOR_MOBILE } from '../components/ui/planDecorPlants'

const BASE = process.argv[2] ?? 'http://localhost:3000/ru'
const vp = /^(\d+)x(\d+)$/.exec(process.argv[3] ?? '')
const VIEWPORT = vp ? { width: Number(vp[1]), height: Number(vp[2]) } : { width: 1440, height: 900 }
const DESKTOP = VIEWPORT.width >= 1024

// Субпиксельная раскладка плюс проценты от дробной высоты контейнера.
const TOL = 1.5

// У ПЛАШЕК две разные композиции: мобильная — собственный макет (Price List 3498:46099),
// а не пересчёт десктопной (свои позиции, часть растений другого размера, у одного другой
// угол и нет флипа). У КНОПОК композиция одна на все ширины: в мобильном макете их листья
// отсутствуют, но владелец попросил оставить как на десктопе.
const buttons = PLAN_DECOR.flatMap((p, plan) =>
  p.button.map((q, i) => ({ ...q, id: `${plan}-button-${i}`, slot: 'button' as const })))

const expected = [
  ...(DESKTOP
    ? PLAN_DECOR.flatMap((p, plan) =>
        p.plate.map((q, i) => ({ ...q, id: `${plan}-plate-${i}`, slot: 'plate' as const })))
    : PLAN_DECOR_MOBILE.flatMap((plants, plan) =>
        plants.map((q, i) => ({ ...q, id: `${plan}-plate-mobile-${i}`, slot: 'plate' as const })))),
  ...buttons,
]

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: VIEWPORT, deviceScaleFactor: 1 })
await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60_000 })
// Локальный редирект локали успевает снести контекст исполнения, если спросить сразу.
await page.waitForTimeout(3_000)
await page.waitForSelector('[data-plan-plant]', { state: 'attached', timeout: 20_000 })
// Картинки декора `loading="lazy"`, а секция лежит далеко ниже сгиба: без прокрутки к ней
// браузер их вообще не запрашивает, и любая проверка «загрузилось ли» провалится вхолостую.
await page.evaluate(() => document.querySelector('#plans')?.scrollIntoView())
await page.waitForFunction(
  () => [...document.querySelectorAll<HTMLImageElement>('[data-plan-plant]')]
    .filter(i => i.getBoundingClientRect().width > 0).every(i => i.complete && i.naturalWidth > 0),
  null, { timeout: 20_000 },
)

const fails: string[] = []

for (const want of expected) {
  const got = await page.evaluate((id) => {
    // Мобильный стек и десктопный ряд живут в DOM одновременно — берём видимый.
    const imgs = [...document.querySelectorAll<HTMLImageElement>(`[data-plan-plant="${id}"]`)]
    const img = imgs.find(el => el.getBoundingClientRect().width > 0)
    if (!img) return null
    const layer = img.parentElement!
    const host = layer.parentElement!
    const cs = getComputedStyle(img)
    const ls = getComputedStyle(layer)
    // offset*, а НЕ getBoundingClientRect: на мобилке PlansStack масштабирует карточки
    // трансформом, и рект возвращает размер ПОСЛЕ него — а контейнерные единицы
    // резолвятся против layout-бокса. Сравнение ректа с cq-единицей врало бы на скейл.
    const lo = layer as HTMLElement
    const ho = host as HTMLElement
    return {
      layerW: lo.offsetWidth, layerH: lo.offsetHeight,
      hostW: ho.offsetWidth, hostH: ho.offsetHeight,
      imgW: img.offsetWidth,
      loaded: img.naturalWidth > 0,
      maxWidth: cs.maxWidth,
      pointerEvents: cs.pointerEvents,
      containerType: ls.containerType,
      overflow: ls.overflow,
      hasMask: (ls.getPropertyValue('mask-image') || ls.getPropertyValue('-webkit-mask-image')).trim() !== 'none',
    }
  }, want.id)

  if (!got) { fails.push(`${want.id}: не найден видимый <img>`); continue }
  if (!got.loaded) fails.push(`${want.id}: файл не загрузился (${want.file})`)
  if (got.maxWidth !== 'none') fails.push(`${want.id}: max-width ${got.maxWidth}, ждали none`)
  if (got.pointerEvents !== 'none') fails.push(`${want.id}: pointer-events ${got.pointerEvents}`)
  if (got.containerType !== 'size') fails.push(`${want.id}: слой без container-type: size (${got.containerType})`)
  if (got.overflow !== 'hidden') fails.push(`${want.id}: слой не клипует (overflow ${got.overflow})`)

  // Слой обязан быть ровно хозяином: иначе `--plan-u` считается не от того бокса.
  if (Math.abs(got.layerW - got.hostW) > TOL || Math.abs(got.layerH - got.hostH) > TOL) {
    fails.push(`${want.id}: слой ${got.layerW.toFixed(0)}x${got.layerH.toFixed(0)} `
      + `!= хозяин ${got.hostW.toFixed(0)}x${got.hostH.toFixed(0)} (нет position: relative на хозяине?)`)
  }

  // Единица одна на всех ширинах — высота своего контейнера. Подмена опорной стороны на
  // мобилке отпала вместе с появлением собственной мобильной таблицы.
  const unit = got.layerH
  const expW = unit / 100 * want.w
  if (Math.abs(got.imgW - expW) > TOL) {
    fails.push(`${want.id}: ширина ${got.imgW.toFixed(1)}px, ждали ${expW.toFixed(1)}px (${want.w}u от ${unit.toFixed(1)}px)`)
  }

  if (want.slot === 'plate' && !got.hasMask) fails.push(`${want.id}: на слое плашки нет маски формы`)
}

// Лейбл кнопки обязан рисоваться поверх декора.
const label = await page.evaluate(() => {
  const layer = document.querySelector('[data-plan-decor$="-button"]')
  if (!layer) return 'слой кнопки не найден'
  const span = layer.parentElement!.querySelector('span')
  if (!span) return 'лейбл не найден'
  return getComputedStyle(span).position === 'static' ? 'лейбл статичный — его перекроет декор' : ''
})
if (label) fails.push(`кнопка: ${label}`)

await browser.close()

if (fails.length) {
  console.error(`✗ ${fails.length} проблем при ${VIEWPORT.width}x${VIEWPORT.height}:`)
  for (const f of fails) console.error('   ' + f)
  process.exit(1)
}
console.log(`✓ ${expected.length} растений на месте при ${VIEWPORT.width}x${VIEWPORT.height}`)
