import { useState, type ReactNode } from 'react'
import Header from './Header'
import ResetDialog from '@/components/shared/ResetDialog'
import type { Page, NavigateFn } from '@/App'

interface AppShellProps {
  currentPage: Page
  navigate: NavigateFn
  children: ReactNode
}

const STORAGE_KEYS = [
  'gronthee-username',
  'gronthee:books',
  'gronthee:preferences',
  'gronthee:sessions',
  'gronthee:currentSessionId',
]

export default function AppShell({ currentPage, navigate, children }: AppShellProps) {
  const [resetOpen, setResetOpen] = useState(false)

  function handleReset() {
    STORAGE_KEYS.forEach(key => localStorage.removeItem(key))
    window.location.reload()
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header currentPage={currentPage} navigate={navigate} />
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8">
        {children}
      </main>
      <footer className="max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 flex justify-center">
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
