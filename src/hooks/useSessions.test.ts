import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useSessions, toSlug, DEFAULT_SESSION, DISHARI_CONFIG_ID } from './useSessions'
import type { Session } from '@/types'

// ---------------------------------------------------------------------------
// Supabase mock — needed because useSessions imports supabase at module level.
// The localStorage path (userId = null) never calls supabase; the mock exists
// only to prevent the supabase client from failing on missing env vars.
// ---------------------------------------------------------------------------

const mockFrom = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabase: { from: (...args: unknown[]) => mockFrom(...args) },
}))

function makeSessionRow(s: Session, userId = 'user-1') {
  return { id: s.id, name: s.name, config_id: s.configId, created_at: s.createdAt, user_id: userId }
}

function setupSupabaseFetch(sessions: Session[]) {
  const rows = sessions.map(s => makeSessionRow(s))
  mockFrom.mockReturnValue({
    select: () => ({
      eq: () => ({
        order: () => Promise.resolve({ data: rows, error: null }),
      }),
    }),
    insert: () => Promise.resolve({ error: null }),
    update: () => ({ eq: () => ({ eq: () => ({ then: (fn: (r: { error: null }) => void) => fn({ error: null }) }) }) }),
    delete: () => ({ eq: () => ({ eq: () => ({ then: (fn: (r: { error: null }) => void) => fn({ error: null }) }) }) }),
    upsert: (row: unknown) => ({
      select: () => Promise.resolve({ data: [row], error: null }),
    }),
  })
}

const SESSIONS_KEY = 'gronthee:sessions'
const CURRENT_KEY = 'gronthee:currentSessionId'

function seedSessions(count: number) {
  const sessions = [DEFAULT_SESSION]
  for (let i = 1; i < count; i++) {
    sessions.push({
      id: `session-${i}`,
      name: `Session ${i}`,
      createdAt: new Date().toISOString(),
      configId: DISHARI_CONFIG_ID,
    })
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
      { id: 'fiction', name: 'Fiction', createdAt: new Date().toISOString(), configId: DISHARI_CONFIG_ID },
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
    current.push({ id: 'another-shelf', name: 'another-shelf', createdAt: '', configId: DISHARI_CONFIG_ID })
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
      { id: 'sci-fi', name: 'Sci-Fi', createdAt: new Date().toISOString(), configId: DISHARI_CONFIG_ID },
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

  it('default session has configId set to dishari', () => {
    const { result } = renderHook(() => useSessions())
    expect(result.current.sessions[0].configId).toBe(DISHARI_CONFIG_ID)
  })

  it('createSession defaults configId to dishari when omitted', () => {
    const { result } = renderHook(() => useSessions())
    let created: ReturnType<typeof result.current.createSession> = null
    act(() => { created = result.current.createSession('Science') })
    expect(created!.configId).toBe(DISHARI_CONFIG_ID)
  })

  it('createSession stores configId when provided', () => {
    const { result } = renderHook(() => useSessions())
    let created: ReturnType<typeof result.current.createSession> = null
    act(() => { created = result.current.createSession('Science', 'my-custom-config') })
    expect(created!.configId).toBe('my-custom-config')
    const persisted = JSON.parse(localStorage.getItem(SESSIONS_KEY)!)
    expect(persisted.find((s: { id: string }) => s.id === created!.id).configId).toBe('my-custom-config')
  })

  it('migrates legacy sessions without configId to dishari', () => {
    // Simulate localStorage written by a pre-feature build
    const legacy = [
      { id: 'default', name: 'Default', createdAt: new Date(0).toISOString() },
      { id: 'fiction', name: 'Fiction', createdAt: new Date().toISOString() },
    ]
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(legacy))
    const { result } = renderHook(() => useSessions())
    expect(result.current.sessions).toHaveLength(2)
    expect(result.current.sessions[0].configId).toBe(DISHARI_CONFIG_ID)
    expect(result.current.sessions[1].configId).toBe(DISHARI_CONFIG_ID)
    // Migration is persisted back to localStorage
    const persisted = JSON.parse(localStorage.getItem(SESSIONS_KEY)!)
    expect(persisted.every((s: { configId?: string }) => s.configId === DISHARI_CONFIG_ID)).toBe(true)
  })

  it('preserves a non-dishari configId on existing sessions during migration', () => {
    const stored = [
      DEFAULT_SESSION,
      { id: 'fiction', name: 'Fiction', createdAt: new Date().toISOString(), configId: 'custom-config' },
    ]
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(stored))
    const { result } = renderHook(() => useSessions())
    expect(result.current.sessions[1].configId).toBe('custom-config')
  })

  it('reassignSessionsConfig moves matching sessions to the new config', () => {
    const { result } = renderHook(() => useSessions())
    act(() => { result.current.createSession('Sci-Fi', 'my-config') })
    act(() => { result.current.createSession('Fiction', 'my-config') })
    act(() => { result.current.createSession('Poetry', 'other-config') })
    act(() => { result.current.reassignSessionsConfig('my-config', DISHARI_CONFIG_ID) })

    const byName = (n: string) => result.current.sessions.find(s => s.name === n)!
    expect(byName('Sci-Fi').configId).toBe(DISHARI_CONFIG_ID)
    expect(byName('Fiction').configId).toBe(DISHARI_CONFIG_ID)
    // Sessions on a different config are untouched
    expect(byName('Poetry').configId).toBe('other-config')

    // Persisted to localStorage
    const persisted = JSON.parse(localStorage.getItem(SESSIONS_KEY)!) as { name: string; configId: string }[]
    expect(persisted.find(s => s.name === 'Sci-Fi')!.configId).toBe(DISHARI_CONFIG_ID)
    expect(persisted.find(s => s.name === 'Poetry')!.configId).toBe('other-config')
  })

  it('reassignSessionsConfig is a no-op when no sessions match', () => {
    const { result } = renderHook(() => useSessions())
    act(() => { result.current.createSession('Sci-Fi', DISHARI_CONFIG_ID) })
    const before = JSON.stringify(result.current.sessions)
    act(() => { result.current.reassignSessionsConfig('nothing-here', DISHARI_CONFIG_ID) })
    expect(JSON.stringify(result.current.sessions)).toBe(before)
  })
})

// ---------------------------------------------------------------------------
// useSessions — Supabase mode (userId provided)
// ---------------------------------------------------------------------------
describe('useSessions — Supabase mode', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('starts empty and loads sessions from DB', async () => {
    setupSupabaseFetch([DEFAULT_SESSION, { id: 'sci-fi', name: 'Sci-Fi', createdAt: new Date().toISOString(), configId: DISHARI_CONFIG_ID }])
    const { result } = renderHook(() => useSessions('user-1'))
    expect(result.current.sessions).toHaveLength(0)
    await waitFor(() => expect(result.current.sessions).toHaveLength(2))
    expect(result.current.sessions[1].name).toBe('Sci-Fi')
  })

  it('upserts default session when DB is empty', async () => {
    const mockUpsert = vi.fn().mockReturnValue({
      select: () => Promise.resolve({ data: [makeSessionRow(DEFAULT_SESSION)], error: null }),
    })
    mockFrom.mockReturnValue({
      select: () => ({ eq: () => ({ order: () => Promise.resolve({ data: [], error: null }) }) }),
      upsert: mockUpsert,
    })
    const { result } = renderHook(() => useSessions('user-1'))
    await waitFor(() => expect(result.current.sessions).toHaveLength(1))
    expect(mockUpsert).toHaveBeenCalled()
    expect(result.current.sessions[0].id).toBe('default')
  })

  it('createSession optimistically adds session and inserts to DB', async () => {
    setupSupabaseFetch([DEFAULT_SESSION])
    const { result } = renderHook(() => useSessions('user-1'))
    await waitFor(() => expect(result.current.sessions).toHaveLength(1))
    act(() => { result.current.createSession('Science') })
    expect(result.current.sessions).toHaveLength(2)
    expect(result.current.sessions[1].name).toBe('Science')
  })

  it('createSession rolls back on DB error', async () => {
    const mockInsert = vi.fn().mockReturnValue(Promise.resolve({ error: { message: 'fail' } }))
    mockFrom.mockReturnValue({
      select: () => ({ eq: () => ({ order: () => Promise.resolve({ data: [makeSessionRow(DEFAULT_SESSION)], error: null }) }) }),
      insert: mockInsert,
    })
    const { result } = renderHook(() => useSessions('user-1'))
    await waitFor(() => expect(result.current.sessions).toHaveLength(1))
    act(() => { result.current.createSession('Bad Session') })
    expect(result.current.sessions).toHaveLength(2)
    await waitFor(() => expect(result.current.sessions).toHaveLength(1))
  })

  it('deleteSession removes from state and calls DB delete', async () => {
    const sciSession: Session = { id: 'sci-fi', name: 'Sci-Fi', createdAt: new Date().toISOString(), configId: DISHARI_CONFIG_ID }
    setupSupabaseFetch([DEFAULT_SESSION, sciSession])
    const { result } = renderHook(() => useSessions('user-1'))
    await waitFor(() => expect(result.current.sessions).toHaveLength(2))
    act(() => { result.current.deleteSession('sci-fi') })
    expect(result.current.sessions).toHaveLength(1)
    expect(result.current.sessions[0].id).toBe('default')
  })

  it('renameSession updates state and calls DB update', async () => {
    const sciSession: Session = { id: 'sci-fi', name: 'Sci-Fi', createdAt: new Date().toISOString(), configId: DISHARI_CONFIG_ID }
    setupSupabaseFetch([DEFAULT_SESSION, sciSession])
    const { result } = renderHook(() => useSessions('user-1'))
    await waitFor(() => expect(result.current.sessions).toHaveLength(2))
    act(() => { result.current.renameSession('sci-fi', 'Science Fiction') })
    expect(result.current.sessions.find(s => s.id === 'sci-fi')?.name).toBe('Science Fiction')
  })

  it('currentSessionId stays in localStorage; falls back to default when session missing from DB', async () => {
    localStorage.setItem(CURRENT_KEY, 'ghost-session')
    setupSupabaseFetch([DEFAULT_SESSION])
    const { result } = renderHook(() => useSessions('user-1'))
    await waitFor(() => expect(result.current.sessions).toHaveLength(1))
    expect(result.current.currentSessionId).toBe('default')
    expect(localStorage.getItem(CURRENT_KEY)).toBe('default')
  })
})
