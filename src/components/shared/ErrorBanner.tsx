import { X } from 'lucide-react'

interface ErrorBannerProps {
  message: string
  onDismiss: () => void
}

export default function ErrorBanner({ message, onDismiss }: ErrorBannerProps) {
  return (
    <div className="flex items-start gap-3 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
      <span className="flex-1">{message}</span>
      <button onClick={onDismiss} className="text-red-400 hover:text-red-600 shrink-0" aria-label="Dismiss error">
        <X size={16} />
      </button>
    </div>
  )
}
