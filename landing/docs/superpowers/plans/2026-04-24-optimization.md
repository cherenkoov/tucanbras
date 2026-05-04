# Optimization Pass — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make all animations CPU-efficient and respect motion preferences, then optimize the two large images in About.

**Architecture:** Extract a shared `useScrollAnimation` hook that handles prefers-reduced-motion, idle RAF cancellation, and Intersection Observer pausing. Update all four RAF components to use it. Add CSS media query to the tucan's CSS animations. Replace two `<img>` with Next.js `<Image>`.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4. Working directory for all commands: `Landing/tucanbras/`.

---

## File Map

| Action | Path |
|---|---|
| **Create** | `hooks/useScrollAnimation.ts` |
| **Modify** | `components/ui/HibiscusUpAnimated.tsx` |
| **Modify** | `components/ui/HibiscusDownAnimated.tsx` |
| **Modify** | `components/ui/ScrollSway.tsx` |
| **Modify** | `components/ui/FernAnimated.tsx` |
| **Modify** | `components/ui/ScrollRotate.tsx` |
| **Modify** | `components/sections/Footer.tsx` |
| **Modify** | `components/sections/About.tsx` |

---

## Task 1: Create `useScrollAnimation` hook

**Files:**
- Create: `hooks/useScrollAnimation.ts`

The hook manages the full RAF lifecycle for scroll-driven animations. Components pass a `setup` function that runs once at mount, creates all mutable animation state in a local closure, and returns a `onTick(target)` callback the hook calls every frame.

Three optimizations inside:
- **prefers-reduced-motion** — checked at mount; returns early with no listener or RAF.
- **Idle detection** — cancels RAF after 20 consecutive frames where `|target| < 0.001`. RAF restarts automatically on next scroll.
- **Intersection Observer** — cancels RAF when the element leaves the viewport; scroll listener restarts it on re-entry.

- [ ] **Step 1: Create the hooks directory and file**

```bash
mkdir hooks
```

Create `hooks/useScrollAnimation.ts` with this exact content:

```ts
import { useEffect, type RefObject } from 'react'

interface UseScrollAnimationOptions {
  ref:                  RefObject<HTMLElement | null>
  maxDegrees:           number
  decay:                number
  velocitySensitivity:  number
  // Called once at mount with the validated container element.
  // Must return the per-frame tick callback.
  // All mutable animation state (currentAngles, element refs) should
  // live inside this closure — the hook never touches them.
  setup: (el: HTMLElement) => (target: number) => void
}

// Frames near-zero before RAF is considered idle and cancelled.
const IDLE_FRAMES = 20

export function useScrollAnimation({
  ref,
  maxDegrees,
  decay,
  velocitySensitivity,
  setup,
}: UseScrollAnimationOptions): void {
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const onTick = setup(el)

    let target    = 0
    let lastY     = window.scrollY
    let rafId:    number | null = null
    let idleCount = 0

    const stopRAF = () => {
      if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null }
    }

    const tick = () => {
      target *= decay
      onTick(target)
      if (Math.abs(target) < 0.001) {
        if (++idleCount >= IDLE_FRAMES) { stopRAF(); return }
      } else {
        idleCount = 0
      }
      rafId = requestAnimationFrame(tick)
    }

    const startRAF = () => {
      if (rafId !== null) return
      idleCount = 0
      rafId = requestAnimationFrame(tick)
    }

    const onScroll = () => {
      const delta = window.scrollY - lastY
      lastY = window.scrollY
      target = Math.max(-maxDegrees, Math.min(maxDegrees, -delta * velocitySensitivity))
      startRAF()
    }

    const observer = new IntersectionObserver(
      ([entry]) => { if (!entry.isIntersecting) { stopRAF(); target = 0 } },
      { threshold: 0 },
    )

    observer.observe(el)
    window.addEventListener('scroll', onScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', onScroll)
      stopRAF()
      observer.disconnect()
    }
  // `setup` is intentionally omitted: it runs once at mount and owns all
  // mutable state. Adding it to deps would reset state on every render.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maxDegrees, decay, velocitySensitivity])
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run build 2>&1 | tail -20
```

Expected: build succeeds (the hook is not yet used, so no import errors). If `hooks/` path alias is needed, skip — it'll be checked in Task 2.

- [ ] **Step 3: Commit**

```bash
git add hooks/useScrollAnimation.ts
git commit -m "feat: add useScrollAnimation hook with idle detection, prefers-reduced-motion, and IntersectionObserver"
```

---

## Task 2: Update `HibiscusUpAnimated`

**Files:**
- Modify: `components/ui/HibiscusUpAnimated.tsx`

Replace the existing `useEffect` with `useScrollAnimation`. The `setup` function recreates exactly the same petal-animation logic in a closure. The SVG markup is unchanged.

- [ ] **Step 1: Replace the file content**

Replace the entire `HibiscusUpAnimated.tsx` with:

```tsx
'use client'

import { useRef } from 'react'
import { useScrollAnimation } from '@/hooks/useScrollAnimation'

interface Props {
  className?:           string
  style?:               React.CSSProperties
  stemMaxDegrees?:      number
  stemSmoothing?:       number
  leafMaxDegrees?:      number
  leafMinDegrees?:      number
  leafTipSmoothing?:    number
  leafBaseSmoothing?:   number
  velocitySensitivity?: number
  decay?:               number
}

// [id, transformOrigin within petal's fill-box, t: 0=tip (flexible), 1=base (rigid)]
const PETALS: [string, string, number][] = [
  ['07', '100% 100%', 0.2],
  ['05', '50% 100%',  0.3],
  ['06', '100% 50%',  0.4],
  ['01', '100% 100%', 0.4],
  ['02', '100% 50%',  0.5],
  ['03', '0% 100%',   0.5],
  ['04', '100% 0%',   0.7],
]

const lerp = (a: number, b: number, t: number) => a + (b - a) * t

export default function HibiscusUpAnimated({
  className,
  style,
  stemMaxDegrees      = 6,
  stemSmoothing       = 0.08,
  leafMaxDegrees      = 4,
  leafMinDegrees      = 1,
  leafTipSmoothing    = 0.15,
  leafBaseSmoothing   = 0.05,
  velocitySensitivity = 0.15,
  decay               = 0.88,
}: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useScrollAnimation({
    ref,
    maxDegrees:          stemMaxDegrees,
    decay,
    velocitySensitivity,
    setup: (container) => {
      const svg = container.querySelector('svg')!
      const petalEls = PETALS.map(([n]) => svg.querySelector<SVGGElement>(`#hu-petal-${n}`))
      const petalCurrents = PETALS.map(() => 0)
      let stemCurrent = 0

      return (target) => {
        stemCurrent += (target - stemCurrent) * stemSmoothing
        container.style.transform = `rotate(${stemCurrent.toFixed(3)}deg)`

        PETALS.forEach(([, , t], i) => {
          const el = petalEls[i]
          if (!el) return
          const maxDeg      = lerp(leafMaxDegrees, leafMinDegrees, t)
          const smoothing   = lerp(leafTipSmoothing, leafBaseSmoothing, t)
          const petalTarget = Math.max(-maxDeg, Math.min(maxDeg, target))
          petalCurrents[i] += (petalTarget - petalCurrents[i]) * smoothing
          el.style.transform = `rotate(${petalCurrents[i].toFixed(3)}deg)`
        })
      }
    },
  })

  return (
    <div
      ref={ref}
      className={className}
      style={{ transformOrigin: '65% 97%', width: '100%', height: '100%', ...style }}
    >
      <svg width="244" height="216" viewBox="0 0 244 216" fill="none" xmlns="http://www.w3.org/2000/svg"
        style={{ width: '100%', height: '100%' }}>

        <g id="hu-petal-01" style={{ transformBox: 'fill-box', transformOrigin: '100% 100%' }}>
          <path d="M138.5 50.0114C123.643 67.6596 136.811 92.5461 138.423 95.4604L149.38 43.3184C146.106 43.4095 142.368 45.409 138.487 50.0278L138.5 50.0114Z" fill="#F26434"/>
          <path d="M149.325 43.2045L138.115 94.7247C138.203 94.9063 138.273 95.0025 138.273 95.0025C146.837 89.5276 154.083 76.9963 154.083 76.9963C164.236 60.4663 159.157 42.8494 149.338 43.2136L149.325 43.2045Z" fill="#F7A17B"/>
          <g opacity={0.38} style={{ mixBlendMode: 'screen' as const }}>
            <path d="M139.559 88.4157C138.28 85.5855 136.412 80.7598 135.507 75.147C133.252 61.4214 138.528 55.115 140.266 53.0404C142.904 49.8872 145.451 48.2269 147.804 48.1148C147.91 48.1105 148.016 48.1061 148.136 48.1108C151.451 48.1639 154.126 51.4228 154.96 56.3866C155.892 61.9919 154.362 68.5638 150.738 74.4416L150.673 74.5241L150.623 74.6412C150.559 74.7237 145.597 83.1679 139.585 88.4082L139.559 88.4157Z" fill="#F7A17B"/>
          </g>
          <path d="M148.11 49.1897C143.573 66.1909 140.644 83.779 135.985 101.011C135.697 102.015 137.237 102.095 137.465 101.077C141.632 83.7611 145.018 66.4651 148.095 49.1794C148.095 49.1794 152.647 32.1884 148.11 49.1897Z" fill="#F26434"/>
        </g>

        <g id="hu-petal-02" style={{ transformBox: 'fill-box', transformOrigin: '100% 50%' }}>
          <path d="M91.6908 140.142C110.759 147.408 136.229 122.862 139.202 119.92L84.23 132.024C84.4571 135.31 86.7178 138.246 91.6908 140.142Z" fill="#F26434"/>
          <path d="M84.2299 132.176L137.789 120.378C137.971 120.203 138.075 120.099 138.075 120.099C132.141 113.839 118.959 112.103 118.959 112.103C101.554 109.204 83.5505 122.316 84.2426 132.16L84.2299 132.176Z" fill="#F7A17B"/>
          <g opacity={0.38} style={{ mixBlendMode: 'screen' as const }}>
            <path d="M130.658 121.593C127.873 124.099 123.09 128.077 117.48 131.46C103.751 139.695 97.1931 137.141 95.0218 136.299C91.7344 135.005 89.9543 133.179 89.7525 130.845C89.743 130.743 89.7459 130.626 89.7365 130.524C89.6466 127.165 92.7931 123.057 97.7764 120.048C103.386 116.666 110.069 115.357 116.133 116.436L116.231 116.453L116.329 116.47C116.329 116.47 125.13 117.809 130.658 121.593Z" fill="#F7A17B"/>
          </g>
          <path d="M144.42 118.684C128.923 121.78 112.286 124.456 97.1669 129.357C112.32 125.978 128.896 122.846 144.323 120.276C145.371 120.146 145.51 118.468 144.42 118.684Z" fill="#F26434"/>
        </g>

        <g id="hu-petal-03" style={{ transformBox: 'fill-box', transformOrigin: '0% 100%' }}>
          <path d="M166.195 83.066C148.25 97.014 151.688 125.562 152.166 128.917L177.445 79.1499C174.674 78.3846 170.876 79.4423 166.208 83.0748L166.195 83.066Z" fill="#F26434"/>
          <path d="M177.395 79.1027L152.026 128.058C152.05 128.27 152.062 128.377 152.062 128.377C160.782 125.01 170.632 114.235 170.632 114.235C184.131 100.156 185.517 81.2128 177.395 79.1027Z" fill="#F7A17B"/>
          <g opacity={0.38} style={{ mixBlendMode: 'screen' as const }}>
            <path d="M155.147 122.773C154.859 119.491 154.615 113.997 155.421 107.96C157.418 93.179 163.841 88.2604 165.951 86.6338C169.169 84.1536 171.85 83.2079 173.943 83.7864C174.049 83.8073 174.142 83.8447 174.235 83.882C177.116 84.9131 178.505 89.031 177.798 94.3875C176.993 100.425 173.763 106.733 168.905 111.703L168.842 111.785L168.752 111.874C168.689 111.956 161.921 119.161 155.134 122.789L155.147 122.773Z" fill="#F7A17B"/>
          </g>
          <path d="M176.01 81.959L149.75 131.956C149.198 132.977 150.515 133.398 151.067 132.347L176.01 81.959Z" fill="#F26434"/>
        </g>

        <g id="hu-petal-04" style={{ transformBox: 'fill-box', transformOrigin: '100% 0%' }}>
          <path d="M104.701 158.621C122.318 143.288 149.04 155.682 152.157 157.215L98.3016 169.694C98.2239 166.437 100.112 162.626 104.716 158.63L104.701 158.621Z" fill="#F7A17B"/>
          <path d="M98.3334 169.645L152.468 156.953C152.657 157.052 152.772 157.103 152.772 157.103C147.473 166.028 134.581 173.724 134.581 173.724C117.616 184.512 98.555 179.719 98.3187 169.636L98.3334 169.645Z" fill="#F26434"/>
          <g opacity={0.38} style={{ mixBlendMode: 'screen' as const }}>
            <path d="M145.9 159.352C142.801 158.058 137.536 156.191 131.498 155.283C116.733 153.104 110.446 158.597 108.372 160.418C105.215 163.168 103.658 165.814 103.712 168.258C103.719 168.364 103.712 168.486 103.733 168.602C104.031 172.019 107.7 174.755 113.04 175.556C119.078 176.464 125.93 174.818 131.9 171.016L131.995 170.952L132.089 170.888C132.089 170.888 140.762 165.632 145.886 159.342L145.9 159.352Z" fill="#F7A17B"/>
          </g>
          <path d="M154.866 156.829C141.634 159.421 128.408 162.092 115.241 165.639C128.439 162.543 141.655 160.346 154.848 158.236C155.812 158.093 155.839 156.616 154.864 156.802L154.866 156.829Z" fill="#F26434"/>
        </g>

        <g id="hu-petal-05" style={{ transformBox: 'fill-box', transformOrigin: '50% 100%' }}>
          <path d="M109.284 37.5176C97.412 51.3249 107.225 71.0949 108.429 73.4039L117.886 32.3086C115.345 32.3564 112.386 33.9135 109.284 37.5176Z" fill="#F26434"/>
          <path d="M117.857 32.3132L108.561 73.5986C108.645 73.749 108.688 73.8243 108.688 73.8243C115.591 69.5669 121.464 59.6231 121.464 59.6231C129.708 46.4983 125.729 32.2162 117.857 32.3132Z" fill="#F7A17B"/>
          <g opacity={0.38} style={{ mixBlendMode: 'screen' as const }}>
            <path d="M110.333 68.4781C109.275 66.1624 107.728 62.2182 106.933 57.643C105.001 46.4897 109.214 41.5758 110.599 39.972C112.711 37.5073 114.761 36.254 116.66 36.2476C116.75 36.2367 116.841 36.2505 116.919 36.2552C119.601 36.3945 121.804 39.0982 122.504 43.1375C123.311 47.6971 122.114 52.9501 119.241 57.5542L119.181 57.6321L119.134 57.719C119.086 57.7813 115.136 64.4322 110.308 68.4847L110.333 68.4781Z" fill="#F7A17B"/>
          </g>
          <path d="M117.761 32.3624C114.177 46.6857 109.542 60.3868 107.457 74.8917C107.335 76.1368 109.361 76.0324 109.407 74.7639C110.822 60.6411 115.735 47.0209 117.761 32.3624Z" fill="#F26434"/>
        </g>

        <g id="hu-petal-06" style={{ transformBox: 'fill-box', transformOrigin: '100% 50%' }}>
          <path d="M75.0467 109.893C92.1566 111.456 107.764 87.2971 109.57 84.4177L67.2303 105.254C68.1209 107.722 70.5759 109.491 75.0467 109.893Z" fill="#F26434"/>
          <path d="M67.2298 105.247L109.438 85.0925C109.548 84.9212 109.609 84.8144 109.609 84.8144C103.198 81.1163 91.756 82.464 91.756 82.464C76.4992 83.7375 64.4132 97.6745 67.2444 105.256L67.2298 105.247Z" fill="#F7A17B"/>
          <g opacity={0.38} style={{ mixBlendMode: 'screen' as const }}>
            <path d="M104.732 86.9181C102.929 89.5734 99.7583 93.8625 95.7139 97.8111C85.8305 107.476 79.5262 106.727 77.44 106.487C74.2739 106.116 72.3073 104.965 71.5582 103.071C71.5347 102.981 71.4834 102.897 71.46 102.806C70.5649 100.045 72.3088 95.9857 75.8729 92.4827C79.902 88.5238 85.376 86.0345 90.8841 85.6767L90.9828 85.6688L91.0815 85.6608C91.0815 85.6608 99.0258 84.9347 104.732 86.9181Z" fill="#F7A17B"/>
          </g>
          <path d="M118.591 81.44C102.027 85.9875 86.3801 94.2959 71.3084 103.27C86.9982 96.6942 102.319 87.1001 118.701 83.1594C119.896 82.9685 119.791 81.1314 118.591 81.44Z" fill="#F26434"/>
        </g>

        <g id="hu-petal-07" style={{ transformBox: 'fill-box', transformOrigin: '100% 100%' }}>
          <path d="M54.888 52.4564C57.3673 71.3772 88.4804 66.004 92.1679 65.2984L58.1989 40.3293C55.6366 43.4243 54.2422 47.5141 54.888 52.4564Z" fill="#F26434"/>
          <path d="M57.9339 40.6725L91.0829 65.0315C91.312 64.9979 91.4395 64.9498 91.4395 64.9498C94.0086 55.3511 89.6771 45.1446 89.6771 45.1446C84.4536 31.0967 65.7561 31.2486 57.9339 40.6725Z" fill="#F7A17B"/>
          <g opacity={0.38} style={{ mixBlendMode: 'screen' as const }}>
            <path d="M87.7511 61.7623C84.3694 62.1876 78.8672 62.6164 73.4652 61.9784C60.2483 60.4081 59.309 53.9082 58.9927 51.7653C58.5156 48.5103 59.2036 45.7487 61.0192 43.5582C61.0983 43.4563 61.1774 43.3545 61.2716 43.2626C64.0056 40.2416 68.8699 38.6406 73.6655 39.2093C79.0807 39.8303 83.2769 42.9878 85.2097 47.8571L85.2433 47.931L85.2769 48.005C85.2769 48.005 88.2608 54.8629 87.7379 61.7793L87.7511 61.7623Z" fill="#F7A17B"/>
          </g>
        </g>

        {/* Stem */}
        <path d="M159.396 208.617C160.085 168.582 155.996 114.119 129.239 86.6013C123.508 80.6133 115.59 77.3066 108.335 73.396C101.128 69.5438 94.0604 65.4772 87.2495 61.0707C80.4772 56.6132 64.82 44.8038 57.7233 40.6983C68.711 52.6613 93.1259 66.9265 106.917 75.5459C113.798 79.7684 121.184 83.2016 126.468 89.3236C131.798 95.1418 135.785 102.158 138.882 109.622C150.773 139.89 151.99 175.275 149.83 209.467C149.32 215.891 158.956 215.192 159.383 208.634L159.396 208.617Z" fill="#F26434"/>
      </svg>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npm run build 2>&1 | tail -20
```

Expected: build succeeds with no type errors.

- [ ] **Step 3: Smoke-test in browser**

```bash
npm run dev
```

Open `http://localhost:3000`. Scroll through the About section. The hibiscus should sway exactly as before.

- [ ] **Step 4: Verify idle detection**

Open Chrome DevTools → Performance → start recording. Stop scrolling and wait 2 seconds. Scripting CPU activity should drop to near zero. Stop recording and confirm no RAF frames after the idle threshold.

- [ ] **Step 5: Commit**

```bash
git add components/ui/HibiscusUpAnimated.tsx
git commit -m "perf: migrate HibiscusUpAnimated to useScrollAnimation hook"
```

---

## Task 3: Update `HibiscusDownAnimated`

**Files:**
- Modify: `components/ui/HibiscusDownAnimated.tsx`

Same pattern as Task 2. LEAVES array and SVG markup are unchanged; only the effect is replaced.

- [ ] **Step 1: Replace the file content**

```tsx
'use client'

import { useRef } from 'react'
import { useScrollAnimation } from '@/hooks/useScrollAnimation'

interface Props {
  className?:           string
  style?:               React.CSSProperties
  stemMaxDegrees?:      number
  stemSmoothing?:       number
  leafMaxDegrees?:      number
  leafMinDegrees?:      number
  leafTipSmoothing?:    number
  leafBaseSmoothing?:   number
  velocitySensitivity?: number
  decay?:               number
}

// [id, transformOrigin within leaf's fill-box, t: 0=tip (flexible), 1=base (rigid)]
const LEAVES: [string, string, number][] = [
  ['07', '50% 100%', 0.0],
  ['05', '100% 50%', 0.2],
  ['06', '0% 50%',   0.3],
  ['01', '100% 50%', 0.4],
  ['02', '0% 50%',   0.4],
  ['03', '100% 50%', 0.6],
  ['04', '100% 0%',  0.7],
]

const lerp = (a: number, b: number, t: number) => a + (b - a) * t

export default function HibiscusDownAnimated({
  className,
  style,
  stemMaxDegrees      = 6,
  stemSmoothing       = 0.08,
  leafMaxDegrees      = 4,
  leafMinDegrees      = 1,
  leafTipSmoothing    = 0.15,
  leafBaseSmoothing   = 0.05,
  velocitySensitivity = 0.15,
  decay               = 0.88,
}: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useScrollAnimation({
    ref,
    maxDegrees:          stemMaxDegrees,
    decay,
    velocitySensitivity,
    setup: (container) => {
      const svg = container.querySelector('svg')!
      const leafEls = LEAVES.map(([n]) => svg.querySelector<SVGGElement>(`#hd-leaf-${n}`))
      const leafCurrents = LEAVES.map(() => 0)
      let stemCurrent = 0

      return (target) => {
        stemCurrent += (target - stemCurrent) * stemSmoothing
        container.style.transform = `rotate(${stemCurrent.toFixed(3)}deg)`

        LEAVES.forEach(([, , t], i) => {
          const el = leafEls[i]
          if (!el) return
          const maxDeg     = lerp(leafMaxDegrees, leafMinDegrees, t)
          const smoothing  = lerp(leafTipSmoothing, leafBaseSmoothing, t)
          const leafTarget = Math.max(-maxDeg, Math.min(maxDeg, target))
          leafCurrents[i] += (leafTarget - leafCurrents[i]) * smoothing
          el.style.transform = `rotate(${leafCurrents[i].toFixed(3)}deg)`
        })
      }
    },
  })

  return (
    <div
      ref={ref}
      className={className}
      style={{ transformOrigin: '94% 14%', width: '100%', height: '100%', ...style }}
    >
      <svg width="123" height="159" viewBox="0 0 123 159" fill="none" xmlns="http://www.w3.org/2000/svg"
        style={{ width: '100%', height: '100%' }}>

        <g id="hd-leaf-01" style={{ transformBox: 'fill-box', transformOrigin: '100% 50%' }}>
          <path d="M17.5632 86.4217C33.9432 90.7529 46.3375 74.2064 47.7668 72.222L9.70564 81.2964C10.7933 83.4416 13.2936 85.2965 17.5782 86.4251L17.5632 86.4217Z" fill="#A5D8A6"/>
          <path d="M9.64722 81.3683L47.3747 72.6567C47.4679 72.542 47.5097 72.465 47.5097 72.465C41.1875 68.4955 30.5931 67.6135 30.5931 67.6135C16.4316 66.0555 6.32693 74.9515 9.64898 81.3564L9.64722 81.3683Z" fill="#6A906E"/>
          <g opacity={0.38} style={{ mixBlendMode: 'screen' as const }}>
            <path d="M42.7288 73.6756C41.2506 75.4119 38.6321 78.1651 35.1891 80.5262C26.7823 86.3271 20.9394 84.8012 19.0167 84.2981C16.0953 83.5352 14.1935 82.3642 13.3811 80.8375C13.3449 80.7683 13.3086 80.699 13.2741 80.6179C12.2694 78.4001 13.5942 75.6023 16.6288 73.4923C20.0586 71.1161 24.9022 70.0707 29.9425 70.6346L30.0174 70.6514L30.1108 70.6478C30.1858 70.6645 37.3498 71.3117 42.7156 73.6604L42.7288 73.6756Z" fill="#6A906E"/>
          </g>
          <path d="M13.9989 80.297C26.7115 77.9786 39.3095 74.4087 52.2135 72.099C52.9708 71.9749 52.5407 70.9279 51.7936 71.0956C38.9876 73.7582 26.4403 76.9332 13.9969 80.3104C13.9969 80.3104 1.28627 82.6154 13.9989 80.297Z" fill="#8FD096"/>
        </g>

        <g id="hd-leaf-02" style={{ transformBox: 'fill-box', transformOrigin: '0% 50%' }}>
          <path d="M92.0882 89.2361C90.9308 74.2966 66.6406 65.081 63.7543 64.0293L89.0381 96.7355C91.1492 95.5543 92.3895 93.1326 92.0882 89.2361Z" fill="#A5D8A6"/>
          <path d="M89.1411 96.6868L64.5038 64.8227C64.3303 64.7566 64.2287 64.7202 64.2287 64.7202C61.9333 70.623 64.9162 79.9202 64.9162 79.9202C68.4512 92.3867 82.8069 100.229 89.1263 96.6834L89.1411 96.6868Z" fill="#6A906E"/>
          <g opacity={0.38} style={{ mixBlendMode: 'screen' as const }}>
            <path d="M67.5487 69.1741C70.0862 70.2376 74.2287 72.1665 78.235 74.8309C88.0103 81.3647 88.3718 86.5199 88.4941 88.2255C88.6658 90.8143 88.012 92.5688 86.5257 93.4345C86.461 93.4727 86.382 93.5077 86.3173 93.5459C84.1148 94.659 80.4003 93.8575 76.8388 91.492C72.8326 88.8277 69.8671 84.8003 68.6809 80.436L68.6615 80.3656L68.6422 80.2952C68.6422 80.2952 66.7701 74.0316 67.5487 69.1741Z" fill="#6A906E"/>
          </g>
          <path d="M61.2995 60.9511C68.217 70.2699 75.2133 80.4785 83.2113 88.9805C76.2133 79.9785 68.9337 69.954 62.3865 60.5159C61.9715 59.8608 60.8142 60.2947 61.2995 60.9511Z" fill="#8FD096"/>
        </g>

        <g id="hd-leaf-03" style={{ transformBox: 'fill-box', transformOrigin: '100% 50%' }}>
          <path d="M30.8239 57.6603C45.7154 65.2016 63.5933 53.9672 65.6713 52.5982L24.6943 51.4188C25.0554 53.4986 26.9492 55.6885 30.8256 57.6489L30.8239 57.6603Z" fill="#A5D8A6"/>
          <path d="M24.6779 51.465L65.1438 52.9587C65.2776 52.8763 65.3445 52.8351 65.3445 52.8351C60.3731 48.1008 50.1286 44.9397 50.1286 44.9397C36.5448 40.3916 23.5311 45.4107 24.6779 51.465Z" fill="#6A906E"/>
          <g opacity={0.38} style={{ mixBlendMode: 'screen' as const }}>
            <path d="M60.6563 52.5457C58.5676 53.7658 54.9959 55.6505 50.7343 57.0085C40.2929 60.3174 35.0118 57.595 33.2696 56.7036C30.6132 55.345 29.144 53.861 28.8716 52.2901C28.8523 52.2133 28.848 52.1398 28.8436 52.0664C28.6245 49.8303 30.9232 47.6169 34.7016 46.4063C38.9632 45.0483 44.1652 45.2149 48.9892 46.8817L49.0637 46.8981L49.1512 46.9295C49.2256 46.9459 56.1324 49.1802 60.6712 52.549L60.6563 52.5457Z" fill="#6A906E"/>
          </g>
          <path d="M27.0074 51.4894L68.4443 53.2478C69.2957 53.2944 69.1622 52.2882 68.291 52.2507L27.0074 51.4894Z" fill="#8FD096"/>
        </g>

        <g id="hd-leaf-04" style={{ transformBox: 'fill-box', transformOrigin: '100% 0%' }}>
          <path d="M100.289 74.797C84.5809 67.9069 84.427 46.2772 84.4672 43.7266L109.65 75.5741C107.512 76.6469 104.389 76.5885 100.291 74.7843L100.289 74.797Z" fill="#6A906E"/>
          <path d="M109.608 75.5675L84.1959 43.6019C84.2027 43.4455 84.2004 43.3528 84.2004 43.3528C91.7894 44.0733 100.944 50.22 100.944 50.22C113.43 58.1022 116.228 72.2618 109.606 75.5803L109.608 75.5675Z" fill="#A5D8A6"/>
          <g opacity={0.38} style={{ mixBlendMode: 'screen' as const }}>
            <path d="M87.8461 47.2129C87.9595 49.6765 88.3717 53.7581 89.6629 58.052C92.8483 68.5387 98.4687 70.9915 100.328 71.7971C103.145 73.0316 105.39 73.2355 106.996 72.4335C107.064 72.3959 107.148 72.3618 107.218 72.3114C109.394 71.0423 110.059 67.7482 108.916 63.9514C107.625 59.6575 104.382 55.6237 99.9844 52.8517L99.9122 52.8089L99.8399 52.766C99.8399 52.766 93.6285 48.6556 87.8442 47.2257L87.8461 47.2129Z" fill="#6A906E"/>
          </g>
          <path d="M83.3586 42.0494C89.2306 50.0225 95.1539 57.9671 101.64 65.5976C95.4439 57.8053 89.8391 49.7187 84.2987 41.6198C83.9009 41.0247 82.9115 41.47 83.3415 42.059L83.3586 42.0494Z" fill="#8FD096"/>
        </g>

        <g id="hd-leaf-05" style={{ transformBox: 'fill-box', transformOrigin: '100% 50%' }}>
          <path d="M18.4286 109.731C31.3228 113.287 41.3707 100.578 42.526 99.0555L12.2704 105.653C13.0994 107.325 15.0621 108.801 18.4286 109.731Z" fill="#A5D8A6"/>
          <path d="M12.2832 105.671L42.6142 98.9075C42.6877 98.8046 42.7245 98.7531 42.7245 98.7531C37.7312 95.5044 29.2851 94.7206 29.2851 94.7206C17.9831 93.3602 9.74841 100.476 12.2832 105.671Z" fill="#6A906E"/>
          <g opacity={0.38} style={{ mixBlendMode: 'screen' as const }}>
            <path d="M38.6548 99.3384C37.449 100.766 35.3157 103.03 32.5269 104.991C25.7271 109.769 21.1422 108.512 19.6427 108.095C17.3432 107.465 15.8677 106.497 15.2676 105.239C15.2322 105.182 15.2127 105.117 15.1914 105.064C14.4423 103.24 15.5462 100.93 18.0087 99.1992C20.7833 97.2348 24.6468 96.3831 28.6057 96.8478L28.6764 96.8634L28.7488 96.8673C28.8053 96.8798 34.4609 97.4174 38.6671 99.3532L38.6548 99.3384Z" fill="#6A906E"/>
          </g>
          <path d="M12.3429 105.727C22.9784 103.616 33.5306 102.398 43.8161 99.2346C44.6812 98.9254 43.9764 97.6133 43.1195 97.9802C33.2979 101.469 22.7123 102.477 12.3429 105.727Z" fill="#8FD096"/>
        </g>

        <g id="hd-leaf-06" style={{ transformBox: 'fill-box', transformOrigin: '0% 50%' }}>
          <path d="M77.2269 109.78C72.897 97.9292 51.958 95.1414 49.4791 94.8444L76.5989 116.424C77.9578 115.059 78.3627 112.874 77.2269 109.78Z" fill="#A5D8A6"/>
          <path d="M76.5925 116.428L49.9673 94.7217C49.8188 94.7021 49.729 94.6954 49.729 94.6954C49.2846 100.111 53.7694 107.286 53.7694 107.286C59.4016 117.017 72.4482 120.672 76.5944 116.415L76.5925 116.428Z" fill="#6A906E"/>
          <g opacity={0.38} style={{ mixBlendMode: 'screen' as const }}>
            <path d="M52.6564 97.2709C54.9852 97.6354 58.8281 98.3958 62.719 99.8432C72.2376 103.375 73.7181 107.796 74.2136 109.256C74.9602 111.475 74.8129 113.142 73.7903 114.233C73.7378 114.277 73.698 114.337 73.6454 114.381C72.0928 115.841 68.85 115.956 65.4057 114.688C61.5128 113.254 58.1424 110.4 56.1766 106.855L56.1404 106.791L56.1042 106.728C56.1042 106.728 53.1296 101.681 52.6564 97.2709Z" fill="#6A906E"/>
          </g>
          <path d="M44.6715 89.7847C52.8878 99.357 63.3136 107.141 74.0012 114.334C64.7123 105.979 53.5349 98.8139 45.7785 89.1722C45.277 88.4389 44.0899 89.0844 44.6715 89.7847Z" fill="#8FD096"/>
        </g>

        <g id="hd-leaf-07" style={{ transformBox: 'fill-box', transformOrigin: '50% 100%' }}>
          <path d="M45.4093 141.175C57.1966 133.596 43.8663 114.62 42.2407 112.393L36.317 142.779C39.1764 143.51 42.3299 143.154 45.4093 141.175Z" fill="#A5D8A6"/>
          <path d="M36.6278 142.849L42.4036 113.199C42.3094 113.057 42.2374 112.988 42.2374 112.988C35.057 114.291 29.6381 120.368 29.6381 120.368C21.948 128.242 27.9153 140.61 36.6278 142.849Z" fill="#6A906E"/>
          <g opacity={0.38} style={{ mixBlendMode: 'screen' as const }}>
            <path d="M41.2791 116.436C42.6224 118.549 44.6334 122.068 45.9045 125.855C49.0082 135.124 44.9867 137.786 43.6628 138.668C41.6511 140.005 39.6013 140.414 37.5771 139.896C37.4847 139.875 37.3922 139.854 37.3017 139.821C34.4379 138.953 31.8486 136.225 30.7217 132.862C29.4352 129.071 30.2155 125.295 32.8426 122.484L32.8811 122.439L32.9197 122.393C32.9197 122.393 36.5376 118.262 41.2945 116.44L41.2791 116.436Z" fill="#6A906E"/>
          </g>
        </g>

        {/* Stem */}
        <path d="M116.324 22.8013C89.5223 34.8998 54.6384 54.6957 44.7594 81.0937C42.5806 86.7768 42.8689 93.0719 42.5479 99.1158C42.2507 105.11 41.7676 111.078 40.9781 116.983C40.1426 122.878 37.2123 136.979 36.7123 142.979C41.2095 131.93 43.0231 111.244 44.4204 99.3832C45.0658 93.4897 45.0287 87.5087 47.4363 82.0798C49.628 76.716 53.0358 71.8678 57.0213 67.4706C73.3906 50.0814 96.506 38.1761 119.889 28.8866C124.315 27.2104 120.828 21.0313 116.339 22.8045L116.324 22.8013Z" fill="#8FD096"/>
      </svg>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript and smoke-test**

```bash
npm run build 2>&1 | tail -20
```

Scroll through About section in browser, verify green hibiscus sways normally.

- [ ] **Step 3: Commit**

```bash
git add components/ui/HibiscusDownAnimated.tsx
git commit -m "perf: migrate HibiscusDownAnimated to useScrollAnimation hook"
```

---

## Task 4: Update `ScrollSway`

**Files:**
- Modify: `components/ui/ScrollSway.tsx`

`ScrollSway` has only a single element to animate (the container itself). `setup` is minimal.

- [ ] **Step 1: Replace the file content**

```tsx
'use client'

import { useRef } from 'react'
import { useScrollAnimation } from '@/hooks/useScrollAnimation'

interface Props {
  children:             React.ReactNode
  className?:           string
  maxDegrees?:          number
  velocitySensitivity?: number
  decay?:               number
  smoothing?:           number
  transformOrigin?:     string
}

export default function ScrollSway({
  children,
  className,
  maxDegrees          = 8,
  velocitySensitivity = 0.15,
  decay               = 0.85,
  smoothing           = 0.1,
  transformOrigin     = 'bottom center',
}: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useScrollAnimation({
    ref,
    maxDegrees,
    decay,
    velocitySensitivity,
    setup: (container) => {
      let current = 0
      return (target) => {
        current += (target - current) * smoothing
        container.style.transform = `rotate(${current.toFixed(3)}deg)`
      }
    },
  })

  return (
    <div
      ref={ref}
      className={`w-full h-full${className ? ` ${className}` : ''}`}
      style={{ transformOrigin }}
    >
      {children}
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npm run build 2>&1 | tail -20
```

- [ ] **Step 3: Commit**

```bash
git add components/ui/ScrollSway.tsx
git commit -m "perf: migrate ScrollSway to useScrollAnimation hook"
```

---

## Task 5: Update `FernAnimated` (hook + filter consolidation)

**Files:**
- Modify: `components/ui/FernAnimated.tsx`

Two changes: replace the `useEffect` with `useScrollAnimation`, and replace the 17 identical `<filter>` elements with one shared `<filter id="fern-shadow">`. All `filter="url(#fN)"` attributes become `filter="url(#fern-shadow)"`.

- [ ] **Step 1: Replace the file content**

```tsx
'use client'

import { useRef } from 'react'
import { useScrollAnimation } from '@/hooks/useScrollAnimation'

interface Props {
  className?:           string
  style?:               React.CSSProperties
  stemMaxDegrees?:      number
  stemSmoothing?:       number
  leafMaxDegrees?:      number
  leafMinDegrees?:      number
  leafTipSmoothing?:    number
  leafBaseSmoothing?:   number
  velocitySensitivity?: number
  decay?:               number
}

// [id suffix, is right-side leaf, position along stem: 0 = tip, 1 = base]
const LEAVES: [string, boolean, number][] = [
  ['01', true,  0.00],
  ['02', false, 0.07],
  ['03', true,  0.14],
  ['04', false, 0.21],
  ['05', true,  0.28],
  ['06', false, 0.35],
  ['07', true,  0.42],
  ['08', false, 0.49],
  ['09', true,  0.56],
  ['10', false, 0.63],
  ['11', true,  0.70],
  ['12', false, 0.70],
  ['13', true,  0.84],
  ['14', false, 0.84],
  ['15', true,  0.91],
  ['16', false, 1.00],
]

const lerp = (a: number, b: number, t: number) => a + (b - a) * t

export default function FernAnimated({
  className,
  style,
  stemMaxDegrees      = 8,
  stemSmoothing       = 0.08,
  leafMaxDegrees      = 5,
  leafMinDegrees      = 2,
  leafTipSmoothing    = 0.18,
  leafBaseSmoothing   = 0.05,
  velocitySensitivity = 0.15,
  decay               = 0.88,
}: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useScrollAnimation({
    ref,
    maxDegrees:          stemMaxDegrees,
    decay,
    velocitySensitivity,
    setup: (container) => {
      const svg = container.querySelector('svg')!
      const leafEls = LEAVES.map(([n]) => svg.querySelector<SVGGElement>(`#fern-leaf-${n}`))
      const leafCurrents = LEAVES.map(() => 0)
      let stemCurrent = 0

      return (target) => {
        stemCurrent += (target - stemCurrent) * stemSmoothing
        container.style.transform = `rotate(${stemCurrent.toFixed(3)}deg)`

        LEAVES.forEach(([, isRight, t], i) => {
          const el = leafEls[i]
          if (!el) return
          const maxDeg     = lerp(leafMaxDegrees, leafMinDegrees, t)
          const smoothing  = lerp(leafTipSmoothing, leafBaseSmoothing, t)
          const leafTarget = Math.max(-maxDeg, Math.min(maxDeg, target)) * (isRight ? 1 : -1)
          leafCurrents[i] += (leafTarget - leafCurrents[i]) * smoothing
          el.style.transform = `rotate(${leafCurrents[i].toFixed(3)}deg)`
        })
      }
    },
  })

  return (
    <div
      ref={ref}
      className={className}
      style={{ transformOrigin: '0% 100%', ...style }}
    >
      <svg width="503" height="466" viewBox="0 0 503 466" fill="none" xmlns="http://www.w3.org/2000/svg">

        {/* ── Stem ── */}
        <g id="fern-stem" filter="url(#fern-shadow)">
          <path d="M358.809 150.208C355.049 157.349 351.161 164.437 347.148 171.472L345.797 174.131C342.103 180.518 338.329 186.861 334.456 193.166L333.178 195.178C326.351 206.197 319.239 217.077 311.821 227.823L309.805 230.683L309.799 230.692C308.179 233.01 306.56 235.327 304.914 237.63C297.98 247.337 290.835 256.926 283.452 266.385L281.647 268.69C272.116 280.85 262.21 292.786 251.971 304.487L250.47 306.169C246.137 311.103 241.747 315.989 237.303 320.845C231.903 326.739 226.419 332.568 220.871 338.328L218.047 341.276C207.283 352.36 196.212 363.224 184.824 373.827L182.368 376.135C174.508 383.405 166.5 390.543 158.338 397.527C152.291 402.685 146.133 407.765 139.874 412.721L137.56 414.557C114.564 432.531 90.009 448.803 63.4409 462.023C61.3401 463.066 63.2863 465.703 65.3871 464.66C69.7509 462.51 74.0665 460.265 78.334 457.924C100.079 446.068 120.383 432.197 139.626 417.14L142.498 414.872C152.129 407.254 161.494 399.318 170.617 391.231C175.387 387.001 180.114 382.696 184.793 378.382L187.786 375.649C198.831 365.355 209.606 354.809 220.079 344.063L221.899 342.23C231.249 332.566 240.376 322.745 249.261 312.773C251.329 310.441 253.391 308.088 255.453 305.735L255.455 305.735L259.021 301.548C267.248 291.97 275.279 282.25 283.052 272.404L285.936 268.682C295.296 256.721 304.28 244.535 312.901 232.166L315.082 229.002C322.852 217.728 330.326 206.274 337.468 194.671L339.8 190.817C343.455 184.787 347.011 178.719 350.492 172.628L353.106 167.984C358.264 158.777 363.202 149.501 367.913 140.134C368.821 138.33 369.722 136.507 370.609 134.709L367.97 132.172C364.992 138.214 361.961 144.227 358.809 150.208Z" fill="#8FD096"/>
        </g>

        <g id="fern-leaf-01" filter="url(#fern-shadow)" style={{ transformBox: 'fill-box', transformOrigin: '0% 100%' }}>
          <path d="M372.732 114.238C372.059 116.91 367.808 127.235 367.97 132.172L370.608 134.709C371.263 134.554 372.042 134.193 372.987 133.613C381.015 128.636 388.717 114.609 393.551 107.114C399.538 97.8144 404.328 87.9064 406.794 77.5421C412.921 51.7491 404.15 26.0295 405.608 0.00057729C395.153 26.8293 384.69 53.7905 379.115 81.4697C376.912 92.3912 375.471 103.389 372.732 114.238Z" fill="#8FD096"/>
        </g>

        <g id="fern-leaf-02" filter="url(#fern-shadow)" style={{ transformBox: 'fill-box', transformOrigin: '100% 100%' }}>
          <path d="M330.451 150.444C332.392 158.734 339.299 164.689 343.801 171.726L344.01 171.669C344.751 172.834 345.326 173.632 345.798 174.133L347.148 171.474C347.098 170.621 347.01 169.627 346.938 168.607C346.537 163.367 346.152 158.101 345.751 152.861C345.153 145.054 344.571 137.222 344.938 129.328C345.389 119.658 347.299 109.985 347.508 100.336C347.738 90.0978 346.042 79.9669 342.541 70.4738C337.947 58.0923 330.214 46.3183 330.861 32.9578C331.041 29.2068 331.899 25.468 332.756 21.7294C320.81 37.1814 315.513 56.3847 318.262 74.1783C321.173 92.9892 332.647 110.143 331.446 129.369C331.008 136.415 328.87 143.66 330.451 150.444Z" fill="#8FD096"/>
        </g>

        <g id="fern-leaf-03" filter="url(#fern-shadow)" style={{ transformBox: 'fill-box', transformOrigin: '0% 100%' }}>
          <path d="M353.507 167.638C353.376 167.738 353.231 167.864 353.106 167.985L350.493 172.629C351.216 172.478 352.231 172.161 353.566 171.693C362.467 168.537 372.4 167.463 380.256 162.012C386.693 157.55 390.562 150.813 395.628 145.096C409.427 129.514 431.465 122.082 448.148 108.948C463.898 96.5207 474.501 78.8324 477.046 60.6736L476.89 60.9097L476.89 60.9098C474.742 64.1743 472.587 67.4498 469.912 70.3902C460.179 81.1319 445.128 86.3127 432.097 93.5693C422.095 99.1436 413.02 106.157 405.357 114.241C398.131 121.861 392.199 130.366 385.141 138.113C379.389 144.448 372.927 150.238 366.481 156.002C362.155 159.874 357.833 163.766 353.507 167.638Z" fill="#8FD096"/>
        </g>

        <g id="fern-leaf-04" filter="url(#fern-shadow)" style={{ transformBox: 'fill-box', transformOrigin: '100% 100%' }}>
          <path d="M330.927 193.077C331.871 194.079 332.618 194.765 333.178 195.177L334.456 193.166C334.221 192.125 333.842 190.885 333.477 189.532C332.055 184.502 330.648 179.447 329.225 174.417L329.091 173.937C327.049 166.603 324.997 159.232 323.863 151.676C322.456 142.203 322.471 132.499 320.813 123.094C319.045 113.113 315.407 103.527 310.06 94.8556C303.082 83.5494 293.085 73.2948 291.136 60.2224C290.571 56.5421 290.698 52.7619 290.831 49.0019C281.922 65.8875 280.345 85.3878 286.551 102.25C293.107 120.079 307.872 134.938 310.4 153.831C311.326 160.77 310.592 168.135 313.491 174.477C317.024 182.251 325.074 186.946 330.927 193.077Z" fill="#8FD096"/>
        </g>

        <g id="fern-leaf-05" filter="url(#fern-shadow)" style={{ transformBox: 'fill-box', transformOrigin: '0% 100%' }}>
          <path d="M340.061 190.703C339.962 190.751 339.883 190.794 339.799 190.817L337.468 194.671C337.804 194.667 338.166 194.678 338.565 194.657C347.902 194.372 357.371 196.411 366.653 193.585C374.249 191.257 380.353 185.975 387.173 182.016C405.731 171.257 428.739 170.926 449.003 163.41C468.162 156.299 484.603 142.516 493.892 125.789L493.712 125.927L493.712 125.927C490.477 128.414 487.221 130.918 483.642 132.945C470.654 140.277 454.922 140.596 440.223 143.582C428.952 145.861 417.974 149.814 407.887 155.238C398.363 160.337 389.676 166.705 380.275 172.009C372.608 176.326 364.478 179.924 356.384 183.49C350.947 185.908 345.504 188.306 340.061 190.703Z" fill="#8FD096"/>
        </g>

        <g id="fern-leaf-06" filter="url(#fern-shadow)" style={{ transformBox: 'fill-box', transformOrigin: '100% 100%' }}>
          <path d="M308.793 229.677C309.164 230.053 309.504 230.395 309.806 230.682L311.821 227.822L311.364 226.126C309.942 221.096 308.514 216.046 307.112 211.011L306.978 210.53L306.978 210.529C304.936 203.196 302.884 195.826 301.75 188.27C300.323 178.803 300.337 169.099 298.679 159.694C296.911 149.712 293.273 140.126 287.926 131.455C280.948 120.149 270.951 109.894 269.002 96.822C268.437 93.1417 268.565 89.3615 268.697 85.6016C259.788 102.487 258.211 121.987 264.417 138.85C270.973 156.679 285.738 171.538 288.267 190.43C289.192 197.369 288.458 204.734 291.357 211.077C294.89 218.851 302.94 223.546 308.793 229.677Z" fill="#8FD096"/>
        </g>

        <g id="fern-leaf-07" filter="url(#fern-shadow)" style={{ transformBox: 'fill-box', transformOrigin: '0% 100%' }}>
          <path d="M317.353 228.258C316.47 228.648 315.602 229.012 314.823 229.373L312.901 232.164C313.616 232.232 314.582 232.231 315.852 232.192C325.189 231.907 334.658 233.946 343.94 231.121C351.536 228.793 357.64 223.511 364.46 219.551C383.018 208.792 406.026 208.461 426.29 200.945C445.449 193.835 461.89 180.052 471.179 163.324L470.877 163.556L470.877 163.556C467.683 166.012 464.483 168.473 460.929 170.481C447.946 177.832 432.215 178.152 417.516 181.137C406.244 183.416 395.266 187.37 385.179 192.794C375.656 197.893 366.968 204.26 357.568 209.565C349.901 213.882 341.771 217.48 333.677 221.046C328.248 223.46 322.814 225.853 317.38 228.247L317.374 228.249L317.353 228.258Z" fill="#8FD096"/>
        </g>

        <g id="fern-leaf-08" filter="url(#fern-shadow)" style={{ transformBox: 'fill-box', transformOrigin: '100% 100%' }}>
          <path d="M280.179 267.245C280.741 267.83 281.229 268.305 281.647 268.69L283.452 266.385C283.256 265.572 282.985 264.649 282.729 263.7C281.307 258.67 279.879 253.62 278.477 248.585L278.343 248.104L278.343 248.103C276.301 240.77 274.249 233.4 273.115 225.844C271.708 216.371 271.723 206.667 270.065 197.262C268.297 187.281 264.659 177.695 259.312 169.024C252.334 157.717 242.337 147.463 240.387 134.39C239.823 130.71 239.95 126.93 240.083 123.17C231.174 140.055 229.597 159.556 235.803 176.418C242.358 194.247 257.124 209.106 259.652 227.999C260.578 234.938 259.844 242.303 262.743 248.645C266.276 256.419 274.326 261.114 280.179 267.245Z" fill="#8FD096"/>
        </g>

        <g id="fern-leaf-09" filter="url(#fern-shadow)" style={{ transformBox: 'fill-box', transformOrigin: '0% 100%' }}>
          <path d="M286.501 268.442C286.297 268.519 286.119 268.61 285.936 268.681L283.052 272.403C283.593 272.409 284.244 272.407 284.999 272.376C294.337 272.091 303.806 274.13 313.088 271.304C320.684 268.977 326.788 263.694 333.608 259.735C352.166 248.976 375.174 248.645 395.438 241.129C414.597 234.019 431.038 220.236 440.326 203.508L440.024 203.74C436.831 206.197 433.631 208.657 430.077 210.664C417.094 218.016 401.362 218.336 386.663 221.321C375.392 223.6 364.414 227.553 354.327 232.978C344.803 238.077 336.116 244.444 326.715 249.748C319.049 254.066 310.918 257.664 302.824 261.23C297.397 263.643 291.964 266.036 286.531 268.429L286.521 268.433L286.501 268.442Z" fill="#8FD096"/>
        </g>

        <g id="fern-leaf-10" filter="url(#fern-shadow)" style={{ transformBox: 'fill-box', transformOrigin: '100% 100%' }}>
          <path d="M248.412 303.952C249.277 304.996 249.945 305.725 250.469 306.169L251.971 304.487L251.929 304.498C251.793 303.409 251.486 302.019 251.194 300.518C250.169 295.38 249.124 290.249 248.099 285.112L247.995 284.586C246.508 277.116 245.019 269.628 244.455 261.995C243.741 252.422 244.49 242.694 243.54 233.163C242.527 223.064 239.605 213.22 234.954 204.21C228.864 192.448 219.691 181.582 218.732 168.351C218.472 164.632 218.872 160.865 219.273 157.098C209.172 173.481 206.173 192.954 211.075 210.232C216.27 228.514 229.826 244.306 230.944 263.383C231.351 270.397 230.07 277.736 232.483 284.274C235.419 292.252 243.064 297.446 248.412 303.952Z" fill="#8FD096"/>
        </g>

        <g id="fern-leaf-11" filter="url(#fern-shadow)" style={{ transformBox: 'fill-box', transformOrigin: '0% 100%' }}>
          <path d="M274.8 295.651C269.537 297.632 264.289 299.587 259.021 301.547L255.454 305.735L255.455 305.735C255.728 305.748 256 305.761 256.314 305.763C265.599 306.033 274.864 308.647 284.271 306.372C291.966 304.494 298.43 299.548 305.495 295.999C324.731 286.335 347.589 287.365 368.262 281.037C387.816 275.055 405.163 262.219 415.622 245.998C412.163 248.338 408.715 250.717 404.92 252.562C391.463 259.154 375.817 258.541 361.016 260.645C349.654 262.255 338.46 265.574 328.031 270.397C318.204 274.95 309.113 280.82 299.381 285.564C291.457 289.427 283.149 292.531 274.861 295.628L274.86 295.628L274.8 295.651Z" fill="#8FD096"/>
        </g>

        <g id="fern-leaf-12" filter="url(#fern-shadow)" style={{ transformBox: 'fill-box', transformOrigin: '100% 100%' }}>
          <path d="M217.984 341.206C218.01 341.22 218.042 341.255 218.048 341.275L220.871 338.328C220.843 338.14 220.815 337.953 220.766 337.771C219.741 332.634 218.696 327.503 217.672 322.366L217.567 321.84C216.081 314.369 214.591 306.882 214.027 299.249C213.334 289.671 214.063 279.947 213.113 270.417C212.1 260.318 209.178 250.474 204.526 241.464C198.436 229.702 189.263 218.836 188.305 205.605C188.044 201.886 188.445 198.119 188.845 194.352L188.845 194.352C178.745 210.735 175.745 230.208 180.647 247.486C185.842 265.768 199.398 281.56 200.516 300.637C200.923 307.651 199.642 314.99 202.055 321.528C204.991 329.506 212.636 334.7 217.984 341.206Z" fill="#8FD096"/>
        </g>

        <g id="fern-leaf-13" filter="url(#fern-shadow)" style={{ transformBox: 'fill-box', transformOrigin: '0% 100%' }}>
          <path d="M225.942 341.142C224.455 341.542 223.041 341.88 221.9 342.231L220.079 344.064C220.753 344.315 221.916 344.543 223.666 344.786C232.766 346.037 241.536 349.65 251.1 348.373C258.929 347.325 265.935 343.056 273.358 340.254C293.568 332.623 315.934 336.081 337.112 331.956C357.136 328.055 375.897 317.047 388.329 301.897C384.641 303.886 380.911 305.887 376.945 307.345C362.855 312.506 347.524 310.227 332.682 310.761C321.293 311.188 309.842 313.299 298.941 317.037C288.652 320.545 278.943 325.456 268.735 329.18C260.405 332.204 251.815 334.431 243.226 336.658L243.226 336.659C237.475 338.165 231.698 339.656 225.942 341.142Z" fill="#8FD096"/>
        </g>

        <g id="fern-leaf-14" filter="url(#fern-shadow)" style={{ transformBox: 'fill-box', transformOrigin: '100% 100%' }}>
          <path d="M181.646 375.29C181.911 375.608 182.14 375.871 182.368 376.135L184.824 373.827C184.703 373.21 184.571 372.553 184.428 371.855C183.404 366.718 182.358 361.587 181.334 356.45L181.229 355.924C179.743 348.453 178.253 340.966 177.69 333.333C176.996 323.754 177.725 314.031 176.775 304.501C175.762 294.402 172.84 284.558 168.188 275.548C162.098 263.786 152.925 252.92 151.967 239.689C151.706 235.97 152.107 232.203 152.507 228.436L152.507 228.436C142.407 244.819 139.407 264.292 144.309 281.57C149.504 299.852 163.06 315.644 164.178 334.721C164.585 341.735 163.304 349.074 165.717 355.612C168.653 363.59 176.298 368.784 181.646 375.29Z" fill="#8FD096"/>
        </g>

        <g id="fern-leaf-15" filter="url(#fern-shadow)" style={{ transformBox: 'fill-box', transformOrigin: '0% 100%' }}>
          <path d="M189.588 375.163L187.787 375.649L184.793 378.382C185.435 378.512 186.261 378.658 187.312 378.808C196.412 380.059 205.182 383.672 214.746 382.395C222.574 381.347 229.58 377.077 237.004 374.276C257.214 366.645 279.58 370.103 300.757 365.978C320.781 362.077 339.542 351.068 351.975 335.919C348.287 337.908 344.557 339.909 340.591 341.367C326.501 346.527 311.17 344.249 296.328 344.783C284.939 345.21 273.487 347.32 262.586 351.058C252.297 354.566 242.588 359.477 232.38 363.202C224.051 366.225 215.461 368.453 206.872 370.68C201.121 372.186 195.344 373.678 189.588 375.163Z" fill="#8FD096"/>
        </g>

        <g id="fern-leaf-16" filter="url(#fern-shadow)" style={{ transformBox: 'fill-box', transformOrigin: '100% 100%' }}>
          <path d="M136.552 413.4C136.918 413.842 137.268 414.224 137.56 414.557L139.874 412.721C139.714 411.876 139.532 410.951 139.334 409.965L136.26 394.554L136.254 394.522L136.254 394.522C134.736 386.887 133.213 379.233 132.658 371.426C131.965 361.847 132.714 352.119 131.785 342.582C130.814 332.472 127.913 322.623 123.262 313.613C117.193 301.845 108.04 290.973 107.103 277.737C106.85 274.126 107.24 270.465 107.629 266.808L107.629 266.808L107.664 266.478C97.543 282.867 94.4959 302.33 99.3771 319.615C104.525 337.888 118.065 353.705 119.141 372.794C119.527 379.813 118.246 387.152 120.639 393.696C123.58 401.694 131.204 406.894 136.552 413.4Z" fill="#8FD096"/>
        </g>

        <defs>
          {/* Single shared inner-shadow filter — replaces the former 17 identical filters */}
          <filter id="fern-shadow" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
            <feFlood floodOpacity="0" result="BackgroundImageFix"/>
            <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
            <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
            <feOffset dx="4" dy="4"/><feGaussianBlur stdDeviation="4"/>
            <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1"/>
            <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.05 0"/>
            <feBlend mode="normal" in2="shape" result="s1"/>
            <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
            <feOffset dx="-4" dy="-4"/><feGaussianBlur stdDeviation="4"/>
            <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1"/>
            <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.05 0"/>
            <feBlend mode="normal" in2="s1" result="s2"/>
            <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
            <feOffset dx="4" dy="-4"/><feGaussianBlur stdDeviation="4"/>
            <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1"/>
            <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.05 0"/>
            <feBlend mode="normal" in2="s2" result="s3"/>
            <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
            <feOffset dx="-4" dy="4"/><feGaussianBlur stdDeviation="4"/>
            <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1"/>
            <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.05 0"/>
            <feBlend mode="normal" in2="s3"/>
          </filter>
        </defs>
      </svg>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript and smoke-test**

```bash
npm run build 2>&1 | tail -20
```

Open the About section in the browser, scroll to trigger the fern. It should sway identically to before. The leaf inner-shadows should look visually identical (filter is the same operation, now shared).

- [ ] **Step 3: Commit**

```bash
git add components/ui/FernAnimated.tsx
git commit -m "perf: migrate FernAnimated to useScrollAnimation hook and consolidate 17 SVG filters into one"
```

---

## Task 6: Update `ScrollRotate`

**Files:**
- Modify: `components/ui/ScrollRotate.tsx`

`ScrollRotate` has no RAF loop (stateless scroll listener). Only change needed: skip the listener entirely if `prefers-reduced-motion` is set.

- [ ] **Step 1: Replace the file content**

```tsx
'use client'

import { useEffect, useRef } from 'react'

export default function ScrollRotate({
  children,
  degreesPerScreen = 25,
  className,
  transformOrigin = 'center center',
}: {
  children:          React.ReactNode
  degreesPerScreen?: number
  className?:        string
  transformOrigin?:  string
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const update = () => {
      const rotation = (window.scrollY / window.innerHeight) * degreesPerScreen
      el.style.transform = `rotate(${rotation}deg)`
    }
    update()
    window.addEventListener('scroll', update, { passive: true })
    return () => window.removeEventListener('scroll', update)
  }, [degreesPerScreen])

  return (
    <div
      ref={ref}
      className={`w-full h-full${className ? ` ${className}` : ''}`}
      style={{ transformOrigin }}
    >
      {children}
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npm run build 2>&1 | tail -20
```

- [ ] **Step 3: Smoke-test prefers-reduced-motion**

Open Chrome DevTools → Rendering tab → set "Emulate CSS media feature prefers-reduced-motion" to `reduce`. Reload and scroll: the rotating flower in the About section should be completely static. Remove the emulation, reload: the flower should rotate again normally.

- [ ] **Step 4: Commit**

```bash
git add components/ui/ScrollRotate.tsx
git commit -m "perf: add prefers-reduced-motion guard to ScrollRotate"
```

---

## Task 7: Tucan — `prefers-reduced-motion`

**Files:**
- Modify: `components/sections/Footer.tsx`

Add `@media (prefers-reduced-motion: reduce)` rules to the two inline `<style>` blocks inside `TucanBody` and `TucanHead`. No JS changes needed — these are pure CSS animations.

- [ ] **Step 1: Update `TucanBody` style block**

In `Footer.tsx`, find the `<style>` tag inside `TucanBody` (currently ends with `animation: tucan-wave 5s ease-in-out infinite;`). Replace just the `<style>` content:

```tsx
      <style>{`
        @keyframes tucan-wave {
          0%   { transform: rotate(0deg); }
          20%  { transform: rotate(-18deg); }
          45%  { transform: rotate(-6deg); }
          65%  { transform: rotate(-22deg); }
          85%  { transform: rotate(-4deg); }
          100% { transform: rotate(0deg); }
        }
        .tucan-footer-wing {
          transform-box: fill-box;
          transform-origin: 0% 100%;
          animation: tucan-wave 5s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .tucan-footer-wing { animation: none; }
        }
      `}</style>
```

- [ ] **Step 2: Update `TucanHead` style block**

Find the `<style>` tag inside `TucanHead`. Replace just the `<style>` content:

```tsx
      <style>{`
        @keyframes tucan-lid-upper {
          0%   { transform: translateY(-13px); }
          76%  { transform: translateY(-13px); animation-timing-function: ease-in; }
          86%  { transform: translateY(0px); }
          90%  { transform: translateY(0px); animation-timing-function: ease-out; }
          100% { transform: translateY(-13px); }
        }
        @keyframes tucan-lid-lower {
          0%   { transform: translateY(13px); }
          76%  { transform: translateY(13px); animation-timing-function: ease-in; }
          86%  { transform: translateY(0px); }
          90%  { transform: translateY(0px); animation-timing-function: ease-out; }
          100% { transform: translateY(13px); }
        }
        .tucan-lid-upper {
          animation: tucan-lid-upper 5s linear infinite 2s;
          animation-fill-mode: backwards;
        }
        .tucan-lid-lower {
          animation: tucan-lid-lower 5s linear infinite 2s;
          animation-fill-mode: backwards;
        }
        @media (prefers-reduced-motion: reduce) {
          .tucan-lid-upper,
          .tucan-lid-lower { animation: none; }
        }
      `}</style>
```

- [ ] **Step 3: Verify TypeScript**

```bash
npm run build 2>&1 | tail -20
```

- [ ] **Step 4: Smoke-test prefers-reduced-motion**

Open Chrome DevTools → Rendering → enable `prefers-reduced-motion: reduce`. Scroll to the footer. The tucan's wing should be still, and the eye should not blink. Remove emulation — wing waves and eye blinks normally.

- [ ] **Step 5: Commit**

```bash
git add components/sections/Footer.tsx
git commit -m "perf: add prefers-reduced-motion support to tucan CSS animations"
```

---

## Task 8: Images — Next.js `<Image>`

**Files:**
- Modify: `components/sections/About.tsx`

Replace both bare `<img>` tags with Next.js `<Image>`. Actual image dimensions (confirmed):
- `screen-dashboard.png`: 1200 × 2478
- `screen-calendar.png`: 992 × 1992

Both are 2× retina assets. `width` / `height` props encode the intrinsic aspect ratio for CLS prevention; `style={{ width: '100%', height: 'auto' }}` makes them responsive.

- [ ] **Step 1: Add the import**

At the top of `components/sections/About.tsx`, add the import after the existing imports:

```tsx
import Image from 'next/image'
```

The file currently has:
```tsx
import { AboutProps } from '@/types'
import ScrollRotate      from '@/components/ui/ScrollRotate'
import FernAnimated      from '@/components/ui/FernAnimated'
import HibiscusUpAnimated   from '@/components/ui/HibiscusUpAnimated'
import HibiscusDownAnimated from '@/components/ui/HibiscusDownAnimated'
```

Add `import Image from 'next/image'` as the last import line.

- [ ] **Step 2: Replace the dashboard image**

Find:
```tsx
              <img
                alt="TucanBRAS app — dashboard"
                src={IMG_SCREEN_DASHBOARD}
                className="w-full h-auto block pointer-events-none lg:w-[600px] lg:max-w-none"
              />
```

Replace with:
```tsx
              <Image
                alt="TucanBRAS app — dashboard"
                src={IMG_SCREEN_DASHBOARD}
                width={1200}
                height={2478}
                className="w-full h-auto block pointer-events-none lg:w-[600px] lg:max-w-none"
              />
```

- [ ] **Step 3: Replace the calendar image**

Find:
```tsx
              <img
                alt="TucanBRAS app — calendar"
                src={IMG_SCREEN_CALENDAR}
                className="w-full h-auto block pointer-events-none"
              />
```

Replace with:
```tsx
              <Image
                alt="TucanBRAS app — calendar"
                src={IMG_SCREEN_CALENDAR}
                width={992}
                height={1992}
                className="w-full h-auto block pointer-events-none"
              />
```

- [ ] **Step 4: Verify TypeScript and layout**

```bash
npm run build 2>&1 | tail -20
```

Open the About section in browser. Both phone mockups should render identically to before. In DevTools → Network, filter by `img` — the dashboard and calendar requests should show as WebP (not PNG) on a second load, and the `loading` attribute should be `lazy`.

- [ ] **Step 5: Commit**

```bash
git add components/sections/About.tsx
git commit -m "perf: replace bare img tags with Next.js Image in About section"
```

---

## Verification Checklist

After all tasks are complete:

- [ ] `npm run build` passes with no errors
- [ ] `npm run lint` passes with no new warnings
- [ ] Animations look visually identical to before
- [ ] DevTools Rendering → `prefers-reduced-motion: reduce`: all animations (hibiscus, fern, flower, tucan wing, tucan blink) are static
- [ ] DevTools Performance: CPU scripting drops to ~0% within ~2 seconds of stopping scrolling
- [ ] About section phone images load as WebP in Network tab
- [ ] Footer tucan renders correctly on desktop
