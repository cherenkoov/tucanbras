import { chromium } from 'playwright'
const b = await chromium.launch()
const page = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage()
await page.goto('http://localhost:3000/ru?staticfill=1', { waitUntil: 'domcontentloaded', timeout: 60000 })
await page.waitForTimeout(2500)
await page.evaluate(async () => { for (let y = 0; y <= document.body.scrollHeight; y += 800) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 60)) } window.scrollTo(0, 0) })
await page.waitForTimeout(1500)
await page.evaluate(() => document.querySelectorAll('[style*="filter: url"]').forEach(e => {
  if ((e.textContent ?? '').trim().startsWith('Или просто узнай')) e.setAttribute('data-x', '1') }))
await page.evaluate(() => document.querySelector('[data-x]').scrollIntoView({ block: 'center' }))
await page.evaluate(async () => { let last = NaN, still = 0; const art = document.querySelector('svg[viewBox^="0 0 1027 "]')
  for (let i = 0; i < 240; i++) { await new Promise(r => requestAnimationFrame(r)); const t = art ? art.getBoundingClientRect().top : 0
    still = Math.abs(t - last) < 0.25 ? still + 1 : 0; last = t; if (still > 25) return } })
const r = await page.evaluate(() => {
  const el = document.querySelector('[data-x]')
  const t = el.getBoundingClientRect()
  const s = el.style
  const imgs = s.backgroundImage.split(/,(?![^(]*\))/).map(x => x.trim())
  const sizes = s.backgroundSize.split(',').map(x => x.trim())
  const poss = s.backgroundPosition.split(',').map(x => x.trim())
  const layers = imgs.map((img, i) => ({ img: img.slice(0, 46), size: sizes[i] ?? '', pos: poss[i] ?? '' }))
  // Art unit at the text top, computed the way the BROWSER paints layer 0.
  const beachLayer = layers.findIndex(l => l.img.includes('main2-fill'))
  let unit = null
  if (beachLayer >= 0) {
    const h = parseFloat(layers[beachLayer].size.split(' ')[1])
    const posY = parseFloat(layers[beachLayer].pos.split(' ')[1])
    unit = { perUnit: +(h / 3614).toFixed(3), top: +((-posY) / (h / 3614)).toFixed(0),
             bottom: +((-posY + t.height) / (h / 3614)).toFixed(0) }
  }
  return { box: `${Math.round(t.x)},${Math.round(t.y)} ${Math.round(t.width)}x${Math.round(t.height)}`, layers, unit }
})
console.log('бокс:', r.box)
r.layers.forEach((l, i) => console.log(`  слой ${i}: ${l.img}  size=${l.size}  pos=${l.pos}`))
console.log('юниты арта по инлайн-стилю:', JSON.stringify(r.unit), ' (море в ассете: 3180..3614)')
await b.close()
