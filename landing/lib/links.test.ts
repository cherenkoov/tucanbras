import { test } from 'node:test'
import assert from 'node:assert/strict'
import { activeHref } from './links'

test('activeHref: настоящий адрес проходит как есть', () => {
  assert.equal(activeHref('https://youtube.com/@tucanbras'), 'https://youtube.com/@tucanbras')
  assert.equal(activeHref('https://t.me/tucanBRAS'), 'https://t.me/tucanBRAS')
  assert.equal(activeHref('/legal/privacy'), '/legal/privacy')
})

test('activeHref: заглушка # — канал не запущен', () => {
  assert.equal(activeHref('#'), null)
})

test('activeHref: пустая строка и пробелы — канал не запущен', () => {
  assert.equal(activeHref(''), null)
  assert.equal(activeHref('   '), null)
})

test('activeHref: пробелы по краям срезаются', () => {
  assert.equal(activeHref('  https://instagram.com/tucanbras  '), 'https://instagram.com/tucanbras')
})

test('activeHref: null и undefined — канал не запущен', () => {
  assert.equal(activeHref(null), null)
  assert.equal(activeHref(undefined), null)
})
