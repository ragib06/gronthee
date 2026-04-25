import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Plus } from 'lucide-react'
import type { ExportConfig } from '@/types'

const MAX_NAME_LENGTH = 50
const DEFAULT_CONFIG_ID = 'dishari'

interface CreateSessionDialogProps {
  open: boolean
  configs: ExportConfig[]
  onCancel: () => void
  onCreate: (name: string, configId: string) => string | null
}

interface InnerProps {
  configs: ExportConfig[]
  onCancel: () => void
  onCreate: CreateSessionDialogProps['onCreate']
}

function CreateSessionDialogInner({ configs, onCancel, onCreate }: InnerProps) {
  const [name, setName] = useState('')
  const [configId, setConfigId] = useState<string>(() =>
    configs.some(c => c.id === DEFAULT_CONFIG_ID) ? DEFAULT_CONFIG_ID : (configs[0]?.id ?? DEFAULT_CONFIG_ID)
  )
  const [error, setError] = useState<string | null>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setTimeout(() => nameInputRef.current?.focus(), 0)
  }, [])

  useEffect(() => {
    function handler(e: KeyboardEvent) { if (e.key === 'Escape') onCancel() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onCancel])

  function handleConfirm() {
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Name is required.')
      return
    }
    const err = onCreate(trimmed, configId)
    if (err) setError(err)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleConfirm()
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
        className="relative bg-white rounded-xl shadow-xl w-full max-w-sm p-6"
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.15 }}
      >
        <h3 className="text-base font-semibold text-gray-900 mb-1">New Session</h3>
        <p className="text-sm text-gray-500 mb-4">
          Pick the export config this session should use when exporting to CSV.
        </p>

        <div className="space-y-3 mb-5">
          <div>
            <label htmlFor="new-session-name" className="block text-xs font-medium text-gray-600 mb-1">
              Name
            </label>
            <input
              id="new-session-name"
              ref={nameInputRef}
              type="text"
              value={name}
              onChange={e => setName(e.target.value.slice(0, MAX_NAME_LENGTH))}
              onKeyDown={handleKeyDown}
              maxLength={MAX_NAME_LENGTH}
              placeholder="e.g. Sci-Fi"
              className="w-full text-sm border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label htmlFor="new-session-config" className="block text-xs font-medium text-gray-600 mb-1">
              Export Config
            </label>
            <select
              id="new-session-config"
              value={configId}
              onChange={e => setConfigId(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
            >
              {configs.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <div className="mb-4 px-3 py-2 text-sm rounded-lg bg-red-50 border border-red-100 text-red-700">
            {error}
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
            disabled={!name.trim()}
            className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors"
          >
            <Plus size={14} />
            Create
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default function CreateSessionDialog({ open, configs, onCancel, onCreate }: CreateSessionDialogProps) {
  return (
    <AnimatePresence>
      {open && <CreateSessionDialogInner configs={configs} onCancel={onCancel} onCreate={onCreate} />}
    </AnimatePresence>
  )
}
