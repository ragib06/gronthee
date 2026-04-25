import { useState } from 'react'
import { motion } from 'motion/react'
import { ArrowLeft, Plus } from 'lucide-react'
import type { ExportColumn, ExportConfig } from '@/types'
import ColumnRow from './ColumnRow'

interface ConfigEditorProps {
  mode: 'create' | 'edit'
  initial?: ExportConfig
  existingNames: string[]
  onCancel: () => void
  onSave: (input: { name: string; description?: string; columns: ExportColumn[] }) => string | null
}

const MAX_NAME_LENGTH = 80
const MAX_DESCRIPTION_LENGTH = 200
const MAX_HEADER_LENGTH = 200

const SCAFFOLD_COLUMN: ExportColumn = { type: 'mapped', header: 'Title', field: 'title' }

export default function ConfigEditor({
  mode,
  initial,
  existingNames,
  onCancel,
  onSave,
}: ConfigEditorProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [columns, setColumns] = useState<ExportColumn[]>(
    initial ? initial.columns.map(c => ({ ...c })) : [{ ...SCAFFOLD_COLUMN }]
  )
  const [error, setError] = useState<string | null>(null)
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  const existingLower = existingNames.map(n => n.toLowerCase())

  function validate(): string | null {
    const trimmed = name.trim()
    if (!trimmed) return 'Name is required.'
    if (existingLower.includes(trimmed.toLowerCase())) return 'A config with that name already exists.'
    if (columns.length === 0) return 'At least one column is required.'
    for (let i = 0; i < columns.length; i++) {
      const col = columns[i]
      if (!col.header.trim()) return `Column ${i + 1}: header is required.`
      if (col.header.length > MAX_HEADER_LENGTH) return `Column ${i + 1}: header is too long.`
    }
    return null
  }

  function handleSave() {
    const err = validate()
    if (err) {
      setError(err)
      return
    }
    const cleanedColumns: ExportColumn[] = columns.map(c =>
      c.type === 'constant'
        ? { type: 'constant', header: c.header.trim(), value: c.value }
        : { type: 'mapped', header: c.header.trim(), field: c.field }
    )
    const input = {
      name: name.trim(),
      description: description.trim() ? description.trim() : undefined,
      columns: cleanedColumns,
    }
    const saveErr = onSave(input)
    if (saveErr) setError(saveErr)
  }

  function handleColumnChange(index: number, column: ExportColumn) {
    setColumns(prev => prev.map((c, i) => (i === index ? column : c)))
  }

  function moveColumn(from: number, to: number) {
    if (from === to || to < 0 || to >= columns.length) return
    setColumns(prev => {
      const next = [...prev]
      const [item] = next.splice(from, 1)
      next.splice(to, 0, item)
      return next
    })
  }

  function handleAddColumn() {
    setColumns(prev => [...prev, { type: 'mapped', header: '', field: 'title' }])
  }

  function handleDeleteColumn(index: number) {
    setColumns(prev => prev.filter((_, i) => i !== index))
  }

  function handleDragStart(index: number) {
    setDraggingIndex(index)
    setDragOverIndex(index)
  }

  function handleDragOver(index: number) {
    setDragOverIndex(index)
  }

  function handleDrop(index: number) {
    if (draggingIndex !== null) moveColumn(draggingIndex, index)
    setDraggingIndex(null)
    setDragOverIndex(null)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onCancel}
          className="p-1.5 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
          title="Back"
          aria-label="Back"
        >
          <ArrowLeft size={16} />
        </button>
        <h1 className="text-2xl font-semibold text-gray-900">
          {mode === 'create' ? 'New Config' : 'Edit Config'}
        </h1>
      </div>

      {error && (
        <div className="mb-4 px-3 py-2 text-sm rounded-lg bg-red-50 border border-red-100 text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-4 mb-6">
        <div>
          <label htmlFor="config-name" className="block text-xs font-medium text-gray-600 mb-1">
            Name
          </label>
          <input
            id="config-name"
            type="text"
            value={name}
            onChange={e => setName(e.target.value.slice(0, MAX_NAME_LENGTH))}
            maxLength={MAX_NAME_LENGTH}
            placeholder="e.g. Library System v2"
            className="w-full text-sm border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label htmlFor="config-description" className="block text-xs font-medium text-gray-600 mb-1">
            Description (optional)
          </label>
          <input
            id="config-description"
            type="text"
            value={description}
            onChange={e => setDescription(e.target.value.slice(0, MAX_DESCRIPTION_LENGTH))}
            maxLength={MAX_DESCRIPTION_LENGTH}
            placeholder="What this config is for"
            className="w-full text-sm border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>

      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-sm font-semibold text-gray-700">Columns</h2>
        <span className="text-xs text-gray-400">{columns.length} column{columns.length === 1 ? '' : 's'}</span>
      </div>

      <div role="list" className="space-y-2 mb-3">
        {columns.map((column, i) => (
          <ColumnRow
            key={i}
            column={column}
            index={i}
            total={columns.length}
            onChange={handleColumnChange}
            onMoveUp={(idx) => moveColumn(idx, idx - 1)}
            onMoveDown={(idx) => moveColumn(idx, idx + 1)}
            onDelete={handleDeleteColumn}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            isDragging={draggingIndex === i}
            isDragTarget={dragOverIndex === i && draggingIndex !== null && draggingIndex !== i}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={handleAddColumn}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border border-dashed border-gray-300 text-gray-500 hover:text-indigo-700 hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
      >
        <Plus size={13} />
        Add column
      </button>

      <div className="mt-8 flex justify-end gap-3">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          className="px-4 py-2 text-sm rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
        >
          Save
        </button>
      </div>
    </motion.div>
  )
}
