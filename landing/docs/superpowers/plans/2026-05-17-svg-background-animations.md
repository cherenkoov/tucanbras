# SVG Background Animations — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the PNG background with an inline SVG, add CSS parallax, and animate the train and cable car cabin along their SVG paths using GSAP MotionPath.

**Architecture:** The background SVG (~800KB) is fetched asynchronously and injected via `dangerouslySetInnerHTML` so GSAP can query its DOM nodes. A pure utility function `injectRailPath` patches the SVG string before injection — it adds the train path from `road trace.svg` as a hidden `<path id="rail-path">` inside `<defs>`, and stamps an explicit `id="cable-path"` on the inner path of the `#Road_2` group. Three hooks (`useParallaxBackground`, `useTrainAnimation`, `useCarAnimation`) are wired into `BackgroundCanvas` and activate only after the SVG is in the DOM.

**Tech Stack:** React 19, TypeScript strict, Next.js App Router, GSAP 3 + MotionPathPlugin (new dep), `requestAnimationFrame`, `IntersectionObserver`. No test framework present — visual verification via browser dev server.

**Source of truth:** `landing/docs/superpowers/specs/2026-05-17-svg-background-animations-design.md`

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `package.json` | Modify | Add `gsap` |
| `app/layout.tsx` | Modify | Add `<link rel="preload" as="fetch">` for SVG |
| `components/ui/background/utils/injectRailPath.ts` | Create | Pure fn: patch SVG string before DOM injection |
| `components/ui/background/BackgroundCanvas.tsx` | Rewrite | Fetch SVG, placeholder, dangerouslySetInnerHTML, ChristScene overlay, wires all hooks |
| `components/ui/background/useParallaxBackground.ts` | Create | Scroll → translateY on container (0.4×); skipped on mobile/reduced-motion |
| `components/ui/background/useTrainAnimation.ts` | Create | GSAP MotionPath on `#rail-path`; IntersectionObserver trigger |
| `components/ui/background/useCarAnimation.ts` | Create | GSAP MotionPath on `#cable-path`; two cabins offset 0.5; IntersectionObserver trigger |

---

## Task 1 — Install GSAP + add preload hint

**Files:**
- Modify: `landing/package.json`
- Modify: `landing/app/layout.tsx`

- [ ] **Step 1: Install gsap**

```bash
cd landing && npm install gsap
```

Expected output includes: `added 1 package` (gsap ships its own types).

- [ ] **Step 2: Verify GSAP types are available**

```bash
cd landing && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors about `gsap` module not found.

- [ ] **Step 3: Add preload hint in layout.tsx**

Current `app/layout.tsx`:
```tsx
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col" suppressHydrationWarning>{children}</body>
    </html>
  )
}
```

Replace with:
```tsx
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <link
          rel="preload"
          href="/SVG/background/background [Vectorized].svg"
          as="fetch"
          crossOrigin="anonymous"
        />
      </head>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>{children}</body>
    </html>
  )
}
```

> `as="fetch"` is mandatory — not `as="image"`. We load via `fetch()`, which uses the fetch cache. Using `as="image"` would put the file in the image cache and `fetch()` would download it again.

- [ ] **Step 4: Verify dev server compiles**

```bash
cd landing && curl -s http://localhost:3000/ru > /dev/null && echo OK
```

Expected: `OK`

- [ ] **Step 5: Commit**

```bash
git add landing/package.json landing/package-lock.json landing/app/layout.tsx
git commit -m "feat: install gsap, add SVG preload hint in layout"
```

---

## Task 2 — `injectRailPath` utility

**Files:**
- Create: `landing/components/ui/background/utils/injectRailPath.ts`

This is a pure function — no DOM, no React. It takes the raw background SVG string and returns a patched version with two changes:
1. A hidden `<path id="rail-path">` added to `<defs>` — the train's motion path (from `road trace.svg`, transformed to the background SVG coordinate space)
2. An `id="cable-path"` attribute added to the inner `<path>` inside the `#Road_2` group — the cable car's motion path

The raw path `d` from `road trace.svg` (303×441 space):
```
M107.705 1.91113C96.8715 5.24447 76.9048 15.6111 83.7048 30.4111C92.2048 48.9111 133.205 74.9111 159.705 83.9111C186.205 92.9111 270.705 126.911 288.705 145.911C299.579 157.389 309.705 179.411 288.705 208.411C271.905 231.611 186.705 299.078 146.205 329.911L1.20508 439.411
```

This path lives in 303×441 space. The Train group in the background SVG sits around **x≈330–434, y≈1044–1153**. Starting transform: `translate(290, 1044) scale(0.47, 0.25)` — maps path to approximately that area. Fine-tuned visually in Task 5.

- [ ] **Step 1: Create the utils directory and file**

```bash
mkdir -p landing/components/ui/background/utils
```

- [ ] **Step 2: Write injectRailPath.ts**

```ts
// Pure function — patches SVG string before dangerouslySetInnerHTML injection.
// No DOM access, safe to call on any thread.

const RAIL_PATH_D =
  'M107.705 1.91113C96.8715 5.24447 76.9048 15.6111 83.7048 30.4111' +
  'C92.2048 48.9111 133.205 74.9111 159.705 83.9111' +
  'C186.205 92.9111 270.705 126.911 288.705 145.911' +
  'C299.579 157.389 309.705 179.411 288.705 208.411' +
  'C271.905 231.611 186.705 299.078 146.205 329.911L1.20508 439.411'

// Transform maps road trace (303×441 space) into background SVG (800×2430 space).
// translate(290, 1044): positions path start near Train group origin (~390, 1044).
// scale(0.47, 0.25): compresses path to fit train road section.
// Adjust these values visually in Task 5 step "Visual calibration".
const RAIL_TRANSFORM = 'translate(290, 1044) scale(0.47, 0.25)'

export function injectRailPath(svgString: string): string {
  // 1. Inject #rail-path into <defs> (creates <defs> if missing)
  const railPathEl =
    `<path id="rail-path" d="${RAIL_PATH_D}" transform="${RAIL_TRANSFORM}" fill="none" visibility="hidden"/>`

  let patched: string
  if (svgString.includes('<defs>')) {
    patched = svgString.replace('<defs>', `<defs>${railPathEl}`)
  } else {
    // No <defs> — insert one right after the opening <svg ...> tag
    patched = svgString.replace(/(<svg[^>]*>)/, `$1<defs>${railPathEl}</defs>`)
  }

  // 2. Stamp id="cable-path" on the inner <path> inside #Road_2 group.
  // The inner path currently has id="Road_3" — we add cable-path as an alias
  // by replacing id="Road_3" with id="Road_3" and adding a data attribute,
  // but simpler: GSAP will use '#Road_3' directly. We expose it as cable-path
  // by replacing the id value so the hook has a stable target name.
  patched = patched.replace('id="Road_3"', 'id="cable-path"')

  return patched
}
```

- [ ] **Step 3: Manual smoke test in browser console**

Open `http://localhost:3000/ru`, open DevTools console and run:

```js
fetch('/SVG/background/background [Vectorized].svg')
  .then(r => r.text())
  .then(raw => {
    // Simulate injectRailPath inline
    const hasRailPath = raw.includes('id="rail-path"')
    const hasRoad3 = raw.includes('id="Road_3"')
    console.log('Before injection - has rail-path:', hasRailPath)   // false
    console.log('Before injection - has Road_3:', hasRoad3)          // true
  })
```

Expected: `false`, `true` — confirms raw SVG doesn't yet have our injections and Road_3 exists.

- [ ] **Step 4: Commit**

```bash
git add landing/components/ui/background/utils/injectRailPath.ts
git commit -m "feat: add injectRailPath SVG string patcher"
```

---

## Task 3 — Rewrite BackgroundCanvas (fetch + render, no animations yet)

**Files:**
- Rewrite: `landing/components/ui/background/BackgroundCanvas.tsx`

This task gets the SVG rendering — animations come in Tasks 4–6. After this task, the page should show the SVG background in place of the PNG.

- [ ] **Step 1: Replace BackgroundCanvas.tsx**

```tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import ChristScene from '../ChristScene'
import { injectRailPath } from './utils/injectRailPath'

function Placeholder() {
  return (
    <div
      style={{
        width: '100%',
        aspectRatio: '800 / 2430',
        background: 'linear-gradient(to bottom, #1a2a4a 0%, #2a5298 15%, #1e3a6e 40%, #1a3a0d 70%)',
      }}
    />
  )
}

export default function BackgroundCanvas() {
  const [svgContent, setSvgContent] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/SVG/background/background [Vectorized].svg')
      .then(r => r.text())
      .then(raw => setSvgContent(injectRailPath(raw)))
  }, [])

  return (
    <div
      ref={containerRef}
      className="absolute top-0 left-0 w-full z-0 pointer-events-none"
      style={{ overflow: 'visible' }}
    >
      {!svgContent && <Placeholder />}
      {svgContent && (
        <div dangerouslySetInnerHTML={{ __html: svgContent }} />
      )}

      {/* ChristScene sits on top of SVG, position matches mountain peak */}
      <div
        className="absolute"
        style={{ left: '72%', top: '5%', transform: 'translateX(-50%)' }}
      >
        <ChristScene />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify SVG renders in browser**

Open `http://localhost:3000/ru`.

Check:
- SVG illustration appears (mountains, city, cable car) — not the old PNG
- ChristScene statue is still visible on the mountain peak
- No console errors

- [ ] **Step 3: Verify #rail-path and #cable-path are in the DOM**

Open DevTools console:
```js
document.getElementById('rail-path')   // should return <path> element
document.getElementById('cable-path')  // should return <path> element
```

Expected: both return DOM elements (not `null`).

- [ ] **Step 4: Verify TypeScript**

```bash
cd landing && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add landing/components/ui/background/BackgroundCanvas.tsx
git commit -m "feat: BackgroundCanvas — inline SVG via fetch + dangerouslySetInnerHTML"
```

---

## Task 4 — `useParallaxBackground` hook

**Files:**
- Create: `landing/components/ui/background/useParallaxBackground.ts`

Scrolling the page moves the SVG container upward at 0.4× the scroll speed (background appears to move slower than content = parallax depth). Disabled on mobile and when `prefers-reduced-motion` is set.

- [ ] **Step 1: Create the hook**

```ts
'use client'

import { useEffect, type RefObject } from 'react'

const PARALLAX_FACTOR = 0.4

export function useParallaxBackground(
  containerRef: RefObject<HTMLDivElement | null>,
  { enabled }: { enabled: boolean }
): void {
  useEffect(() => {
    if (!enabled) return
    const el = containerRef.current
    if (!el) return

    // Disabled on touch-only devices — parallax is jarring without a mouse
    if (window.matchMedia('(hover: none) and (pointer: coarse)').matches) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let rafId: number | null = null
    let lastApplied = -1

    const onScroll = () => {
      if (rafId !== null) return
      rafId = requestAnimationFrame(() => {
        rafId = null
        const scrollY = window.scrollY
        if (scrollY === lastApplied) return
        lastApplied = scrollY
        el.style.transform = `translateY(${-scrollY * PARALLAX_FACTOR}px)`
      })
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (rafId !== null) cancelAnimationFrame(rafId)
      el.style.transform = ''
    }
  }, [enabled, containerRef])
}
```

- [ ] **Step 2: Wire into BackgroundCanvas**

In `BackgroundCanvas.tsx`, add the import and hook call:

```tsx
// Add import at top
import { useParallaxBackground } from './useParallaxBackground'

// Add inside BackgroundCanvas(), after the fetch useEffect:
useParallaxBackground(containerRef, { enabled: !!svgContent })
```

- [ ] **Step 3: Verify parallax in browser**

Open `http://localhost:3000/ru` and scroll slowly.

Expected:
- Background SVG moves **slower** than page content — creates depth
- Section text/cards scroll at normal speed, SVG drifts behind them
- On DevTools mobile emulation (toggle device toolbar): SVG is static, content scrolls normally

- [ ] **Step 4: Commit**

```bash
git add landing/components/ui/background/useParallaxBackground.ts \
         landing/components/ui/background/BackgroundCanvas.tsx
git commit -m "feat: parallax background — 0.4x scroll speed, desktop only"
```

---

## Task 5 — `useTrainAnimation` hook + visual calibration

**Files:**
- Create: `landing/components/ui/background/useTrainAnimation.ts`
- Modify: `landing/components/ui/background/utils/injectRailPath.ts` (adjust RAIL_TRANSFORM)
- Modify: `landing/components/ui/background/BackgroundCanvas.tsx` (wire hook)

The train (`#Train` group in SVG) follows `#rail-path` — the transformed road trace path. GSAP MotionPath animates the group along the path with `autoRotate: true` so the train tilts with the road curve. Animation loops forever, pausing when out of viewport.

- [ ] **Step 1: Create useTrainAnimation.ts**

```ts
'use client'

import { useEffect, type RefObject } from 'react'
import { gsap } from 'gsap'
import { MotionPathPlugin } from 'gsap/MotionPathPlugin'

gsap.registerPlugin(MotionPathPlugin)

const TRAIN_DURATION = 8   // seconds per lap
const VISIBILITY_MARGIN = '200px'

export function useTrainAnimation(
  containerRef: RefObject<HTMLDivElement | null>,
  { enabled }: { enabled: boolean }
): void {
  useEffect(() => {
    if (!enabled) return
    const container = containerRef.current
    if (!container) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const train = container.querySelector<SVGElement>('#Train')
    const railPath = container.querySelector<SVGPathElement>('#rail-path')
    if (!train || !railPath) {
      console.warn('useTrainAnimation: #Train or #rail-path not found in DOM')
      return
    }

    const tl = gsap.timeline({ repeat: -1, paused: true })
    tl.to(train, {
      motionPath: {
        path: railPath,
        autoRotate: true,
        align: railPath,
        alignOrigin: [0.5, 0.5],
      },
      duration: TRAIN_DURATION,
      ease: 'none',
    })

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) tl.play()
        else tl.pause()
      },
      { rootMargin: `${VISIBILITY_MARGIN} 0px ${VISIBILITY_MARGIN} 0px`, threshold: 0 }
    )
    observer.observe(train)

    return () => {
      tl.kill()
      observer.disconnect()
    }
  }, [enabled, containerRef])
}
```

- [ ] **Step 2: Wire into BackgroundCanvas**

```tsx
// Add import at top of BackgroundCanvas.tsx
import { useTrainAnimation } from './useTrainAnimation'

// Add inside BackgroundCanvas(), after useParallaxBackground:
useTrainAnimation(containerRef, { enabled: !!svgContent })
```

- [ ] **Step 3: Check initial animation in browser**

Open `http://localhost:3000/ru` and scroll to the city/train section (around 40–50% down the page).

Expected: train moves along a path. It may be in the wrong position — that's normal, go to Step 4.

If the train doesn't move at all, open DevTools console and check for the `useTrainAnimation:` warning. If warned, check `document.getElementById('rail-path')` and `document.getElementById('Train')` — both should be non-null.

- [ ] **Step 4: Visual calibration of RAIL_TRANSFORM**

In `utils/injectRailPath.ts`, adjust `RAIL_TRANSFORM` until the train follows the road in the illustration.

Starting point: `'translate(290, 1044) scale(0.47, 0.25)'`

Tuning guide:
- Train starts too far **left** → increase first `translate` value (e.g. `310`)
- Train starts too far **right** → decrease first `translate` value
- Train starts too far **up** → increase second `translate` value (e.g. `1060`)
- Train starts too far **down** → decrease second `translate` value
- Path is too **short/compressed** → increase `scale` values
- Path is too **long/stretched** → decrease `scale` values

Each change: save file → Next.js hot-reloads → observe. Repeat until the train visually follows the road.

- [ ] **Step 5: Commit**

```bash
git add landing/components/ui/background/useTrainAnimation.ts \
         landing/components/ui/background/utils/injectRailPath.ts \
         landing/components/ui/background/BackgroundCanvas.tsx
git commit -m "feat: train animation along rail-path (GSAP MotionPath)"
```

---

## Task 6 — `useCarAnimation` hook

**Files:**
- Create: `landing/components/ui/background/useCarAnimation.ts`
- Modify: `landing/components/ui/background/BackgroundCanvas.tsx` (wire hook)

The cable car has two cabins (`#Cabine` and `#Cabine_2`) that travel along `#cable-path` (the inner `<path>` of the `#Road_2` group, renamed to `cable-path` by `injectRailPath`). The two cabins are offset by 50% — one goes down while the other goes up, mimicking a real cable car system.

- [ ] **Step 1: Create useCarAnimation.ts**

```ts
'use client'

import { useEffect, type RefObject } from 'react'
import { gsap } from 'gsap'
import { MotionPathPlugin } from 'gsap/MotionPathPlugin'

gsap.registerPlugin(MotionPathPlugin)

const CAR_DURATION = 12    // seconds per full cable lap
const VISIBILITY_MARGIN = '200px'

export function useCarAnimation(
  containerRef: RefObject<HTMLDivElement | null>,
  { enabled }: { enabled: boolean }
): void {
  useEffect(() => {
    if (!enabled) return
    const container = containerRef.current
    if (!container) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const cabine1 = container.querySelector<SVGElement>('#Cabine')
    const cabine2 = container.querySelector<SVGElement>('#Cabine_2')
    const cablePath = container.querySelector<SVGPathElement>('#cable-path')

    if (!cabine1 || !cabine2 || !cablePath) {
      console.warn('useCarAnimation: #Cabine, #Cabine_2, or #cable-path not found in DOM')
      return
    }

    // Cabin 1: travels start→end (0→1)
    const tl1 = gsap.timeline({ repeat: -1, paused: true })
    tl1.to(cabine1, {
      motionPath: {
        path: cablePath,
        autoRotate: true,
        align: cablePath,
        alignOrigin: [0.5, 0.5],
        start: 0,
        end: 1,
      },
      duration: CAR_DURATION,
      ease: 'none',
    })

    // Cabin 2: starts halfway along the path (0.5→1.5 = wraps to start again)
    const tl2 = gsap.timeline({ repeat: -1, paused: true })
    tl2.to(cabine2, {
      motionPath: {
        path: cablePath,
        autoRotate: true,
        align: cablePath,
        alignOrigin: [0.5, 0.5],
        start: 0.5,
        end: 1.5,
      },
      duration: CAR_DURATION,
      ease: 'none',
    })

    // Trigger both timelines together when cable car group enters viewport
    const cableCarGroup = container.querySelector('#\\43 able\\ car') ??
      container.querySelector('[id="Cable car"]') ??
      cabine1.closest('g')

    const trigger = cableCarGroup ?? cabine1

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) { tl1.play(); tl2.play() }
        else { tl1.pause(); tl2.pause() }
      },
      { rootMargin: `${VISIBILITY_MARGIN} 0px ${VISIBILITY_MARGIN} 0px`, threshold: 0 }
    )
    observer.observe(trigger)

    return () => {
      tl1.kill()
      tl2.kill()
      observer.disconnect()
    }
  }, [enabled, containerRef])
}
```

> **Note on `#Cable car` selector:** The group ID contains a space, which is invalid in CSS selectors. `querySelector` needs escaping (`\43 able\\ car`) — the fallback `[id="Cable car"]` attribute selector is simpler and more reliable.

- [ ] **Step 2: Wire into BackgroundCanvas**

```tsx
// Add import at top of BackgroundCanvas.tsx
import { useCarAnimation } from './useCarAnimation'

// Add inside BackgroundCanvas(), after useTrainAnimation:
useCarAnimation(containerRef, { enabled: !!svgContent })
```

- [ ] **Step 3: Verify cable car animation in browser**

Open `http://localhost:3000/ru` and scroll to the mountain/cable car section (around 25–35% down).

Expected:
- Both cabins move along the cable wire
- Cabine and Cabine_2 travel in opposite directions (one going up while the other goes down)
- Animation pauses when the section is not visible, resumes when scrolled back

If cabins don't move: check DevTools console for the `useCarAnimation:` warning. Then run in console:
```js
document.querySelector('[id="Cable car"]')  // should return <g> element
document.getElementById('cable-path')        // should return <path> element
```

- [ ] **Step 4: Verify TypeScript**

```bash
cd landing && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add landing/components/ui/background/useCarAnimation.ts \
         landing/components/ui/background/BackgroundCanvas.tsx
git commit -m "feat: cable car animation — two cabins offset 0.5 along cable-path"
```

---

## Task 7 — Final visual review + cleanup

**Files:**
- Modify: `landing/components/ui/background/BackgroundCanvas.tsx` (position tweak if needed)
- Modify: `landing/app/globals.css` (commit pending starFloat if not yet committed)

- [ ] **Step 1: Commit pending uncommitted changes**

There are local changes not yet committed (from previous session). Stage and commit them first:

```bash
cd landing
git add landing/app/globals.css \
        landing/components/ui/background/BackgroundCanvas.tsx \
        landing/components/ui/background/ChristScene.tsx \
        landing/components/ui/background/useStatueRotation.ts
git commit -m "fix: starFloat keyframe, position tweak, perspective in transform, touch tracking"
```

> This clears the pre-existing working tree changes before final review.

- [ ] **Step 2: Full visual checklist in browser**

Open `http://localhost:3000/ru`. Scroll through the full page and verify:

- [ ] SVG illustration visible from top to bottom (mountains → cable car → city)
- [ ] Background moves at ~0.4× scroll speed on desktop (parallax depth)
- [ ] Background is static on mobile (DevTools: Responsive, any phone preset)
- [ ] ChristScene statue overlays mountain peak correctly
- [ ] Train moves along road in the city section when visible
- [ ] Train pauses when scrolled past (open DevTools Performance — no RAF running)
- [ ] Cable car cabines move in opposite directions along the cable wire
- [ ] Cable car pauses when scrolled past
- [ ] `prefers-reduced-motion: reduce` in DevTools Rendering → everything static
- [ ] No console errors or warnings (except expected React hydration note about SVG)

- [ ] **Step 3: Fix any visual issues found in Step 2**

Common fixes:
- ChristScene position: adjust `left` / `top` in BackgroundCanvas JSX
- Train path alignment: adjust `RAIL_TRANSFORM` in `injectRailPath.ts`
- Cable car speed: adjust `CAR_DURATION` in `useCarAnimation.ts`
- Parallax intensity: adjust `PARALLAX_FACTOR` in `useParallaxBackground.ts`

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "fix: visual calibration — train path, cable car timing, parallax factor"
```

---

## Self-Review

**Spec coverage:**
- ✅ Replace PNG with SVG — Task 3 (fetch + dangerouslySetInnerHTML)
- ✅ Preload hint `as="fetch"` — Task 1
- ✅ Parallax 0.4× — Task 4
- ✅ Parallax disabled on mobile — Task 4 (`pointer: coarse` check)
- ✅ Animations on mobile (loop, no parallax) — Tasks 5 & 6 (no mobile guard on GSAP hooks)
- ✅ Train follows SVG path — Task 5 (GSAP MotionPath + `#rail-path`)
- ✅ Cable car two cabins offset — Task 6 (`start: 0` / `start: 0.5`)
- ✅ IntersectionObserver viewport trigger — Tasks 5 & 6
- ✅ Infinite loop (repeat: -1) — Tasks 5 & 6
- ✅ prefers-reduced-motion — Tasks 4, 5, 6
- ✅ ChristScene preserved — Task 3 JSX
- ✅ Placeholder while loading — Task 3
- ✅ `#Road_2` inner path aliased as `#cable-path` — Task 2
- ✅ Pending uncommitted changes committed — Task 7 Step 1
