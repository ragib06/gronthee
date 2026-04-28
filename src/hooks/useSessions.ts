import { useState, useEffect } from 'react'
import type { Session } from '@/types'
import { toSlug } from '@/utils/slug'
import { supabase } from '@/lib/supabase'
import { toSessionRow, fromSessionRow } from '@/lib/db-mappers'

export { toSlug }

const SESSIONS_KEY = 'gronthee:sessions'
const CURRENT_SESSION_KEY = 'gronthee:currentSessionId'
const MAX_SESSIONS = 50

export const DISHARI_CONFIG_ID = 'dishari'

export const DEFAULT_SESSION: Session = {
  id: 'default',
  name: 'Default',
  createdAt: new Date(0).toISOString(),
  configId: DISHARI_CONFIG_ID,
}

function loadSessions(): Session[] {
  try {
    const raw = JSON.parse(localStorage.getItem(SESSIONS_KEY) ?? '[]') as Partial<Session>[]
    if (!Array.isArray(raw)) return []
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

export function useSessions(userId: string | null = null) {
  const [sessions, setSessions] = useState<Session[]>(() => {
    if (userId) return []
    const loaded = loadSessions()
    if (loaded.length === 0) {
      const seeded = [DEFAULT_SESSION]
      persist(seeded)
      return seeded
    }
    persist(loaded)
    return loaded
  })

  const [currentSessionId, setCurrentSessionIdState] = useState<string>(() => {
    const stored = localStorage.getItem(CURRENT_SESSION_KEY) ?? 'default'
    if (userId) return stored
    const loaded = loadSessions()
    return loaded.some(s => s.id === stored) ? stored : 'default'
  })

  useEffect(() => {
    if (!userId) return
    supabase
      .from('sessions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .then(async ({ data, error }) => {
        if (error) return
        let rows = data ?? []
        if (rows.length === 0) {
          const { data: inserted } = await supabase
            .from('sessions')
            .upsert(toSessionRow(DEFAULT_SESSION, userId))
            .select()
          rows = inserted ?? []
        }
        const loaded = rows.map(fromSessionRow)
        setSessions(loaded)
        const stored = localStorage.getItem(CURRENT_SESSION_KEY) ?? 'default'
        if (!loaded.some(s => s.id === stored)) {
          const fallback = loaded[0]?.id ?? 'default'
          localStorage.setItem(CURRENT_SESSION_KEY, fallback)
          setCurrentSessionIdState(fallback)
        }
      })
  }, [userId])

  useEffect(() => {
    if (userId) return
    if (!localStorage.getItem(CURRENT_SESSION_KEY)) {
      localStorage.setItem(CURRENT_SESSION_KEY, 'default')
    }
  }, [userId])

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
    if (sessions.some(s => s.name.toLowerCase() === trimmed.toLowerCase())) return null

    let id = toSlug(trimmed)
    if (sessions.some(s => s.id === id)) {
      id = `${id.slice(0, 44)}-${Math.random().toString(36).slice(2, 6)}`
    }

    const session: Session = { id, name: trimmed, createdAt: new Date().toISOString(), configId }

    if (userId) {
      setSessions(prev => [...prev, session])
      supabase
        .from('sessions')
        .insert(toSessionRow(session, userId))
        .then(({ error }) => {
          if (error) setSessions(prev => prev.filter(s => s.id !== session.id))
        })
    } else {
      const updated = [...sessions, session]
      setSessions(updated)
      persist(updated)
    }

    return session
  }

  function renameSession(id: string, newName: string): void {
    if (id === 'default') return
    const trimmed = newName.trim()
    if (!trimmed) return
    const updated = sessions.map(s => s.id === id ? { ...s, name: trimmed } : s)
    setSessions(updated)
    if (userId) {
      supabase.from('sessions').update({ name: trimmed }).eq('id', id).eq('user_id', userId).then(() => {})
    } else {
      persist(updated)
    }
  }

  function deleteSession(id: string): void {
    if (id === 'default') return
    const updated = sessions.filter(s => s.id !== id)
    setSessions(updated)
    if (userId) {
      supabase.from('sessions').delete().eq('id', id).eq('user_id', userId).then(() => {})
    } else {
      persist(updated)
    }
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
    if (userId) {
      supabase
        .from('sessions')
        .update({ config_id: toConfigId })
        .eq('user_id', userId)
        .eq('config_id', fromConfigId)
        .then(() => {})
    } else {
      persist(updated)
    }
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
