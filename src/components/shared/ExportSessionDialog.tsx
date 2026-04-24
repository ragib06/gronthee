import { useEffect } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Download } from 'lucide-react'
import type { BookMetadata, Session } from '@/types'
import { exportSessionsToCsv } from '@/services/csv'

interface ExportSessionDialogProps {
  open: boolean
  sessions: Session[]
  books: BookMetadata[]
  username: string
  onCancel: () => void
}

export default function ExportSessionDialog({
  open,
  sessions,
  books,
  username,
  onCancel,
}: ExportSessionDialogProps) {
  useEffect(() => {
    if (!open) return
    function handler(e: KeyboardEvent) { if (e.key === 'Escape') onCancel() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onCancel])

  function handleDownload(session: Session) {
    exportSessionsToCsv([session], books, username)
  }

  function bookCount(sessionId: string): number {
    return books.filter(b => b.sessionId === sessionId).length
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
          <motion.div
            className="relative bg-white rounded-xl shadow-xl w-full max-w-sm p-6"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <h3 className="text-base font-semibold text-gray-900 mb-1">Export CSV</h3>
            <p className="text-sm text-gray-500 mb-4">
              Download a CSV file for each session.
            </p>

            {/* Session list */}
            <ul className="border border-gray-100 rounded-lg divide-y divide-gray-50 mb-5 max-h-52 overflow-y-auto">
              {sessions.map(session => {
                const count = bookCount(session.id)
                return (
                  <li key={session.id} className="flex items-center gap-3 px-3 py-2.5">
                    <span className="flex-1 text-sm text-gray-800 truncate">{session.name}</span>
                    <span className="text-xs text-gray-400 shrink-0">{count} book{count !== 1 ? 's' : ''}</span>
                    <button
                      onClick={() => handleDownload(session)}
                      className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition-colors"
                      title={`Download ${session.name}`}
                    >
                      <Download size={12} />
                      Export
                    </button>
                  </li>
                )
              })}
            </ul>

            {/* Actions */}
            <div className="flex justify-end">
              <button
                onClick={onCancel}
                className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
