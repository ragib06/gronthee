import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useExportConfigs } from './useExportConfigs'
import { DISHARI_CONFIG } from '@/services/exportConfig'
import type { ExportColumn } from '@/types'

const STORAGE_KEY = 'gronthee:exportConfigs'

const SAMPLE_COLUMNS: ExportColumn[] = [
  { type: 'mapped', header: 'Title', field: 'title' },
  { type: 'constant', header: 'Marker', value: 'X' },
]

beforeEach(() => {
  localStorage.clear()
})

describe('useExportConfigs — built-ins', () => {
  it('exposes Dishari built-in even with empty localStorage', () => {
    const { result } = renderHook(() => useExportConfigs())
    expect(result.current.configs).toHaveLength(1)
    expect(result.current.configs[0].id).toBe('dishari')
    expect(result.current.configs[0].builtIn).toBe(true)
  })

  it('isBuiltIn returns true for dishari and false for others', () => {
    const { result } = renderHook(() => useExportConfigs())
    expect(result.current.isBuiltIn('dishari')).toBe(true)
    expect(result.current.isBuiltIn('does-not-exist')).toBe(false)
  })

  it('getConfig falls back to Dishari for unknown ids', () => {
    const { result } = renderHook(() => useExportConfigs())
    expect(result.current.getConfig('does-not-exist').id).toBe('dishari')
  })

  it('getConfig resolves Dishari by id', () => {
    const { result } = renderHook(() => useExportConfigs())
    expect(result.current.getConfig('dishari').name).toBe('Dishari')
  })
})

describe('useExportConfigs — createConfig', () => {
  it('happy path: adds, returns, persists', () => {
    const { result } = renderHook(() => useExportConfigs())
    let created: ReturnType<typeof result.current.createConfig> = null
    act(() => {
      created = result.current.createConfig({ name: 'Custom', columns: SAMPLE_COLUMNS })
    })
    expect(created).not.toBeNull()
    expect(created!.id).toBe('custom')
    expect(result.current.configs).toHaveLength(2)
    const persisted = JSON.parse(localStorage.getItem(STORAGE_KEY)!) as { id: string }[]
    expect(persisted).toHaveLength(1)
    expect(persisted[0].id).toBe('custom')
  })

  it('rejects empty name', () => {
    const { result } = renderHook(() => useExportConfigs())
    let created: ReturnType<typeof result.current.createConfig> = null
    act(() => {
      created = result.current.createConfig({ name: '   ', columns: SAMPLE_COLUMNS })
    })
    expect(created).toBeNull()
  })

  it('rejects empty columns', () => {
    const { result } = renderHook(() => useExportConfigs())
    let created: ReturnType<typeof result.current.createConfig> = null
    act(() => {
      created = result.current.createConfig({ name: 'X', columns: [] })
    })
    expect(created).toBeNull()
  })

  it('rejects duplicate name (case-insensitive, including built-in)', () => {
    const { result } = renderHook(() => useExportConfigs())
    let created: ReturnType<typeof result.current.createConfig> = null
    act(() => {
      created = result.current.createConfig({ name: 'DISHARI', columns: SAMPLE_COLUMNS })
    })
    expect(created).toBeNull()
  })

  it('appends random suffix on slug collision', () => {
    const { result } = renderHook(() => useExportConfigs())
    act(() => { result.current.createConfig({ name: 'Custom', columns: SAMPLE_COLUMNS }) })
    let second: ReturnType<typeof result.current.createConfig> = null
    act(() => { second = result.current.createConfig({ name: 'Custom!', columns: SAMPLE_COLUMNS }) })
    expect(second).not.toBeNull()
    expect(second!.id).not.toBe('custom')
    expect(second!.id.startsWith('custom-')).toBe(true)
  })
})

describe('useExportConfigs — updateConfig', () => {
  it('patches and bumps updatedAt', async () => {
    const { result } = renderHook(() => useExportConfigs())
    let id = ''
    act(() => { id = result.current.createConfig({ name: 'C', columns: SAMPLE_COLUMNS })!.id })
    const before = result.current.getConfig(id).updatedAt
    // Ensure clock advances
    await new Promise(r => setTimeout(r, 5))
    let updated: import('@/types').ExportConfig | null = null
    act(() => {
      updated = result.current.updateConfig(id, { description: 'Now with desc' })
    })
    expect(updated).not.toBeNull()
    expect(updated!.description).toBe('Now with desc')
    expect(updated!.updatedAt).not.toBe(before)
  })

  it('returns null and does nothing for the Dishari built-in', () => {
    const { result } = renderHook(() => useExportConfigs())
    let updated: ReturnType<typeof result.current.updateConfig> = null
    act(() => {
      updated = result.current.updateConfig('dishari', { description: 'try to mutate' })
    })
    expect(updated).toBeNull()
    expect(result.current.getConfig('dishari').description).toBe(DISHARI_CONFIG.description)
  })

  it('returns null when renaming to a duplicate name', () => {
    const { result } = renderHook(() => useExportConfigs())
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

describe('useExportConfigs — deleteConfig', () => {
  it('removes a user config', () => {
    const { result } = renderHook(() => useExportConfigs())
    let id: string
    act(() => { id = result.current.createConfig({ name: 'Temp', columns: SAMPLE_COLUMNS })!.id })
    let ok = false
    act(() => { ok = result.current.deleteConfig(id) })
    expect(ok).toBe(true)
    expect(result.current.configs.find(c => c.id === id)).toBeUndefined()
  })

  it('returns false and does nothing for the Dishari built-in', () => {
    const { result } = renderHook(() => useExportConfigs())
    let ok = false
    act(() => { ok = result.current.deleteConfig('dishari') })
    expect(ok).toBe(false)
    expect(result.current.configs.find(c => c.id === 'dishari')).toBeDefined()
  })

  it('returns false for an unknown id', () => {
    const { result } = renderHook(() => useExportConfigs())
    let ok = false
    act(() => { ok = result.current.deleteConfig('not-real') })
    expect(ok).toBe(false)
  })
})

describe('useExportConfigs — cloneConfig', () => {
  it('clones Dishari into a new editable user config', () => {
    const { result } = renderHook(() => useExportConfigs())
    let cloned: ReturnType<typeof result.current.cloneConfig> = null
    act(() => { cloned = result.current.cloneConfig('dishari', 'My Library') })
    expect(cloned).not.toBeNull()
    expect(cloned!.id).toBe('my-library')
    expect(cloned!.builtIn).toBeUndefined()
    expect(cloned!.columns).toHaveLength(DISHARI_CONFIG.columns.length)
    // Mutating clone should not affect Dishari (deep copy)
    cloned!.columns[0].header = 'Mutated'
    expect(DISHARI_CONFIG.columns[0].header).not.toBe('Mutated')
  })

  it('returns null when source id does not exist', () => {
    const { result } = renderHook(() => useExportConfigs())
    let cloned: ReturnType<typeof result.current.cloneConfig> = null
    act(() => { cloned = result.current.cloneConfig('nope', 'Whatever') })
    expect(cloned).toBeNull()
  })

  it('two clones with the same name produce unique ids', () => {
    const { result } = renderHook(() => useExportConfigs())
    let a: ReturnType<typeof result.current.cloneConfig> = null
    let b: ReturnType<typeof result.current.cloneConfig> = null
    act(() => { a = result.current.cloneConfig('dishari', 'Copy') })
    // Second clone of same name must collide on uniqueness check; rename first
    act(() => { result.current.updateConfig(a!.id, { name: 'Original' }) })
    act(() => { b = result.current.cloneConfig('dishari', 'Copy') })
    expect(a!.id).not.toBe(b!.id)
  })
})

describe('useExportConfigs — persistence', () => {
  it('restores user configs from localStorage', () => {
    const stored = [{
      id: 'pre-existing',
      name: 'Pre Existing',
      columns: [{ type: 'mapped', header: 'Title', field: 'title' }],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    }]
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
    const { result } = renderHook(() => useExportConfigs())
    expect(result.current.configs).toHaveLength(2) // Dishari + 1
    expect(result.current.configs[1].id).toBe('pre-existing')
  })

  it('drops corrupt entries from localStorage silently', () => {
    const stored = [
      { not: 'a config' },
      {
        id: 'good',
        name: 'Good',
        columns: [{ type: 'mapped', header: 'Title', field: 'title' }],
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ]
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
    const { result } = renderHook(() => useExportConfigs())
    expect(result.current.configs).toHaveLength(2) // Dishari + good only
    expect(result.current.configs[1].id).toBe('good')
  })

  it('refuses to load a user config that collides with the built-in id', () => {
    const stored = [{
      id: 'dishari',
      name: 'Hijack',
      columns: [{ type: 'constant', header: 'X', value: '' }],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    }]
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
    const { result } = renderHook(() => useExportConfigs())
    expect(result.current.configs).toHaveLength(1)
    expect(result.current.configs[0].name).toBe('Dishari')
  })
})
