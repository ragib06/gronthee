import { useState } from 'react'
import { BookOpen, Mail } from 'lucide-react'
import { motion } from 'motion/react'
import { useAuth } from '@/hooks/useAuth'

export default function LoginPage() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = email.trim()
    if (!trimmed) return
    setLoading(true)
    setError(null)
    const { error } = await signIn(trimmed)
    setLoading(false)
    if (error) {
      setError(error.message)
    } else {
      setSent(true)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <motion.div
        className="w-full max-w-sm"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <div className="flex items-center justify-center gap-2 mb-8">
          <BookOpen size={28} className="text-indigo-600" />
          <span className="text-2xl font-semibold text-gray-900">Gronthee</span>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          {sent ? (
            <div className="text-center py-2">
              <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center mx-auto mb-4">
                <Mail size={22} className="text-indigo-600" />
              </div>
              <h2 className="text-base font-semibold text-gray-900 mb-1">Check your email</h2>
              <p className="text-sm text-gray-500">
                Magic link sent to <span className="font-medium text-gray-700">{email}</span>.
                Click the link to sign in.
              </p>
              <button
                onClick={() => { setSent(false); setEmail('') }}
                className="mt-4 text-sm text-indigo-600 hover:text-indigo-700 underline underline-offset-2"
              >
                Use a different email
              </button>
            </div>
          ) : (
            <>
              <h2 className="text-base font-semibold text-gray-900 mb-1">Sign in</h2>
              <p className="text-sm text-gray-500 mb-4">We'll send a magic link to your email.</p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoFocus
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                {error && (
                  <p className="text-sm text-red-600">{error}</p>
                )}
                <button
                  type="submit"
                  disabled={!email.trim() || loading}
                  className="w-full px-4 py-2 text-sm rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Sending…' : 'Send magic link'}
                </button>
              </form>
            </>
          )}
        </div>
      </motion.div>
    </div>
  )
}
