'use client'

import { useEffect, useRef, useState } from 'react'
import { uiLabels } from '@/lib/uiLabels'
import { bloomOnTap } from '@/components/ui/tapBloom'

/**
 * Сколько держится «Отменено» после снятия выбора. Карточка тутора мигает 600мс
 * (`flashDeselect` в Tutors) — здесь дольше: там подтверждением служит ещё и смена
 * цвета карточки, а тут вся обратная связь — одна надпись, и страница под кнопкой
 * не двигается.
 */
const FLASH_MS = 1000

interface Props {
  /**
   * Тариф, который кнопка кладёт в футер-форму, — «Пробный урок»
   * (`footerData.formFreeLessonOption`, первый пункт списка тарифов).
   * Строка должна совпадать с пунктом дословно: FooterForm принимает
   * `plan-selected` только если значение есть в `planNames`.
   */
  planName:   string
  locale:     string
  className?: string
  style?:     React.CSSProperties
}

/**
 * Hero CTA = карточка тарифа из секции Plans, только без плашки: тот же
 * `plan-selected`, та же надпись «Выбрано!». Отличий два.
 *
 * 1. Кнопка НИКУДА не ведёт — ни к #tutors (прежнее поведение), ни к футер-форме
 *    (в отличие от карточек тарифов): читатель остаётся на первом экране и видит
 *    только, что выбор принят. Тариф при этом уже лежит в форме — он найдёт его,
 *    когда дойдёт.
 * 2. Выбор снимается повторным нажатием, с «Отменено» на секунду — как у карточки
 *    тутора. Карточкам тарифов такое не нужно: там выбор всегда виден рядом с
 *    остальными тремя, а тут кнопка одна и отменить выбор больше нечем.
 */
export default function FreeLessonButton({ planName, locale, className, style }: Props) {
  const L = uiLabels(locale)

  // Выбор живёт в глобальном `plan-selected` (как в PlanSection): смена тарифа
  // в футер-форме или в секции тарифов должна гасить надпись здесь.
  const [selected,    setSelected]    = useState(false)
  const [justCleared, setJustCleared] = useState(false)
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const onPlanSelected = (e: Event) => {
      const picked = (e as CustomEvent<string | null>).detail
      setSelected(picked === planName)
      // Гасим вспышку только на РЕАЛЬНОМ выборе: собственный диспатч снятия
      // (detail === null) прилетает сюда же и иначе стёр бы «Отменено» сразу.
      if (picked !== null) setJustCleared(false)
    }
    window.addEventListener('plan-selected', onPlanSelected)
    return () => window.removeEventListener('plan-selected', onPlanSelected)
  }, [planName])

  useEffect(() => () => { if (flashTimer.current) clearTimeout(flashTimer.current) }, [])

  const handleClick = () => {
    // null = «ничего не выбрано» — тот же язык, которым говорит карусель туторов
    // (`tutor-selected`), и по нему же FooterForm чистит поле тарифа.
    const next = selected ? null : planName
    window.dispatchEvent(new CustomEvent('plan-selected', { detail: next }))
    if (next !== null) return

    setJustCleared(true)
    if (flashTimer.current) clearTimeout(flashTimer.current)
    flashTimer.current = setTimeout(() => setJustCleared(false), FLASH_MS)
  }

  const label = selected ? L.planSelected : justCleared ? L.unselected : L.tryFree

  return (
    <button
      type="button"
      onClick={handleClick}
      // Тап = замена наведения: взводит `[data-tapped]` на 900мс, и на него отвечает
      // антуриум в Hero (`peer-data-tapped`, tapBloom.ts). Обработчик живёт здесь, а
      // не в Hero, потому что Hero — серверный компонент: функцию через границу не
      // передать, а `peer`-селектору атрибут нужен именно на КНОПКЕ.
      // На мыши `bloomOnTap` сам ничего не делает — там уже есть настоящий hover.
      onPointerDown={bloomOnTap}
      aria-pressed={selected}
      className={className}
      style={style}
    >
      {label}
    </button>
  )
}
