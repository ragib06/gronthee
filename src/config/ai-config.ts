import rawConfig from '../../ai-config.json'
import type { AIConfig, AIProvider, SelectedModel } from '@/types'

const config = rawConfig as AIConfig

export function getDefaultModel(): SelectedModel {
  const provider = config.providers.find(p => p.provider === config.defaultProvider)
  if (!provider) throw new Error(`Default provider "${config.defaultProvider}" not found in ai-config.json`)
  return { provider: provider.provider, modelId: config.defaultModelId }
}

export function getProviderConfig(provider: AIProvider) {
  return config.providers.find(p => p.provider === provider)
}

export function resolveModel(provider: AIProvider, modelId: string): SelectedModel {
  const p = config.providers.find(pr => pr.provider === provider)
  if (!p) throw new Error(`Provider "${provider}" not found in ai-config.json`)
  return { provider, modelId }
}

export default config
