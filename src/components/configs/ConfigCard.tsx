import { Pencil, Copy, Share2, Trash2 } from 'lucide-react'
import type { ExportConfig } from '@/types'

interface ConfigCardProps {
  config: ExportConfig
  onEdit: (id: string) => void
  onClone: (id: string) => void
  onShare: (id: string) => void
  onDelete: (id: string) => void
}

export default function ConfigCard({ config, onEdit, onClone, onShare, onDelete }: ConfigCardProps) {
  const isBuiltIn = config.builtIn === true
  const columnCount = config.columns.length

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-900 truncate">{config.name}</h3>
            {isBuiltIn && (
              <span className="shrink-0 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide rounded bg-indigo-50 text-indigo-700">
                Built-in
              </span>
            )}
          </div>
          {config.description && (
            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{config.description}</p>
          )}
          <p className="text-xs text-gray-400 mt-1">
            {columnCount} column{columnCount === 1 ? '' : 's'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1 -mb-1">
        {!isBuiltIn && (
          <button
            onClick={() => onEdit(config.id)}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md text-gray-600 hover:text-indigo-700 hover:bg-indigo-50 transition-colors"
            title="Edit config"
          >
            <Pencil size={12} />
            Edit
          </button>
        )}
        <button
          onClick={() => onClone(config.id)}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md text-gray-600 hover:text-indigo-700 hover:bg-indigo-50 transition-colors"
          title="Clone config"
        >
          <Copy size={12} />
          Clone
        </button>
        <button
          onClick={() => onShare(config.id)}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md text-gray-600 hover:text-indigo-700 hover:bg-indigo-50 transition-colors"
          title="Share config"
        >
          <Share2 size={12} />
          Share
        </button>
        {!isBuiltIn && (
          <button
            onClick={() => onDelete(config.id)}
            className="ml-auto flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
            title="Delete config"
          >
            <Trash2 size={12} />
            Delete
          </button>
        )}
      </div>
    </div>
  )
}
