<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

**Version: Next.js 16.2.2, React 19.2.4, Tailwind CSS v4**

These are recent releases with breaking changes from Next.js 13–14. APIs, conventions, and file structure differ from training data. Read `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

Key differences from Next.js 14:
- `next/navigation` replaces `next/router` in App Router
- Tailwind v4 uses PostCSS config, no `tailwind.config.ts` — tokens live in `globals.css`
- `app/[locale]/page.tsx` is the entry point (not `app/page.tsx`)
- Static params use `generateStaticParams()` for locale pre-rendering
<!-- END:nextjs-agent-rules -->

---

<!-- BEGIN:project-architecture-rules -->
# Project Architecture Rules

## Stack
- **Next.js 16.2.2** App Router, SSR + ISR (3600s revalidate)
- **React 19.2.4** — Server Components + Client Components (`'use client'` required for scroll/DOM)
- **TypeScript** strict mode — all components and hooks must be typed
- **Tailwind CSS v4** — use `var(--color-*)` tokens from `globals.css`, never invent raw hex values
- **Notion API** (`@notionhq/client`) — primary CMS for all section content
- **PostgreSQL** (`pg`) — tutor list + leads storage
- **Resend** — welcome emails, 3 locale templates in `lib/email.ts`

## Directory Layout
```
components/
  sections/          ← full-page sections (Header, Hero, About, Comparison,
  │                     Tutors, WaveSection, CelpeBras, Plans, Footer)
  ui/                ← reusable sub-components and animations
  ui/background/     ← BackgroundCanvas + scene components (Scene1Mountain,
                        Scene2Forest, Scene3Beach, Scene4Cliff, SceneTransition)
hooks/               ← shared logic (useScrollAnimation, useScrollScene)
lib/                 ← server-side data (notion.ts, tutors.ts, db.ts, email.ts)
types/               ← TypeScript interfaces (index.ts)
```

## Section Order — DO NOT REORDER
```
1. Header
2. Hero
3. About
4. Comparison
5. Tutors
6. WaveSection      ← decorative, no CMS content
7. CelpeBras
8. Plans
9. Footer
```

## Animation Rules

- All scroll-driven animations use `hooks/useScrollAnimation.ts`
  — never write a new RAF + scroll listener from scratch
- One global scroll listener in `BackgroundCanvas` for background scenes
  — do not add more scroll listeners for background purposes
- `prefers-reduced-motion`: all animations must check this and disable motion
  — use `window.matchMedia('(prefers-reduced-motion: reduce)').matches`
- Animations update DOM directly via ref (`el.style.transform = ...`)
  — never use React state for animation values (causes re-renders)
- Idle detection: stop RAF after 60 frames with |target| < 0.001

## BackgroundCanvas Rules

- `components/ui/background/BackgroundCanvas.tsx` is `position:fixed; z-index:0`
- All page content sits in a wrapper with `position:relative; z-index:10`
- `useScrollScene` maps `scrollY` to `{ scene: 1|2|3|4, progress: 0..1 }`
- Scene SVGs are lazy-loaded via IntersectionObserver before their section enters viewport
- Mobile: disable parallax, use opacity crossfade only
- `prefers-reduced-motion`: render first frame only, no animation

## Form & Lead Capture

- Both `FreeLessonModal` and `FooterForm` POST to `/api/free-lesson`
- Pipeline: Notion → PostgreSQL → Telegram notification → Resend email
- Never duplicate validation logic — if adding a third form entry point, extract shared validator

## Content Rules

- Section text comes from Notion — never hardcode copy in components
- `WaveSection` is purely decorative, has no Notion data
- Nav labels, anchor hrefs, and section order are hardcoded in `Header.tsx`
- CTA button texts come from Notion; destinations are configured per section

## TypeScript

- All new components: explicit Props interface before the component
- No `any` — use `unknown` + type guard if shape is truly unknown
- Server Components: async functions returning JSX — no `'use client'`
- Client Components requiring scroll/DOM/state: add `'use client'` at top

## Image Handling

- Use `next/image` (`<Image>`) for all raster assets, never bare `<img>`
- Always provide `width` and `height` for `<Image>` (required by Next.js Image)
- SVG animations: inline SVG in component, not `<img src="*.svg">`
<!-- END:project-architecture-rules -->
