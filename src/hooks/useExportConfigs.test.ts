import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useExportConfigs } from './useExportConfigs'
import { DISHARI_CONFIG } from '@/services/exportConfig'
import type { ExportColumn } from '@/types'

// ---------------------------------------------------------------------------
// Supabase mock
// ---------------------------------------------------------------------------

const mockFrom = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabase: { from: (...args: unknown[]) => mockFrom(...args) },
}))

const USER_ID = 'user-test-1'

const SAMPLE_COLUMNS: ExportColumn[] = [
  { type: 'mapped', header: 'Title', field: 'title' },
  { type: 'constant', header: 'Marker', value: 'X' },
]

function mockChain(result = { error: null as null | { message: string } }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chain: any = {
    eq: () => chain,
    then: (fn: (r: typeof result) => void) => Promise.resolve(result).then(fn),
  }
  return chain
}

function setupMock(existingRows: unknown[] = []) {
  mockFrom.mockReturnValue({
    select: () => ({
      eq: () => ({
        order: () => Promise.resolve({ data: existingRows, error: null }),
      }),
    }),
    insert: () => mockChain(),
    update: () => mockChain(),
    delete: () => mockChain(),
  })
}

beforeEach(() => {
  setupMock()
})

// ---------------------------------------------------------------------------
// Built-ins
// ---------------------------------------------------------------------------

describe('useExportConfigs — built-ins', () => {
  it('exposes Dishari built-in even with no DB data', () => {
    const { result } = renderHook(() => useExportConfigs(USER_ID))
    expect(result.current.configs).toHaveLength(1)
    expect(result.current.configs[0].id).toBe('dishari')
    expect(result.current.configs[0].builtIn).toBe(true)
  })

  it('isBuiltIn returns true for dishari and false for others', () => {
    const { result } = renderHook(() => useExportConfigs(USER_ID))
    expect(result.current.isBuiltIn('dishari')).toBe(true)
    expect(result.current.isBuiltIn('does-not-exist')).toBe(false)
  })

  it('getConfig falls back to Dishari for unknown ids', () => {
    const { result } = renderHook(() => useExportConfigs(USER_ID))
    expect(result.current.getConfig('does-not-exist').id).toBe('dishari')
  })

  it('getConfig resolves Dishari by id', () => {
    const { result } = renderHook(() => useExportConfigs(USER_ID))
    expect(result.current.getConfig('dishari').name).toBe('Dishari')
  })
})

// ---------------------------------------------------------------------------
// createConfig
// ---------------------------------------------------------------------------

describe('useExportConfigs — createConfig', () => {
  it('happy path: adds config and returns it', () => {
    const { result } = renderHook(() => useExportConfigs(USER_ID))
    let created: ReturnType<typeof result.current.createConfig> = null
    act(() => {
      created = result.current.createConfig({ name: 'Custom', columns: SAMPLE_COLUMNS })
    })
    expect(created).not.toBeNull()
    expect(created!.id).toBe('custom')
    expect(result.current.configs).toHaveLength(2)
  })

  it('rejects empty name', () => {
    const { result } = renderHook(() => useExportConfigs(USER_ID))
    let created: ReturnType<typeof result.current.createConfig> = null
    act(() => {
      created = result.current.createConfig({ name: '   ', columns: SAMPLE_COLUMNS })
    })
    expect(created).toBeNull()
  })

  it('rejects empty columns', () => {
    const { result } = renderHook(() => useExportConfigs(USER_ID))
    let created: ReturnType<typeof result.current.createConfig> = null
    act(() => {
      created = result.current.createConfig({ name: 'X', columns: [] })
    })
    expect(created).toBeNull()
  })

  it('rejects duplicate name (case-insensitive, including built-in)', () => {
    const { result } = renderHook(() => useExportConfigs(USER_ID))
    let created: ReturnType<typeof result.current.createConfig> = null
    act(() => {
      created = result.current.createConfig({ name: 'DISHARI', columns: SAMPLE_COLUMNS })
    })
    expect(created).toBeNull()
  })

  it('appends random suffix on slug collision', () => {
    const { result } = renderHook(() => useExportConfigs(USER_ID))
    act(() => { result.current.createConfig({ name: 'Custom', columns: SAMPLE_COLUMNS }) })
    let second: ReturnType<typeof result.current.createConfig> = null
    act(() => { second = result.current.createConfig({ name: 'Custom!', columns: SAMPLE_COLUMNS }) })
    expect(second).not.toBeNull()
    expect(second!.id).not.toBe('custom')
    expect(second!.id.startsWith('custom-')).toBe(true)
  })

  it('returns null when userId is null', () => {
    const { result } = renderHook(() => useExportConfigs(null))
    let created: ReturnType<typeof result.current.createConfig> = null
    act(() => {
      created = result.current.createConfig({ name: 'Custom', columns: SAMPLE_COLUMNS })
    })
    expect(created).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// updateConfig
// ---------------------------------------------------------------------------

describe('useExportConfigs — updateConfig', () => {
  it('patches description and returns updated config', () => {
    const { result } = renderHook(() => useExportConfigs(USER_ID))
    let id = ''
    act(() => { id = result.current.createConfig({ name: 'C', columns: SAMPLE_COLUMNS })!.id })
    let updated: import('@/types').ExportConfig | null = null
    act(() => {
      updated = result.current.updateConfig(id, { description: 'Now with desc' })
    })
    expect(updated).not.toBeNull()
    expect(updated!.description).toBe('Now with desc')
    expect(updated!.updatedAt >= updated!.createdAt).toBe(true)
  })

  it('returns null and does nothing for the Dishari built-in', () => {
    const { result } = renderHook(() => useExportConfigs(USER_ID))
    let updated: ReturnType<typeof result.current.updateConfig> = null
    act(() => {
      updated = result.current.updateConfig('dishari', { description: 'try to mutate' })
    })
    expect(updated).toBeNull()
    expect(result.current.getConfig('dishari').description).toBe(DISHARI_CONFIG.description)
  })

  it('returns null when renaming to a duplicate name', () => {
    const { result } = renderHook(() => useExportConfigs(USER_ID))
    let aId: string
    act(() => {
      aId = result.current.createConfig({ name: 'Alpha', columns: SAMPLE_COLUMNS })!.id
      result.current.createConfig({ name: 'Beta', columns: SAMPLE_COLUMNS })
    })
    let renamed: ReturnType<typeof result.current.updateConfig> = null
    act(() => {
      renamed = result.current.updateConfig(aId, { name: 'Beta' })
    })
    expect(renamed).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// deleteConfig
// ---------------------------------------------------------------------------

describe('useExportConfigs — deleteConfig', () => {
  it('removes a user config', () => {
    const { result } = renderHook(() => useExportConfigs(USER_ID))
    let id: string
    act(() => { id = result.current.createConfig({ name: 'Temp', columns: SAMPLE_COLUMNS })!.id })
    let ok = false
    act(() => { ok = result.current.deleteConfig(id) })
    expect(ok).toBe(true)
    expect(result.current.configs.find(c => c.id === id)).toBeUndefined()
  })

  it('returns false and does nothing for the Dishari built-in', () => {
    const { result } = renderHook(() => useExportConfigs(USER_ID))
    let ok = false
    act(() => { ok = result.current.deleteConfig('dishari') })
    expect(ok).toBe(false)
    expect(result.current.configs.find(c => c.id === 'dishari')).toBeDefined()
  })

  it('returns false for an unknown id', () => {
    const { result } = renderHook(() => useExportConfigs(USER_ID))
    let ok = false
    act(() => { ok = result.current.deleteConfig('not-real') })
    expect(ok).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// cloneConfig
// ---------------------------------------------------------------------------

describe('useExportConfigs — cloneConfig', () => {
  it('clones Dishari into a new editable user config', () => {
    const { result } = renderHook(() => useExportConfigs(USER_ID))
    let cloned: ReturnType<typeof result.current.cloneConfig> = null
    act(() => { cloned = result.current.cloneConfig('dishari', 'My Library') })
    expect(cloned).not.toBeNull()
    expect(cloned!.id).toBe('my-library')
    expect(cloned!.builtIn).toBeUndefined()
    expect(cloned!.columns).toHaveLength(DISHARI_CONFIG.columns.length)
    cloned!.columns[0].header = 'Mutated'
    expect(DISHARI_CONFIG.columns[0].header).not.toBe('Mutated')
  })

  it('returns null when source id does not exist', () => {
    const { result } = renderHook(() => useExportConfigs(USER_ID))
    let cloned: ReturnType<typeof result.current.cloneConfig> = null
    act(() => { cloned = result.current.cloneConfig('nope', 'Whatever') })
    expect(cloned).toBeNull()
  })

  it('two clones with the same name produce unique ids', () => {
    const { result } = renderHook(() => useExportConfigs(USER_ID))
    let a: ReturnType<typeof result.current.cloneConfig> = null
    let b: ReturnType<typeof result.current.cloneConfig> = null
    act(() => { a = result.current.cloneConfig('dishari', 'Copy') })
    act(() => { result.current.updateConfig(a!.id, { name: 'Original' }) })
    act(() => { b = result.current.cloneConfig('dishari', 'Copy') })
    expect(a!.id).not.toBe(b!.id)
  })
})
