import { chromium } from 'playwright'
const b = await chromium.launch()
const page = await (await b.newContext({ viewport: { width: 400, height: 200 } })).newPage()
await page.goto('http://localhost:8099/_r2.html', { waitUntil: 'load' })
await page.waitForTimeout(3000)
const png = await page.screenshot({ clip: { x: 0, y: 0, width: 342, height: 75 } })
const s = await page.evaluate(async b64 => {
  const img = new Image(); await new Promise(r => { img.onload = r; img.src = 'data:image/png;base64,' + b64 })
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height
  const cx = c.getContext('2d'); cx.drawImage(img, 0, 0)
  const d = cx.getImageData(0, 0, c.width, c.height).data
  let sum = 0; const hist = new Map()
  for (let i = 0; i < d.length; i += 4) { const p = [d[i], d[i+1], d[i+2]]
    sum += (0.2126*p[0] + 0.7152*p[1] + 0.0722*p[2]) / 255
    const k = '#' + p.map(v => v.toString(16).padStart(2, '0')).join(''); hist.set(k, (hist.get(k) ?? 0) + 1) }
  const tot = d.length / 4
  return { L: +(sum/tot).toFixed(3), top: [...hist.entries()].sort((a,b)=>b[1]-a[1]).slice(0,3).map(([k,v])=>`${k} ${(100*v/tot).toFixed(0)}%`) }
}, png.toString('base64'))
console.log('что fill реально рисует под этим текстом →', JSON.stringify(s))
await b.close()
