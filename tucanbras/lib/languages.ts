// Mapping from language code to display name and custom flag asset.
// Used on the landing and (in future) in the main application.
// Bot stores: [{ code: "pt-BR", name: "Português" }, ...]

export interface Language {
  code: string
  name: string
  flagPath: string // path under /public, e.g. "/flags/pt-br.svg"
}

export const LANGUAGES: Record<string, Language> = {
  'pt-BR': { code: 'pt-BR', name: 'Português',  flagPath: '/flags/pt-br.svg' },
  'ru':    { code: 'ru',    name: 'Русский',     flagPath: '/flags/ru.svg'    },
  'en':    { code: 'en',    name: 'English',     flagPath: '/flags/en.svg'    },
  'pt-PT': { code: 'pt-PT', name: 'Português (PT)', flagPath: '/flags/pt-pt.svg' },
  'es':    { code: 'es',    name: 'Español',     flagPath: '/flags/es.svg'    },
}

// Resolve a raw DB language entry to a Language object.
// Supports both new format { code, name } and legacy { flag, name }.
export function resolveLanguage(entry: { code?: string; flag?: string; name?: string }): Language {
  if (entry.code && LANGUAGES[entry.code]) return LANGUAGES[entry.code]
  // Legacy: try to match by name
  const match = Object.values(LANGUAGES).find(l =>
    l.name.toLowerCase() === (entry.name ?? '').toLowerCase()
  )
  return match ?? { code: 'unknown', name: entry.name ?? '', flagPath: '/flags/unknown.svg' }
}
