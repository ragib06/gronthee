import type { UserPreferences } from '@/types'

const STORAGE_KEY = 'gronthee:preferences'

export function loadPreferences(): UserPreferences {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{"corrections":{}}') as UserPreferences
  } catch {
    return { corrections: {} }
  }
}

export function applyPreferences(
  metadata: Record<string, string>,
  preferences: UserPreferences
): Record<string, string> {
  const result = { ...metadata }
  for (const [fieldName, corrections] of Object.entries(preferences.corrections)) {
    const current = result[fieldName]
    if (typeof current === 'string' && corrections[current] !== undefined) {
      result[fieldName] = corrections[current]
    }
  }
  return result
}
