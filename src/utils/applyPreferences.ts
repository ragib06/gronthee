import type { UserPreferences } from '@/types'

export function applyPreferences(
  metadata: Record<string, string>,
  preferences: UserPreferences
): Record<string, string> {
  const result = { ...metadata }
  const authorCorrections = preferences.corrections['author']
  if (authorCorrections) {
    const current = result['author']
    if (typeof current === 'string' && authorCorrections[current] !== undefined) {
      result['author'] = authorCorrections[current]
    }
  }
  return result
}
