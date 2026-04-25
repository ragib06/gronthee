import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSessions } from '@/hooks/useSessions'
import { useExportConfigs } from '@/hooks/useExportConfigs'
import { DISHARI_CONFIG } from '@/services/exportConfig'
import { exportToCsv } from '@/services/csv'
import type { BookMetadata, Session } from '@/types'

const SESSIONS_KEY = 'gronthee:sessions'

function makeBook(id: string, sessionId = 'default'): BookMetadata {
  return {
    id, sessionId, title: 'Test Book', subTitle: '', otherTitle: '',
    author: 'Author', secondAuthor: '', editor: '', translator: '', illustrator: '',
    publisher: 'Publisher', publishedYear: '2020', publishedYearBengali: '',
    isbn: '9780000000000', category: 'Fiction', genre: 'Novel',
    collection: 'FIC', itemType: 'BK', pageCount: '200', language: 'EN',
    edition: '1st', publicationPlace: 'Dhaka', scanDate: '2026-01-01',
    summary: 'A test book.',
  }
}

// Synchronously captures the CSV content written to Blob.
// Only suitable for exportToCsv (synchronous). For exportSessionsToCsv use
// vi.useFakeTimers() + vi.runAllTimers() as shown in csv.test.ts.
function withCapturedBlob(run: () => void): string {
  let captured = ''
  const OriginalBlob = globalThis.Blob
  vi.spyOn(globalThis, 'Blob').mockImplementation(function(
    this: unknown,
    parts?: BlobPart[],
    opts?: BlobPropertyBag,
  ) {
    if (parts) captured = parts.join('')
    return new OriginalBlob(parts, opts)
  } as unknown as typeof Blob)
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock')
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
  const fakeA = document.createElement('a')
  vi.spyOn(fakeA, 'click').mockImplementation(() => {})
  vi.spyOn(document, 'createElement').mockReturnValue(fakeA as unknown as HTMLElement)
  run()
  vi.restoreAllMocks()
  return captured
}

beforeEach(() => { localStorage.clear() })
afterEach(() => { vi.restoreAllMocks() })

// ---------------------------------------------------------------------------
// 1. Migration: legacy sessions without configId
// ---------------------------------------------------------------------------
describe('Backward compatibility — sessions without configId', () => {
  it('assigns configId: dishari to all legacy sessions on load', () => {
    const legacy = [
      { id: 'default', name: 'Default', createdAt: new Date(0).toISOString() },
      { id: 'sci-fi', name: 'Sci-Fi', createdAt: new Date().toISOString() },
    ]
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(legacy))

    const { result } = renderHook(() => useSessions())
    expect(result.current.sessions.every(s => s.configId === 'dishari')).toBe(true)
  })

  it('persists migration back to localStorage', () => {
    const legacy = [{ id: 'default', name: 'Default', createdAt: '' }]
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(legacy))

    renderHook(() => useSessions())

    const persisted = JSON.parse(localStorage.getItem(SESSIONS_KEY)!) as Session[]
    expect(persisted[0].configId).toBe('dishari')
  })
})

// ---------------------------------------------------------------------------
// 2. Config lookup
// ---------------------------------------------------------------------------
describe('useExportConfigs — config lookup', () => {
  it('exposes bundled Dishari without any localStorage data', () => {
    const { result } = renderHook(() => useExportConfigs())
    const found = result.current.getConfig('dishari')
    expect(found.id).toBe('dishari')
    expect(found.builtIn).toBe(true)
    expect(found.columns.length).toBeGreaterThan(0)
  })

  it('falls back to Dishari for unknown ids', () => {
    const { result } = renderHook(() => useExportConfigs())
    expect(result.current.getConfig('does-not-exist').id).toBe('dishari')
  })
})

// ---------------------------------------------------------------------------
// 3. Default session exports with Dishari schema (pre-feature CSV compatibility)
// ---------------------------------------------------------------------------
describe('Export — Default session uses Dishari schema', () => {
  it('CSV starts with the Dishari header row', () => {
    const book = makeBook('book-1')
    const csv = withCapturedBlob(() => {
      exportToCsv([book], 'test.csv', DISHARI_CONFIG)
    })
    const firstLine = csv.split('\n')[0]
    expect(firstLine.startsWith('ISBN')).toBe(true)
    expect(firstLine).toContain('Title')
    expect(firstLine).toContain('Author')
    expect(firstLine).toContain('Collection')
  })
})

// ---------------------------------------------------------------------------
// 4. R&D flag — always appended regardless of config
// ---------------------------------------------------------------------------
describe('Export — R&D flag is config-agnostic', () => {
  it('appends Book ID, Images, Prompt Output to Dishari export when includeRnd=true', () => {
    const book = makeBook('book-rnd')
    const csv = withCapturedBlob(() => {
      exportToCsv([book], 'test.csv', DISHARI_CONFIG, true)
    })
    const firstLine = csv.split('\n')[0]
    expect(firstLine).toContain('Book ID')
    expect(firstLine).toContain('Images')
    expect(firstLine).toContain('Prompt Output')
  })

  it('appends R&D columns to a custom-config export when includeRnd=true', () => {
    const { result } = renderHook(() => useExportConfigs())
    let customConfig: ReturnType<typeof result.current.createConfig> = null
    act(() => {
      customConfig = result.current.createConfig({
        name: 'Minimal',
        columns: [{ type: 'mapped', header: 'Title', field: 'title' }],
      })
    })

    const book = makeBook('book-custom')
    const csv = withCapturedBlob(() => {
      exportToCsv([book], 'test.csv', customConfig!, true)
    })

    const firstLine = csv.split('\n')[0]
    expect(firstLine).toBe('Title,Book ID,Images,Prompt Output')
  })
})

// ---------------------------------------------------------------------------
// 5. Custom config — session-level export schema
// ---------------------------------------------------------------------------
describe('Custom config — session-level export', () => {
  it('session with custom config uses custom columns in CSV', () => {
    const { result } = renderHook(() => useExportConfigs())
    let customConfig: ReturnType<typeof result.current.createConfig> = null
    act(() => {
      customConfig = result.current.createConfig({
        name: 'Custom Schema',
        columns: [
          { type: 'mapped', header: 'Book Title', field: 'title' },
          { type: 'constant', header: 'Branch', value: 'Main' },
        ],
      })
    })

    const book = makeBook('book-2', 'custom-session')
    const session: Session = { id: 'custom-session', name: 'Custom', createdAt: '', configId: customConfig!.id }
    const resolvedConfig = result.current.getConfig(session.configId)

    const csv = withCapturedBlob(() => {
      exportToCsv([book], 'test.csv', resolvedConfig)
    })

    const firstLine = csv.split('\n')[0]
    expect(firstLine).toBe('Book Title,Branch')
    const dataLine = csv.split('\n')[1]
    expect(dataLine).toContain('Test Book')
    expect(dataLine).toContain('Main')
  })
})

// ---------------------------------------------------------------------------
// 6. Config deletion cascade → sessions fall back to Dishari
// ---------------------------------------------------------------------------
describe('Config deletion cascade', () => {
  it('sessions referencing deleted config fall back to dishari', () => {
    const { result: sessionsResult } = renderHook(() => useSessions())
    const { result: configsResult } = renderHook(() => useExportConfigs())

    let customId = ''
    act(() => {
      const cfg = configsResult.current.createConfig({
        name: 'Temp Config',
        columns: [{ type: 'mapped', header: 'Title', field: 'title' }],
      })
      customId = cfg!.id
    })

    // Separate act() calls — batched calls clobber each other due to stale closure
    act(() => { sessionsResult.current.createSession('Session A', customId) })
    act(() => { sessionsResult.current.createSession('Session B', customId) })

    act(() => {
      sessionsResult.current.reassignSessionsConfig(customId, 'dishari')
      configsResult.current.deleteConfig(customId)
    })

    const sessionA = sessionsResult.current.sessions.find(s => s.name === 'Session A')!
    const sessionB = sessionsResult.current.sessions.find(s => s.name === 'Session B')!
    expect(sessionA.configId).toBe('dishari')
    expect(sessionB.configId).toBe('dishari')
    expect(configsResult.current.configs.find(c => c.id === customId)).toBeUndefined()
    expect(configsResult.current.getConfig(customId).id).toBe('dishari')
  })

  it('after config deletion, subsequent export uses Dishari schema', () => {
    const { result: sessionsResult } = renderHook(() => useSessions())
    const { result: configsResult } = renderHook(() => useExportConfigs())

    let customId = ''
    act(() => {
      const cfg = configsResult.current.createConfig({
        name: 'About To Delete',
        columns: [{ type: 'constant', header: 'Only Column', value: '' }],
      })
      customId = cfg!.id
    })

    act(() => { sessionsResult.current.createSession('My Session', customId) })

    act(() => {
      sessionsResult.current.reassignSessionsConfig(customId, 'dishari')
      configsResult.current.deleteConfig(customId)
    })

    const session = sessionsResult.current.sessions.find(s => s.name === 'My Session')!
    expect(session.configId).toBe('dishari')

    const book = makeBook('book-3', session.id)
    const resolvedConfig = configsResult.current.getConfig(session.configId)
    const csv = withCapturedBlob(() => {
      exportToCsv([book], 'test.csv', resolvedConfig)
    })

    const firstLine = csv.split('\n')[0]
    expect(firstLine.startsWith('ISBN')).toBe(true)
  })
})
