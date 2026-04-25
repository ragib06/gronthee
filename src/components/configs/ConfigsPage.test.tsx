import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ConfigsPage from './ConfigsPage'
import { DISHARI_CONFIG } from '@/services/exportConfig'
import type { ExportConfig } from '@/types'

function makeUserConfig(id = 'custom', name = 'Custom'): ExportConfig {
  return {
    id,
    name,
    description: 'A user-made config',
    columns: [
      { type: 'mapped', header: 'Title', field: 'title' },
      { type: 'constant', header: 'Marker', value: 'X' },
    ],
    createdAt: '2026-04-24T00:00:00.000Z',
    updatedAt: '2026-04-24T00:00:00.000Z',
  }
}

interface RenderOpts {
  configs?: ExportConfig[]
  createConfig?: (...args: unknown[]) => ExportConfig | null
  updateConfig?: (...args: unknown[]) => ExportConfig | null
  deleteConfig?: (...args: unknown[]) => boolean
  cloneConfig?: (...args: unknown[]) => ExportConfig | null
}

function renderPage(opts: RenderOpts = {}) {
  const configs = opts.configs ?? [DISHARI_CONFIG, makeUserConfig()]
  const props = {
    configs,
    getConfig: (id: string) => configs.find(c => c.id === id) ?? DISHARI_CONFIG,
    isBuiltIn: (id: string) => id === 'dishari',
    createConfig: (opts.createConfig ?? vi.fn()) as (input: { name: string; description?: string; columns: ExportConfig['columns'] }) => ExportConfig | null,
    updateConfig: (opts.updateConfig ?? vi.fn()) as (id: string, patch: Partial<ExportConfig>) => ExportConfig | null,
    deleteConfig: (opts.deleteConfig ?? vi.fn()) as (id: string) => boolean,
    cloneConfig: (opts.cloneConfig ?? vi.fn()) as (sourceId: string, newName: string) => ExportConfig | null,
  }
  return { props, ...render(<ConfigsPage {...props} />) }
}

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('ConfigsPage — list view', () => {
  it('renders Dishari with built-in badge and no Edit/Delete buttons', () => {
    renderPage({ configs: [DISHARI_CONFIG] })
    expect(screen.getByText('Dishari')).toBeTruthy()
    // Badge text — at least one match (Dishari description also mentions "Built-in")
    expect(screen.getAllByText(/Built-in/i).length).toBeGreaterThan(0)
    expect(screen.queryByTitle('Edit config')).toBeNull()
    expect(screen.queryByTitle('Delete config')).toBeNull()
    expect(screen.getByTitle('Clone config')).toBeTruthy()
    expect(screen.getByTitle('Share config')).toBeTruthy()
  })

  it('renders a user config with Edit, Clone, Share, and Delete', () => {
    renderPage({ configs: [makeUserConfig()] })
    expect(screen.getByTitle('Edit config')).toBeTruthy()
    expect(screen.getByTitle('Clone config')).toBeTruthy()
    expect(screen.getByTitle('Share config')).toBeTruthy()
    expect(screen.getByTitle('Delete config')).toBeTruthy()
  })

  it('clicking New Config opens the editor with one scaffold column', async () => {
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: /new config/i }))
    expect(screen.getByText(/^new config$/i)).toBeTruthy()
    // Scaffold has Header input + at least one column row
    expect(screen.getByLabelText(/^name$/i)).toBeTruthy()
    expect(screen.getByText('1 column')).toBeTruthy()
  })

  it('clicking Edit on a user config opens the editor with that config loaded', async () => {
    const config = makeUserConfig('alpha', 'Alpha')
    renderPage({ configs: [DISHARI_CONFIG, config] })
    await userEvent.click(screen.getByTitle('Edit config'))
    expect(screen.getByText(/^edit config$/i)).toBeTruthy()
    expect(screen.getByDisplayValue('Alpha')).toBeTruthy()
  })

  it('clicking Delete on a user config shows confirmation, then calls deleteConfig', async () => {
    const deleteConfig = vi.fn()
    renderPage({ configs: [makeUserConfig('alpha', 'Alpha')], deleteConfig })
    await userEvent.click(screen.getByTitle('Delete config'))
    expect(screen.getByText(/Delete config "Alpha"/)).toBeTruthy()
    // The dialog's confirm button is the last "Delete" button in the document
    const deleteButtons = screen.getAllByRole('button', { name: /^delete$/i })
    await userEvent.click(deleteButtons[deleteButtons.length - 1])
    expect(deleteConfig).toHaveBeenCalledWith('alpha')
  })

  it('clicking Clone on Dishari calls cloneConfig with a derived name', async () => {
    const cloneConfig = vi.fn()
    renderPage({ configs: [DISHARI_CONFIG], cloneConfig })
    await userEvent.click(screen.getByTitle('Clone config'))
    expect(cloneConfig).toHaveBeenCalledWith('dishari', 'Dishari Copy')
  })

  it('clicking Share downloads a JSON file named gronthee-config-<slug>.json', async () => {
    const config = makeUserConfig('my-lib', 'My Library')
    renderPage({ configs: [config] })

    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:fake')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    const fakeA = document.createElement('a')
    vi.spyOn(fakeA, 'click').mockImplementation(() => {})
    vi.spyOn(document, 'createElement').mockReturnValue(fakeA as unknown as HTMLElement)

    await userEvent.click(screen.getByTitle('Share config'))

    expect(URL.createObjectURL).toHaveBeenCalledOnce()
    expect(fakeA.download).toBe('gronthee-config-my-library.json')
  })
})
