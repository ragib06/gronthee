import type { UserPreferences, BookMetadata } from '@/types'

const STORAGE_KEY = 'gronthee:preferences'

function load(): UserPreferences {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{"corrections":{}}') as UserPreferences
  } catch {
    return { corrections: {} }
  }
}

export function useUserPreferences() {
  function recordCorrections(
    original: Partial<BookMetadata>,
    saved: Omit<BookMetadata, 'id'>
  ) {
    const prefs = load()
    const updated: UserPreferences = {
      corrections: { ...prefs.corrections },
    }
    let changed = false

    const fields = (Object.keys(saved) as (keyof typeof saved)[]).filter(
      k => k !== 'scanDate'
    )

    for (const field of fields) {
      const orig = (original as Record<string, string>)[field] ?? ''
      const corr = (saved as Record<string, string>)[field] ?? ''
      if (orig && corr && orig !== corr) {
        updated.corrections[field] = {
          ...updated.corrections[field],
          [orig]: corr,
        }
        changed = true
      }
    }

    if (changed) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    }
  }

  return { recordCorrections }
}
