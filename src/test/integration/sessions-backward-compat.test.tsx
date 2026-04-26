import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useSessions } from '@/hooks/useSessions'

vi.mock('@/lib/supabase', () => ({
  supabase: { from: vi.fn() },
}))

const SESSIONS_KEY = 'gronthee:sessions'
const CURRENT_KEY = 'gronthee:currentSessionId'

beforeEach(() => {
  localStorage.clear()
})

describe('Backward compatibility — sessions seeded from scratch', () => {
  it('Default session created on first load', () => {
    const { result } = renderHook(() => useSessions())
    expect(result.current.sessions).toHaveLength(1)
    expect(result.current.sessions[0].name).toBe('Default')
  })

  it('currentSessionId persisted to localStorage', () => {
    renderHook(() => useSessions())
    expect(localStorage.getItem(CURRENT_KEY)).toBe('default')
  })
})

describe('Session persistence across remount', () => {
  it('active session is restored after unmount and remount', () => {
    const stored = [
      { id: 'default', name: 'Default', createdAt: '' },
      { id: 'sci-fi', name: 'Sci-Fi', createdAt: '' },
    ]
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(stored))
    localStorage.setItem(CURRENT_KEY, 'sci-fi')

    const { result } = renderHook(() => useSessions())
    expect(result.current.currentSession.id).toBe('sci-fi')
  })
})
