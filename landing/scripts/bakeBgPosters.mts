// Bakes the blurred background POSTERS — small stills of the settled scene that the page
// shows from the first paint, until the live BackgroundCanvas has assembled and fades in
// over them (see BgPoster.tsx).
//
// WHY. The live scene cannot appear early: it needs the 160 KB collage + the beach + a
// layout that converges over several passes (BackgroundCanvas, REVEAL_SETTLE_MS). On a slow
// phone (prod 2026-10-05, 1.6 Mbit, latency 150ms) the text paints at 0.8 s and the scene
// is ready at ~5–6 s — the first screen was bare sky for 4–5 seconds.
//
// HOW BLURRED. ~3 css px on phones and tablets, ~4 on desktops — the owner's call, in two
// steps. The first version was a 32px-wide still (~15 css px, 2026-10-05) and showed
// ARTIFACTS: a 12× bilinear upscale paints a grid of soft squares, and lossy WebP at 32px
// smears chroma into orange/green fringes. Then ~6 px (W/6) — clean, but still read as
// soap. Now W/4: the statue's folds and the clouds' shape read. Going sharper was tried and
// rejected: at ~2 px a half-step overlay shows a second outline, at ~1 px the statue and
// its stars visibly double mid-cross-fade — and the stars are ANIMATED (ChristScene), so no
// still will ever line up with them. Blur is what lets the still disagree with the scene.
// Encoded with smartSubsample, so no chroma fringes at any size.
//
// WHY SO MANY. The scene's framing is computed at runtime from the width (cover-zoom up to
// ×6 on phones, focal shift onto the statue, phones-only scaleY), so a still only lines up
// at the width it was shot at; elsewhere the cross-fade shows the statue twice, and the
// lighter the blur, the less offset it hides. Mismatch between neighbouring shots, blurred
// exactly as shipped (mean |Δ| per channel, 0–255): below 1024 neighbours 40–80px apart
// differ by 15–18, so shots are ~20–25px apart there and any width sits within half a step
// of one; ≥1024 the art merely scales (zoom 1) and steps of ~80–120px hold — checked by
// 50/50 overlays at the bucket edges, the worst case of each step.
//
// INLINE BELOW 520, FILES ABOVE. A file is fetched only for the width that matches, so the
// count costs nothing on the wire — but it arrives AFTER the first paint, and a new frame
// needs the main thread, which on a phone is busy hydrating: measured, the file was in at
// 1.9 s and painted at 6.5 s. A data URI is decodable at the first paint itself. So the
// phone posters (the slowest main threads, and the narrowest stills) go inline at q65,
// ~17 KB for all seven; tablets and desktops get a ~4–14 KB file behind a media-matched
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
// Desktop needs a grid too: ≥1024 the art scales with the width but the statue is seated on
// the hero's top line, a fixed px offset — at ~3 px of blur a 1100 still on a 1232 screen
// doubled the statue's arms mid-fade.
const NARROW = [
  360, 375, 390, 412, 430, 455, 480,
  520, 540, 560, 580, 600, 620, 640, 660, 680, 700, 720, 744, 768, 794, 820, 846, 872, 900, 930, 960, 990,
]
const WIDE = [1060, 1120, 1200, 1280, 1366, 1440, 1536, 1600, 1680, 1792, 1920, 2048, 2240, 2560]
const WIDE_BREAKPOINT = 1024
// Typical viewport height for a width: phone portrait, then tablet, then landscape screens.
const viewportHeight = (w: number) => (w < 520 ? Math.round(w * 2.16) : w < WIDE_BREAKPOINT ? 1100 : Math.round(w * 0.6))
const CAPTURE_BELOW = 1.35 // capture height / viewport height
// Poster pixel width: blur ≈ BLUR_SIGMA × (w / posterWidth) css px.
const posterWidth = (w: number) => Math.round(w / (w < WIDE_BREAKPOINT ? 4 : 5))
const BLUR_SIGMA = 0.8
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
