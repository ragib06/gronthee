import { BookOpen } from 'lucide-react'
import type { Page, NavigateFn } from '@/App'

interface HeaderProps {
  currentPage: Page
  navigate: NavigateFn
}

export default function Header({ currentPage, navigate }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <button
          onClick={() => navigate('scan')}
          className="flex items-center gap-2 text-indigo-600 font-semibold text-lg"
        >
          <BookOpen size={22} />
          Gronthee
        </button>
        <nav className="flex items-center gap-6">
          {(['scan', 'history', 'configs'] as Page[]).map(p => (
            <button
              key={p}
              onClick={() => navigate(p)}
              className={`text-sm font-medium capitalize transition-colors ${
                currentPage === p
                  ? 'text-indigo-600'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              {p === 'scan' ? 'Scan' : p === 'history' ? 'History' : 'Configs'}
            </button>
          ))}
        </nav>
      </div>
    </header>
  )
}
