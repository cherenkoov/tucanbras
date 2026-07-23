/**
 * Normalize an image URL pasted into Notion into something an <img> / next/image
 * can actually render.
 *
 * Admins paste Google Drive *share* links (e.g. `…/file/d/<id>/view?usp=…`), which
 * point at the Drive viewer page — not the image — so the browser can't load them
 * (`naturalWidth: 0`). We rewrite any Drive link to the googleusercontent CDN
 * (`lh3.googleusercontent.com/d/<id>`), which serves the raw bytes and allows
 * hotlinking for files shared as "anyone with the link". A `=w<width>` suffix asks
 * the CDN for a sensibly-sized variant.
 *
 * Non-Drive URLs (and local `/PNG/...` paths from the stubs) pass through untouched.
 */

// Matches the file id in the shapes Drive/Notion produce:
//   /file/d/<id>/view   ?id=<id>   &id=<id>   /d/<id>  (already-CDN form)
const DRIVE_ID = /(?:\/file\/d\/|[?&]id=|\/d\/)([a-zA-Z0-9_-]{20,})/

export function normalizeImageUrl(
  url: string | null | undefined,
  width = 1000,
): string | null {
  if (!url) return null
  const trimmed = url.trim()
  if (!trimmed) return null

  // Only touch Google-hosted links; leave everything else (local paths, other CDNs) alone.
  if (!/(?:drive|docs)\.google\.com|lh3\.googleusercontent\.com/.test(trimmed)) {
    return trimmed
  }

  const match = trimmed.match(DRIVE_ID)
  if (!match) return trimmed

  return `https://lh3.googleusercontent.com/d/${match[1]}=w${width}`
}
