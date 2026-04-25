# Optimization Pass — Design Spec
**Date:** 2026-04-24  
**Status:** Approved

---

## Goal

Make the site run smoothly on all devices, including low-end mobile phones. Two categories of work: animation efficiency and image loading.

---

## Scope

| Area | Files touched |
|---|---|
| New shared hook | `hooks/useScrollAnimation.ts` (new) |
| RAF components | `FernAnimated`, `HibiscusUpAnimated`, `HibiscusDownAnimated`, `ScrollSway`, `ScrollRotate` |
| SVG filter consolidation | `FernAnimated` only |
| Tucan CSS animations | `Footer.tsx` — `TucanBody`, `TucanHead` |
| Image optimization | `About.tsx` |

---

## 1. Shared hook — `hooks/useScrollAnimation.ts`

### Problem
`FernAnimated`, `HibiscusUpAnimated`, `HibiscusDownAnimated`, and `ScrollSway` all contain identical scroll→target→RAF control flow. None of them idle, respect motion preferences, or pause when off-screen.

### Solution
A single hook that manages the animation lifecycle. The component is responsible only for its per-frame DOM mutations, passed in as `onTick`.

```ts
useScrollAnimation({
  ref:                  RefObject<HTMLElement>,
  maxDegrees:           number,
  decay:                number,
  velocitySensitivity:  number,
  onTick:               (target: number) => void,
})
```

### Three optimizations the hook provides

**Idle detection**  
The hook tracks how many consecutive frames have `|target| < 0.001`. After a threshold (e.g. 60 frames ≈ 1 second), it calls `cancelAnimationFrame`. The scroll listener remains active and restarts the RAF on the next scroll event. This eliminates continuous CPU usage when the user is not scrolling.

**`prefers-reduced-motion`**  
Checked once at mount via `window.matchMedia('(prefers-reduced-motion: reduce)')`. If true, the hook returns immediately — no scroll listener, no RAF, no DOM mutations. Elements stay in their default position.

**Intersection Observer**  
A single `IntersectionObserver` watches the `ref` element. When the element leaves the viewport, RAF is cancelled. When it re-enters, RAF restarts (only if the user has scrolled — otherwise idle detection will stop it quickly anyway). Prevents animations from running while the user is in a completely different section.

### Cleanup
All three — scroll listener, RAF, and IntersectionObserver — are cleaned up in the `useEffect` return.

---

## 2. Updating RAF components

Each component replaces its `useEffect` body with a call to `useScrollAnimation`. The `onTick` callback contains the existing per-leaf/per-petal lerp logic, unchanged.

| Component | Change |
|---|---|
| `FernAnimated` | `useEffect` → `useScrollAnimation`, 16-leaf `onTick` |
| `HibiscusUpAnimated` | `useEffect` → `useScrollAnimation`, 7-petal `onTick` |
| `HibiscusDownAnimated` | `useEffect` → `useScrollAnimation`, 7-leaf `onTick` |
| `ScrollSway` | `useEffect` → `useScrollAnimation`, single-container `onTick` |

**`ScrollRotate`** — does not use RAF (stateless scroll listener only). Add `prefers-reduced-motion` check inline: if the media query matches, skip `addEventListener` and do nothing. No hook needed.

---

## 3. FernAnimated — consolidate SVG filters

### Problem
`FernAnimated` defines 17 identical `<filter>` elements (`f0`–`f16`), one per leaf and the stem. They share the same inner-shadow operations. This creates 17 separate GPU compositing contexts.

### Solution
Replace with one `<filter id="fern-shadow">`. Update all `filter="url(#fN)"` references to `filter="url(#fern-shadow)"`. The visual result is identical.

---

## 4. Tucan — `prefers-reduced-motion`

### Problem
The tucan's wing wave and blink animations (`tucan-wave`, `tucan-lid-upper`, `tucan-lid-lower`) run as CSS `animation: infinite` with no motion-preference check.

### Solution
Add to the `<style>` block in both `TucanBody` and `TucanHead`:

```css
@media (prefers-reduced-motion: reduce) {
  .tucan-footer-wing,
  .tucan-lid-upper,
  .tucan-lid-lower { animation: none; }
}
```

No JS changes needed — the tucan is already a server component with pure CSS animations.

---

## 5. Images — Next.js `<Image>`

### Problem
`About.tsx` uses two bare `<img>` tags for `screen-dashboard.png` and `screen-calendar.png`. These miss automatic WebP/AVIF conversion, responsive `srcset`, and lazy loading.

### Solution
Replace both with `<Image>` from `next/image`. Actual pixel dimensions to be confirmed at implementation time by inspecting the source files. Both images are below the fold — no `priority` prop needed (lazy loading is the correct default).

`next.config.ts` requires no changes — local images don't need domain configuration.

---

## What is NOT changing

- Component APIs (all props stay the same)
- Visual design and animation feel (same parameters, same timing)
- Notion integration
- Section order
- Any other component
