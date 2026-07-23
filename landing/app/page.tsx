// Root "/" is caught by proxy.ts → redirects to a locale picked from
// Accept-Language (ru → /ru, pt → /pt, otherwise /en).
// This file exists only as a fallback; proxy.ts handles the actual redirect.
export default function RootPage() {
  return null
}
