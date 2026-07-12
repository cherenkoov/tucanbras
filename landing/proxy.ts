import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const LOCALES = ['ru', 'en', 'pt']
const DEFAULT_LOCALE = 'en'

// Pick the site locale from the Accept-Language header: the first language the
// browser lists (highest q first) whose primary subtag we support wins.
// ru → /ru, pt (incl. pt-BR) → /pt, anything else → /en.
function detectLocale(header: string | null): string {
  if (!header) return DEFAULT_LOCALE
  const ranked = header
    .split(',')
    .map(part => {
      const [tag, ...params] = part.trim().split(';')
      const qParam = params.find(p => p.trim().startsWith('q='))
      const q = qParam ? parseFloat(qParam.split('=')[1]) : 1
      return { lang: tag.trim().toLowerCase().split('-')[0], q: Number.isNaN(q) ? 0 : q }
    })
    .sort((a, b) => b.q - a.q)
  const match = ranked.find(r => LOCALES.includes(r.lang))
  return match ? match.lang : DEFAULT_LOCALE
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  const hasLocale = LOCALES.some(
    l => pathname === `/${l}` || pathname.startsWith(`/${l}/`),
  )
  if (hasLocale) return

  const url = request.nextUrl.clone()
  const locale = detectLocale(request.headers.get('accept-language'))
  url.pathname = `/${locale}${pathname}`
  const response = NextResponse.redirect(url)
  // The redirect target depends on the request's Accept-Language — any shared
  // cache must key on it, or one visitor's locale gets replayed to others.
  response.headers.set('Vary', 'Accept-Language')
  return response
}

export const config = {
  matcher: ['/((?!_next|favicon.ico|api|.*\\..*).*)'],
}
