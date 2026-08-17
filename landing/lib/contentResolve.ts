/**
 * Слияние строки контента из БД с запечённым снапшотом.
 *
 * Форма результата задаётся ФОЛБЭКОМ, а не строкой из БД: ключи, которых нет
 * в снапшоте, отбрасываются. Это держит контракт с типами лендинга даже если
 * в JSONB попало что-то лишнее.
 *
 * Пустое значение (пустая строка, пустой массив, null, undefined) считается
 * отсутствующим и добирается из снапшота. Урок Фазы 1: частичный ответ CMS
 * обнулял секцию целиком (так CELPE-BRAS терял заголовок), и пофайловый
 * фолбэк по каждому полю оказался единственной надёжной защитой. Цена —
 * поле нельзя намеренно оставить пустым; для текстов лендинга это ровно то
 * поведение, которое нужно.
 */
export function resolveSection<T extends object>(row: unknown, fallback: T): T {
  if (!row || typeof row !== 'object' || Array.isArray(row)) return fallback

  const source = row as Record<string, unknown>
  const result = { ...fallback } as Record<string, unknown>

  for (const key of Object.keys(fallback)) {
    const value = source[key]

    if (value === undefined || value === null || value === '') continue
    if (Array.isArray(value) && value.length === 0) continue

    result[key] = value
  }

  return result as T
}
