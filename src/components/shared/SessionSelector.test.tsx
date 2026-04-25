import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SessionSelector from './SessionSelector'
import { DISHARI_CONFIG } from '@/services/exportConfig'
import type { BookMetadata, ExportConfig, Session } from '@/types'

function makeSession(id: string, name: string, configId = 'dishari'): Session {
  return { id, name, createdAt: new Date().toISOString(), configId }
}

function makeBook(sessionId: string): BookMetadata {
  return {
    id: crypto.randomUUID(), sessionId, title: 'T', subTitle: '', otherTitle: '',
    author: 'A', secondAuthor: '', editor: '', translator: '', illustrator: '',
    publisher: 'P', publishedYear: '2020', publishedYearBengali: '', isbn: '123',
    category: 'Fiction', genre: 'Novel', collection: 'FIC', itemType: 'BK',
    pageCount: '100', language: 'en', edition: '1st', publicationPlace: 'Dhaka',
    scanDate: '2026-01-01', summary: 'S',
  }
}

const customConfig: ExportConfig = {
  id: 'library-v2',
  name: 'Library v2',
  columns: [{ type: 'mapped', header: 'Title', field: 'title' }],
  createdAt: '2026-04-25T00:00:00.000Z',
  updatedAt: '2026-04-25T00:00:00.000Z',
}

const configs: ExportConfig[] = [DISHARI_CONFIG, customConfig]
const getConfig = (id: string) => configs.find(c => c.id === id) ?? DISHARI_CONFIG

const defaultSession = makeSession('default', 'Default')
const sessions = [defaultSession, makeSession('sci-fi', 'Sci-Fi', 'library-v2')]
const books = [makeBook('default'), makeBook('sci-fi'), makeBook('sci-fi')]

const noop = () => {}

function renderSelector(overrides: Partial<Parameters<typeof SessionSelector>[0]> = {}) {
  const props = {
    sessions,
    currentSession: defaultSession,
    books,
    configs,
    getConfig,
    onSelect: noop,
    onCreate: vi.fn().mockReturnValue(makeSession('new', 'New')),
    onRename: noop,
    onDelete: noop,
    ...overrides,
  }
  return render(<SessionSelector {...props} />)
}

// Open the dropdown by clicking the first button (the trigger)
async function openDropdown() {
  await userEvent.click(screen.getAllByRole('button')[0])
}

describe('SessionSelector', () => {
  it('renders current session name on trigger button', () => {
    renderSelector()
    expect(screen.getAllByRole('button')[0].textContent).toContain('Default')
  })

  it('renders all session names after opening', async () => {
    renderSelector()
    await openDropdown()
    expect(screen.getAllByText('Default').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Sci-Fi').length).toBeGreaterThanOrEqual(1)
  })

  it("shows each session's config name as a subtitle", async () => {
    renderSelector()
    await openDropdown()
    // Default uses Dishari, Sci-Fi uses Library v2
    expect(screen.getByText('Dishari')).toBeTruthy()
    expect(screen.getByText('Library v2')).toBeTruthy()
  })

  it('shows correct book count badges', async () => {
    renderSelector()
    await openDropdown()
    expect(screen.getByText('(1)')).toBeTruthy()
    expect(screen.getByText('(2)')).toBeTruthy()
  })

  it('clicking a non-active session calls onSelect', async () => {
    const onSelect = vi.fn()
    renderSelector({ onSelect })
    await openDropdown()
    const scifiBtn = screen.getAllByRole('button').find(b =>
      b.textContent?.includes('Sci-Fi') && b.className.includes('flex-1')
    )
    if (scifiBtn) await userEvent.click(scifiBtn)
    expect(onSelect).toHaveBeenCalledWith('sci-fi')
  })

  it('clicking "New session" opens the CreateSessionDialog', async () => {
    renderSelector()
    await openDropdown()
    await userEvent.click(screen.getByRole('button', { name: /new session/i }))
    // The dialog has its own heading and an Export Config select
    expect(screen.getByRole('heading', { name: /new session/i })).toBeTruthy()
    expect(screen.getByLabelText(/export config/i)).toBeTruthy()
  })

  it('submitting the dialog calls onCreate with name and configId, then onSelect', async () => {
    const onCreate = vi.fn().mockReturnValue(makeSession('poetry', 'Poetry', 'library-v2'))
    const onSelect = vi.fn()
    renderSelector({ onCreate, onSelect })
    await openDropdown()
    await userEvent.click(screen.getByRole('button', { name: /new session/i }))
    await userEvent.type(screen.getByLabelText(/^name$/i), 'Poetry')
    await userEvent.selectOptions(screen.getByLabelText(/export config/i), 'library-v2')
    await userEvent.click(screen.getByRole('button', { name: /^create$/i }))
    expect(onCreate).toHaveBeenCalledWith('Poetry', 'library-v2')
    expect(onSelect).toHaveBeenCalledWith('poetry')
  })

  it('pencil icon only exists for non-default sessions', async () => {
    renderSelector()
    await openDropdown()
    const pencilBtns = screen.queryAllByTitle('Rename session')
    expect(pencilBtns.length).toBe(1)
  })

  it('trash icon only exists for non-default sessions', async () => {
    renderSelector()
    await openDropdown()
    const trashBtns = screen.queryAllByTitle('Delete session')
    expect(trashBtns.length).toBe(1)
  })

  it('clicking rename opens inline input with existing name', async () => {
    renderSelector()
    await openDropdown()
    await userEvent.click(screen.getByTitle('Rename session'))
    expect(screen.getByDisplayValue('Sci-Fi')).toBeTruthy()
  })

  it('pressing Enter in rename input commits the rename', async () => {
    const onRename = vi.fn()
    renderSelector({ onRename })
    await openDropdown()
    await userEvent.click(screen.getByTitle('Rename session'))
    const renameInput = screen.getByDisplayValue('Sci-Fi')
    await userEvent.clear(renameInput)
    await userEvent.type(renameInput, 'New Name{Enter}')
    expect(onRename).toHaveBeenCalledWith('sci-fi', 'New Name')
  })

  it('clicking delete trash opens DeleteSessionDialog', async () => {
    renderSelector()
    await openDropdown()
    await userEvent.click(screen.getByTitle('Delete session'))
    expect(screen.getByText(/Delete session/)).toBeTruthy()
  })

  it('"New session" button disabled at 50-session cap', async () => {
    const manySessions = Array.from({ length: 50 }, (_, i) =>
      makeSession(i === 0 ? 'default' : `s${i}`, i === 0 ? 'Default' : `Session ${i}`)
    )
    renderSelector({ sessions: manySessions })
    await openDropdown()
    expect(screen.getByRole('button', { name: /new session/i })).toBeDisabled()
  })
})
