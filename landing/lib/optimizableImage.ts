// Mirrors images.remotePatterns in next.config.ts — keep the two lists in sync.
const ALLOWED_HOSTS = [
  'res.cloudinary.com',
  'drive.google.com',
  'lh3.googleusercontent.com',
  'i.ibb.co',
  '*.imgbb.com',
]

// next/image throws at render time for remote hosts missing from remotePatterns.
// Tutor photos are admin-pasted URLs (Notion), so an unknown host must degrade to
// an unoptimized image instead of crashing the page.
export function canOptimizeImage(src: string): boolean {
  if (src.startsWith('/')) return true
  try {
    const host = new URL(src).hostname
    return ALLOWED_HOSTS.some(h =>
      h.startsWith('*.') ? host.endsWith(h.slice(1)) : host === h,
    )
  } catch {
    return false
  }
}
