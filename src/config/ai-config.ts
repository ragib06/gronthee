import rawConfig from '../../ai-config.json'
import type { AIConfig, AIProvider, SelectedModel } from '@/types'

const config = rawConfig as Omit<AIConfig, 'providers'> & {
  providers: Array<Omit<AIConfig['providers'][number], 'apiKey'>>
}

function getApiKey(provider: AIProvider): string {
  switch (provider) {
    case 'anthropic':
      return import.meta.env.VITE_ANTHROPIC_API_KEY ?? ''
    case 'openai':
      return import.meta.env.VITE_OPENAI_API_KEY ?? ''
    case 'gemini':
      return import.meta.env.VITE_GEMINI_API_KEY ?? ''
    case 'openrouter':
      return import.meta.env.VITE_OPENROUTER_API_KEY ?? ''
  }
}

export function getDefaultModel(): SelectedModel {
  const provider = config.providers.find(p => p.provider === config.defaultProvider)
  if (!provider) throw new Error(`Default provider "${config.defaultProvider}" not found in ai-config.json`)
  return { provider: provider.provider, modelId: config.defaultModelId, apiKey: getApiKey(provider.provider) }
}

export function getProviderConfig(provider: AIProvider) {
  return config.providers.find(p => p.provider === provider)
}

export function resolveModel(provider: AIProvider, modelId: string): SelectedModel {
  const p = config.providers.find(pr => pr.provider === provider)
  if (!p) throw new Error(`Provider "${provider}" not found in ai-config.json`)
  return { provider, modelId, apiKey: getApiKey(provider) }
}

export default config
