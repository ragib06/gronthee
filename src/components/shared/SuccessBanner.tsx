import { CheckCircle, X } from 'lucide-react'

interface SuccessBannerProps {
  message: string
  onDismiss: () => void
}

export default function SuccessBanner({ message, onDismiss }: SuccessBannerProps) {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
      <CheckCircle size={16} className="shrink-0" />
      <span className="flex-1">{message}</span>
      <button onClick={onDismiss} className="text-green-400 hover:text-green-600 shrink-0" aria-label="Dismiss">
        <X size={16} />
      </button>
    </div>
  )
}
