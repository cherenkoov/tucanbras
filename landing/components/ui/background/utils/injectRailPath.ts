// Pure function — patches SVG string before dangerouslySetInnerHTML injection.
// No DOM access, safe to call on any thread.

// Train path: derived from "train trace" group in SVG (SVG coordinate space, no transform needed).
// Direction: upper-right (mountain top) → lower-left (forest). start_2 reversed + middle_2 + end_2.
const TRAIN_PATH_D =
  'M599 569.5 C508.409 575.972 466.872 580.723 373 605 ' +
  'C361.167 608.833 331.7 621.7 338.5 636.5 ' +
  'C347 655 388 681 414.5 690 ' +
  'C441 699 525.5 733 543.5 752 ' +
  'C554.374 763.478 564.5 785.5 543.5 814.5 ' +
  'C526.7 837.7 441.5 905.167 401 936 ' +
  'L256 1045.5 L63 1176.5'

// Cabine forward path: upper-right (441,480) → lower-left (-54,787).
// start reversed + middle + end from "cabine trace" group.
const CABINE_PATH_FWD =
  'M441 480 L398 515.5 C275.822 617.351 183.197 678.169 -1 769 L-54 787'

// Cabine reverse path: lower-left → upper-right (for the second cabin going opposite direction).
// Cubic control points swapped to reverse the curve.
const CABINE_PATH_REV =
  'M-54 787 L-1 769 C183.197 678.169 275.822 617.351 398 515.5 L441 480'

export function injectRailPath(svgString: string): string {
  // 0a. Make SVG stretch to full container width and trim empty space top/bottom.
  // Content lives between y≈181 and y≈2042 (out of 2430). viewBox is cropped to
  // y=165–2060 (±15px buffer). Height becomes 1895 instead of 2430.
  // height="2430" is removed so the browser auto-derives height from the viewBox
  // aspect ratio — keeping content proportional at any viewport width.
  let patched = svgString
    .replace(/(<svg[^>]*)\swidth="\d+"([^>]*>)/, '$1 width="100%"$2')
    .replace(/(<svg[^>]*)\sheight="\d+"([^>]*>)/, '$1$2')
    .replace(/(<svg[^>]*)\sviewBox="0 0 800 \d+"([^>]*>)/, '$1 viewBox="0 0 800 2047"$2')
    .replace(/(<svg[^>]*)(\sfill="none")/, '$1 overflow="visible"$2')

  // 0b. Remove all solid full-bleed background rects — let page background show through
  patched = patched.replace(/<rect width="800" height="\d+" fill="[^"]*"\/>/g, '')
  patched = patched.replace(/<rect width="800" height="\d+" fill="[^"]*" fill-opacity="[^"]*"\/>/g, '')

  // 0c. Remove clip-path that restricts content to 800px wide
  patched = patched.replace(' clip-path="url(#clip0_0_1)"', '')

  // 0d. Hide debug trace groups — visible only in Figma/design, not in production
  patched = patched.replace('id="cabine trace"', 'id="cabine trace" visibility="hidden"')
  patched = patched.replace('id="train trace"', 'id="train trace" visibility="hidden"')

  // 1. Inject animation paths into <defs>
  const defsContent =
    `<path id="rail-path" d="${TRAIN_PATH_D}" fill="none" visibility="hidden"/>` +
    `<path id="cabine-anim-path" d="${CABINE_PATH_FWD}" fill="none" visibility="hidden"/>` +
    `<path id="cabine-anim-path-rev" d="${CABINE_PATH_REV}" fill="none" visibility="hidden"/>`

  if (patched.includes('<defs>')) {
    patched = patched.replace('<defs>', `<defs>${defsContent}`)
  } else {
    patched = patched.replace(/(<svg[^>]*>)/, `$1<defs>${defsContent}</defs>`)
  }

  // 2. Rename Group 8 → bush 01
  patched = patched.replace('id="Group 8"', 'id="bush 01"')

  // 3. Inject cloud animation CSS into SVG <defs> + move clouds to end
  const cloudCSS = `
.cloud-anim-left{opacity:0;transform:translateX(-160px)}
.cloud-anim-right{opacity:0;transform:translateX(160px)}
.cloud-anim-left.cloud-visible,.cloud-anim-right.cloud-visible{opacity:1;transform:translateX(0)}
`
  const styleEl = `<style>${cloudCSS}</style>`
  patched = patched.replace('<defs>', `<defs>${styleEl}`)

  const CLOUD_INIT_CLASS: Record<string, string> = {
    'Cloud 06':   'cloud-anim-left',
    'Cloud 07':   'cloud-anim-left',
    'Cloud 05':   'cloud-anim-left',
    'Cloud 01_2': 'cloud-anim-left',
    'Cloud 03':   'cloud-anim-right',
    'Cloud 02':   'cloud-anim-right',
    'Cloud 01':   'cloud-anim-right',
  }

  const cloudGroups: string[] = []
  patched = patched.replace(/<g id="Cloud[^"]*">[\s\S]*?<\/g>/g, (match) => {
    const idMatch = match.match(/id="(Cloud[^"]*)"/)
    if (idMatch) {
      const id = idMatch[1]
      const initClass = CLOUD_INIT_CLASS[id] ?? 'cloud-anim-left'
      cloudGroups.push(match.replace(`id="${id}"`, `id="${id}" class="${initClass}"`))
    } else {
      cloudGroups.push(match)
    }
    return ''
  })
  patched = patched.replace('</svg>', cloudGroups.join('') + '</svg>')

  return patched
}
