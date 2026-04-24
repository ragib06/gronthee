import { useState, useEffect } from 'react'
import type { Session } from '@/types'

const SESSIONS_KEY = 'gronthee:sessions'
const CURRENT_SESSION_KEY = 'gronthee:currentSessionId'
const MAX_SESSIONS = 50

export const DEFAULT_SESSION: Session = {
  id: 'default',
  name: 'Default',
  createdAt: new Date(0).toISOString(), // stable value; not shown in UI
}

export function toSlug(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 50)
  return slug || 'session'
}

function loadSessions(): Session[] {
  try {
    const raw = JSON.parse(localStorage.getItem(SESSIONS_KEY) ?? '[]') as Session[]
    return Array.isArray(raw) ? raw : []
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

  function createSession(name: string): Session | null {
    const trimmed = name.trim()
    if (!trimmed) return null
    if (sessions.length >= MAX_SESSIONS) return null

    // Case-insensitive name uniqueness
    if (sessions.some(s => s.name.toLowerCase() === trimmed.toLowerCase())) return null

    let id = toSlug(trimmed)
    if (sessions.some(s => s.id === id)) {
      id = `${id.slice(0, 44)}-${Math.random().toString(36).slice(2, 6)}`
    }

    const session: Session = { id, name: trimmed, createdAt: new Date().toISOString() }
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

  return {
    sessions,
    currentSession,
    currentSessionId,
    sessionCount: sessions.length,
    setCurrentSession,
    createSession,
    renameSession,
    deleteSession,
  }
}
