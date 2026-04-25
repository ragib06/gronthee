import { useState } from 'react'
import { motion } from 'motion/react'
import { Plus, Upload } from 'lucide-react'
import type { ExportColumn, ExportConfig } from '@/types'
import { serializeForShare } from '@/services/exportConfig'
import { toSlug } from '@/utils/slug'
import ConfigCard from './ConfigCard'
import ConfigEditor from './ConfigEditor'
import ImportConfigDialog from './ImportConfigDialog'
import ConfirmDialog from '@/components/shared/ConfirmDialog'

interface ConfigsPageProps {
  configs: ExportConfig[]
  getConfig: (id: string) => ExportConfig
  isBuiltIn: (id: string) => boolean
  createConfig: (input: { name: string; description?: string; columns: ExportColumn[] }) => ExportConfig | null
  updateConfig: (id: string, patch: Partial<Omit<ExportConfig, 'id' | 'builtIn' | 'createdAt'>>) => ExportConfig | null
  deleteConfig: (id: string) => boolean
  cloneConfig: (sourceId: string, newName: string) => ExportConfig | null
}

type View =
  | { mode: 'list' }
  | { mode: 'create' }
  | { mode: 'edit'; id: string }

export default function ConfigsPage({
  configs,
  getConfig,
  createConfig,
  updateConfig,
  deleteConfig,
  cloneConfig,
}: ConfigsPageProps) {
  const [view, setView] = useState<View>({ mode: 'list' })
  const [importOpen, setImportOpen] = useState(false)
  const [deleteCandidate, setDeleteCandidate] = useState<ExportConfig | null>(null)

  function handleEdit(id: string) {
    setView({ mode: 'edit', id })
  }

  function handleClone(id: string) {
    const source = getConfig(id)
    let name = `${source.name} Copy`
    let attempt = 1
    while (configs.some(c => c.name.toLowerCase() === name.toLowerCase())) {
      attempt += 1
      name = `${source.name} Copy ${attempt}`
    }
    cloneConfig(id, name)
  }

  function handleShare(id: string) {
    const config = getConfig(id)
    const json = serializeForShare(config)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `gronthee-config-${toSlug(config.name)}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  function handleConfirmDelete() {
    if (deleteCandidate) {
      deleteConfig(deleteCandidate.id)
      setDeleteCandidate(null)
    }
  }

  function handleSaveCreate(input: { name: string; description?: string; columns: ExportColumn[] }): string | null {
    const created = createConfig(input)
    if (!created) return 'Could not save — name may already be taken.'
    setView({ mode: 'list' })
    return null
  }

  function handleSaveEdit(id: string, input: { name: string; description?: string; columns: ExportColumn[] }): string | null {
    const updated = updateConfig(id, {
      name: input.name,
      description: input.description,
      columns: input.columns,
    })
    if (!updated) return 'Could not save — name may already be taken.'
    setView({ mode: 'list' })
    return null
  }

  function handleImport(input: { name: string; description?: string; columns: ExportColumn[] }): string | null {
    const created = createConfig(input)
    if (!created) return 'Could not import — a config with that name already exists.'
    setImportOpen(false)
    return null
  }

  if (view.mode === 'create') {
    return (
      <ConfigEditor
        mode="create"
        existingNames={configs.map(c => c.name)}
        onCancel={() => setView({ mode: 'list' })}
        onSave={handleSaveCreate}
      />
    )
  }

  if (view.mode === 'edit') {
    const config = configs.find(c => c.id === view.id)
    if (!config) {
      // Config disappeared (deleted in another tab); fall back to list.
      return null
    }
    return (
      <ConfigEditor
        mode="edit"
        initial={config}
        existingNames={configs.filter(c => c.id !== config.id).map(c => c.name)}
        onCancel={() => setView({ mode: 'list' })}
        onSave={input => handleSaveEdit(config.id, input)}
      />
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Export Configs</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Define the columns each session uses when exporting to CSV.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setImportOpen(true)}
            className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Upload size={15} />
            Import
          </button>
          <button
            onClick={() => setView({ mode: 'create' })}
            className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
          >
            <Plus size={15} />
            New Config
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {configs.map(c => (
          <ConfigCard
            key={c.id}
            config={c}
            onEdit={handleEdit}
            onClone={handleClone}
            onShare={handleShare}
            onDelete={() => setDeleteCandidate(c)}
          />
        ))}
      </div>

      <ImportConfigDialog
        open={importOpen}
        onCancel={() => setImportOpen(false)}
        onImport={handleImport}
      />

      <ConfirmDialog
        open={deleteCandidate !== null}
        title={`Delete config "${deleteCandidate?.name ?? ''}"?`}
        message="Sessions using this config will fall back to Dishari. This cannot be undone."
        confirmLabel="Delete"
        danger
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteCandidate(null)}
      />
    </motion.div>
  )
}
