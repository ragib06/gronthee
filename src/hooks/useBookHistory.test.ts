import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useBookHistory } from './useBookHistory'
import type { BookMetadata } from '@/types'

const STORAGE_KEY = 'gronthee:books'

function makeBook(overrides: Partial<BookMetadata> = {}): BookMetadata {
  return {
    id: crypto.randomUUID(),
    sessionId: 'default',
    title: 'Test Book',
    subTitle: '',
    otherTitle: '',
    author: 'Test Author',
    secondAuthor: '',
    editor: '',
    translator: '',
    illustrator: '',
    publisher: 'Test Publisher',
    publishedYear: '2020',
    publishedYearBengali: '',
    isbn: '1234567890',
    category: 'Fiction',
    genre: 'Novel',
    collection: 'FIC',
    itemType: 'BK',
    pageCount: '200',
    language: 'en',
    edition: '1st',
    publicationPlace: 'Dhaka',
    scanDate: '2026-01-01',
    summary: 'A test book',
    ...overrides,
  }
}

beforeEach(() => {
  localStorage.clear()
})

describe('useBookHistory', () => {
  it('migration: books without sessionId get assigned default', () => {
    const legacy = [makeBook({ sessionId: undefined as unknown as string })]
    localStorage.setItem(STORAGE_KEY, JSON.stringify(legacy))
    const { result } = renderHook(() => useBookHistory())
    expect(result.current.books[0].sessionId).toBe('default')
  })

  it('migration: books that already have sessionId are not changed', () => {
    const book = makeBook({ sessionId: 'sci-fi' })
    localStorage.setItem(STORAGE_KEY, JSON.stringify([book]))
    const { result } = renderHook(() => useBookHistory())
    expect(result.current.books[0].sessionId).toBe('sci-fi')
  })

  it('addBook attaches the provided sessionId', () => {
    const { result } = renderHook(() => useBookHistory())
    const book = makeBook({ sessionId: 'poetry' })
    act(() => { result.current.addBook(book) })
    expect(result.current.books[0].sessionId).toBe('poetry')
  })

  it('getBooksBySession filters by sessionId', () => {
    const { result } = renderHook(() => useBookHistory())
    act(() => {
      result.current.addBook(makeBook({ sessionId: 'default' }))
      result.current.addBook(makeBook({ sessionId: 'sci-fi' }))
      result.current.addBook(makeBook({ sessionId: 'sci-fi' }))
    })
    expect(result.current.getBooksBySession('sci-fi')).toHaveLength(2)
    expect(result.current.getBooksBySession('default')).toHaveLength(1)
  })

  it('getBooksBySession returns migrated books under default', () => {
    const legacy = [makeBook({ sessionId: undefined as unknown as string })]
    localStorage.setItem(STORAGE_KEY, JSON.stringify(legacy))
    const { result } = renderHook(() => useBookHistory())
    expect(result.current.getBooksBySession('default')).toHaveLength(1)
  })

  it('reassignBooksToSession moves books to target session', () => {
    const { result } = renderHook(() => useBookHistory())
    act(() => {
      result.current.addBook(makeBook({ id: 'a', sessionId: 'old-session' }))
      result.current.addBook(makeBook({ id: 'b', sessionId: 'old-session' }))
      result.current.addBook(makeBook({ id: 'c', sessionId: 'other' }))
    })
    act(() => { result.current.reassignBooksToSession('old-session', 'default') })
    expect(result.current.getBooksBySession('default')).toHaveLength(2)
    expect(result.current.getBooksBySession('old-session')).toHaveLength(0)
    expect(result.current.getBooksBySession('other')).toHaveLength(1)
  })
})
