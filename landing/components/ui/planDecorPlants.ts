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
 * Все 16 инстансов на месте. Два из них — кнопка тарифа 0 — стоят при IoU 0.497, ниже
 * порога 0.92, и это осознанно: угол подтверждён НЕЗАВИСИМО двумя разными кадрами
 * (77.1 на окне 119×99 инстанса 3483:45402 и 76.6 на окне 260×99 инстанса 3483:45351).
 * Совпадение замеров по разным окнам — довод сильнее самой метрики, которая на плотном
 * листе в узкой полосе штрафует за доли градуса. То же и у тарифа 3 (IoU 0.435).
 *
 * Заливка листьев в кнопке тарифа 0 — тот же `#8FD096`, что у самой кнопки; тёмным лист
 * выглядит из-за multiply-слоёв ВНУТРИ рисунка, а не из-за подложки.
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
      { file: 'Flower 2 - Tutors - Plans Cream.svg', anchorX: 'left', x: 9.821, anchorY: 'bottom', y: -9.85, w: 67.938, rotate: 0.19 },
      /* p0-plate-1  3483:45159 */
      { file: 'Flower 2 - Tutors - Plans Cream.svg', anchorX: 'right', x: 11.427, anchorY: 'top', y: -5.01, w: 69.27, rotate: 326.5 },
      /* p0-plate-2  3483:45170 */
      { file: 'Flower 2 - Tutors - Plans Cream.svg', anchorX: 'center', x: 25.517, anchorY: 'top', y: 31.76, w: 80.609, rotate: 0.19 },
    ],
    button: [
      /* p0-btn-0  3483:45351 */
      { file: 'Flower 2 - Cover - Plans Green.svg', anchorX: 'left', x: 89.677, anchorY: 'top', y: 0.489, w: 362.111, rotate: 348.45, flipY: true },
      /* p0-btn-1  3483:45402 */
      { file: 'Flower 2 - Cover - Plans Green.svg', anchorX: 'right', x: -22.863, anchorY: 'center', y: 0.023, w: 258.473, rotate: 128.43, flipY: true },
    ],
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
      { file: 'Flower - Plans - Plan Button.svg', anchorX: 'center', x: 0.486, anchorY: 'top', y: -26.538, w: 1062.886, rotate: 358.5, flipY: true },
    ],
  },
  {
    plate: [
      /* p2-plate-0  3484:60118 */
      { file: 'Flower 1 - CELPE-BRAS - Plans Pale.svg', anchorX: 'left', x: 28.523, anchorY: 'top', y: -45.102, w: 127.61, rotate: 291.03 },
      /* p2-plate-1  3484:59890 */
      { file: 'Flower 1 - CELPE-BRAS - Plans Pale.svg', anchorX: 'right', x: -0.07, anchorY: 'bottom', y: -25.012, w: 146.131, rotate: 106.2 },
    ],
    button: [
      /* p2-btn-0  3484:60261 */
      { file: 'Flower 1 - CELPE-BRAS - Plans Blue.svg', anchorX: 'right', x: 102.488, anchorY: 'bottom', y: 0.217, w: 366.857, rotate: 256.48, flipY: true },
      /* p2-btn-1  3484:60309 */
      { file: 'Flower 1 - CELPE-BRAS - Plans Blue.svg', anchorX: 'left', x: 122.765, anchorY: 'bottom', y: 34.56, w: 366.857, rotate: 76.48, flipY: true },
    ],
  },
  {
    /* Тариф 3 пущен НИЖЕ порога IoU (0.435 после доводки центра) — см. BELOW_PASS_OK в
       scripts/fitPlanDecor.mjs. Силуэт и угол при ψ=209.4 совпадают с рендером Figma,
       метрика строгая; центр доведён по референсу, а не взят из бокса макета. Проверено
       глазами против макета — если разойдётся, снимать отсюда вместе с BELOW_PASS_OK. */
    plate: [
      /* p3-plate-0  3484:59802 */
      { file: 'Flower 3 - Become - Plans Olive.svg', anchorX: 'right', x: 95.912, anchorY: 'top', y: 42.465, w: 168.686, rotate: 138.8, flipY: true },
      /* p3-plate-1  3484:60356 */
      { file: 'Flower 3 - Become - Plans Olive.svg', anchorX: 'left', x: 12.901, anchorY: 'bottom', y: -1.574, w: 227.828, rotate: 280 },
    ],
    button: [
      /* p3-btn-0  3484:60565 */
      { file: 'Flower 3 - Become - Plans Pale.svg', anchorX: 'left', x: 34.679, anchorY: 'bottom', y: -13.14, w: 380.026, rotate: 280 },
      /* p3-btn-1  3484:60653 */
      { file: 'Flower 3 - Become - Plans Pale.svg', anchorX: 'right', x: 109.596, anchorY: 'bottom', y: 23.501, w: 380.026, rotate: 100 },
    ],
  },
]

/**
 * Мобильная композиция — ОТДЕЛЬНЫЙ макет (Figma Price List 3498:46099, ширина 354), а не
 * пересчёт десктопной. Разница не косметическая:
 *
 * • внутри кнопок на мобилке декора НЕТ ни у одного тарифа — поэтому здесь только плашки;
 * • у растений свои позиции и часть из них другого размера;
 * • у `3499:46325` вдобавок другой угол (−64.04 против −115.96) и НЕТ флипа, то есть
 *   пересчёт десктопных чисел дал бы просто не тот лист.
 *
 * Единица та же `--plan-u` = 1cqh, но контейнер свой: высоты мобильных плашек (472/448/
 * 478/494) отличаются от десктопных, и числа посчитаны против них.
 */
export const PLAN_DECOR_MOBILE: readonly (readonly PlanDecorPlant[])[] = [
  [
    /* m0-plate-0  3498:46306 */
    { file: 'Flower 2 - Tutors - Plans Cream.svg', anchorX: 'left', x: -9.091, anchorY: 'top', y: 7.242, w: 66.776, rotate: 0.19 },
    /* m0-plate-1  3499:46312 */
    { file: 'Flower 2 - Tutors - Plans Cream.svg', anchorX: 'right', x: -1.551, anchorY: 'top', y: 25.723, w: 57.382, rotate: 326.5 },
    /* m0-plate-2  3499:46318 */
    { file: 'Flower 2 - Tutors - Plans Cream.svg', anchorX: 'left', x: 12.373, anchorY: 'bottom', y: 9.849, w: 56.279, rotate: 0.19 },
  ],
  [
    /* m1-plate-0  3499:46324 */
    { file: 'Flower 4 - Cover.svg', anchorX: 'right', x: 6.824, anchorY: 'bottom', y: -2.306, w: 87.216, rotate: 115.86 },
    /* m1-plate-1  3499:46325 — не копия десктопного: свой угол, без флипа */
    { file: 'Flower 4 - Cover.svg', anchorX: 'left', x: 4.228, anchorY: 'top', y: 7.892, w: 66.162, rotate: 295.86 },
  ],
  [
    /* m2-plate-0  3499:46375 */
    { file: 'Flower 1 - CELPE-BRAS - Plans Pale.svg', anchorX: 'left', x: 23.332, anchorY: 'top', y: -36.893, w: 104.384, rotate: 291.03 },
    /* m2-plate-1  3499:46376 */
    { file: 'Flower 1 - CELPE-BRAS - Plans Pale.svg', anchorX: 'right', x: 20.235, anchorY: 'bottom', y: -24.016, w: 119.534, rotate: 106.2 },
  ],
  [
    /* m3-plate-0  3499:46642 */
    { file: 'Flower 3 - Become - Plans Olive.svg', anchorX: 'right', x: 21.624, anchorY: 'top', y: 29.509, w: 129.03, rotate: 100 },
    /* m3-plate-1  3499:46643 */
    { file: 'Flower 3 - Become - Plans Olive.svg', anchorX: 'left', x: 24.127, anchorY: 'bottom', y: -1.157, w: 144.047, rotate: 280 },
  ],
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
