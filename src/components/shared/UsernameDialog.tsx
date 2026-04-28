import { useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'

interface UsernameDialogProps {
  onSubmit: (username: string, fullName: string | null) => void
}

export default function UsernameDialog({ onSubmit }: UsernameDialogProps) {
  const [username, setUsername] = useState('')
  const [fullName, setFullName] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmedUsername = username.trim()
    if (!trimmedUsername) return
    const trimmedFullName = fullName.trim()
    onSubmit(trimmedUsername, trimmedFullName || null)
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
        <p className="text-sm text-gray-500 mb-4">Set up your profile to get started.</p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Username <span className="text-gray-400">(letters and numbers only)</span>
            </label>
            <input
              ref={inputRef}
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value.replace(/[^A-Za-z0-9]/g, ''))}
              placeholder="yourname"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              spellCheck={false}
              autoComplete="off"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Full Name <span className="text-gray-400">(optional)</span>
            </label>
            <input
              type="text"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="Your name"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              autoComplete="name"
            />
          </div>
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={!username.trim()}
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
