import { useEffect, useState } from 'react'
import { BookOpen } from 'lucide-react'
import { motion } from 'motion/react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

export default function ResetPasswordPage() {
  const { updatePassword } = useAuth()
  const [ready, setReady] = useState(false)
  const [tokenError, setTokenError] = useState<string | null>(null)

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    let cancelled = false

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return
      if (session) setReady(true)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
        setReady(true)
      }
    })

    const timeout = window.setTimeout(() => {
      if (cancelled) return
      setReady(prev => {
        if (!prev) setTokenError('Reset link is invalid or expired. Request a new one from the sign-in page.')
        return prev
      })
    }, 3000)

    return () => {
      cancelled = true
      subscription.unsubscribe()
      window.clearTimeout(timeout)
    }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    setLoading(true)
    const { error } = await updatePassword(password)
    setLoading(false)
    if (error) {
      setError(error.message)
      return
    }
    setDone(true)
    window.setTimeout(() => window.location.replace('/'), 1500)
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
          <h2 className="text-base font-semibold text-gray-900 mb-1">Set new password</h2>
          <p className="text-sm text-gray-500 mb-4">Pick a new password (min 8 characters).</p>

          {tokenError ? (
            <>
              <p className="text-sm text-red-600">{tokenError}</p>
              <a
                href="/"
                className="mt-4 inline-block text-sm text-indigo-600 hover:text-indigo-700 underline underline-offset-2"
              >
                Back to sign in
              </a>
            </>
          ) : !ready ? (
            <p className="text-sm text-gray-500">Verifying reset link…</p>
          ) : done ? (
            <p className="text-sm text-emerald-600">Password updated. Redirecting…</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="New password"
                autoComplete="new-password"
                autoFocus
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Confirm new password"
                autoComplete="new-password"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button
                type="submit"
                disabled={loading || !password || !confirm}
                className="w-full px-4 py-2 text-sm rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Updating…' : 'Update password'}
              </button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  )
}
