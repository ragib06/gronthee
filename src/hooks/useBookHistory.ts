import { useState, useEffect } from 'react'
import type { BookMetadata } from '@/types'

const STORAGE_KEY = 'gronthee:books'

function load(): BookMetadata[] {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as BookMetadata[]
    // Migration: assign 'default' sessionId to any book that predates sessions
    return raw.map(b => b.sessionId ? b : { ...b, sessionId: 'default' })
  } catch {
    return []
  }
}

export function useBookHistory() {
  const [books, setBooks] = useState<BookMetadata[]>(load)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(books))
  }, [books])

  function addBook(book: BookMetadata) {
    setBooks(prev => [book, ...prev])
  }

  function updateBook(book: BookMetadata) {
    setBooks(prev => prev.map(b => b.id === book.id ? book : b))
  }

  function deleteBook(id: string) {
    setBooks(prev => prev.filter(b => b.id !== id))
  }

  function getBooksBySession(sessionId: string): BookMetadata[] {
    return books.filter(b => b.sessionId === sessionId)
  }

  function reassignBooksToSession(fromId: string, toId: string): void {
    setBooks(prev => prev.map(b => b.sessionId === fromId ? { ...b, sessionId: toId } : b))
  }

  return { books, addBook, updateBook, deleteBook, getBooksBySession, reassignBooksToSession }
}
