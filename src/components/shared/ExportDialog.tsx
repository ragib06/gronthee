import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'

interface ExportDialogProps {
  open: boolean
  defaultFilename: string
  onExport: (filename: string) => void
  onCancel: () => void
}

export default function ExportDialog({ open, defaultFilename, onExport, onCancel }: ExportDialogProps) {
  const [filename, setFilename] = useState(defaultFilename)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setFilename(defaultFilename)
      setTimeout(() => {
        inputRef.current?.focus()
        // Select the name portion before .csv
        const end = defaultFilename.endsWith('.csv') ? defaultFilename.length - 4 : defaultFilename.length
        inputRef.current?.setSelectionRange(0, end)
      }, 50)
    }
  }, [open, defaultFilename])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onCancel])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = filename.trim()
    if (trimmed) onExport(trimmed)
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
            <p className="text-sm text-gray-500 mb-4">Edit the filename before saving.</p>
            <form onSubmit={handleSubmit}>
              <input
                ref={inputRef}
                type="text"
                value={filename}
                onChange={e => setFilename(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent mb-5"
                placeholder="filename.csv"
                spellCheck={false}
              />
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onCancel}
                  className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!filename.trim()}
                  className="px-4 py-2 text-sm rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  Save
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
