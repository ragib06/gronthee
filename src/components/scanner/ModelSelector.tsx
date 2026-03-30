import config, { resolveModel } from '@/config/ai-config'
import type { SelectedModel, AIProvider } from '@/types'

interface ModelSelectorProps {
  selectedModel: SelectedModel
  onChange: (model: SelectedModel) => void
}

export default function ModelSelector({ selectedModel, onChange }: ModelSelectorProps) {
  const currentProvider = config.providers.find(p => p.provider === selectedModel.provider)

  function handleProviderChange(provider: AIProvider) {
    const p = config.providers.find(pr => pr.provider === provider)
    if (p && p.models[0]) {
      onChange(resolveModel(provider, p.models[0].id))
    }
  }

  function handleModelChange(modelId: string) {
    onChange(resolveModel(selectedModel.provider, modelId))
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={selectedModel.provider}
        onChange={e => handleProviderChange(e.target.value as AIProvider)}
        className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        aria-label="AI Provider"
      >
        {config.providers.map(p => (
          <option key={p.provider} value={p.provider}>{p.label}</option>
        ))}
      </select>
      <select
        value={selectedModel.modelId}
        onChange={e => handleModelChange(e.target.value)}
        className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        aria-label="AI Model"
      >
        {currentProvider?.models.map(m => (
          <option key={m.id} value={m.id}>{m.label}</option>
        ))}
      </select>
    </div>
  )
}
