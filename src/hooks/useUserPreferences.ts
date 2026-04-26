import { useState, useEffect } from 'react'
import type { UserPreferences, BookMetadata } from '@/types'
import { supabase } from '@/lib/supabase'
import { toPrefsRow, fromPrefsRow } from '@/lib/db-mappers'

const EMPTY_PREFS: UserPreferences = { corrections: {} }

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

export function useUserPreferences(userId: string | null) {
  const [preferences, setPreferences] = useState<UserPreferences>(EMPTY_PREFS)

  useEffect(() => {
    if (!userId) { setPreferences(EMPTY_PREFS); return }
    supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setPreferences(fromPrefsRow(data))
      })
  }, [userId])

  function recordCorrections(
    original: Partial<BookMetadata>,
    saved: Omit<BookMetadata, 'id' | 'sessionId'>
  ) {
    if (!userId) return
    const orig = (original as Record<string, unknown>)['author'] as string ?? ''
    const corr = (saved as Record<string, unknown>)['author'] as string ?? ''

    if (!orig || !corr || orig === corr) return

    const distance = levenshtein(orig, corr)
    if (distance / orig.length > 0.3) return

    const updated: UserPreferences = {
      corrections: {
        ...preferences.corrections,
        author: { ...preferences.corrections['author'], [orig]: corr },
      },
    }
    setPreferences(updated)
    supabase
      .from('user_preferences')
      .upsert(toPrefsRow(updated, userId))
      .then(() => {})
  }

  return { preferences, recordCorrections }
}
