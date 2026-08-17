// Жёлтый «цветок» футера = розовый лист в цвете обрезанного цветка.
//
// Почему не оригинал: `flower-orange.svg` — срез из Figma, обрезанный по краю карточки
// (чернила упираются в нижнюю границу файла: 72px из 176 в последней строке). Пока он
// стоял вплотную к низу, срез был не виден; поднятый над низом он показывает прямую
// горизонтальную линию обрезки. За новой, необрезанной выгрузкой нужен доступ к Figma
// (node 2580:46228, fileKey tvcHxlXEhy5hoSPgrsOzwJ) — MCP отвечает 403 «Token expired».
//
// Замена — решение владельца 2026-08-14: та же форма, что у розового листа, в жёлтом
// цвете исходного цветка. Восстановится доступ к Figma — вернуть настоящий цветок и
// снести этот шаг вместе с `flower-yellow.svg`.
//
//   npm run gen:footer-flower
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const DIR = fileURLToPath(new URL('../public/SVG/footer/decor/', import.meta.url))
const FROM = 'leaf-rose.svg'
const TO = 'flower-yellow.svg'
/** Заливка розового листа → заливка обрезанного цветка (оба цвета сняты с выгрузок). */
const ROSE = /#D7B3A7/gi
const YELLOW = '#FFD376'

const src = readFileSync(DIR + FROM, 'utf8')
const hits = (src.match(ROSE) ?? []).length
if (!hits) {
  console.error(`FAIL: в ${FROM} не нашлось ни одной заливки ${ROSE.source} — перекрашивать нечего`)
  process.exit(1)
}

writeFileSync(DIR + TO, src.replace(ROSE, YELLOW))
console.log(`${TO} ← ${FROM}, перекрашено заливок: ${hits} → ${YELLOW}`)
