// Pure function — patches SVG string before dangerouslySetInnerHTML injection.
// No DOM access, safe to call on any thread.

const RAIL_PATH_D =
  'M107.705 1.91113C96.8715 5.24447 76.9048 15.6111 83.7048 30.4111' +
  'C92.2048 48.9111 133.205 74.9111 159.705 83.9111' +
  'C186.205 92.9111 270.705 126.911 288.705 145.911' +
  'C299.579 157.389 309.705 179.411 288.705 208.411' +
  'C271.905 231.611 186.705 299.078 146.205 329.911L1.20508 439.411'

// Transform maps road trace (303×441 space) into background SVG (800×2430 space).
// translate(290, 1044): positions path start near Train group origin (~390, 1044).
// scale(0.47, 0.25): compresses path to fit train road section.
// Adjust these values visually in Task 5 step "Visual calibration".
const RAIL_TRANSFORM = 'translate(290, 1044) scale(0.47, 0.25)'

export function injectRailPath(svgString: string): string {
  // 0a. Make SVG stretch to full container width (keep viewBox for scaling)
  let patched = svgString.replace(
    /(<svg[^>]*)\swidth="800"([^>]*>)/,
    '$1 width="100%"$2'
  )

  // 0b. Remove the dark background rect (#1E1E1E) — let page background show through
  patched = patched.replace('<rect width="800" height="2430" fill="#1E1E1E"/>', '')

  // 1. Inject #rail-path into <defs> (creates <defs> if missing)
  const railPathEl =
    `<path id="rail-path" d="${RAIL_PATH_D}" transform="${RAIL_TRANSFORM}" fill="none" visibility="hidden"/>`

  if (patched.includes('<defs>')) {
    patched = patched.replace('<defs>', `<defs>${railPathEl}`)
  } else {
    patched = patched.replace(/(<svg[^>]*>)/, `$1<defs>${railPathEl}</defs>`)
  }

  // 2. Rename inner cable wire path to stable ID for useCarAnimation
  patched = patched.replace('id="Road_3"', 'id="cable-path"')

  return patched
}
