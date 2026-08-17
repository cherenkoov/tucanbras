import { test } from 'node:test'
import assert from 'node:assert/strict'
import { resolveSection } from './contentResolve'

const FALLBACK = {
  nav0: 'О тукане',
  nav1: 'Туторы',
  nav2: 'CELPE-BRAS',
  nav3: 'Тарифы',
}

test('нет строки в БД — весь фолбэк', () => {
  assert.deepEqual(resolveSection(undefined, FALLBACK), FALLBACK)
  assert.deepEqual(resolveSection(null, FALLBACK), FALLBACK)
})

test('не объект — весь фолбэк', () => {
  assert.deepEqual(resolveSection('строка', FALLBACK), FALLBACK)
  assert.deepEqual(resolveSection([1, 2], FALLBACK), FALLBACK)
})

test('полная строка из БД побеждает фолбэк', () => {
  const row = { nav0: 'A', nav1: 'B', nav2: 'C', nav3: 'D' }
  assert.deepEqual(resolveSection(row, FALLBACK), row)
})

test('частичная строка добирает недостающее из фолбэка', () => {
  const result = resolveSection({ nav0: 'A' }, FALLBACK)
  assert.equal(result.nav0, 'A')
  assert.equal(result.nav1, 'Туторы')
})

test('пустая строка в поле не затирает фолбэк', () => {
  const result = resolveSection({ nav0: '', nav1: 'B' }, FALLBACK)
  assert.equal(result.nav0, 'О тукане')
  assert.equal(result.nav1, 'B')
})

test('пустой массив не затирает непустой фолбэк', () => {
  const fallback = { heading: 'Тарифы', plans: [{ name: 'Один урок' }] }
  const result = resolveSection({ heading: 'Планы', plans: [] }, fallback)
  assert.equal(result.heading, 'Планы')
  assert.deepEqual(result.plans, [{ name: 'Один урок' }])
})

test('непустой массив из БД побеждает', () => {
  const fallback = { plans: [{ name: 'Старый' }] }
  const result = resolveSection({ plans: [{ name: 'Новый' }] }, fallback)
  assert.deepEqual(result.plans, [{ name: 'Новый' }])
})

test('лишние ключи из БД не проникают в результат', () => {
  const result = resolveSection({ nav0: 'A', hacked: 'x' }, FALLBACK)
  assert.equal((result as Record<string, unknown>).hacked, undefined)
})
