# TucanBRAS Landing — Development Plan Design
**Date:** 2026-05-01  
**Status:** Approved

---

## Context

TucanBRAS is a production-grade multilingual landing page (RU/EN/PT) for a Brazilian Portuguese school. Stack: Next.js 16.2.2, React 19, TypeScript strict, Tailwind v4, Notion CMS, PostgreSQL, Resend.

The page has 8 sections, scroll-driven flora animations, a lead capture pipeline (Notion + PostgreSQL + Telegram + email), and an existing optimization plan from 2026-04-24 that is partially complete.

---

## Development Phases

### Phase 0 — Close Technical Debt (1–2 weeks)

Complete the 2026-04-24 optimization plan:

1. Finalize `hooks/useScrollAnimation.ts` — shared RAF + scroll hook with idle detection (60 frames at |target| < 0.001) and `IntersectionObserver` viewport pausing.
2. Refactor `FernAnimated` — use `useScrollAnimation`, consolidate 17 duplicate `<filter>` elements into 1 reusable `<defs>` block.
3. Refactor `HibiscusUpAnimated` — use `useScrollAnimation`.
4. Refactor `HibiscusDownAnimated` — use `useScrollAnimation`.
5. Refactor `ScrollSway` — use `useScrollAnimation`.
6. `ScrollRotate` — add `prefers-reduced-motion` inline check (already partially done).
7. Footer tucan CSS animations — add `@media (prefers-reduced-motion)` block.
8. `About.tsx` — confirm all `<img>` replaced with Next.js `<Image>` (dimensions required).

---

### Phase 1 — Background Collage System (main new feature)

A fixed full-page background layer that displays a visual journey through Brazil as the user scrolls. Each scroll position range maps to a scene.

#### Architecture

```
<body>
  <BackgroundCanvas />        ← position:fixed, z-0, full viewport, pointer-events:none
  <div style="position:relative; z-index:10">
    <Header />
    <Hero />           ← Scene 1: Mountain + Christ the Redeemer
    <About />          ← Scene 2: Forest begins
    <Comparison />     ← Scene 2: Deep forest
    <WaveSection />    ← Scene 3: Beach + waves + palm crowns (new section)
    <Tutors />         ← Scene 3→4: Beach heading → Cliff cards
    <CelpeBras />      ← Scene 4+: neutral / open
    <Plans />
    <Footer />
  </div>
</body>
```

#### Component Structure

```
components/ui/background/
├── BackgroundCanvas.tsx     ← orchestrator: subscribes to scroll, renders scenes
├── useScrollScene.ts        ← maps scrollY to { scene: 1|2|3|4, progress: 0..1 }
├── Scene1Mountain.tsx       ← sky gradient + Corcovado hill layers + Christ statue
├── Scene2Forest.tsx         ← canopy + lianas + undergrowth SVG layers
├── Scene3Beach.tsx          ← sky + ocean + sand SVG layers
├── Scene4Cliff.tsx          ← rocky cliff + distant ocean
└── SceneTransition.tsx      ← crossfade wrapper between scenes
```

#### Scroll System Rules

- One scroll listener total, in `BackgroundCanvas`. No other component subscribes to scroll for background purposes.
- RAF throttling: only re-render when `scrollY` changed since last frame.
- `useScrollScene(scrollY, sectionRefs)` maps absolute pixel positions to `{ scene, progress }` using section bounding boxes measured on mount and on resize.
- Background layers update via direct DOM style mutation (no React state) to avoid re-renders.

#### Scene Details

**Scene 1 — Mountain + Christ the Redeemer (Hero)**
Layers (back to front):
- Sky gradient: tropical blue → warm horizon
- Distant hills (Corcovado silhouette, dark green, slow parallax)
- Main mountain body (medium parallax)
- Christ the Redeemer statue: SVG or Three.js — decision deferred, both valid
  - SVG option: detailed flat-style SVG with CSS perspective hover effect
  - Three.js option: GLTF model loaded via dynamic import, desktop only
- Base mist: light fog gradient at mountain foot

**Scene 2 — Forest (About → Comparison)**
Layers:
- Canopy layer (dense treetops, horizontal repeat, fast parallax)
- Mid-tree trunks with lianas (static + subtle sway on scroll velocity)
- Undergrowth layer (bushes + existing FernAnimated style)
- Light rays: radial gradient overlay from top center
- Additional tropical flowers: `TropicalFlower.tsx`, `VineAnimated.tsx` as overlays on section edges

**Scene 3 — Beach (WaveSection + Tutors heading)**
Layers:
- Sky gradient: azure → white horizon
- Ocean body (solid blue-green fill)
- Wave layers: 3 SVG paths animating with different speeds (see Phase 2)
- Sand strip at bottom
- Palm tree silhouettes (side view, horizon)

**Scene 4 — Cliff (Tutors cards)**
Layers:
- Rocky cliff face texture (SVG)
- Cliff edge with tropical vegetation
- Distant ocean far below
- Sky sliver at top

#### Performance Rules

- `prefers-reduced-motion`: all background animations disabled; scene shows static first frame only.
- Mobile: parallax disabled, only opacity crossfade between scenes.
- Three.js (if used for statue): dynamic import, desktop only, fallback to SVG statue on mobile or if load fails.
- Each scene SVG is lazy-loaded via `IntersectionObserver` before its section enters viewport.

---

### Phase 2 — WaveSection (new decorative section)

A full-width decorative section inserted between Tutors and CelpeBras. No text content.

**Section order after addition:**
```
1. Header
2. Hero
3. About
4. Comparison
5. Tutors
6. WaveSection  ← NEW
7. CelpeBras
8. Plans
9. Footer
```

**Components:**
```
components/sections/WaveSection.tsx
components/ui/WavesAnimated.tsx      ← 3 SVG wave paths, staggered sine animation
components/ui/PalmTopAnimated.tsx    ← top-down palm crown, rotates on scroll
```

**WavesAnimated:**
- 3 SVG `<path>` elements representing wave crests at different depths
- Each path animates horizontally (translateX) at different speeds via RAF
- Depths: far (slowest, lightest), mid, near (fastest, darkest)
- Uses `useScrollAnimation` hook

**PalmTopAnimated:**
- SVG of a palm crown viewed from directly above (fronds radiating from center)
- Rotates continuously (slow, CSS `animation`) + extra rotation on scroll velocity
- Multiple instances placed at different horizontal positions
- `prefers-reduced-motion`: rotation stops, crown stays visible as static decoration

---

### Phase 3 — Additional Decorative Elements

Scatter new flora components across existing sections:

| Component | Placement | Behavior |
|-----------|-----------|----------|
| `TropicalFlower.tsx` | About edges, Comparison sides | Gentle sway on scroll |
| `VineAnimated.tsx` | Scene2 forest overlay | Hangs from top, lerp sway |
| `LeafDrop.tsx` | CelpeBras, Plans margins | Subtle parallax offset |

All new components use `useScrollAnimation` hook. All respect `prefers-reduced-motion`.

---

### Phase 4 — Analytics (deferred)

Full conversion tracking stack when ready:
- Vercel Analytics or GA4 for pageviews and traffic sources
- Conversion events: FreeLessonModal open, form submit, tutor select, plan click
- UTM parameters captured from URL, appended to Notion lead record and Telegram notification
- No implementation until explicitly requested

---

## Architecture Decisions

**Why BackgroundCanvas is fixed, not sticky:**
Fixed removes it from document flow entirely — no layout reflow when scenes change. Content sits on top via z-index. This is the standard pattern for parallax backgrounds.

**Why SVG scenes, not Canvas/WebGL for background:**
Consistent with existing flora components (FernAnimated, Hibiscus). SVG is editable, accessible, scales without pixelation. Three.js is reserved for the Christ statue only if true 3D interactivity is required.

**Why one scroll listener:**
Multiple scroll listeners on the same page create hidden performance costs. A single listener in BackgroundCanvas fans out scroll state to all scene components.

**Christ statue decision deferred:**
Both 2D SVG (stylized flat illustration) and 3D Three.js (GLTF model) are valid. SVG is more consistent with the site's visual language; Three.js offers real interactivity. Decide when design assets are ready.

---

## Files to Update

- `AGENTS.md` — agent rules for current stack and new architecture
- `Claude.md` — project documentation: stack, structure, section order, resolved TBDs
- `app/[locale]/page.tsx` — add `WaveSection` to section list (Phase 2)
- `types/index.ts` — no changes needed (WaveSection has no CMS content)
