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
  patched = patched.replace(/<rect[^>]*width="800"[^>]*height="\d+"[^>]*fill="[^"]*"[^>]*\/>/g, '')

  // 0c. Remove clip-path that restricts content to 800px wide
  patched = patched.replace(' clip-path="url(#clip0_0_1)"', '')

  // 0d. Hide debug trace groups + original train (overlay takes over)
  patched = patched.replace('id="cabine trace"', 'id="cabine trace" visibility="hidden"')
  patched = patched.replace('id="train trace"', 'id="train trace" visibility="hidden"')
  patched = patched.replace('id="train"', 'id="train" visibility="hidden"')

  // 1. Inject animation paths into SVG body (NOT <defs>).
  // Elements inside <defs> are never rendered, so getScreenCTM() returns null on them.
  // GSAP MotionPathPlugin uses getScreenCTM() for the `align` option — with null it falls
  // back to an identity matrix, mapping path coordinates to screen pixels instead of SVG
  // units, and the animated element flies to the wrong position.
  // visibility="hidden" keeps them invisible while still participating in layout.
  // ONE template literal on purpose — NOT a `tpl` + `tpl` chain. Turbopack's prod
  // minifier (Next 16.2.10) mis-folds fully-constant template-literal concatenations:
  // each non-final operand loses its static tail after the last ${}, which corrupted
  // exactly this markup (rail-path's d= swallowed both cabine <path> elements).
  // The newlines are harmless whitespace between SVG elements.
  const animPaths = `
    <path id="rail-path" d="${TRAIN_PATH_D}" fill="none" visibility="hidden"/>
    <path id="cabine-anim-path" d="${CABINE_PATH_FWD}" fill="none" visibility="hidden"/>
    <path id="cabine-anim-path-rev" d="${CABINE_PATH_REV}" fill="none" visibility="hidden"/>`

  patched = patched.replace('</svg>', animPaths + '</svg>')

  // 2. (bush 01 already exists natively in the SVG — no rename needed)
  // 3. Cloud reveal is set up separately by injectCloudAnimation() on the
  //    extracted clouds layer — clouds no longer live in this SVG.

  return patched
}

// CSS + initial classes that drive the cloud slide-in reveal. Lives in whatever
// SVG holds the cloud groups; useCloudAnimation toggles `.cloud-visible` to play it.
const CLOUD_CSS =
  '.cloud-anim-left{opacity:0;transform:translateX(-160px)}' +
  '.cloud-anim-right{opacity:0;transform:translateX(160px)}' +
  '.cloud-anim-left.cloud-visible,.cloud-anim-right.cloud-visible{opacity:1;transform:translateX(0)}'

const CLOUD_INIT_CLASS: Record<string, string> = {
  'Cloud 06': 'cloud-anim-left',
  'Cloud 07': 'cloud-anim-left',
  'Cloud 05': 'cloud-anim-left',
  'Cloud 08': 'cloud-anim-left',
  'Cloud 03': 'cloud-anim-right',
  'Cloud 02': 'cloud-anim-right',
  'Cloud 01': 'cloud-anim-right',
}

// Inject the cloud-reveal <style> + initial slide-in classes into the clouds-only
// SVG produced by wrapSvg(). No "move to end" needed — the layer is clouds only.
export function injectCloudAnimation(svgString: string): string {
  let out = svgString.replace(/(<svg[^>]*>)/, `$1<style>${CLOUD_CSS}</style>`)
  out = out.replace(/<g id="(Cloud[^"]*)"/g, (_m, id: string) => {
    const initClass = CLOUD_INIT_CLASS[id] ?? 'cloud-anim-left'
    return `<g id="${id}" class="${initClass}"`
  })
  return out
}
