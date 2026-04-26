import { useState, type ReactNode } from 'react'
import Header from './Header'
import ResetDialog from '@/components/shared/ResetDialog'
import type { Page, NavigateFn } from '@/App'

interface AppShellProps {
  currentPage: Page
  navigate: NavigateFn
  onSignOut: () => void
  children: ReactNode
}

const STORAGE_KEYS = [
  'gronthee:books',
  'gronthee:preferences',
  'gronthee:sessions',
  'gronthee:currentSessionId',
  'gronthee:exportConfigs',
  'gronthee:selectedModel',
]

export default function AppShell({ currentPage, navigate, onSignOut, children }: AppShellProps) {
  const [resetOpen, setResetOpen] = useState(false)

  function handleReset() {
    STORAGE_KEYS.forEach(key => localStorage.removeItem(key))
    onSignOut()
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header currentPage={currentPage} navigate={navigate} />
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8">
        {children}
      </main>
      <footer className="max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 flex items-center justify-center gap-6">
        <button
          onClick={onSignOut}
          className="text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2 transition-colors"
        >
          Sign out
        </button>
        <button
          onClick={() => setResetOpen(true)}
          className="text-xs text-red-400 hover:text-red-600 underline underline-offset-2 transition-colors"
        >
          Reset all data
        </button>
      </footer>
      <ResetDialog
        open={resetOpen}
        onConfirm={handleReset}
        onCancel={() => setResetOpen(false)}
      />
    </div>
  )
}
