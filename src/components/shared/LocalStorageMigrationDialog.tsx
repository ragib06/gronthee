import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { HardDriveDownload } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toBookRow, toSessionRow } from '@/lib/db-mappers'
import type { BookMetadata, Session } from '@/types'

const BOOKS_KEY = 'gronthee:books'
const SESSIONS_KEY = 'gronthee:sessions'
const MIGRATED_KEY = 'gronthee:migrated'

interface Props {
  userId: string
  onDone: () => void
}

function loadLocalBooks(): BookMetadata[] {
  try {
    const raw = JSON.parse(localStorage.getItem(BOOKS_KEY) ?? '[]') as BookMetadata[]
    return raw.map(b => b.sessionId ? b : { ...b, sessionId: 'default' })
  } catch {
    return []
  }
}

function loadLocalNonDefaultSessions(): Session[] {
  try {
    const raw = JSON.parse(localStorage.getItem(SESSIONS_KEY) ?? '[]') as Partial<Session>[]
    return (Array.isArray(raw) ? raw : [])
      .filter((s): s is Session => !!s.id && s.id !== 'default' && !!s.name)
      .map(s => ({
        id: s.id,
        name: s.name,
        createdAt: s.createdAt ?? new Date().toISOString(),
        configId: s.configId ?? 'dishari',
      }))
  } catch {
    return []
  }
}

export function hasPendingMigration(): boolean {
  if (localStorage.getItem(MIGRATED_KEY)) return false
  return !!localStorage.getItem(BOOKS_KEY) || loadLocalNonDefaultSessions().length > 0
}

export default function LocalStorageMigrationDialog({ userId, onDone }: Props) {
  const books = loadLocalBooks()
  const sessions = loadLocalNonDefaultSessions()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleImport() {
    setLoading(true)
    setError(null)

    if (sessions.length > 0) {
      const sessionRows = sessions.map(s => toSessionRow(s, userId))
      const { error: sessionError } = await supabase.from('sessions').upsert(sessionRows)
      if (sessionError) {
        setError(sessionError.message)
        setLoading(false)
        return
      }
    }

    if (books.length > 0) {
      const rows = books.map(b => toBookRow(b, userId))
      const { error: bookError } = await supabase.from('books').upsert(rows)
      if (bookError) {
        setError(bookError.message)
        setLoading(false)
        return
      }
    }

    localStorage.removeItem(BOOKS_KEY)
    localStorage.removeItem(SESSIONS_KEY)
    localStorage.setItem(MIGRATED_KEY, '1')
    setLoading(false)
    onDone()
  }

  function handleSkip() {
    localStorage.setItem(MIGRATED_KEY, '1')
    onDone()
  }

  const countParts: string[] = []
  if (books.length > 0) countParts.push(`${books.length} book${books.length !== 1 ? 's' : ''}`)
  if (sessions.length > 0) countParts.push(`${sessions.length} session${sessions.length !== 1 ? 's' : ''}`)
  const countText = countParts.join(' and ')

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="absolute inset-0 bg-black/50" />
        <motion.div
          className="relative bg-white rounded-xl shadow-xl w-full max-w-sm p-6"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <div className="flex items-start gap-3 mb-4">
            <div className="shrink-0 w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center mt-0.5">
              <HardDriveDownload size={18} className="text-indigo-600" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900">Import existing data?</h3>
              <p className="text-sm text-gray-500 mt-1">
                Found <span className="font-medium text-gray-700">{countText}</span> stored
                locally. Import them to your account?
              </p>
            </div>
          </div>
          {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={handleSkip}
              disabled={loading}
              className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              Skip
            </button>
            <button
              type="button"
              onClick={handleImport}
              disabled={loading}
              className="px-4 py-2 text-sm rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Importing…' : 'Import data'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
