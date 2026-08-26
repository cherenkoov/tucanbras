import { revalidatePath } from 'next/cache'
import type { Locale } from '@/types'

const LOCALES: Locale[] = ['ru', 'en', 'pt']

/**
 * Хук ревалидации для админки: бот дёргает его после сохранения контента,
 * чтобы правка появилась сразу, а не через час ISR.
 *
 * Сравнение секрета не обязано быть постоянным по времени: сверяемся с
 * переменной окружения, а не с пользовательскими данными из БД. Главная
 * защита в том, что без `REVALIDATE_SECRET` роут отвечает 401 всегда.
 */
export async function POST(request: Request) {
  const expected = process.env.REVALIDATE_SECRET

  if (!expected) {
    console.error('[revalidate] REVALIDATE_SECRET не задан — отклоняем запрос')
    return Response.json({ message: 'Not configured' }, { status: 401 })
  }

  if (request.headers.get('x-revalidate-secret') !== expected) {
    return Response.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const paths = LOCALES.map(locale => `/${locale}`)
  for (const path of paths) revalidatePath(path)

  return Response.json({ revalidated: true, paths })
}
