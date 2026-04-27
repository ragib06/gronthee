import { useState } from 'react'
import { BookOpen, Mail } from 'lucide-react'
import { motion } from 'motion/react'
import { useAuth } from '@/hooks/useAuth'

type Tab = 'magic' | 'password'
type PasswordMode = 'signin' | 'signup' | 'forgot'

export default function LoginPage() {
  const {
    signInWithMagicLink,
    signInWithPassword,
    signUpWithPassword,
    sendPasswordReset,
  } = useAuth()

  const [tab, setTab] = useState<Tab>('magic')
  const [mode, setMode] = useState<PasswordMode>('signin')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [magicSent, setMagicSent] = useState(false)

  function resetMessages() {
    setError(null)
    setInfo(null)
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = email.trim()
    if (!trimmed) return
    resetMessages()
    setLoading(true)
    const { error } = await signInWithMagicLink(trimmed)
    setLoading(false)
    if (error) setError(error.message)
    else setMagicSent(true)
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmedEmail = email.trim()
    if (!trimmedEmail) return
    resetMessages()

    if (mode === 'forgot') {
      setLoading(true)
      const { error } = await sendPasswordReset(trimmedEmail)
      setLoading(false)
      if (error) setError(error.message)
      else setInfo(`Password reset link sent to ${trimmedEmail}.`)
      return
    }

    if (!password) return

    if (mode === 'signup') {
      if (password.length < 8) {
        setError('Password must be at least 8 characters.')
        return
      }
      if (password !== confirm) {
        setError('Passwords do not match.')
        return
      }
      setLoading(true)
      const { data, error } = await signUpWithPassword(trimmedEmail, password)
      setLoading(false)
      if (error) {
        setError(error.message)
        return
      }
      if (data.session) {
        // Email confirmations disabled — already signed in.
        return
      }
      // Supabase obfuscates already-registered emails by returning a fake user
      // with no identities and no session, and sends no email. Detect and
      // direct the user to sign in or reset their password instead.
      if ((data.user?.identities?.length ?? 0) === 0) {
        setError('This email is already registered. Sign in, or use "Forgot password?" to set a new password.')
        return
      }
      setInfo(`Confirmation link sent to ${trimmedEmail}. Confirm to finish signing up.`)
      return
    }

    setLoading(true)
    const { error } = await signInWithPassword(trimmedEmail, password)
    setLoading(false)
    if (error) setError(error.message)
  }

  function selectTab(next: Tab) {
    setTab(next)
    setMode('signin')
    setMagicSent(false)
    resetMessages()
    setPassword('')
    setConfirm('')
  }

  function selectMode(next: PasswordMode) {
    setMode(next)
    resetMessages()
    setPassword('')
    setConfirm('')
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
          <div className="flex bg-gray-100 rounded-lg p-1 mb-5">
            <TabButton active={tab === 'magic'} onClick={() => selectTab('magic')}>
              Magic link
            </TabButton>
            <TabButton active={tab === 'password'} onClick={() => selectTab('password')}>
              Password
            </TabButton>
          </div>

          {tab === 'magic' ? (
            magicSent ? (
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
                  onClick={() => { setMagicSent(false); setEmail('') }}
                  className="mt-4 text-sm text-indigo-600 hover:text-indigo-700 underline underline-offset-2"
                >
                  Use a different email
                </button>
              </div>
            ) : (
              <>
                <h2 className="text-base font-semibold text-gray-900 mb-1">Sign in</h2>
                <p className="text-sm text-gray-500 mb-4">We'll send a magic link to your email.</p>
                <form onSubmit={handleMagicLink} className="space-y-4">
                  <EmailInput value={email} onChange={setEmail} />
                  {error && <p className="text-sm text-red-600">{error}</p>}
                  <PrimaryButton disabled={!email.trim() || loading}>
                    {loading ? 'Sending…' : 'Send magic link'}
                  </PrimaryButton>
                </form>
              </>
            )
          ) : (
            <>
              <h2 className="text-base font-semibold text-gray-900 mb-1">
                {mode === 'signin' && 'Sign in with password'}
                {mode === 'signup' && 'Create an account'}
                {mode === 'forgot' && 'Reset password'}
              </h2>
              <p className="text-sm text-gray-500 mb-4">
                {mode === 'signin' && 'Enter your email and password.'}
                {mode === 'signup' && 'Pick an email and a password (min 8 characters).'}
                {mode === 'forgot' && "We'll email you a link to set a new password."}
              </p>

              <form onSubmit={handlePasswordSubmit} className="space-y-3">
                <EmailInput value={email} onChange={setEmail} />

                {mode !== 'forgot' && (
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Password"
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                )}

                {mode === 'signup' && (
                  <input
                    type="password"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    placeholder="Confirm password"
                    autoComplete="new-password"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                )}

                {error && <p className="text-sm text-red-600">{error}</p>}
                {info && <p className="text-sm text-emerald-600">{info}</p>}

                <PrimaryButton
                  disabled={
                    loading ||
                    !email.trim() ||
                    (mode !== 'forgot' && !password) ||
                    (mode === 'signup' && !confirm)
                  }
                >
                  {loading
                    ? 'Working…'
                    : mode === 'signin'
                    ? 'Sign in'
                    : mode === 'signup'
                    ? 'Create account'
                    : 'Send reset link'}
                </PrimaryButton>
              </form>

              <div className="mt-4 flex flex-col items-center gap-2 text-sm">
                {mode === 'signin' && (
                  <>
                    <button
                      onClick={() => selectMode('forgot')}
                      className="text-indigo-600 hover:text-indigo-700 underline underline-offset-2"
                    >
                      Forgot password?
                    </button>
                    <span className="text-gray-500">
                      No account?{' '}
                      <button
                        onClick={() => selectMode('signup')}
                        className="text-indigo-600 hover:text-indigo-700 underline underline-offset-2"
                      >
                        Create one
                      </button>
                    </span>
                  </>
                )}
                {mode === 'signup' && (
                  <span className="text-gray-500">
                    Already have an account?{' '}
                    <button
                      onClick={() => selectMode('signin')}
                      className="text-indigo-600 hover:text-indigo-700 underline underline-offset-2"
                    >
                      Sign in
                    </button>
                  </span>
                )}
                {mode === 'forgot' && (
                  <button
                    onClick={() => selectMode('signin')}
                    className="text-indigo-600 hover:text-indigo-700 underline underline-offset-2"
                  >
                    Back to sign in
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  )
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 text-sm py-1.5 rounded-md transition-colors ${
        active ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
      }`}
    >
      {children}
    </button>
  )
}

function EmailInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="email"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder="you@example.com"
      autoFocus
      autoComplete="email"
      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
    />
  )
}

function PrimaryButton({
  disabled,
  children,
}: {
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className="w-full px-4 py-2 text-sm rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-colors"
    >
      {children}
    </button>
  )
}
