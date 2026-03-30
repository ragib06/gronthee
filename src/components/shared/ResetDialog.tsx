import { useEffect } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { TriangleAlert } from 'lucide-react'

interface ResetDialogProps {
  open: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ResetDialog({ open, onConfirm, onCancel }: ResetDialogProps) {
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onCancel])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
          <motion.div
            className="relative bg-white rounded-xl shadow-xl w-full max-w-sm p-6"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <div className="flex items-start gap-3 mb-4">
              <div className="shrink-0 w-9 h-9 rounded-full bg-red-100 flex items-center justify-center mt-0.5">
                <TriangleAlert size={18} className="text-red-600" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">Reset all data?</h3>
                <p className="text-sm text-gray-500 mt-1">
                  This will permanently delete:
                </p>
                <ul className="mt-2 text-sm text-gray-500 space-y-1 list-disc list-inside">
                  <li>Your username</li>
                  <li>All scanned book history</li>
                  <li>All saved edit preferences</li>
                </ul>
                <p className="text-sm font-medium text-red-600 mt-3">
                  This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className="px-4 py-2 text-sm rounded-lg text-white bg-red-600 hover:bg-red-700 transition-colors"
              >
                Reset everything
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
