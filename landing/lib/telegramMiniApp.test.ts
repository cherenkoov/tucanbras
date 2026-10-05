import { test } from 'node:test'
import assert from 'node:assert/strict'
import { TELEGRAM_MINI_APP_REDIRECT } from './telegramMiniApp'

// Исполняем ту самую строку, что уходит в <head>, на подменённом location.
function run(hash: string, search = ''): string | null {
  let replaced: string | null = null
  const location = { hash, search, replace: (url: string) => { replaced = url } }
  new Function('window', TELEGRAM_MINI_APP_REDIRECT)({ location })
  return replaced
}

test('открытие из Telegram уводит в /app с фрагментом initData', () => {
  const hash = '#tgWebAppData=user%3D%257B%2522id%2522%253A42%257D%26hash%3Dabc&tgWebAppVersion=8.0&tgWebAppPlatform=ios'
  assert.equal(run(hash), '/app/' + hash)
})

test('query сохраняется (startapp-параметр Telegram)', () => {
  assert.equal(run('#tgWebAppVersion=8.0', '?tgWebAppStartParam=promo'), '/app/?tgWebAppStartParam=promo#tgWebAppVersion=8.0')
})

test('обычный посетитель лендинга остаётся на месте', () => {
  assert.equal(run(''), null)
  assert.equal(run('#pricing'), null)
  assert.equal(run('#about-tgWebAppData'), null)
})
