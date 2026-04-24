import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useBookHistory } from '@/hooks/useBookHistory'
import { useSessions } from '@/hooks/useSessions'
import type { BookMetadata } from '@/types'

const BOOKS_KEY = 'gronthee:books'
const SESSIONS_KEY = 'gronthee:sessions'
const CURRENT_KEY = 'gronthee:currentSessionId'

function makeLegacyBook(id: string, title: string): Omit<BookMetadata, 'sessionId'> {
  return {
    id, title, subTitle: '', otherTitle: '', author: 'A', secondAuthor: '',
    editor: '', translator: '', illustrator: '', publisher: 'P',
    publishedYear: '2020', publishedYearBengali: '', isbn: '123',
    category: 'Fiction', genre: 'Novel', collection: 'FIC', itemType: 'BK',
    pageCount: '100', language: 'en', edition: '1st', publicationPlace: 'Dhaka',
    scanDate: '2026-01-01', summary: 'S',
  }
}

beforeEach(() => {
  localStorage.clear()
})

describe('Backward compatibility — existing books without sessionId', () => {
  it('all legacy books are assigned sessionId=default on load', () => {
    const legacy = [makeLegacyBook('1', 'Old Book'), makeLegacyBook('2', 'Older Book')]
    localStorage.setItem(BOOKS_KEY, JSON.stringify(legacy))
    const { result } = renderHook(() => useBookHistory())
    result.current.books.forEach(b => {
      expect(b.sessionId).toBe('default')
    })
  })

  it('migrated books appear in getBooksBySession("default")', () => {
    const legacy = [makeLegacyBook('1', 'Old Book')]
    localStorage.setItem(BOOKS_KEY, JSON.stringify(legacy))
    const { result } = renderHook(() => useBookHistory())
    expect(result.current.getBooksBySession('default')).toHaveLength(1)
  })

  it('migration persists back to localStorage', () => {
    const legacy = [makeLegacyBook('1', 'Old Book')]
    localStorage.setItem(BOOKS_KEY, JSON.stringify(legacy))
    renderHook(() => useBookHistory())
    const stored = JSON.parse(localStorage.getItem(BOOKS_KEY)!) as BookMetadata[]
    expect(stored[0].sessionId).toBe('default')
  })
})

describe('Backward compatibility — sessions seeded from scratch', () => {
  it('Default session created on first load', () => {
    const { result } = renderHook(() => useSessions())
    expect(result.current.sessions).toHaveLength(1)
    expect(result.current.sessions[0].name).toBe('Default')
  })

  it('currentSessionId persisted to localStorage', () => {
    renderHook(() => useSessions())
    expect(localStorage.getItem(CURRENT_KEY)).toBe('default')
  })
})

describe('Session persistence across remount', () => {
  it('active session is restored after unmount and remount', () => {
    const stored = [
      { id: 'default', name: 'Default', createdAt: '' },
      { id: 'sci-fi', name: 'Sci-Fi', createdAt: '' },
    ]
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(stored))
    localStorage.setItem(CURRENT_KEY, 'sci-fi')

    const { result } = renderHook(() => useSessions())
    expect(result.current.currentSession.id).toBe('sci-fi')
  })
})

describe('Session delete reassigns books', () => {
  it('delete session + reassign books combined workflow', () => {
    const books: BookMetadata[] = [
      { ...makeLegacyBook('1', 'B1'), sessionId: 'old' },
      { ...makeLegacyBook('2', 'B2'), sessionId: 'old' },
    ]
    localStorage.setItem(BOOKS_KEY, JSON.stringify(books))
    localStorage.setItem(SESSIONS_KEY, JSON.stringify([
      { id: 'default', name: 'Default', createdAt: '' },
      { id: 'old', name: 'Old Session', createdAt: '' },
    ]))

    const { result: booksResult } = renderHook(() => useBookHistory())
    const { result: sessionsResult } = renderHook(() => useSessions())

    act(() => {
      booksResult.current.reassignBooksToSession('old', 'default')
      sessionsResult.current.deleteSession('old')
    })

    expect(booksResult.current.getBooksBySession('default')).toHaveLength(2)
    expect(booksResult.current.getBooksBySession('old')).toHaveLength(0)
    expect(sessionsResult.current.sessions.find(s => s.id === 'old')).toBeUndefined()
  })
})
