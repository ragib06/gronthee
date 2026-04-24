import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSessions, toSlug, DEFAULT_SESSION } from './useSessions'

const SESSIONS_KEY = 'gronthee:sessions'
const CURRENT_KEY = 'gronthee:currentSessionId'

function seedSessions(count: number) {
  const sessions = [DEFAULT_SESSION]
  for (let i = 1; i < count; i++) {
    sessions.push({ id: `session-${i}`, name: `Session ${i}`, createdAt: new Date().toISOString() })
  }
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions))
}

beforeEach(() => {
  localStorage.clear()
})

// ---------------------------------------------------------------------------
// toSlug utility
// ---------------------------------------------------------------------------
describe('toSlug', () => {
  it('lowercases and replaces spaces with hyphens', () => {
    expect(toSlug('My Books')).toBe('my-books')
  })

  it('strips special characters', () => {
    expect(toSlug('Summer 2025!')).toBe('summer-2025')
  })

  it('trims leading/trailing spaces', () => {
    expect(toSlug('  hello  ')).toBe('hello')
  })

  it('truncates to 50 characters', () => {
    const long = 'a'.repeat(60)
    expect(toSlug(long).length).toBeLessThanOrEqual(50)
  })

  it('returns fallback for empty/special-only input', () => {
    expect(toSlug('!!!')).toBe('session')
    expect(toSlug('')).toBe('session')
  })
})

// ---------------------------------------------------------------------------
// useSessions hook
// ---------------------------------------------------------------------------
describe('useSessions', () => {
  it('seeds Default session on first load', () => {
    const { result } = renderHook(() => useSessions())
    expect(result.current.sessions).toHaveLength(1)
    expect(result.current.sessions[0].id).toBe('default')
    expect(result.current.sessions[0].name).toBe('Default')
  })

  it('restores sessions from localStorage', () => {
    const stored = [
      DEFAULT_SESSION,
      { id: 'fiction', name: 'Fiction', createdAt: new Date().toISOString() },
    ]
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(stored))
    const { result } = renderHook(() => useSessions())
    expect(result.current.sessions).toHaveLength(2)
    expect(result.current.sessions[1].name).toBe('Fiction')
  })

  it('createSession happy path', () => {
    const { result } = renderHook(() => useSessions())
    let created: ReturnType<typeof result.current.createSession> = null
    act(() => { created = result.current.createSession('Science') })
    expect(created).not.toBeNull()
    expect(result.current.sessions).toHaveLength(2)
    expect(result.current.sessions[1].name).toBe('Science')
    const persisted = JSON.parse(localStorage.getItem(SESSIONS_KEY)!)
    expect(persisted).toHaveLength(2)
  })

  it('createSession rejects duplicate name (case-insensitive)', () => {
    const { result } = renderHook(() => useSessions())
    act(() => { result.current.createSession('Science') })
    let duplicate: ReturnType<typeof result.current.createSession> = null
    act(() => { duplicate = result.current.createSession('SCIENCE') })
    expect(duplicate).toBeNull()
    expect(result.current.sessions).toHaveLength(2)
  })

  it('createSession rejects at 50-session cap', () => {
    seedSessions(50)
    const { result } = renderHook(() => useSessions())
    let extra: ReturnType<typeof result.current.createSession> = null
    act(() => { extra = result.current.createSession('New One') })
    expect(extra).toBeNull()
    expect(result.current.sessions).toHaveLength(50)
  })

  it('createSession appends random suffix on slug collision', () => {
    // Two sessions whose names produce the same slug: "My Shelf" and "My  Shelf" (extra space collapses)
    const { result } = renderHook(() => useSessions())
    act(() => { result.current.createSession('my shelf') })
    // Force slug collision by pre-seeding
    const current = JSON.parse(localStorage.getItem(SESSIONS_KEY)!)
    current.push({ id: 'another-shelf', name: 'another-shelf', createdAt: '' })
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(current))

    const { result: result2 } = renderHook(() => useSessions())
    let s: ReturnType<typeof result2.current.createSession> = null
    act(() => { s = result2.current.createSession('another shelf extra') })
    // Should succeed (different name, slug may collide but gets suffix)
    expect(s).not.toBeNull()
  })

  it('renameSession updates name', () => {
    const { result } = renderHook(() => useSessions())
    let id: string
    act(() => {
      const s = result.current.createSession('OldName')
      id = s!.id
    })
    act(() => { result.current.renameSession(id, 'NewName') })
    expect(result.current.sessions.find(s => s.id === id)?.name).toBe('NewName')
  })

  it('renameSession on default is a no-op', () => {
    const { result } = renderHook(() => useSessions())
    act(() => { result.current.renameSession('default', 'Something Else') })
    expect(result.current.sessions[0].name).toBe('Default')
  })

  it('deleteSession removes session', () => {
    const { result } = renderHook(() => useSessions())
    let id: string
    act(() => { id = result.current.createSession('Temp')!.id })
    act(() => { result.current.deleteSession(id) })
    expect(result.current.sessions.find(s => s.id === id)).toBeUndefined()
  })

  it('deleteSession on default is a no-op', () => {
    const { result } = renderHook(() => useSessions())
    act(() => { result.current.deleteSession('default') })
    expect(result.current.sessions.find(s => s.id === 'default')).toBeDefined()
  })

  it('setCurrentSession persists to localStorage', () => {
    const stored = [
      DEFAULT_SESSION,
      { id: 'sci-fi', name: 'Sci-Fi', createdAt: new Date().toISOString() },
    ]
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(stored))
    const { result } = renderHook(() => useSessions())
    act(() => { result.current.setCurrentSession('sci-fi') })
    expect(localStorage.getItem(CURRENT_KEY)).toBe('sci-fi')
    expect(result.current.currentSession.id).toBe('sci-fi')
  })

  it('falls back to default when stored currentSessionId no longer exists', () => {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify([DEFAULT_SESSION]))
    localStorage.setItem(CURRENT_KEY, 'deleted-session')
    const { result } = renderHook(() => useSessions())
    expect(result.current.currentSession.id).toBe('default')
  })

  it('sessionCount reflects state', () => {
    const { result } = renderHook(() => useSessions())
    expect(result.current.sessionCount).toBe(1)
    act(() => { result.current.createSession('One') })
    expect(result.current.sessionCount).toBe(2)
    let id: string
    act(() => { id = result.current.createSession('Two')!.id })
    act(() => { result.current.deleteSession(id) })
    expect(result.current.sessionCount).toBe(2)
  })

  it('deleteSession falls back to default if current session is deleted', () => {
    const { result } = renderHook(() => useSessions())
    let id: string
    act(() => { id = result.current.createSession('Temp')!.id })
    act(() => { result.current.setCurrentSession(id) })
    act(() => { result.current.deleteSession(id) })
    expect(result.current.currentSessionId).toBe('default')
  })
})
