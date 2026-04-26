import { useState, useEffect } from 'react'
import type { Session } from '@/types'
import { toSlug } from '@/utils/slug'

export { toSlug }

const SESSIONS_KEY = 'gronthee:sessions'
const CURRENT_SESSION_KEY = 'gronthee:currentSessionId'
const MAX_SESSIONS = 50

export const DISHARI_CONFIG_ID = 'dishari'

export const DEFAULT_SESSION: Session = {
  id: 'default',
  name: 'Default',
  createdAt: new Date(0).toISOString(), // stable value; not shown in UI
  configId: DISHARI_CONFIG_ID,
}

function loadSessions(): Session[] {
  try {
    const raw = JSON.parse(localStorage.getItem(SESSIONS_KEY) ?? '[]') as Partial<Session>[]
    if (!Array.isArray(raw)) return []
    // Migration: assign 'dishari' configId to any session that predates export configs
    return raw.map(s => ({
      ...s,
      configId: s.configId ?? DISHARI_CONFIG_ID,
    })) as Session[]
  } catch {
    return []
  }
}

function persist(sessions: Session[]): void {
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions))
}

export function useSessions() {
  const [sessions, setSessions] = useState<Session[]>(() => {
    const loaded = loadSessions()
    if (loaded.length === 0) {
      const seeded = [DEFAULT_SESSION]
      persist(seeded)
      return seeded
    }
    // Re-persist if migration filled in any configId values
    persist(loaded)
    return loaded
  })

  const [currentSessionId, setCurrentSessionIdState] = useState<string>(() => {
    const loaded = loadSessions()
    const stored = localStorage.getItem(CURRENT_SESSION_KEY) ?? 'default'
    return loaded.some(s => s.id === stored) ? stored : 'default'
  })

  // Seed currentSessionId key if absent
  useEffect(() => {
    if (!localStorage.getItem(CURRENT_SESSION_KEY)) {
      localStorage.setItem(CURRENT_SESSION_KEY, 'default')
    }
  }, [])

  const currentSession: Session =
    sessions.find(s => s.id === currentSessionId) ?? DEFAULT_SESSION

  function setCurrentSession(id: string): void {
    setCurrentSessionIdState(id)
    localStorage.setItem(CURRENT_SESSION_KEY, id)
  }

  function createSession(name: string, configId: string = DISHARI_CONFIG_ID): Session | null {
    const trimmed = name.trim()
    if (!trimmed) return null
    if (sessions.length >= MAX_SESSIONS) return null

    // Case-insensitive name uniqueness
    if (sessions.some(s => s.name.toLowerCase() === trimmed.toLowerCase())) return null

    let id = toSlug(trimmed)
    if (sessions.some(s => s.id === id)) {
      id = `${id.slice(0, 44)}-${Math.random().toString(36).slice(2, 6)}`
    }

    const session: Session = { id, name: trimmed, createdAt: new Date().toISOString(), configId }
    const updated = [...sessions, session]
    setSessions(updated)
    persist(updated)
    return session
  }

  function renameSession(id: string, newName: string): void {
    if (id === 'default') return
    const trimmed = newName.trim()
    if (!trimmed) return
    const updated = sessions.map(s => s.id === id ? { ...s, name: trimmed } : s)
    setSessions(updated)
    persist(updated)
  }

  function deleteSession(id: string): void {
    if (id === 'default') return
    const updated = sessions.filter(s => s.id !== id)
    setSessions(updated)
    persist(updated)
    if (currentSessionId === id) setCurrentSession('default')
  }

  function reassignSessionsConfig(fromConfigId: string, toConfigId: string): void {
    if (fromConfigId === toConfigId) return
    let changed = false
    const updated = sessions.map(s => {
      if (s.configId === fromConfigId) {
        changed = true
        return { ...s, configId: toConfigId }
      }
      return s
    })
    if (!changed) return
    setSessions(updated)
    persist(updated)
  }

  return {
    sessions,
    currentSession,
    currentSessionId,
    sessionCount: sessions.length,
    setCurrentSession,
    createSession,
    renameSession,
    deleteSession,
    reassignSessionsConfig,
  }
}
