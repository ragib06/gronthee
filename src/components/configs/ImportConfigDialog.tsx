import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Upload } from 'lucide-react'
import type { ExportColumn, ExportConfig } from '@/types'
import { isValidationError, parseImported } from '@/services/exportConfig'

interface ImportConfigDialogProps {
  open: boolean
  onCancel: () => void
  onImport: (input: { name: string; description?: string; columns: ExportColumn[] }) => string | null
}

interface ImportConfigDialogInnerProps {
  onCancel: () => void
  onImport: ImportConfigDialogProps['onImport']
}

function ImportConfigDialogInner({ onCancel, onImport }: ImportConfigDialogInnerProps) {
  const [parsed, setParsed] = useState<ExportConfig | null>(null)
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    function handler(e: KeyboardEvent) { if (e.key === 'Escape') onCancel() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onCancel])

  async function handleFile(file: File) {
    setError(null)
    try {
      const text = await file.text()
      const result = parseImported(text)
      if (isValidationError(result)) {
        setParsed(null)
        setError(result.error)
        return
      }
      setParsed(result)
      setName(result.name)
    } catch {
      setParsed(null)
      setError('Could not read the file.')
    }
  }

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  function handleConfirm() {
    if (!parsed) return
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Name is required.')
      return
    }
    const err = onImport({
      name: trimmed,
      description: parsed.description,
      columns: parsed.columns,
    })
    if (err) setError(err)
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <motion.div
        className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6"
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.15 }}
      >
        <h3 className="text-base font-semibold text-gray-900 mb-1">Import Config</h3>
        <p className="text-sm text-gray-500 mb-4">
          Choose a Gronthee config JSON file to add it to your list.
        </p>

        <div className="mb-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            onChange={handleFileInputChange}
            aria-label="Config file"
            className="block w-full text-xs text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-indigo-50 file:text-indigo-700 file:text-xs hover:file:bg-indigo-100 cursor-pointer"
          />
        </div>

        {error && (
          <div className="mb-4 px-3 py-2 text-sm rounded-lg bg-red-50 border border-red-100 text-red-700">
            {error}
          </div>
        )}

        {parsed && (
          <div className="mb-5 space-y-3">
            <div>
              <label htmlFor="import-name" className="block text-xs font-medium text-gray-600 mb-1">
                Name
              </label>
              <input
                id="import-name"
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <p className="text-xs text-gray-500">
              {parsed.columns.length} column{parsed.columns.length === 1 ? '' : 's'}
              {parsed.description ? ` · ${parsed.description}` : ''}
            </p>
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!parsed}
            className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors"
          >
            <Upload size={14} />
            Import
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default function ImportConfigDialog({ open, onCancel, onImport }: ImportConfigDialogProps) {
  return (
    <AnimatePresence>
      {open && <ImportConfigDialogInner onCancel={onCancel} onImport={onImport} />}
    </AnimatePresence>
  )
}
