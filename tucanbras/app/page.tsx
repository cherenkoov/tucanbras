import { redirect } from 'next/navigation'

// Root "/" is handled by middleware → redirects to /ru
// This component is a fallback (e.g. during static export)
export default function RootPage() {
  redirect('/ru')
}
