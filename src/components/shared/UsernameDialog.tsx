import { useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'

interface UsernameDialogProps {
  onSubmit: (username: string) => void
}

export default function UsernameDialog({ onSubmit }: UsernameDialogProps) {
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = value.trim()
    if (trimmed) onSubmit(trimmed)
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.div
        className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6"
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.15 }}
      >
        <h3 className="text-base font-semibold text-gray-900 mb-1">Welcome to Gronthee</h3>
        <p className="text-sm text-gray-500 mb-4">Enter a username to get started.</p>
        <form onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={e => setValue(e.target.value)}
            placeholder="Your username"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent mb-5"
            spellCheck={false}
          />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!value.trim()}
              className="px-4 py-2 text-sm rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              Continue
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}
