import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import HistoryPage from './HistoryPage'
import { DISHARI_CONFIG } from '@/services/exportConfig'
import type { BookMetadata, Session } from '@/types'

vi.mock('@/services/csv', () => ({
  exportSessionsToCsv: vi.fn(),
  defaultCsvFilename: vi.fn().mockReturnValue('test.csv'),
}))

const getConfig = () => DISHARI_CONFIG

function makeSession(id: string, name: string): Session {
  return { id, name, createdAt: new Date().toISOString(), configId: 'dishari' }
}

function makeBook(id: string, title: string, sessionId: string): BookMetadata {
  return {
    id, sessionId, title, subTitle: '', otherTitle: '',
    author: 'Author', secondAuthor: '', editor: '', translator: '', illustrator: '',
    publisher: 'Pub', publishedYear: '2020', publishedYearBengali: '', isbn: '123',
    category: 'Fiction', genre: 'Novel', collection: 'FIC', itemType: 'BK',
    pageCount: '100', language: 'en', edition: '1st', publicationPlace: 'Dhaka',
    scanDate: '2026-01-01', summary: 'S',
  }
}

const sessions = [makeSession('default', 'Default'), makeSession('sci-fi', 'Sci-Fi')]
const books = [
  makeBook('1', 'Book A', 'default'),
  makeBook('2', 'Book B', 'sci-fi'),
  makeBook('3', 'Book C', 'sci-fi'),
]

function renderPage() {
  return render(
    <HistoryPage
      navigate={vi.fn()}
      books={books}
      sessions={sessions}
      getConfig={getConfig}
      onDelete={vi.fn()}
      username="ragib"
    />
  )
}

describe('HistoryPage session filter chips', () => {
  it('"All" chip is shown and active by default', () => {
    renderPage()
    const allChip = screen.getByRole('button', { name: /^all$/i })
    expect(allChip).toBeTruthy()
    expect(allChip.className).toContain('bg-indigo-600')
  })

  it('shows one chip per session', () => {
    renderPage()
    expect(screen.getByRole('button', { name: /^default$/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /^sci-fi$/i })).toBeTruthy()
  })

  it('"All" shows all books', () => {
    renderPage()
    expect(screen.getByText('Book A')).toBeTruthy()
    expect(screen.getByText('Book B')).toBeTruthy()
    expect(screen.getByText('Book C')).toBeTruthy()
  })

  it('clicking session chip filters to that session', async () => {
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: /^sci-fi$/i }))
    expect(screen.queryByText('Book A')).toBeNull()
    expect(screen.getByText('Book B')).toBeTruthy()
    expect(screen.getByText('Book C')).toBeTruthy()
  })

  it('clicking "All" after filtering restores full list', async () => {
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: /^sci-fi$/i }))
    await userEvent.click(screen.getByRole('button', { name: /^all$/i }))
    expect(screen.getByText('Book A')).toBeTruthy()
    expect(screen.getByText('Book B')).toBeTruthy()
    expect(screen.getByText('Book C')).toBeTruthy()
  })

  it('chips not rendered when only one session exists', () => {
    render(
      <HistoryPage
        navigate={vi.fn()}
        books={[makeBook('1', 'Book A', 'default')]}
        sessions={[makeSession('default', 'Default')]}
        getConfig={getConfig}
        onDelete={vi.fn()}
        username="ragib"
      />
    )
    expect(screen.queryByRole('button', { name: /^all$/i })).toBeNull()
  })
})
