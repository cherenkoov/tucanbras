// New "Ocean Waves" type-1 wave silhouettes — standalone Figma exports in
// public/SVG/background/Ocean Waves/*.svg (one file per wave). Each has its OWN viewBox
// (e.g. 2371×760), a #1E1E1E frame backdrop, and one <g id="type 1 wave 0X"> of numbered
// line <path>s. They REPLACE the old sea waves baked into main 2.svg.
//
// Because every file has its own coordinate space, beachWaves places each wave via a nested
// <svg viewBox> mapped onto a target rect in the beach canvas — so we only need each shape's
// intrinsic size (w, h) + its inner <g> markup here.

export const OCEAN_WAVE_IDS = [
  'type 1 wave 01', 'type 1 wave 02', 'type 1 wave 03',
  'type 1 wave 04', 'type 1 wave 05', 'type 1 wave 06',
] as const

export interface OceanWaveShape {
  w: number      // intrinsic viewBox width
  h: number      // intrinsic viewBox height
  inner: string  // the <g id="b2-type 1 wave 0X">…</g> markup (backdrop stripped, ids b2-prefixed)
}

// Parse one standalone wave SVG string into an OceanWaveShape.
export function parseOceanWaveSvg(raw: string): OceanWaveShape {
  const vb = raw.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/)
  const w = vb ? parseFloat(vb[1]) : 1027
  const h = vb ? parseFloat(vb[2]) : 500
  // Drop the Figma frame backdrop (opaque; would hide everything behind the wave).
  let s = raw.replace(/<rect\b[^>]*fill="#1E1E1E"[^>]*\/>/g, '')
  // Keep only the wave group.
  const gStart = s.indexOf('<g ')
  const gEnd = s.lastIndexOf('</g>')
  s = gStart !== -1 && gEnd !== -1 ? s.slice(gStart, gEnd + 4) : ''
  // Namespace ids with b2- so the per-line dissolve (which matches id="b2-…") works, and so
  // clones stay unique once beachWaves suffixes them.
  s = s.replace(/id="([^"]+)"/g, 'id="b2-$1"')
  return { w, h, inner: s }
}

const BASE = '/SVG/background/Ocean Waves'

// Fetch + parse all six wave files. Called once by the client (BackgroundCanvas / wave-lab),
// then handed to injectWaveSurfAnimation.
export async function loadOceanWaveShapes(): Promise<Record<string, OceanWaveShape>> {
  const entries = await Promise.all(
    OCEAN_WAVE_IDS.map(async id => {
      const res = await fetch(encodeURI(`${BASE}/${id}.svg`))
      const raw = await res.text()
      return [id, parseOceanWaveSvg(raw)] as const
    }),
  )
  return Object.fromEntries(entries)
}
