import { useState, useEffect } from 'react'
import type { ExportColumn, ExportConfig } from '@/types'
import { toSlug } from '@/utils/slug'
import { DISHARI_CONFIG } from '@/services/exportConfig'
import { supabase } from '@/lib/supabase'
import type { Json } from '@/lib/supabase-types'
import { toConfigRow, fromConfigRow } from '@/lib/db-mappers'

const BUILTIN_CONFIGS: readonly ExportConfig[] = [DISHARI_CONFIG]

function isBuiltInId(id: string): boolean {
  return BUILTIN_CONFIGS.some(c => c.id === id)
}

export interface CreateConfigInput {
  name: string
  description?: string
  columns: ExportColumn[]
}

export function useExportConfigs(userId: string | null) {
  const [userConfigs, setUserConfigs] = useState<ExportConfig[]>([])

  useEffect(() => {
    if (!userId) { setUserConfigs([]); return }
    supabase
      .from('export_configs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .then(({ data }) => setUserConfigs((data ?? []).map(fromConfigRow)))
  }, [userId])

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
    if (!userId) return null
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
    supabase.from('export_configs').insert(toConfigRow(config, userId)).then(({ error }) => {
      if (error) setUserConfigs(prev => prev.filter(c => c.id !== id))
    })
    return config
  }

  function updateConfig(id: string, patch: Partial<Omit<ExportConfig, 'id' | 'builtIn' | 'createdAt'>>): ExportConfig | null {
    if (!userId || isBuiltIn(id)) return null
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
    supabase
      .from('export_configs')
      .update({
        name: updated.name,
        description: updated.description ?? null,
        columns: updated.columns as unknown as Json,
        updated_at: updated.updatedAt,
      })
      .eq('id', id)
      .eq('user_id', userId)
      .then(({ error }) => {
        if (error) setUserConfigs(prev => prev.map(c => c.id === id ? current : c))
      })
    return updated
  }

  function deleteConfig(id: string): boolean {
    if (!userId || isBuiltIn(id)) return false
    if (!userConfigs.some(c => c.id === id)) return false
    setUserConfigs(prev => prev.filter(c => c.id !== id))
    supabase
      .from('export_configs')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)
      .then(({ error }) => {
        if (error) {
          supabase
            .from('export_configs')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: true })
            .then(({ data }) => setUserConfigs((data ?? []).map(fromConfigRow)))
        }
      })
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

