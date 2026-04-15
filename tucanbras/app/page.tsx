// Root "/" is caught by middleware (middleware.ts) → redirects to /ru
// This file exists only as a fallback; middleware handles the actual redirect.
export default function RootPage() {
  return null
}
