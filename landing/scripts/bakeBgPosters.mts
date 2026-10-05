// Bakes the blurred background POSTERS — small stills of the settled scene that the page
// shows from the first paint, until the live BackgroundCanvas has assembled and fades in
// over them (see BgPoster.tsx).
//
// WHY. The live scene cannot appear early: it needs the 160 KB collage + the beach + a
// layout that converges over several passes (BackgroundCanvas, REVEAL_SETTLE_MS). On a slow
// phone (prod 2026-10-05, 1.6 Mbit, latency 150ms) the text paints at 0.8 s and the scene
// is ready at ~5–6 s — the first screen was bare sky for 4–5 seconds.
//
// HOW BLURRED. Light: ~6 css px on phones, ~8 on desktops. The first version was a 32px-wide
// still (~15 css px of blur, 2026-10-05) and the owner saw ARTIFACTS on it — a 12× bilinear
// upscale paints a visible grid of soft squares, and lossy WebP at 32px smears chroma into
// orange/green fringes around the clouds and the statue. Here the still is ~W/6 px wide
// (64 at 390), encoded with smartSubsample: no grid, no fringes, statue and clouds read.
//
// WHY SO MANY. The scene's framing is computed at runtime from the width (cover-zoom up to
// ×6 on phones, focal shift onto the statue, phones-only scaleY), so a still only lines up
// at the width it was shot at; elsewhere the cross-fade shows the statue twice, and the
// lighter the blur, the less offset it hides. Mismatch between neighbouring shots, blurred
// exactly as shipped (mean |Δ| per channel, 0–255): below 1024 neighbours 40–80px apart
// differ by 15–18, so shots are ~20–40px apart there and any width sits within half a step
// of one; ≥1024 the scene merely scales (zoom 1, neighbours differ by 3–5) and a few cover
// it.
//
// INLINE BELOW 520, FILES ABOVE. A file is fetched only for the width that matches, so the
// count costs nothing on the wire — but it arrives AFTER the first paint, and a new frame
// needs the main thread, which on a phone is busy hydrating: measured, the file was in at
// 1.9 s and painted at 6.5 s. A data URI is decodable at the first paint itself. So the
// phone posters (the slowest main threads, and the narrowest stills) go inline at q65,
// ~10 KB for all seven; tablets and desktops get a ~2–7 KB file behind a media-matched
// <link rel=preload> (app/layout.tsx).
//
// HEIGHT. The viewport is ~35% taller than a typical screen of that width, so a tall phone
// still sees art instead of the poster's fade-out edge. Viewport height barely moves the
// top of the scene (390×664 vs 390×932 is zoom 545% vs 563%), so the extra height costs
// a few % of zoom, not a misplaced statue. NOT a fullPage screenshot of a normal-height
// viewport: Chromium relaid the page out mid-capture for that, and 3 of 23 shots came out
// with the scene slid half a screen down and no clouds (2026-10-05). Every shot is now
// checked — statue inside the frame, layout identical before and after the capture.
//
// One set serves all three locales, shot from /en. The cover-zoom does follow the page's
// height (ru text is longest: 390px zoom 575% vs en 561%), but the locales differ by 4–5 —
// well under the step-to-step mismatch.
//
// Re-run after any change to the art, the cover-zoom/framing constants, or the hero layout
// (the statue is seated on the hero's top line). Needs a running build of the CURRENT code:
//   npm run build && npx next start -p 3002   # in another shell
//   npm run bake:bg-posters -- http://127.0.0.1:3002/en
import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from 'playwright'
import sharp from 'sharp'

const URL = process.argv[2] ?? 'http://127.0.0.1:3002/en'
const OUT = join('components', 'ui', 'background', 'bgPosters.ts')
const PUBLIC_DIR = join('public', 'PNG', 'background', 'posters')
const PUBLIC_URL = '/PNG/background/posters'

// Shot widths. Buckets switch at the midpoints between neighbours — except at 1024
// (WIDE_BREAKPOINT), where the framing itself jumps (cover-zoom ×2 → ×1).
const NARROW = [360, 375, 390, 412, 430, 455, 480, 520, 560, 600, 640, 680, 720, 744, 768, 820, 900, 960]
const WIDE = [1100, 1366, 1680, 2048, 2560]
const WIDE_BREAKPOINT = 1024
// Typical viewport height for a width: phone portrait, then tablet, then landscape screens.
const viewportHeight = (w: number) => (w < 520 ? Math.round(w * 2.16) : w < WIDE_BREAKPOINT ? 1100 : Math.round(w * 0.6))
const CAPTURE_BELOW = 1.35 // capture height / viewport height
// Poster pixel width: blur ≈ BLUR_SIGMA × (w / posterWidth) css px.
const posterWidth = (w: number) => Math.round(w / (w < WIDE_BREAKPOINT ? 6 : 8))
const BLUR_SIGMA = 1.0
const INLINE_BELOW = 520

const SHOTS = [...NARROW, ...WIDE]
rmSync(PUBLIC_DIR, { recursive: true, force: true })
mkdirSync(PUBLIC_DIR, { recursive: true })

const browser = await chromium.launch()
const posters: { from: number; to: number | null; w: number; h: number; src: string }[] = []
let bytes = 0
for (let i = 0; i < SHOTS.length; i++) {
  const w = SHOTS[i]
  const vh = Math.round(viewportHeight(w) * CAPTURE_BELOW)
  const page = await browser.newPage({ viewport: { width: w, height: vh } })
  await page.goto(URL, { waitUntil: 'load' })
  // The live scene has revealed (the same opacity the entrance gate drives)…
  await page.waitForFunction(() => {
    const el = document.querySelector('.background-canvas')
    return !!el && getComputedStyle(el).opacity === '1'
  }, null, { timeout: 60_000 })
  // …the content is hidden but keeps its layout (the cover-zoom reads <main>'s height), the
  // old poster is out of the shot, and the clouds have finished their staggered slide-in.
  await page.addStyleTag({
    content: 'main, body > div > div.fixed, [data-bg-poster] { visibility: hidden !important }',
  })
  await page.waitForTimeout(3500)
  const layout = () => page.evaluate(() => {
    const c = document.querySelector<HTMLElement>('.background-canvas')!.firstElementChild as HTMLElement
    const statue = document.querySelector('.background-canvas img[src*="statue"]')?.getBoundingClientRect()
    return { sig: `${c.style.width}|${c.style.transform}`, statueTop: statue?.top ?? NaN, statueBottom: statue?.bottom ?? NaN }
  })
  const before = await layout()
  const png = await page.screenshot()
  const after = await layout()
  await page.close()
  if (before.sig !== after.sig) throw new Error(`${w}: layout moved during the capture`)
  if (!(before.statueTop >= 0 && before.statueBottom <= vh)) {
    throw new Error(`${w}: statue outside the frame (${before.statueTop}…${before.statueBottom} of ${vh})`)
  }
  const webp = await sharp(png)
    .resize({ width: posterWidth(w) })
    .blur(BLUR_SIGMA)
    .webp({ quality: w < INLINE_BELOW ? 65 : 80, smartSubsample: true })
    .toBuffer()
  const meta = await sharp(webp).metadata()
  const file = `poster-${w}.webp`
  const inline = w < INLINE_BELOW
  if (!inline) writeFileSync(join(PUBLIC_DIR, file), webp)
  bytes += webp.length
  const prev = SHOTS[i - 1]
  const next = SHOTS[i + 1]
  const edge = (a: number, b: number) =>
    a < WIDE_BREAKPOINT && b >= WIDE_BREAKPOINT ? WIDE_BREAKPOINT : Math.round((a + b) / 2)
  const from = prev == null ? 0 : edge(prev, w)
  const to = next == null ? null : edge(w, next)
  const src = inline ? `data:image/webp;base64,${webp.toString('base64')}` : `${PUBLIC_URL}/${file}`
  posters.push({ from, to, w: meta.width!, h: meta.height!, src })
  console.log(`${w}x${vh} → ${meta.width}x${meta.height}, ${webp.length} B${inline ? ' inline' : ''}, [${from}, ${to ?? '∞'})`)
}
await browser.close()

writeFileSync(OUT, `// GENERATED by scripts/bakeBgPosters.mts — do not edit; re-run \`npm run bake:bg-posters\`.
// Baked ${new Date().toISOString().slice(0, 10)} from ${URL}. Each poster serves viewport widths [from, to).
export const BG_POSTERS: { from: number; to: number | null; w: number; h: number; src: string }[] = ${JSON.stringify(posters, null, 2)}
`)
console.log(`wrote ${OUT} + ${readdirSync(PUBLIC_DIR).length} files in ${PUBLIC_DIR}, ${bytes} B total`)
