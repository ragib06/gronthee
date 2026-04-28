import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { TriangleAlert } from 'lucide-react'

interface ResetDialogProps {
  open: boolean
  onConfirm: (deleteAccount: boolean) => void
  onCancel: () => void
}

export default function ResetDialog({ open, onConfirm, onCancel }: ResetDialogProps) {
  const [deleteAccount, setDeleteAccount] = useState(false)

  useEffect(() => {
    if (!open) return
    setDeleteAccount(false)
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

            <label className="flex items-start gap-2 mb-5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={deleteAccount}
                onChange={e => setDeleteAccount(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
              />
              <span className="text-sm text-gray-700">
                Delete my account
                <span className="block text-xs text-gray-400">
                  Also remove the user record from the database. You'll need to sign up again to use Gronthee.
                </span>
              </span>
            </label>

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
                onClick={() => onConfirm(deleteAccount)}
                className="px-4 py-2 text-sm rounded-lg text-white bg-red-600 hover:bg-red-700 transition-colors"
              >
                {deleteAccount ? 'Delete account' : 'Reset everything'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
