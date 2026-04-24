import { useEffect } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import type { Session } from '@/types'

interface DeleteSessionDialogProps {
  session: Session | null
  bookCount: number
  onConfirm: () => void
  onCancel: () => void
}

export default function DeleteSessionDialog({
  session,
  bookCount,
  onConfirm,
  onCancel,
}: DeleteSessionDialogProps) {
  const open = session !== null

  useEffect(() => {
    if (!open) return
    function handler(e: KeyboardEvent) { if (e.key === 'Escape') onCancel() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onCancel])

  const bookNote =
    bookCount === 0
      ? 'This session has no books.'
      : bookCount === 1
        ? 'This session has 1 book. It will be moved to Default.'
        : `This session has ${bookCount} books. They will be moved to Default.`

  return (
    <AnimatePresence>
      {open && session && (
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
            <h3 className="text-base font-semibold text-gray-900 mb-2">
              Delete session &ldquo;{session.name}&rdquo;?
            </h3>
            <p className="text-sm text-gray-500 mb-1">{bookNote}</p>
            <p className="text-sm text-gray-500 mb-6">This cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={onCancel}
                className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                className="px-4 py-2 text-sm rounded-lg text-white bg-red-600 hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
