# SVG Background with Parallax + Train & Cable Car Animations

**Date:** 2026-05-17
**Status:** Approved

## Goal

Replace the current PNG background in `BackgroundCanvas.tsx` with the vectorized SVG (`background [Vectorized].svg`), add CSS parallax scrolling, and animate two objects along SVG paths using GSAP MotionPath: a train and a cable car cabin.

---

## Decisions

| Question | Decision |
|---|---|
| Scroll behavior | Parallax — SVG scrolls at 0.4× page speed |
| Animation trigger | IntersectionObserver → viewport entry starts infinite cycle |
| SVG in DOM | `fetch()` → `dangerouslySetInnerHTML` (GSAP needs DOM access) |
| Mobile parallax | Disabled (`pointer: coarse`) — SVG static, animations still run |
| Mobile animations | Keep — loop triggers on viewport entry same as desktop |
| Reduced motion | Stop all animations (`prefers-reduced-motion: reduce`) |
| Dependencies | Add `gsap` (npm); no other new deps |

---

## Architecture

```
BackgroundCanvas.tsx
 ├── fetch SVG → dangerouslySetInnerHTML
 ├── <link rel="preload" as="fetch"> in layout.tsx (loads before React)
 ├── Placeholder div (aspect-ratio: 800/2430, sky gradient) until SVG ready
 ├── useParallaxBackground — scroll → translateY on container (0.4×)
 │    └── skipped on mobile (pointer: coarse)
 ├── useTrainAnimation — GSAP MotionPath along #rail-path
 │    └── IntersectionObserver on #Train → play() / pause()
 └── useCarAnimation — GSAP MotionPath along #Road_2
      └── IntersectionObserver on #Cabine → play() / pause()
```

---

## Files

| File | Action | What changes |
|---|---|---|
| `components/ui/background/BackgroundCanvas.tsx` | Rewrite | fetch SVG, dangerouslySetInnerHTML, mounts all hooks |
| `components/ui/background/useParallaxBackground.ts` | Create | RAF scroll listener → translateY on container ref |
| `components/ui/background/useTrainAnimation.ts` | Create | GSAP MotionPath + IntersectionObserver for train |
| `components/ui/background/useCarAnimation.ts` | Create | GSAP MotionPath + IntersectionObserver for cable car |
| `app/layout.tsx` | Modify | Add `<link rel="preload" href="...svg" as="fetch" crossOrigin="anonymous">` |
| `package.json` | Modify | Add `gsap` dependency |

---

## SVG Details

**Background SVG:** `public/SVG/background/background [Vectorized].svg`
- Dimensions: `800 × 2430 px`, `viewBox="0 0 800 2430"`
- Key group IDs used by animations: `#Train`, `#Cable car`, `#Cabine`, `#Cabine_2`, `#Road_2`

**Train path:** `public/SVG/background/road trace.svg`
- Dimensions: `303 × 441 px` — coordinates are in a different space than the background SVG
- This path must be scaled and positioned to align with the `#Train` group in the background SVG
- Inserted as a hidden `<defs><path id="rail-path" .../></defs>` inside the background SVG after fetch (string manipulation before `dangerouslySetInnerHTML`)

**Cable car path:** `#Road_2` is a group (`<g>`) inside the fetched SVG. GSAP MotionPath requires a `<path>` element, not a group. During implementation: inspect `#Road_2` children and identify the inner `<path>` (e.g. `#Road_2 path:first-child`), or give it an explicit ID after fetch via string manipulation. Use that inner path as the MotionPath target.

---

## Parallax

Hook: `useParallaxBackground(containerRef)`

```ts
// Behavior
scrollY → containerRef.current.style.transform = `translateY(${-scrollY * 0.4}px)`

// Mobile skip
if (window.matchMedia('(hover: none) and (pointer: coarse)').matches) return

// Reduced motion skip
if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
```

Uses `requestAnimationFrame` — same pattern as existing `useScrollAnimation`. No new scroll listeners architecture.

---

## Train Animation

Hook: `useTrainAnimation(containerRef)`

```ts
// GSAP MotionPath timeline (paused on creation)
gsap.timeline({ repeat: -1, paused: true })
  .to('#Train', {
    motionPath: { path: '#rail-path', autoRotate: true, align: '#rail-path' },
    duration: 8,
    ease: 'none',
  })

// IntersectionObserver
observer.observe(container.querySelector('#Train'))
// → intersecting: timeline.play()
// → not intersecting: timeline.pause()
```

**Coordinate alignment:** `road trace.svg` path coordinates (303×441 space) must be transformed to the background SVG's 800×2430 space. The transform is applied via a `<g transform="...">` wrapper around the injected `<path id="rail-path">` inside `<defs>`. Exact scale and translation values determined visually during implementation.

---

## Cable Car Animation

Hook: `useCarAnimation(containerRef)`

The SVG contains two cabins: `#Cabine` and `#Cabine_2`. Both follow `#Road_2`.

```ts
// Cabine 1: starts at beginning of path
gsap.timeline({ repeat: -1, paused: true })
  .to('#Cabine', {
    motionPath: { path: '#Road_2', autoRotate: true, align: '#Road_2' },
    duration: 12,
    ease: 'none',
  })

// Cabine 2: starts at 50% offset (opposite direction on the cable)
gsap.timeline({ repeat: -1, paused: true })
  .to('#Cabine_2', {
    motionPath: { path: '#Road_2', autoRotate: true, align: '#Road_2', start: 0.5, end: 1.5 },
    duration: 12,
    ease: 'none',
  })

// IntersectionObserver on the Cable car group
```

---

## Preload

In `app/layout.tsx`, inside `<head>`:

```tsx
<link
  rel="preload"
  href="/SVG/background/background [Vectorized].svg"
  as="fetch"
  crossOrigin="anonymous"
/>
```

`as="fetch"` is required (not `as="image"`) because `fetch()` uses the fetch cache, not the image cache. Using the wrong `as` value causes the browser to download the file twice.

---

## Placeholder

While SVG is loading (`svgContent === ''`):

```tsx
<div
  style={{
    width: '100%',
    aspectRatio: '800 / 2430',
    background: 'linear-gradient(to bottom, #1a2a4a 0%, #2a5298 15%, #1e3a6e 40%)',
  }}
/>
```

Removed and replaced by the SVG once `svgContent` is set.

---

## BackgroundCanvas Structure

```tsx
export default function BackgroundCanvas() {
  const [svgContent, setSvgContent] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  // 1. Fetch SVG (preloaded, so near-instant)
  useEffect(() => {
    fetch('/SVG/background/background [Vectorized].svg')
      .then(r => r.text())
      .then(raw => setSvgContent(injectRailPath(raw))) // inserts #rail-path into <defs>
  }, [])

  // 2. Animations — run after SVG is in DOM
  useParallaxBackground(containerRef, { enabled: !!svgContent })
  useTrainAnimation(containerRef, { enabled: !!svgContent })
  useCarAnimation(containerRef, { enabled: !!svgContent })

  return (
    <div
      ref={containerRef}
      className="absolute top-0 left-0 w-full z-0 pointer-events-none"
      style={{ overflow: 'visible' }}
    >
      {!svgContent && <Placeholder />}
      {svgContent && <div dangerouslySetInnerHTML={{ __html: svgContent }} />}

      {/* ChristScene overlay — positioned on mountain peak, same as before */}
      <div className="absolute" style={{ left: '72%', top: '5%', transform: 'translateX(-50%)' }}>
        <ChristScene />
      </div>
    </div>
  )
}
```

`injectRailPath(raw)` — pure function that inserts the `road trace.svg` path into the SVG string's `<defs>` section before it hits the DOM.

---

## ChristScene Compatibility

`ChristScene` is currently positioned via `BackgroundCanvas` at `left: 72%, top: 5%`. This must remain — the Christ scene overlay sits on top of the SVG background. No changes needed to `ChristScene.tsx` or `useStatueRotation.ts`.

---

## Out of Scope

- Animating clouds, trees, or other SVG elements
- Scroll-driven (scrub) animation — decided against in favour of viewport-triggered loop
- SVG editing or optimization — use as-is from Figma export
- Three.js or WebGL
