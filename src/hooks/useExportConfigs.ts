import { useState, useEffect } from 'react'
import type { ExportColumn, ExportConfig } from '@/types'
import { toSlug } from '@/utils/slug'
import { DISHARI_CONFIG, validateConfig, isValidationError } from '@/services/exportConfig'

const STORAGE_KEY = 'gronthee:exportConfigs'

const BUILTIN_CONFIGS: readonly ExportConfig[] = [DISHARI_CONFIG]

function isBuiltInId(id: string): boolean {
  return BUILTIN_CONFIGS.some(c => c.id === id)
}

function loadUserConfigs(): ExportConfig[] {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as unknown
    if (!Array.isArray(raw)) return []
    const cleaned: ExportConfig[] = []
    for (const candidate of raw) {
      const result = validateConfig(candidate)
      if (!isValidationError(result) && !isBuiltInId(result.id)) {
        delete result.builtIn
        cleaned.push(result)
      }
    }
    return cleaned
  } catch {
    return []
  }
}

export interface CreateConfigInput {
  name: string
  description?: string
  columns: ExportColumn[]
}

export function useExportConfigs() {
  const [userConfigs, setUserConfigs] = useState<ExportConfig[]>(loadUserConfigs)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userConfigs))
  }, [userConfigs])

  const configs: ExportConfig[] = [...BUILTIN_CONFIGS, ...userConfigs]

  function getConfig(id: string): ExportConfig {
    return configs.find(c => c.id === id) ?? DISHARI_CONFIG
  }

  function isBuiltIn(id: string): boolean {
    return isBuiltInId(id)
  }

  function nameTaken(name: string, ignoreId?: string): boolean {
    const lower = name.toLowerCase()
    return configs.some(c => c.id !== ignoreId && c.name.toLowerCase() === lower)
  }

  function createConfig(input: CreateConfigInput): ExportConfig | null {
    const trimmedName = input.name.trim()
    if (!trimmedName) return null
    if (input.columns.length === 0) return null
    if (nameTaken(trimmedName)) return null

    let id = toSlug(trimmedName)
    if (configs.some(c => c.id === id)) {
      id = `${id.slice(0, 44)}-${Math.random().toString(36).slice(2, 6)}`
    }

    const now = new Date().toISOString()
    const config: ExportConfig = {
      id,
      name: trimmedName,
      columns: input.columns.map(c => ({ ...c })),
      createdAt: now,
      updatedAt: now,
    }
    if (input.description) config.description = input.description

    setUserConfigs(prev => [...prev, config])
    return config
  }

  function updateConfig(id: string, patch: Partial<Omit<ExportConfig, 'id' | 'builtIn' | 'createdAt'>>): ExportConfig | null {
    if (isBuiltIn(id)) return null
    const current = userConfigs.find(c => c.id === id)
    if (!current) return null

    if (patch.name !== undefined) {
      const trimmed = patch.name.trim()
      if (!trimmed) return null
      if (nameTaken(trimmed, id)) return null
      patch = { ...patch, name: trimmed }
    }

    const updated: ExportConfig = {
      ...current,
      ...patch,
      id: current.id,
      createdAt: current.createdAt,
      updatedAt: new Date().toISOString(),
    }
    setUserConfigs(prev => prev.map(c => c.id === id ? updated : c))
    return updated
  }

  function deleteConfig(id: string): boolean {
    if (isBuiltIn(id)) return false
    if (!userConfigs.some(c => c.id === id)) return false
    setUserConfigs(prev => prev.filter(c => c.id !== id))
    return true
  }

  function cloneConfig(sourceId: string, newName: string): ExportConfig | null {
    const source = configs.find(c => c.id === sourceId)
    if (!source) return null
    return createConfig({
      name: newName,
      description: source.description,
      columns: source.columns.map(col => ({ ...col })),
    })
  }

  return {
    configs,
    getConfig,
    isBuiltIn,
    createConfig,
    updateConfig,
    deleteConfig,
    cloneConfig,
  }
}
