import type { CSSProperties } from 'react'
import { PLAN_DECOR, PLAN_DECOR_MOBILE, planDecorStyle, decorSrc, type PlanDecorSlot } from '@/components/ui/planDecorPlants'

/**
 * Растения одного тарифа — на плашке или внутри кнопки, клипнутые по своему контейнеру
 * и нарисованные под его контентом.
 *
 * Три вещи несущие:
 *
 * `container-type: size` живёт на ЭТОМ слое, а не на плашке. Растения меряются в
 * `--plan-u`, а контейнерная единица требует контейнер, чей размер не задаётся
 * содержимым — у плашки задаётся именно им. Слой `inset-0` берёт размер от плашки и
 * может нести containment, не отбирая у неё высоту.
 *
 * `max-w-none` на картинке. Preflight ставит `max-width: 100%`, и он бьёт контейнерную
 * ширину: цветок тихо нарисуется во всю плашку и уедет далеко от того места, куда его
 * поставили.
 *
 * Плашка полупрозрачная и доходит до непрозрачной на hover и в центре экрана. Слой
 * декора несёт ТЕ ЖЕ классы: цветок на полной непрозрачности поверх полупрозрачной
 * плашки сломал бы стекло.
 *
 * Внутренний блик кнопки здесь НЕ перерисовывается, в отличие от FeatureCardDecor:
 * кнопка тарифа непрозрачная, блик у неё 18% белого, и лист поверх него читается
 * нормально — а трогать box-shadow кнопки значит менять сам тариф.
 */
/**
 * Разрастание декора на наведение и на тап — тот же жест, что у пилюль хедера, и те же
 * 1.15 и 340ms (`.pill-decor`).
 *
 * `scale` здесь — ОТДЕЛЬНОЕ CSS-свойство, а не часть `transform`: Tailwind v4 пишет
 * `scale-[1.15]` именно так, и рукописный `transition-property: transform` его бы не
 * анимировал. `.pill-decor` перечисляет все четыре свойства, поэтому переход живёт.
 * Якорь `translate(-50%,-50%)` при этом остаётся в `transform` и не ломается: проценты
 * считаются от border-box, а `scale` его не меняет — центр растения стоит на месте.
 *
 * Тап вместо hover на телефоне: `:active` держится ровно пока палец на экране (~100-150ms),
 * то есть короче самого перехода, и жест читался бы как рывок. `bloomOnTap` вместо этого
 * взводит `[data-tapped]` на 900ms — см. tapBloom.ts.
 *
 * Строки литеральные: Tailwind генерирует правило только для имени класса, которое может
 * прочитать буквально, — собранное из переменной не даст НИЧЕГО, причём молча.
 */
const ZOOM_PLATE = 'pill-decor motion-safe:group-hover:scale-[1.15] motion-safe:group-data-tapped:scale-[1.15]'
const ZOOM_BUTTON = 'pill-decor motion-safe:group-hover/btn:scale-[1.15] motion-safe:group-data-tapped/btn:scale-[1.15]'

export default function PlanDecor({ plan, slot, variant = 'desktop', mask }: {
  plan: number
  slot: PlanDecorSlot
  /**
   * Какую композицию рисовать. Мобильная — не пересчёт десктопной, а свой макет: свои
   * позиции, часть растений другого размера, а у одного другой угол и нет флипа. Оба
   * набора живут в разметке одновременно и переключаются брейкпоинтом, как это уже
   * сделано у самой плашки, — иначе выбор зависел бы от JS и мигал бы до гидрации.
   */
  variant?: 'desktop' | 'mobile'
  mask?: { mobile: string; desktop: string }
}) {
  const isPlate = slot === 'plate'
  const isMobile = variant === 'mobile'
  const plants = isMobile ? PLAN_DECOR_MOBILE[plan] : PLAN_DECOR[plan]?.[slot]
  if (!plants?.length) return null

  // Плашки переключаются по брейкпоинту: композиции у них разные. Кнопка одна на все
  // ширины — решение владельца. В мобильном макете её листья отсутствуют, но кнопка и на
  // телефоне остаётся широкой низкой полосой (пропорция как у макетных 518×99), а числа
  // считаются от её собственной высоты, поэтому десктопная композиция переносится как есть.
  const breakpoint = isPlate ? (isMobile ? 'lg:hidden ' : 'hidden lg:block ') : ''

  return (
    <div
      aria-hidden
      data-plan-decor={`${plan}-${slot}${isMobile ? '-mobile' : ''}`}
      className={
        breakpoint + (isPlate
          ? 'plan-decor-plate absolute inset-0 overflow-hidden pointer-events-none opacity-80 group-hover:opacity-100 group-[.is-center]:opacity-100 transition-opacity duration-[600ms]'
          : 'plan-decor-button absolute inset-0 overflow-hidden pointer-events-none')
      }
      style={{
        borderRadius: 'inherit',
        containerType: 'size',
        ...(mask ? {
          '--plan-mask-mobile': `url(${mask.mobile})`,
          '--plan-mask-desktop': `url(${mask.desktop})`,
        } : null),
      } as CSSProperties}
    >
      {plants.map((p, i) => (
        <img
          key={i}
          /* Путь с ведущим слэшем — готовый рендер инстанса из Figma (тариф 4), он лежит
             не на общей полке decor/ и подставляется как есть. */
          src={p.file.startsWith('/') ? p.file : decorSrc(p.file)}
          alt=""
          data-plan-plant={`${plan}-${slot}${isMobile ? '-mobile' : ''}-${i}`}
          className={`absolute h-auto max-w-none select-none pointer-events-none ${isPlate ? ZOOM_PLATE : ZOOM_BUTTON}`}
          loading="lazy"
          decoding="async"
          style={planDecorStyle(p)}
        />
      ))}
    </div>
  )
}
