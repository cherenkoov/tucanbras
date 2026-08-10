import type { CSSProperties } from 'react'

export { decorSrc } from '@/components/ui/heroPlants'

/**
 * Растения, которыми обклеены плашки тарифов и кнопки внутри них (Figma 3484:60740).
 *
 * ── Почему процент КОРОТКОЙ стороны ──
 *
 * Макет рисует плашку 1100×391. В проде её ширина — что осталось от контейнера (до
 * 1720), а высота задана контентом и почти совпадает с макетной. В долях ширины цветок
 * рос бы на 56% там, где плашка не растёт вообще, и в кадре оказывался бы всё больший
 * кусок одного листа. В долях высоты кроп макетный на любой ширине, а широкая плашка
 * просто показывает больше плоского цвета.
 *
 * На телефоне та же плашка — высокая карточка, и короткая сторона у неё уже ширина.
 * Поэтому единица вынесена в `--plan-u` (globals.css): `1cqh` от `lg`, `1cqw` ниже.
 * Кнопка остаётся широкой низкой полосой на всех ширинах и держит `1cqh` везде.
 *
 * ── Якорь ──
 *
 * Каждое растение прижато к БЛИЖАЙШЕЙ грани своего контейнера, по осям независимо;
 * «практически по центру» (в пределах ±5% размера) — это `center`. Figma почти везде
 * отдаёт привязку к левому краю, но лишь потому, что фрейм никогда не растягивали:
 * композиция макета — листья, лезущие в кадр с обоих концов, и при плашке 1720 вместо
 * 1100 буквальная левая привязка сгонит правые кусты к середине.
 *
 * Якорем служит ЦЕНТР бокса: поворот идёт вокруг него, то есть это единственная точка,
 * которую трансформ не двигает.
 *
 * ── Угол ──
 *
 * `rotate` — это НЕ угол из макета. Файлы в decor/ экспортированы из уже повёрнутых
 * инстансов, поэтому к макетному углу прибавлена ψ — собственный поворот файла,
 * найденный `node scripts/fitPlanDecor.mjs` против рендера Figma. Менять числа руками
 * нельзя: гонять скрипт.
 *
 * ── Чего здесь НЕТ ──
 *
 * Шесть инстансов из шестнадцати не попали в таблицу, и это осознанно:
 * • тариф 3 (оранжевый), все четыре инстанса `Flower 3 - Become` — фит не берёт порог
 *   ни на одном угле (лучшее IoU 0.372 против порога 0.92). Неверный ψ даёт
 *   правдоподобный, но ЧУЖОЙ кроп, поэтому лучше без растения, чем не то растение;
 * • тариф 0, оба инстанса `Flower 2 - Cover` в кнопке — ждут референса из Figma
 *   (инстанс 3483:45351): у прежнего окно было 119×99, композит закрывал его целиком,
 *   и IoU держался на 0.415 у любого кандидата — скор не различал угол.
 */
export type PlanDecorSlot = 'plate' | 'button'

export type PlanDecorPlant = {
  /** файл в `public/SVG/header/decor` */
  file: string
  /** грань, от которой отмеряется центр по горизонтали */
  anchorX: 'left' | 'right' | 'center'
  /** смещение центра от этой грани, в единицах `--plan-u` */
  x: number
  anchorY: 'top' | 'bottom' | 'center'
  y: number
  /** ширина собственного бокса файла, в единицах `--plan-u`. Высота следует за файлом. */
  w: number
  /** градусы, вокруг центра картинки, после флипа */
  rotate: number
  /** нужно ли сперва перевернуть файл */
  flipY?: boolean
}

export const PLAN_DECOR: readonly Record<PlanDecorSlot, readonly PlanDecorPlant[]>[] = [
  {
    plate: [
      /* p0-plate-0  3483:45165 */
      { file: 'Flower 2 - Tutors.svg', anchorX: 'left', x: 9.821, anchorY: 'bottom', y: -9.85, w: 67.938, rotate: 0.19 },
      /* p0-plate-1  3483:45159 */
      { file: 'Flower 2 - Tutors.svg', anchorX: 'right', x: 11.427, anchorY: 'top', y: -5.01, w: 69.27, rotate: 326.5 },
      /* p0-plate-2  3483:45170 */
      { file: 'Flower 2 - Tutors.svg', anchorX: 'center', x: 25.517, anchorY: 'top', y: 31.76, w: 80.609, rotate: 0.19 },
    ],
    /* 3483:45351 и 3483:45402 — ждут референса, см. шапку файла */
    button: [],
  },
  {
    plate: [
      /* p1-plate-0  3483:45175 */
      { file: 'Flower 4 - Cover.svg', anchorX: 'right', x: 34.673, anchorY: 'bottom', y: 36.488, w: 99.93, rotate: 115.86 },
      /* p1-plate-1  3483:45201 */
      { file: 'Flower 4 - Cover.svg', anchorX: 'left', x: 106.383, anchorY: 'top', y: 18.69, w: 54.544, rotate: 243.94, flipY: true },
    ],
    button: [
      /* p1-btn-0  3484:60166 — бокс вчетверо шире кнопки: в кадр попадает только край листа */
      { file: 'Flower - Plans.svg', anchorX: 'center', x: 0.486, anchorY: 'top', y: -26.538, w: 1062.886, rotate: 358.5, flipY: true },
    ],
  },
  {
    plate: [
      /* p2-plate-0  3484:60118 */
      { file: 'Flower 1 - CELPE-BRAS.svg', anchorX: 'left', x: 28.523, anchorY: 'top', y: -45.102, w: 127.61, rotate: 291.03 },
      /* p2-plate-1  3484:59890 */
      { file: 'Flower 1 - CELPE-BRAS.svg', anchorX: 'right', x: -0.07, anchorY: 'bottom', y: -25.012, w: 146.131, rotate: 106.2 },
    ],
    button: [
      /* p2-btn-0  3484:60261 */
      { file: 'Flower 1 - CELPE-BRAS.svg', anchorX: 'right', x: 102.488, anchorY: 'bottom', y: 0.217, w: 366.857, rotate: 256.48, flipY: true },
      /* p2-btn-1  3484:60309 */
      { file: 'Flower 1 - CELPE-BRAS.svg', anchorX: 'left', x: 122.765, anchorY: 'bottom', y: 34.56, w: 366.857, rotate: 76.48, flipY: true },
    ],
  },
  /* Тариф 3: все четыре инстанса Flower 3 - Become отсеяны фитом, см. шапку файла */
  { plate: [], button: [] },
]

/** Длина в единицах контейнера. `--plan-u` ставит globals.css. */
const u = (n: number) => `calc(var(--plan-u) * ${n})`

/**
 * Где должен стоять бокс растения, чтобы его ЦЕНТР попал на `x`/`y` от выбранных граней.
 *
 * Грани ставят бокс, translate утаскивает его назад на половину себя. Translate записан
 * ПЕРВЫМ, значит применяется ПОСЛЕДНИМ: флип и поворот идут вокруг несмещённого центра,
 * и поэтому `x`/`y` не зависят от угла. `scaleY(-1)` записан последним, значит применится
 * первым — в том же порядке, в каком композит Figma (её scale действует до rotate).
 *
 * Инлайном, а не классами: значения вычисляемые, а Tailwind генерирует правило только
 * для того, что может прочитать буквально.
 */
export function planDecorStyle(p: PlanDecorPlant): CSSProperties {
  const s: CSSProperties = { width: u(p.w) }

  if (p.anchorX === 'center') s.left = `calc(50% + ${u(p.x)})`
  else if (p.anchorX === 'left') s.left = u(p.x)
  else s.right = u(p.x)

  if (p.anchorY === 'center') s.top = `calc(50% + ${u(p.y)})`
  else if (p.anchorY === 'top') s.top = u(p.y)
  else s.bottom = u(p.y)

  const tx = p.anchorX === 'right' ? '50%' : '-50%'
  const ty = p.anchorY === 'bottom' ? '50%' : '-50%'
  s.transform = `translate(${tx}, ${ty}) rotate(${p.rotate}deg)${p.flipY ? ' scaleY(-1)' : ''}`
  return s
}
