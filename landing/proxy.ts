import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const LOCALES = ['ru', 'en', 'pt']
const DEFAULT_LOCALE = 'en'

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  const hasLocale = LOCALES.some(
    l => pathname === `/${l}` || pathname.startsWith(`/${l}/`),
  )
  if (hasLocale) return

  const url = request.nextUrl.clone()
  url.pathname = `/${DEFAULT_LOCALE}${pathname}`
  return NextResponse.redirect(url)
}

export const config = {
  matcher: ['/((?!_next|favicon.ico|api|.*\\..*).*)'],
}
