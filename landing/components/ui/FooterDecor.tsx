import { FOOTER_DECOR, footerDecorSrc, footerDecorStyle } from '@/components/ui/footerDecorPlants'

/**
 * Слой растений внутри карточки футера — под её контентом, клипнутый по её же радиусу.
 *
 * `container-type: size` живёт на ЭТОМ слое, а не на карточке: срезы меряются в
 * `--footer-u`, а контейнерная единица требует контейнер, чей размер не задаётся
 * содержимым, — у карточки он задаётся именно им (FAQ переносится по-разному в каждой
 * локали). Слой `inset-0` берёт размер от карточки и может нести containment, не отбирая
 * у неё высоту. То же решение, что в FeatureCardDecor и PlanDecor.
 *
 * `max-w-none` на картинке: preflight ставит `<img> { max-width: 100% }`, и он бьёт
 * контейнерную ширину — пальма тихо нарисовалась бы во всю карточку и уехала из угла.
 *
 * Прозрачность живёт в globals.css (`.footer-decor`), а не здесь: она обязана
 * переключаться теми же триггерами, что и сама `.glass` — `:hover` на указательных
 * устройствах и `.is-center` на тач, — а это два разных медиазапроса, которых инлайн-стиль
 * не умеет. Растение на полной непрозрачности поверх полупрозрачной карточки сломало бы
 * стекло.
 *
 * `.footer-plant-big` — три мелких растения на телефоне вчетверо крупнее макетной доли
 * (globals.css; на десктопе множитель гасится в 1). Класс вешается по флагу `big` таблицы.
 * `.footer-plant-tf` — тем же образом несёт трансформ: подъём на `liftPhone` px (только на
 * телефоне) и поворот на `rotate` градусов (на всех ширинах). Оба в одном правиле, потому
 * что `transform` у элемента одно.
 *
 * Разрастания на наведение (`.pill-decor`, как у пилюль хедера и тарифов) тут НЕТ
 * намеренно: карточка футера во всю ширину страницы, и её `:hover` означает просто «курсор
 * где-то внизу страницы» — жест сработал бы сам собой, а не в ответ на действие.
 */
export default function FooterDecor() {
  return (
    <div
      aria-hidden
      data-footer-decor
      className="footer-decor absolute inset-0 overflow-hidden pointer-events-none"
      style={{ borderRadius: 'inherit', containerType: 'size' }}
    >
      {FOOTER_DECOR.map(plant => (
        <img
          key={plant.file}
          src={footerDecorSrc(plant.file)}
          alt=""
          data-footer-plant={plant.file}
          className={[
            'absolute block max-w-none select-none pointer-events-none',
            plant.big ? 'footer-plant-big' : '',
            plant.liftPhone || plant.rotate ? 'footer-plant-tf' : '',
          ].filter(Boolean).join(' ')}
          loading="lazy"
          decoding="async"
          style={footerDecorStyle(plant)}
        />
      ))}
    </div>
  )
}
