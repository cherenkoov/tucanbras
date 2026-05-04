// Mapping from language code to display name and custom flag asset.
// Used on the landing and (in future) in the main application.
// Bot stores: [{ code: "pt-BR", name: "Português" }, ...]

export interface Language {
  code: string
  name: string
  flagPath: string // path under /public, e.g. "/PNG/flags/brazil.png"
}

export const LANGUAGES: Record<string, Language> = {
  'pt-BR': { code: 'pt-BR', name: 'Português',       flagPath: '/PNG/flags/brazil.png'   },
  'ru':    { code: 'ru',    name: 'Русский',          flagPath: '/PNG/flags/russia.png'   },
  'en':    { code: 'en',    name: 'English',          flagPath: '/PNG/flags/usa.png'      },
  'pt-PT': { code: 'pt-PT', name: 'Português (PT)',   flagPath: '/PNG/flags/portugal.png' },
  'es':    { code: 'es',    name: 'Español',          flagPath: '/PNG/flags/spain.png'    },
}

// Resolve a raw DB language entry to a Language object.
// Supports both new format { code, name } and legacy { flag, name }.
export function resolveLanguage(entry: { code?: string; flag?: string; name?: string }): Language {
  if (entry.code && LANGUAGES[entry.code]) return LANGUAGES[entry.code]
  // Legacy: try to match by name
  const match = Object.values(LANGUAGES).find(l =>
    l.name.toLowerCase() === (entry.name ?? '').toLowerCase()
  )
  return match ?? { code: 'unknown', name: entry.name ?? '', flagPath: '' }
}
