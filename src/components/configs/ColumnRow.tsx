import { ArrowDown, ArrowUp, GripVertical, Trash2 } from 'lucide-react'
import type { ExportColumn } from '@/types'
import { ALL_BOOK_FIELDS } from '@/services/exportConfig'

interface ColumnRowProps {
  column: ExportColumn
  index: number
  total: number
  onChange: (index: number, column: ExportColumn) => void
  onMoveUp: (index: number) => void
  onMoveDown: (index: number) => void
  onDelete: (index: number) => void
  onDragStart: (index: number) => void
  onDragOver: (index: number) => void
  onDrop: (index: number) => void
  isDragging: boolean
  isDragTarget: boolean
}

export default function ColumnRow({
  column,
  index,
  total,
  onChange,
  onMoveUp,
  onMoveDown,
  onDelete,
  onDragStart,
  onDragOver,
  onDrop,
  isDragging,
  isDragTarget,
}: ColumnRowProps) {
  function handleHeaderChange(e: React.ChangeEvent<HTMLInputElement>) {
    onChange(index, { ...column, header: e.target.value })
  }

  function handleTypeChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newType = e.target.value as 'mapped' | 'constant'
    if (newType === column.type) return
    if (newType === 'mapped') {
      onChange(index, { type: 'mapped', header: column.header, field: 'title' })
    } else {
      onChange(index, { type: 'constant', header: column.header, value: '' })
    }
  }

  function handleFieldChange(e: React.ChangeEvent<HTMLSelectElement>) {
    if (column.type !== 'mapped') return
    onChange(index, { ...column, field: e.target.value as typeof column.field })
  }

  function handleValueChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (column.type !== 'constant') return
    onChange(index, { ...column, value: e.target.value })
  }

  return (
    <div
      role="listitem"
      aria-label={`Column ${index + 1}`}
      draggable
      onDragStart={() => onDragStart(index)}
      onDragOver={e => {
        e.preventDefault()
        onDragOver(index)
      }}
      onDrop={e => {
        e.preventDefault()
        onDrop(index)
      }}
      className={`flex flex-col sm:flex-row gap-2 items-stretch sm:items-center px-2 py-2 rounded-lg border transition-colors ${
        isDragging
          ? 'opacity-50 border-indigo-300 bg-indigo-50'
          : isDragTarget
          ? 'border-indigo-400 bg-indigo-50/40'
          : 'border-gray-100 bg-white'
      }`}
    >
      <div className="flex items-center gap-1 shrink-0">
        <span
          className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500"
          title="Drag to reorder"
          aria-hidden
        >
          <GripVertical size={14} />
        </span>
        <button
          type="button"
          onClick={() => onMoveUp(index)}
          disabled={index === 0}
          className="p-0.5 rounded text-gray-400 hover:text-indigo-600 disabled:opacity-30 disabled:hover:text-gray-400 transition-colors"
          title="Move up"
          aria-label={`Move column ${index + 1} up`}
        >
          <ArrowUp size={12} />
        </button>
        <button
          type="button"
          onClick={() => onMoveDown(index)}
          disabled={index === total - 1}
          className="p-0.5 rounded text-gray-400 hover:text-indigo-600 disabled:opacity-30 disabled:hover:text-gray-400 transition-colors"
          title="Move down"
          aria-label={`Move column ${index + 1} down`}
        >
          <ArrowDown size={12} />
        </button>
      </div>

      <input
        type="text"
        value={column.header}
        onChange={handleHeaderChange}
        placeholder="Column header"
        aria-label={`Column ${index + 1} header`}
        className="flex-1 min-w-0 text-sm border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
      />

      <select
        value={column.type}
        onChange={handleTypeChange}
        aria-label={`Column ${index + 1} type`}
        className="text-sm border border-gray-200 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
      >
        <option value="mapped">Mapped</option>
        <option value="constant">Constant</option>
      </select>

      {column.type === 'mapped' ? (
        <select
          value={column.field}
          onChange={handleFieldChange}
          aria-label={`Column ${index + 1} field`}
          className="text-sm border border-gray-200 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          {ALL_BOOK_FIELDS.map(f => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
      ) : (
        <input
          type="text"
          value={column.value}
          onChange={handleValueChange}
          placeholder="Constant value"
          aria-label={`Column ${index + 1} value`}
          className="flex-1 min-w-0 text-sm border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      )}

      <button
        type="button"
        onClick={() => onDelete(index)}
        className="shrink-0 p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
        title="Remove column"
        aria-label={`Remove column ${index + 1}`}
      >
        <Trash2 size={14} />
      </button>
    </div>
  )
}
