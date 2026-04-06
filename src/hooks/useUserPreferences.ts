import type { UserPreferences, BookMetadata } from '@/types'

const STORAGE_KEY = 'gronthee:preferences'

function load(): UserPreferences {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{"corrections":{}}') as UserPreferences
  } catch {
    return { corrections: {} }
  }
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  )
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    }
  }
  return dp[m][n]
}

export function useUserPreferences() {
  function recordCorrections(
    original: Partial<BookMetadata>,
    saved: Omit<BookMetadata, 'id'>
  ) {
    const orig = (original as Record<string, string>)['author'] ?? ''
    const corr = (saved as Record<string, string>)['author'] ?? ''

    if (!orig || !corr || orig === corr) return

    const distance = levenshtein(orig, corr)
    if (distance / orig.length > 0.3) return

    const prefs = load()
    const updated: UserPreferences = {
      corrections: {
        ...prefs.corrections,
        author: { ...prefs.corrections['author'], [orig]: corr },
      },
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  }

  return { recordCorrections }
}
