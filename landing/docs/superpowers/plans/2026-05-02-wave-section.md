# WaveSection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full-width decorative wave section (position 6) with 6 SVG bands animating in opposite directions driven by scroll, with inertia and viewport-pausing.

**Architecture:** `WavesAnimated` owns all animation state in refs and drives transforms directly via `useScrollAnimation`. `WaveSection` is a thin shell that provides full-bleed layout and yellow background. `page.tsx` inserts the section between Tutors and CelpeBras.

**Tech Stack:** Next.js App Router, React 19, TypeScript strict, Tailwind v4, `hooks/useScrollAnimation`

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `components/ui/WavesAnimated.tsx` | **Create** | 6 animated SVG bands, all animation state |
| `components/sections/WaveSection.tsx` | **Create** | Full-bleed section shell, yellow background |
| `app/[locale]/page.tsx` | **Modify** | Import + insert WaveSection at position 6 |

---

## Task 1: Create WavesAnimated.tsx

**Files:**
- Create: `components/ui/WavesAnimated.tsx`

The wave path comes from `public/SVG/wave/wave.svg`. Open that file and copy the `d="..."` attribute value — it is a long string starting with `M71.9969 76.8023...`. Paste it as the `WAVE_PATH` constant below.

The component uses `useScrollAnimation` which already handles:
- RAF start/stop on scroll
- `IntersectionObserver` pause when element leaves viewport
- `prefers-reduced-motion` early return
- Idle detection (stops RAF after 20 near-zero frames)

The hook's `target` parameter received by the tick callback is scroll velocity that decays by `decay` each frame. Accumulate it into each band's position.

- [ ] **Step 1: Create the file**

```tsx
'use client'

import { useRef } from 'react'
import { useScrollAnimation } from '@/hooks/useScrollAnimation'

// ─── Wave SVG path ────────────────────────────────────────────────────────────
// Copy the full d="..." value from public/SVG/wave/wave.svg
const WAVE_PATH = 'M71.9969 76.8023...' // ← paste full path here

// ─── Animation constants ──────────────────────────────────────────────────────
const MAX_VELOCITY    = 150   // scroll velocity cap (hook's maxDegrees param)
const FRICTION        = 0.90  // velocity decay per frame (hook's decay param)
const SCROLL_SCALE    = 0.15  // scroll delta → velocity (hook's velocitySensitivity)
const POSITION_SCALE  = 0.01  // velocity → px translation per frame

// ─── Band layout ──────────────────────────────────────────────────────────────
// viewBox 0 0 3825 200, rendered at 2× natural scale → 4974×260px
// dir sign is flipped vs the brainstorm demo because useScrollAnimation negates
// scroll delta: target = -delta * scale, so negative when scrolling down.
// dir=1 for ink → position += 1 * (negative) → translateX negative → moves LEFT ✓
// dir=-1 for cream → position += -1 * (negative) → translateX positive → moves RIGHT ✓
const BANDS = [
  { color: 'var(--color-ink)',   top: -110, speed: 120, dir:  1 },
  { color: 'var(--color-cream)', top:  -34, speed:  90, dir: -1 },
  { color: 'var(--color-ink)',   top:   42, speed: 120, dir:  1 },
  { color: 'var(--color-cream)', top:  118, speed:  90, dir: -1 },
  { color: 'var(--color-ink)',   top:  194, speed: 120, dir:  1 },
  { color: 'var(--color-cream)', top:  270, speed:  90, dir: -1 },
] as const

export function WavesAnimated() {
  const containerRef = useRef<HTMLDivElement>(null)
  const bandRefs     = useRef<(HTMLDivElement | null)[]>([])
  const positions    = useRef<number[]>(BANDS.map(() => 0))

  useScrollAnimation({
    ref:                 containerRef,
    maxDegrees:          MAX_VELOCITY,
    decay:               FRICTION,
    velocitySensitivity: SCROLL_SCALE,
    setup: () => (velocity) => {
      BANDS.forEach((band, i) => {
        positions.current[i] += band.dir * velocity * band.speed * POSITION_SCALE
        const el = bandRefs.current[i]
        if (el) el.style.transform = `translateX(${positions.current[i]}px)`
      })
    },
  })

  return (
    <div ref={containerRef} className="relative w-full overflow-hidden" style={{ height: 440 }}>
      {BANDS.map((band, i) => (
        <div
          key={i}
          ref={el => { bandRefs.current[i] = el }}
          style={{
            position:   'absolute',
            top:        band.top,
            left:       -800,
            width:      4974,
            height:     260,
            willChange: 'transform',
          }}
        >
          <svg
            viewBox="0 0 3825 200"
            preserveAspectRatio="none"
            style={{ display: 'block', width: '100%', height: '100%' }}
            aria-hidden="true"
          >
            <path d={WAVE_PATH} fill={band.color} />
          </svg>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Paste the full wave path**

Open `public/SVG/wave/wave.svg`. Copy the entire value of the `d` attribute (everything between `d="` and `"`). Replace the placeholder string in `WAVE_PATH`.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd tucanbras && npx tsc --noEmit
```

Expected: no errors related to `WavesAnimated.tsx`.

- [ ] **Step 4: Commit**

```bash
git add components/ui/WavesAnimated.tsx
git commit -m "feat: add WavesAnimated — 6 scroll-driven SVG wave bands"
```

---

## Task 2: Create WaveSection.tsx

**Files:**
- Create: `components/sections/WaveSection.tsx`

The section must be full-bleed (ignore horizontal padding of the parent layout). The parent `main` in `page.tsx` has `px-s600` on mobile and `px-[var(--spacing-landing-x)]` on desktop. The CSS variable `--page-x` in `globals.css` already resolves to the correct value for each breakpoint:
- Mobile: `24px`
- Desktop: `max(100px, (100vw - 1440px) / 2)`

Use negative `margin-left/right` equal to `--page-x` to bleed to the edges of `main`. `overflowX: 'clip'` on `main` prevents scrollbar.

- [ ] **Step 1: Create the file**

```tsx
import { WavesAnimated } from '@/components/ui/WavesAnimated'

export default function WaveSection() {
  return (
    <section
      aria-hidden="true"
      style={{
        marginLeft:  'calc(-1 * var(--page-x))',
        marginRight: 'calc(-1 * var(--page-x))',
        background:  'var(--color-yellow)',
      }}
    >
      <WavesAnimated />
    </section>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/sections/WaveSection.tsx
git commit -m "feat: add WaveSection shell — full-bleed, yellow background"
```

---

## Task 3: Wire WaveSection into page.tsx

**Files:**
- Modify: `app/[locale]/page.tsx`

Insert `<WaveSection />` between `<Tutors />` (position 5) and `<CelpeBras />` (position 6). WaveSection takes no props.

- [ ] **Step 1: Add import**

In `app/[locale]/page.tsx`, add to the imports block (after the Tutors import):

```tsx
import WaveSection from '@/components/sections/WaveSection'
```

- [ ] **Step 2: Insert section in JSX**

Find the block:

```tsx
          {/* 5 */}
          <Tutors data={tutorsData} tutors={tutors} locale={locale} modalStrings={modalStrings} />
          {/* 6 */}
          <CelpeBras data={celpeBrasData} />
```

Replace with:

```tsx
          {/* 5 */}
          <Tutors data={tutorsData} tutors={tutors} locale={locale} modalStrings={modalStrings} />
          {/* 6 — decorative, no CMS data */}
          <WaveSection />
          {/* 7 */}
          <CelpeBras data={celpeBrasData} />
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Start dev server and visually verify**

```bash
npm run dev
```

Open `http://localhost:3000/ru`. Scroll to the WaveSection (between Tutors and CelpeBras). Verify:

1. Yellow background section is visible between the two sections
2. 6 wave bands are visible (3 ink, 3 cream)
3. Scrolling down: ink bands move left, cream bands move right
4. Momentum: waves continue briefly after scroll stops then slow to a stop
5. Full-bleed: waves reach both edges of the viewport
6. On mobile: same behavior
7. No horizontal scrollbar appears

- [ ] **Step 5: Verify prefers-reduced-motion**

In browser DevTools → Rendering → Emulate CSS media: `prefers-reduced-motion: reduce`. Reload page. Verify: waves are visible but static — no movement on scroll.

- [ ] **Step 6: Verify IntersectionObserver pause**

Scroll quickly so WaveSection is in view with momentum. Then scroll past it entirely so it leaves the viewport. Verify: wave animation stops (no DOM mutations while offscreen).

- [ ] **Step 7: Commit**

```bash
git add app/[locale]/page.tsx
git commit -m "feat: insert WaveSection at position 6 in page layout"
```
