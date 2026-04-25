import { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import { BookOpen, Download, Search } from 'lucide-react'
import type { NavigateFn } from '@/App'
import type { BookMetadata, ExportConfig, Session } from '@/types'
import BookCard from './BookCard'
import BookDetailModal from './BookDetailModal'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import ExportSessionDialog from '@/components/shared/ExportSessionDialog'
import SuccessBanner from '@/components/shared/SuccessBanner'

type SortKey = 'date-desc' | 'date-asc' | 'title-asc' | 'title-desc'

interface HistoryPageProps {
  navigate: NavigateFn
  books: BookMetadata[]
  sessions: Session[]
  getConfig: (id: string) => ExportConfig
  onDelete: (id: string) => void
  username: string
  flashMessage?: string
}

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.05,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.2 } },
}

function sortBooks(books: BookMetadata[], sort: SortKey): BookMetadata[] {
  return [...books].sort((a, b) => {
    switch (sort) {
      case 'date-desc': return b.scanDate.localeCompare(a.scanDate)
      case 'date-asc':  return a.scanDate.localeCompare(b.scanDate)
      case 'title-asc': return a.title.localeCompare(b.title)
      case 'title-desc': return b.title.localeCompare(a.title)
    }
  })
}

export default function HistoryPage({ navigate, books, sessions, getConfig, onDelete, username, flashMessage }: HistoryPageProps) {
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortKey>('date-desc')
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
  const [selectedBook, setSelectedBook] = useState<BookMetadata | null>(null)
  const [exportOpen, setExportOpen] = useState(false)
  const [sessionFilter, setSessionFilter] = useState<string | null>(null) // null = All
  const [banner, setBanner] = useState(flashMessage ?? '')

  useEffect(() => {
    if (!flashMessage) return
    const t = setTimeout(() => {
      setBanner(flashMessage)
      const clear = setTimeout(() => setBanner(''), 4000)
      return () => clearTimeout(clear)
    }, 0)
    return () => clearTimeout(t)
  }, [flashMessage])

  const visibleBooks = sessionFilter ? books.filter(b => b.sessionId === sessionFilter) : books

  const filtered = sortBooks(
    visibleBooks.filter(b => {
      const q = search.toLowerCase()
      return b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q)
    }),
    sort
  )

  function handleConfirmDelete() {
    if (deleteTargetId) {
      onDelete(deleteTargetId)
      setDeleteTargetId(null)
      if (selectedBook?.id === deleteTargetId) setSelectedBook(null)
    }
  }

  function handleEdit(book: BookMetadata) {
    setSelectedBook(null)
    navigate('editor', { book, pendingImages: [] })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
    >
      {/* Success banner */}
      {banner && (
        <div className="mb-4">
          <SuccessBanner message={banner} onDismiss={() => setBanner('')} />
        </div>
      )}

      {/* Top bar */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold text-gray-900">
          My Books <span className="text-gray-400 font-normal text-lg">({books.length})</span>
        </h1>
        <button
          className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
          onClick={() => setExportOpen(true)}
          disabled={books.length === 0}
        >
          <Download size={15} />
          Export CSV
        </button>
      </div>

      {/* Session filter chips */}
      {sessions.length > 1 && (
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1 scrollbar-hide">
          <button
            onClick={() => setSessionFilter(null)}
            className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              sessionFilter === null
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          {sessions.slice(0, 15).map(session => (
            <button
              key={session.id}
              onClick={() => setSessionFilter(session.id)}
              className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                sessionFilter === session.id
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {session.name}
            </button>
          ))}
        </div>
      )}

      {/* Search + Sort */}
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by title or author…"
            className="w-full rounded-lg border border-gray-200 pl-9 pr-4 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
        <select
          value={sort}
          onChange={e => setSort(e.target.value as SortKey)}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          aria-label="Sort books"
        >
          <option value="date-desc">Newest first</option>
          <option value="date-asc">Oldest first</option>
          <option value="title-asc">Title A–Z</option>
          <option value="title-desc">Title Z–A</option>
        </select>
      </div>

      {/* Empty state */}
      {books.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
          <div className="w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center">
            <BookOpen size={28} className="text-indigo-400" />
          </div>
          <div>
            <p className="text-base font-medium text-gray-700">No books scanned yet</p>
            <p className="text-sm text-gray-400 mt-1">Start by scanning a book cover.</p>
          </div>
          <button
            onClick={() => navigate('scan')}
            className="mt-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Scan a Book
          </button>
        </div>
      ) : (
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {filtered.map(book => (
            <motion.div key={book.id} variants={itemVariants}>
              <BookCard
                book={book}
                onClick={() => setSelectedBook(book)}
                onDelete={() => setDeleteTargetId(book.id)}
              />
            </motion.div>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full text-center py-12 text-sm text-gray-400">
              No books match your search.
            </div>
          )}
        </motion.div>
      )}

      {/* Export dialog */}
      <ExportSessionDialog
        open={exportOpen}
        sessions={sessions}
        books={books}
        username={username}
        getConfig={getConfig}
        onCancel={() => setExportOpen(false)}
      />

      {/* Delete confirmation */}
      <ConfirmDialog
        open={deleteTargetId !== null}
        title="Delete Book"
        message="Are you sure you want to delete this book? This action cannot be undone."
        confirmLabel="Delete"
        danger
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTargetId(null)}
      />

      {/* Detail modal */}
      <BookDetailModal
        book={selectedBook}
        onClose={() => setSelectedBook(null)}
        onEdit={handleEdit}
      />
    </motion.div>
  )
}
