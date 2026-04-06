import { useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'

interface PagesDialogProps {
  onSubmit: (pageCount: string) => void
}

export default function PagesDialog({ onSubmit }: PagesDialogProps) {
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const [viewport, setViewport] = useState<{ height: number; offsetTop: number } | null>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return

    function update() {
      setViewport({ height: vv!.height, offsetTop: vv!.offsetTop })
    }

    update()
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
    }
  }, [])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSubmit(value.trim())
  }

  const overlayStyle = viewport
    ? { top: viewport.offsetTop, height: viewport.height }
    : undefined

  return (
    <motion.div
      className="fixed inset-x-0 z-50 flex items-center justify-center p-4 bg-black/40"
      style={overlayStyle}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.div
        className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6"
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.15 }}
      >
        <h3 className="text-base font-semibold text-gray-900 mb-1">Number of Pages</h3>
        <p className="text-sm text-gray-500 mb-4">How many pages does this book have? You can leave this empty.</p>
        <form onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="number"
            min="1"
            value={value}
            onChange={e => setValue(e.target.value)}
            placeholder="e.g. 320"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent mb-5"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => onSubmit('')}
              className="px-4 py-2 text-sm rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
            >
              Skip
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
            >
              Continue
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}
