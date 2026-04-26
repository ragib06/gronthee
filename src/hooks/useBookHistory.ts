import { useState, useEffect } from 'react'
import type { BookMetadata } from '@/types'
import { supabase } from '@/lib/supabase'
import { toBookRow, fromBookRow } from '@/lib/db-mappers'

export function useBookHistory(userId: string | null) {
  const [books, setBooks] = useState<BookMetadata[]>([])

  useEffect(() => {
    if (!userId) { setBooks([]); return }
    supabase
      .from('books')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .then(({ data }) => setBooks((data ?? []).map(fromBookRow)))
  }, [userId])

  async function addBook(book: BookMetadata) {
    if (!userId) return
    setBooks(prev => [book, ...prev])
    const { data, error } = await supabase
      .from('books')
      .insert(toBookRow(book, userId))
      .select()
      .single()
    if (error) {
      setBooks(prev => prev.filter(b => b.id !== book.id))
    } else if (data) {
      setBooks(prev => prev.map(b => b.id === book.id ? fromBookRow(data) : b))
    }
  }

  async function updateBook(book: BookMetadata) {
    if (!userId) return
    setBooks(prev => prev.map(b => b.id === book.id ? book : b))
    await supabase.from('books').update(toBookRow(book, userId)).eq('id', book.id)
  }

  async function deleteBook(id: string) {
    if (!userId) return
    setBooks(prev => prev.filter(b => b.id !== id))
    await supabase.from('books').delete().eq('id', id)
  }

  function getBooksBySession(sessionId: string): BookMetadata[] {
    return books.filter(b => b.sessionId === sessionId)
  }

  async function reassignBooksToSession(fromId: string, toId: string) {
    if (!userId) return
    setBooks(prev => prev.map(b => b.sessionId === fromId ? { ...b, sessionId: toId } : b))
    const toDbId = toId === 'default' ? null : toId
    // Filter by session_id: null requires .is(), not .eq()
    if (fromId === 'default') {
      await supabase
        .from('books')
        .update({ session_id: toDbId })
        .eq('user_id', userId)
        .is('session_id', null)
    } else {
      await supabase
        .from('books')
        .update({ session_id: toDbId })
        .eq('user_id', userId)
        .eq('session_id', fromId)
    }
  }

  return { books, addBook, updateBook, deleteBook, getBooksBySession, reassignBooksToSession }
}
