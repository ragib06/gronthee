import { useEffect, useState } from 'react'
import { BookOpen } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function AuthCallback() {
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('code')
    if (!code) {
      setError('No auth code found in URL.')
      return
    }
    supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      if (error) {
        setError(error.message)
      } else {
        window.location.replace('/')
      }
    })
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center">
        <BookOpen size={28} className="text-indigo-600 mx-auto mb-4" />
        {error ? (
          <>
            <p className="text-sm text-red-600 mb-3">{error}</p>
            <a href="/" className="text-sm text-indigo-600 underline underline-offset-2">
              Back to sign in
            </a>
          </>
        ) : (
          <p className="text-sm text-gray-500">Signing you in…</p>
        )}
      </div>
    </div>
  )
}
