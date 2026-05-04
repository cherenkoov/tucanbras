# WaveSection — Design Spec
**Date:** 2026-05-02  
**Status:** Approved

---

## Overview

Full-width decorative section between Tutors and CelpeBras. No CMS content, no text. Pure visual animation.

Section order position: **6** (fixed, per CLAUDE.md).

---

## Components

```
components/sections/WaveSection.tsx     ← section shell + IntersectionObserver
components/ui/WavesAnimated.tsx         ← 6 SVG wave bands with counter-animation
```

---

## WaveSection.tsx

- Full-width section, background `var(--color-yellow)` — temporary, will be replaced with a custom background
- Renders `<WavesAnimated />` and passes a running/paused flag via prop
- Uses `IntersectionObserver` to detect when section enters/leaves viewport
- Passes `isActive` prop to `WavesAnimated` — animation pauses when `false`

---

## WavesAnimated.tsx

### SVG Asset

`public/SVG/wave/wave.svg` — viewBox `0 0 3825 200`, single closed path.  
Rendered at **4974×260px** (2× natural scale, preserves aspect ratio).

### Band Configuration

6 bands stacked vertically, alternating ink and cream:

| index | color token | color hex | top (px) | direction |
|-------|-------------|-----------|----------|-----------|
| 0 | `--color-ink` | `#323031` | -110 | ← left |
| 1 | `--color-cream` | `#fffce5` | -34 | → right |
| 2 | `--color-ink` | `#323031` | 42 | ← left |
| 3 | `--color-cream` | `#fffce5` | 118 | → right |
| 4 | `--color-ink` | `#323031` | 194 | ← left |
| 5 | `--color-cream` | `#fffce5` | 270 | → right |

Each band: `position: absolute`, `width: 4974px`, `height: 260px`, `left: -800px` (initial offset to cover viewport).

### Animation

Scroll-driven with inertia. Updates band transforms directly via refs — no React state.

**Tunable constants (top of file):**

```ts
const FRICTION     = 0.90   // velocity decay per frame (0.80=fast stop, 0.95=long glide)
const SCROLL_SCALE = 0.15   // scroll delta → velocity multiplier
const INK_SPEED    = 120    // translateX amplitude for ink bands
const CREAM_SPEED  = 90     // translateX amplitude for cream bands
```

**Per-frame logic:**
1. On scroll event: `velocity += deltaY * SCROLL_SCALE`
2. Each RAF frame: `position[i] += direction * velocity * speed * 0.01`
3. Apply: `bandRef[i].style.transform = translateX(position[i]px)`
4. Decay: `velocity *= FRICTION`
5. Stop RAF when `Math.abs(velocity) < 0.05` (idle threshold)
6. Stop RAF entirely when `isActive === false` (section out of viewport)

**Hook:** Uses `hooks/useScrollAnimation.ts` for RAF loop management.

### Accessibility

`prefers-reduced-motion`: skip all transforms, render bands at static initial positions.

### Mobile

Animation runs as normal — no parallax to disable. If performance issues arise, reduce band count to 4 on mobile (deferred decision).

---

## IntersectionObserver — Pause Logic

`WaveSection.tsx` observes its own root ref:

```ts
const observer = new IntersectionObserver(
  ([entry]) => setIsActive(entry.isIntersecting),
  { threshold: 0 }
)
```

`isActive` is the only piece of React state in this component. All animation state lives in refs.

---

## Palms — Deferred

`PalmTopAnimated` is a separate implementation step. Most likely placement: below the wave bands within WaveSection, or in a different section. Decision deferred until waves are live on the page.

---

## Files to Create / Modify

| File | Action |
|------|--------|
| `components/sections/WaveSection.tsx` | Create |
| `components/ui/WavesAnimated.tsx` | Create |
| `app/[locale]/page.tsx` | Add `<WaveSection />` at position 6 |
| `app/globals.css` | No changes needed — tokens already defined |
