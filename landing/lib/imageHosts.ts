// Single source of truth for allowed remote image hosts.
// next.config.ts derives images.remotePatterns from this list, and
// canOptimizeImage() (lib/optimizableImage.ts) checks against the same list —
// so next/image and the runtime guard can never drift apart.
export const IMAGE_HOSTS = [
  'res.cloudinary.com',
  'drive.google.com',
  'lh3.googleusercontent.com',
  'i.ibb.co',
  '*.imgbb.com',
] as const
