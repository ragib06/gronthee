import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SessionSelector from './SessionSelector'
import type { BookMetadata, Session } from '@/types'

function makeSession(id: string, name: string): Session {
  return { id, name, createdAt: new Date().toISOString() }
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

const defaultSession = makeSession('default', 'Default')
const sessions = [defaultSession, makeSession('sci-fi', 'Sci-Fi')]
const books = [makeBook('default'), makeBook('sci-fi'), makeBook('sci-fi')]

const noop = () => {}

function renderSelector(overrides: Partial<Parameters<typeof SessionSelector>[0]> = {}) {
  const props = {
    sessions,
    currentSession: defaultSession,
    books,
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
    // Trigger button is the first button; its text includes the session name
    expect(screen.getAllByRole('button')[0].textContent).toContain('Default')
  })

  it('renders all session names after opening', async () => {
    renderSelector()
    await openDropdown()
    // Multiple "Default" texts expected (trigger + list item), use getAllByText
    expect(screen.getAllByText('Default').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Sci-Fi').length).toBeGreaterThanOrEqual(1)
  })

  it('shows correct book count badges', async () => {
    renderSelector()
    await openDropdown()
    expect(screen.getByText('(1)')).toBeTruthy()  // default has 1
    expect(screen.getByText('(2)')).toBeTruthy()  // sci-fi has 2
  })

  it('clicking a non-active session calls onSelect', async () => {
    const onSelect = vi.fn()
    renderSelector({ onSelect })
    await openDropdown()
    // Find and click the Sci-Fi row button inside the dropdown list
    const scifiBtn = screen.getAllByRole('button').find(b =>
      b.textContent?.includes('Sci-Fi') && b.className.includes('flex-1')
    )
    if (scifiBtn) await userEvent.click(scifiBtn)
    expect(onSelect).toHaveBeenCalledWith('sci-fi')
  })

  it('create button disabled when input is blank', async () => {
    renderSelector()
    await openDropdown()
    expect(screen.getByTitle('Create session')).toBeDisabled()
  })

  it('create button enabled after typing a name', async () => {
    renderSelector()
    await openDropdown()
    await userEvent.type(screen.getByPlaceholderText('New session name…'), 'Poetry')
    expect(screen.getByTitle('Create session')).not.toBeDisabled()
  })

  it('clicking create calls onCreate', async () => {
    const onCreate = vi.fn().mockReturnValue(makeSession('poetry', 'Poetry'))
    const onSelect = vi.fn()
    renderSelector({ onCreate, onSelect })
    await openDropdown()
    await userEvent.type(screen.getByPlaceholderText('New session name…'), 'Poetry')
    await userEvent.click(screen.getByTitle('Create session'))
    expect(onCreate).toHaveBeenCalledWith('Poetry')
    expect(onSelect).toHaveBeenCalledWith('poetry')
  })

  it('pencil icon only exists for non-default sessions', async () => {
    renderSelector()
    await openDropdown()
    // Only sci-fi (non-default) has the rename button
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

  it('create input disabled at 50-session cap', async () => {
    const manySessions = Array.from({ length: 50 }, (_, i) =>
      makeSession(i === 0 ? 'default' : `s${i}`, i === 0 ? 'Default' : `Session ${i}`)
    )
    renderSelector({ sessions: manySessions })
    await openDropdown()
    expect(screen.getByPlaceholderText('New session name…')).toBeDisabled()
  })
})
