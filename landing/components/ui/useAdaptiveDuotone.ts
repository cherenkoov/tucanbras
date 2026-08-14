'use client'

import { useSyncExternalStore } from 'react'
import { BACKDROP, BACKDROP_BUILTIN, BACKDROP_BUILTIN_BRAND, isWebKit, supportsBackdrop, supportsBuiltinBackdrop } from './useAdaptiveText'

// Shape counterpart of useAdaptiveText: the duotone for a SOLID element (carousel dot,
// rule, marker) instead of glyphs. A transparent box with this chain in backdrop-filter
// paints the live background behind it thresholded onto the ink↔cream axis, and its own
// border-box (radius included) does the clipping — so there is no glyph mask to measure,
// no per-frame work, and none of the iOS image-mask breakage that forces icons onto the
// static path (see useAdaptiveText: `mask` + backdrop-filter renders NOTHING on WebKit).
//
// Unlike text there is no static-fill fallback here: a shape has no background-clip:text
// trick, so the alternatives are the live sample or a flat colour. That is also why
// reduced-motion does NOT drop out — backdrop-filter adds no motion of its own, and with
// the collage frozen the sample is simply a correct static one, whereas the flat fallback
// would keep the dot invisible over a dark scene.

// Engine capability + debug levers never change within a page load, so probe once and
// hand the same string to every consumer (getSnapshot must be referentially stable).
let cached: string | null | undefined

function probe(): string | null {
  if (cached !== undefined) return cached
  // Same debug levers as the text path: ?noadaptive kills the machinery, ?staticfill
  // pins the flat fallback (here that is all "static" can mean) for an A/B.
  const params = new URLSearchParams(location.search)
  if (params.has('noadaptive') || params.has('staticfill')) {
    cached = null
  } else if (isWebKit() || params.has('duowk')) {
    // WebKit parses then DROPS url(#) reference filters inside backdrop-filter, so it gets
    // the built-in-function chain — which now carries the full brand palette via a clamp
    // barrier (see BACKDROP_BUILTIN_BRAND). dimDuotone still appends opacity() cleanly: it
    // fades the finished image, it does not re-enter the chain. Levers move the dots WITH
    // the headings; a lever the shapes ignored would quietly compare two different builds.
    // Keyed on the ENGINE, not on `(hover: none)` as before: that proxy denied non-WebKit
    // phones the exact palette they render fine, and left desktop Safari on a chain it
    // paints as NOTHING — for a shape, whose only paint IS the filtered backdrop, that
    // means an invisible dot.
    const chain = params.has('duomono') ? BACKDROP_BUILTIN : BACKDROP_BUILTIN_BRAND
    cached = supportsBuiltinBackdrop() ? chain : null
  } else {
    // Everything else (incl. Chromium/Gecko phones): the exact palette reference filter,
    // when the engine parses it at all — otherwise nothing, and the caller's fallback
    // colour stands.
    cached = supportsBackdrop() ? BACKDROP : null
  }
  return cached
}

// Nothing to subscribe to: the value is fixed for the page. SSR/hydration get null (the
// flat fallback), the first client snapshot upgrades it.
const subscribe = () => () => {}
const serverSnapshot = () => null

// Returns the chain to put in backdrop-filter, or null when no technique is available —
// then the caller keeps its solid fallback colour.
export function useAdaptiveDuotone(): string | null {
  return useSyncExternalStore(subscribe, probe, serverSnapshot)
}

// Dim a duotone shape WITHOUT element opacity: `opacity()` inside the chain fades the
// filtered backdrop image against the real backdrop, so the box stays fully composited.
// Element `opacity` is not an option — on the element it regroups it and leaks past the
// clip (see the frost layer in PlanSectionShared), and on an ANCESTOR it would create a
// backdrop root, isolating the sample from the page and painting nothing at all.
export function dimDuotone(chain: string, alpha: number): string {
  return alpha >= 1 ? chain : `${chain} opacity(${alpha})`
}
