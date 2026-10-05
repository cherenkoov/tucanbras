import { BG_POSTERS } from './bgPosters'

// Picks the poster for the current width with plain media queries, so the right one is on
// screen from the FIRST paint — before any JS has run, let alone the live scene. Every
// poster's markup ships (they are ~350 B each), only the matching one is displayed.
// The base rule comes first: same specificity, so the media rules after it win.
const POSTER_CSS =
  '[data-bg-poster]>div{display:none}' +
  BG_POSTERS.map((p, i) => {
    const max = p.to == null ? '' : ` and (max-width:${p.to - 0.02}px)`
    return `@media (min-width:${p.from}px)${max}{[data-bg-poster]>[data-i="${i}"]{display:block}}`
  }).join('')

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
          // The shot ends somewhere mid-scene; dissolve that edge into the page sky
          // instead of cutting it.
          maskImage: 'linear-gradient(to bottom, #000 85%, transparent)',
          WebkitMaskImage: 'linear-gradient(to bottom, #000 85%, transparent)',
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
