import { Lock } from 'lucide-react'

interface ScanDateFieldProps {
  date: string
}

export default function ScanDateField({ date }: ScanDateFieldProps) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">
        Scan Date
      </label>
      <div className="flex items-center gap-2 w-full rounded-lg bg-gray-50 border border-gray-100 px-3 py-2 text-sm text-gray-400">
        <Lock size={12} />
        <span>{date}</span>
      </div>
    </div>
  )
}
