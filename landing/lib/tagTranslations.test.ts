import { test } from 'node:test'
import assert from 'node:assert/strict'
import { translateTag, translateTags } from './tagTranslations'

test('ru возвращается как есть', () => {
  assert.equal(translateTag('Музыка', 'ru'), 'Музыка')
})

test('en/pt переводятся по словарю', () => {
  assert.equal(translateTag('Музыка', 'en'), 'Music')
  assert.equal(translateTag('Музыка', 'pt'), 'Música')
  assert.equal(translateTag('Носитель языка', 'pt'), 'Falante nativo')
  assert.equal(translateTag('CELPE-BRAS', 'en'), 'CELPE-BRAS')
})

test('незнакомый тег фолбэкается на ru', () => {
  assert.equal(translateTag('Новый тег', 'en'), 'Новый тег')
})

test('translateTags: массив и null', () => {
  assert.deepEqual(translateTags(['Кино', 'Футбол'], 'pt'), ['Cinema', 'Futebol'])
  assert.deepEqual(translateTags(null, 'en'), [])
})
