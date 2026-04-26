import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useBookHistory } from './useBookHistory'
import type { BookMetadata } from '@/types'

// ---------------------------------------------------------------------------
// Supabase mock
// ---------------------------------------------------------------------------

const mockSingle = vi.fn()
const mockInsertChain = { select: () => ({ single: mockSingle }) }
const mockUpdateChain = { eq: vi.fn().mockResolvedValue({ error: null }) }
const mockDeleteChain = { eq: vi.fn().mockResolvedValue({ error: null }) }

const mockFrom = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabase: { from: (...args: unknown[]) => mockFrom(...args) },
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeBook(overrides: Partial<BookMetadata> = {}): BookMetadata {
  return {
    id: crypto.randomUUID(),
    sessionId: 'default',
    title: 'Test Book',
    subTitle: '', otherTitle: '', author: 'Author', secondAuthor: '',
    editor: '', translator: '', illustrator: '', publisher: 'Pub',
    publishedYear: '2020', publishedYearBengali: '', isbn: '',
    category: '', genre: '', collection: 'FIC', itemType: 'BK',
    pageCount: '100', language: 'en', edition: '', publicationPlace: '',
    scanDate: '2026-01-01', summary: '',
    ...overrides,
  }
}

function makeRow(book: BookMetadata) {
  return {
    ...book,
    sub_title: book.subTitle,
    other_title: book.otherTitle,
    second_author: book.secondAuthor,
    published_year: book.publishedYear,
    published_year_bengali: book.publishedYearBengali,
    item_type: book.itemType,
    page_count: book.pageCount,
    publication_place: book.publicationPlace,
    scan_date: book.scanDate,
    session_id: book.sessionId === 'default' ? null : book.sessionId,
    user_id: 'user-1',
    image_urls: null,
    raw_ai_output: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  }
}

function setupFetchMock(books: BookMetadata[]) {
  const rows = books.map(makeRow)
  mockFrom.mockReturnValue({
    select: () => ({
      eq: () => ({
        order: () => Promise.resolve({ data: rows, error: null }),
      }),
    }),
    insert: () => mockInsertChain,
    update: () => mockUpdateChain,
    delete: () => mockDeleteChain,
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  mockUpdateChain.eq.mockResolvedValue({ error: null })
  mockDeleteChain.eq.mockResolvedValue({ error: null })
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useBookHistory', () => {
  it('returns empty list when userId is null', () => {
    setupFetchMock([])
    const { result } = renderHook(() => useBookHistory(null))
    expect(result.current.books).toHaveLength(0)
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('fetches books on mount when userId provided', async () => {
    const book = makeBook()
    setupFetchMock([book])
    const { result } = renderHook(() => useBookHistory('user-1'))
    await waitFor(() => expect(result.current.books).toHaveLength(1))
    expect(result.current.books[0].id).toBe(book.id)
  })

  it('fromBookRow maps session_id null → "default"', async () => {
    const book = makeBook({ sessionId: 'default' })
    setupFetchMock([book])
    const { result } = renderHook(() => useBookHistory('user-1'))
    await waitFor(() => expect(result.current.books).toHaveLength(1))
    expect(result.current.books[0].sessionId).toBe('default')
  })

  it('addBook optimistically prepends book', async () => {
    setupFetchMock([])
    const serverBook = makeBook()
    mockSingle.mockResolvedValue({ data: makeRow(serverBook), error: null })
    mockFrom.mockReturnValue({
      select: () => ({ eq: () => ({ order: () => Promise.resolve({ data: [], error: null }) }) }),
      insert: () => mockInsertChain,
    })
    const { result } = renderHook(() => useBookHistory('user-1'))
    await waitFor(() => expect(result.current.books).toHaveLength(0))
    act(() => { result.current.addBook(serverBook) })
    expect(result.current.books).toHaveLength(1)
  })

  it('addBook rolls back on error', async () => {
    setupFetchMock([])
    mockSingle.mockResolvedValue({ data: null, error: { message: 'fail' } })
    mockFrom.mockReturnValue({
      select: () => ({ eq: () => ({ order: () => Promise.resolve({ data: [], error: null }) }) }),
      insert: () => mockInsertChain,
    })
    const { result } = renderHook(() => useBookHistory('user-1'))
    await waitFor(() => expect(result.current.books).toHaveLength(0))
    const book = makeBook()
    await act(async () => { await result.current.addBook(book) })
    expect(result.current.books).toHaveLength(0)
  })

  it('deleteBook removes book from state', async () => {
    const book = makeBook()
    setupFetchMock([book])
    const { result } = renderHook(() => useBookHistory('user-1'))
    await waitFor(() => expect(result.current.books).toHaveLength(1))
    await act(async () => { await result.current.deleteBook(book.id) })
    expect(result.current.books).toHaveLength(0)
  })

  it('getBooksBySession filters by sessionId', async () => {
    const a = makeBook({ sessionId: 'sci-fi' })
    const b = makeBook({ sessionId: 'default' })
    setupFetchMock([a, b])
    const { result } = renderHook(() => useBookHistory('user-1'))
    await waitFor(() => expect(result.current.books).toHaveLength(2))
    expect(result.current.getBooksBySession('sci-fi')).toHaveLength(1)
    expect(result.current.getBooksBySession('default')).toHaveLength(1)
  })

  it('reassignBooksToSession updates sessionId in state', async () => {
    const book = makeBook({ sessionId: 'old' })
    setupFetchMock([book])
    mockFrom.mockReturnValue({
      select: () => ({ eq: () => ({ order: () => Promise.resolve({ data: [makeRow(book)], error: null }) }) }),
      update: () => ({ eq: () => ({ eq: () => Promise.resolve({ error: null }) }) }),
    })
    const { result } = renderHook(() => useBookHistory('user-1'))
    await waitFor(() => expect(result.current.books).toHaveLength(1))
    await act(async () => { await result.current.reassignBooksToSession('old', 'default') })
    expect(result.current.books[0].sessionId).toBe('default')
  })
})
