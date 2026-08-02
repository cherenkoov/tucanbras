// One deck, three places: the flags row (mobile burger), the flags dropdown
// (desktop) and the header's ⋮ column all open the same way — whatever is hidden
// lies in the exact box of the pill that stays put, one z-layer under it, and is
// dealt out from beneath it like cards off the top of a deck.
//
// What makes it read as a deck rather than a list switching on:
//   • the tucked card sits in EXACTLY the box of its cover, so nothing peeks —
//     both pill shadows are inset-only, which is why nothing spills either;
//   • it rides slightly small, so the cover always overhangs it and the reveal
//     shows a corner sliding out instead of two flush dark edges;
//   • z descends with depth, so a card is always drawn from under the one that
//     left before it — the whole point of the gesture. Nothing that MOVES is
//     ever drawn over something that stays put, and the header's cover art is
//     below all of it;
//   • the deal is staggered nose-first and tucks back tail-first.

export const DECK = {
  STAGGER_MS: 70,
  OUT_MS:     340,
  IN_MS:      240,
  OUT_EASE:   'cubic-bezier(0.22, 1, 0.36, 1)',   // long glide, settles soft
  IN_EASE:    'cubic-bezier(0.55, 0, 0.85, 0.3)', // pulls back under, quick
  TUCK_SCALE: 0.94,
} as const

/** Deal delay for card `i` of `count` — nose-first on the way out, tail-first back. */
export function dealDelay(i: number, count: number, out: boolean): number {
  return (out ? i : Math.max(0, count - 1 - i)) * DECK.STAGGER_MS
}

// ── Column geometry ──────────────────────────────────────────────────────────
// 8px + 32px line-height + 8px = 48px, the height every header pill shares
// (NavPill, the ⋮ button, and the square LanguageSwitcher). Two gaps: 16px
// between the bar and what hangs off it, 8px once the column is only there
// because something was opened. Neither is the nav's horizontal gap-3 —
// vertical and horizontal simply differ here.
export const PILL_H     = 48
export const PILL_GAP   = 16
export const TIGHT_GAP  = 8
export const PITCH       = PILL_H + PILL_GAP   // bar ↔ the first card under it
export const TIGHT_PITCH = PILL_H + TIGHT_GAP  // every step inside an open column

// ── Press feedback ───────────────────────────────────────────────────────────
// Every pill in the header grows by the same 2% and presses by the same 2%,
// labelled or square, and takes PRESS_MS to do it. The icon pills used to grow
// 1.1 on the argument that a 48px button with no label has to carry the whole
// gesture itself — but the ⋮ has its own plants now, and they grow like every
// other decoration, so the button no longer has to shout. One number reads as one
// family; the size of the pill is not a reason for it to behave differently.
//
// Spelled out, never `scale-[${ICON_PILL_SCALE}]`: Tailwind scans source text for
// COMPLETE class names, so an assembled one compiles to a rule that is never
// generated and the button silently stops pressing. Guard: verify:header-hover.
export const ICON_PILL_SCALE = 1.02
export const ICON_PILL_HOVER = 'hover:scale-[1.02] active:scale-[0.98]'

/**
 * How long a pill takes to reach that scale. Deliberately unhurried: at 120ms the
 * press read as a snap, and a 2% move that fast is a flicker rather than a gesture.
 * `.pill-decor` (globals.css) is still longer, which is what keeps the plants
 * settling after the button rather than with it — `verify:header-hover` asserts it.
 */
export const PRESS_MS = 240
