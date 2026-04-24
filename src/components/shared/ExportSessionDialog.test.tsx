import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ExportSessionDialog from './ExportSessionDialog'
import type { BookMetadata, Session } from '@/types'

// Mock the CSV service — download logic is tested in csv.test.ts
vi.mock('@/services/csv', () => ({
  exportSessionsToCsv: vi.fn(),
  sessionCsvFilename: vi.fn(),
}))

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

const sessions = [makeSession('default', 'Default'), makeSession('sci-fi', 'Sci-Fi')]
const books = [makeBook('default'), makeBook('sci-fi'), makeBook('sci-fi')]

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  vi.clearAllTimers()
})

function renderDialog(open = true, sessionList = sessions, bookList = books) {
  return render(
    <ExportSessionDialog
      open={open}
      sessions={sessionList}
      books={bookList}
      username="ragib"
      onCancel={vi.fn()}
    />
  )
}

describe('ExportSessionDialog', () => {
  it('does not render when closed', () => {
    renderDialog(false)
    expect(screen.queryByText('Export CSV')).toBeNull()
  })

  it('lists all session names with book counts', () => {
    renderDialog()
    expect(screen.getByText('Default')).toBeTruthy()
    expect(screen.getByText('Sci-Fi')).toBeTruthy()
    expect(screen.getByText('1 book')).toBeTruthy()
    expect(screen.getByText('2 books')).toBeTruthy()
  })

  it('shows an Export button for each session', () => {
    renderDialog()
    const exportBtns = screen.getAllByRole('button', { name: /export/i })
    expect(exportBtns).toHaveLength(sessions.length)
  })

  it('no checkboxes rendered', () => {
    renderDialog()
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0)
  })

  it('no select/deselect all toggle', () => {
    renderDialog()
    expect(screen.queryByRole('button', { name: /select all/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /deselect all/i })).toBeNull()
  })

  it('clicking a row Export button calls exportSessionsToCsv for that session', async () => {
    const { exportSessionsToCsv } = await import('@/services/csv')
    renderDialog()
    const exportBtns = screen.getAllByRole('button', { name: /export/i })
    await userEvent.click(exportBtns[0])
    expect(exportSessionsToCsv).toHaveBeenCalledWith([sessions[0]], books, 'ragib')
  })

  it('clicking one row Export does not close the dialog', async () => {
    const onCancel = vi.fn()
    render(
      <ExportSessionDialog open sessions={sessions} books={books} username="ragib" onCancel={onCancel} />
    )
    const exportBtns = screen.getAllByRole('button', { name: /export/i })
    await userEvent.click(exportBtns[0])
    expect(onCancel).not.toHaveBeenCalled()
  })

  it('only a Cancel button at the bottom', () => {
    renderDialog()
    expect(screen.getByRole('button', { name: /^cancel$/i })).toBeTruthy()
  })

  it('calls onCancel when Cancel is clicked', async () => {
    const onCancel = vi.fn()
    render(
      <ExportSessionDialog open sessions={sessions} books={books} username="ragib" onCancel={onCancel} />
    )
    await userEvent.click(screen.getByRole('button', { name: /^cancel$/i }))
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('calls onCancel on Escape key', async () => {
    const onCancel = vi.fn()
    render(
      <ExportSessionDialog open sessions={sessions} books={books} username="ragib" onCancel={onCancel} />
    )
    await userEvent.keyboard('{Escape}')
    expect(onCancel).toHaveBeenCalledOnce()
  })
})
