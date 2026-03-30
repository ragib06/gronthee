import { useState, useEffect } from 'react'
import type { BookMetadata } from '@/types'

const STORAGE_KEY = 'gronthee:books'

function load(): BookMetadata[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as BookMetadata[]
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

  return { books, addBook, updateBook, deleteBook }
}
