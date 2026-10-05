import { BG_POSTERS } from './bgPosters'

/** The width range a poster serves, as a media query. Shared with the <link rel=preload>s
 *  in app/layout.tsx, so the preload and the displayed poster can never disagree. */
export function posterMedia(p: { from: number; to: number | null }): string {
  const max = p.to == null ? '' : ` and (max-width:${p.to - 0.02}px)`
  return `(min-width:${p.from}px)${max}`
}

// Picks the poster for the current width with plain media queries, so the right one is on
// screen from the FIRST paint — before any JS has run, let alone the live scene. Every
// poster's div ships, only the matching one is displayed, and a display:none element's
// background image is never requested — one file goes over the wire, whatever the count.
// The base rule comes first: same specificity, so the media rules after it win.
const POSTER_CSS =
  '[data-bg-poster]>div{display:none}' +
  BG_POSTERS.map((p, i) => `@media ${posterMedia(p)}{[data-bg-poster]>[data-i="${i}"]{display:block}}`).join('')

// Same duration and curve as the live scene's own entrance, so the two read as ONE
// cross-fade — blurred still dissolving into the sharp scene rising over it.
export const POSTER_FADE_MS = 1400

/**
 * Blurred still of the settled background, shown until the live BackgroundCanvas reveals
 * over it, then faded out and unmounted. See scripts/bakeBgPosters.mts for why it is
 * blurred and why there is one per width step.
 *
 * It fades OUT rather than just sitting under the live scene: the collage has no sky of its
 * own (clouds and statue are painted straight over the page background), so a poster left
 * underneath would keep its blurred clouds showing through the live sky.
 */
export default function BgPoster({ hidden }: { hidden: boolean }) {
  return (
    <>
      <style>{POSTER_CSS}</style>
      <div
        data-bg-poster
        aria-hidden="true"
        className="absolute top-0 left-0 w-full pointer-events-none"
        style={{
          opacity: hidden ? 0 : 1,
          transition: `opacity ${POSTER_FADE_MS}ms ease`,
          // The shot ends somewhere mid-scene; dissolve that edge into the page sky instead
          // of cutting it. Only the last 6%: the capture already runs ~35% below a typical
          // fold, so the fade sits off-screen — at 15% it landed ON screen and painted a
          // teal band where translucent green met the sky (2026-10-05).
          maskImage: 'linear-gradient(to bottom, #000 94%, transparent)',
          WebkitMaskImage: 'linear-gradient(to bottom, #000 94%, transparent)',
        }}
      >
        {BG_POSTERS.map((p, i) => (
          <div
            key={i}
            data-i={i}
            style={{
              width: '100%',
              aspectRatio: `${p.w} / ${p.h}`,
              backgroundImage: `url(${p.src})`,
              backgroundSize: '100% 100%',
            }}
          />
        ))}
      </div>
    </>
  )
}
