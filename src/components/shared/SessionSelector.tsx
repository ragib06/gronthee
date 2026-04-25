import { useState, useRef, useEffect } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Check, ChevronDown, Pencil, Plus, Trash2 } from 'lucide-react'
import type { BookMetadata, ExportConfig, Session } from '@/types'
import DeleteSessionDialog from './DeleteSessionDialog'
import CreateSessionDialog from './CreateSessionDialog'

const MAX_SESSIONS = 50
const MAX_NAME_LENGTH = 50

interface SessionSelectorProps {
  sessions: Session[]
  currentSession: Session
  books: BookMetadata[]
  configs: ExportConfig[]
  getConfig: (id: string) => ExportConfig
  onSelect: (id: string) => void
  onCreate: (name: string, configId: string) => Session | null
  onRename: (id: string, newName: string) => void
  onDelete: (id: string) => void
}

export default function SessionSelector({
  sessions,
  currentSession,
  books,
  configs,
  getConfig,
  onSelect,
  onCreate,
  onRename,
  onDelete,
}: SessionSelectorProps) {
  const [open, setOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [renameId, setRenameId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [deleteCandidate, setDeleteCandidate] = useState<Session | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const renameInputRef = useRef<HTMLInputElement>(null)

  const atCap = sessions.length >= MAX_SESSIONS

  function bookCount(sessionId: string): number {
    return books.filter(b => b.sessionId === sessionId).length
  }

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  // Focus rename input when entering rename mode
  useEffect(() => {
    if (renameId) {
      setTimeout(() => renameInputRef.current?.focus(), 0)
    }
  }, [renameId])

  function handleSelect(id: string) {
    onSelect(id)
    setOpen(false)
  }

  function handleCreate(name: string, configId: string): string | null {
    if (atCap) return 'Maximum of 50 sessions reached.'
    const result = onCreate(name, configId)
    if (!result) return 'Could not create — name may already be taken.'
    onSelect(result.id)
    setCreateOpen(false)
    setOpen(false)
    return null
  }

  function startRename(session: Session) {
    setRenameId(session.id)
    setRenameValue(session.name)
  }

  function commitRename() {
    if (renameId && renameValue.trim()) {
      onRename(renameId, renameValue.trim())
    }
    setRenameId(null)
  }

  function handleRenameKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter') commitRename()
    if (e.key === 'Escape') setRenameId(null)
  }

  function handleDeleteConfirm() {
    if (deleteCandidate) {
      onDelete(deleteCandidate.id)
      setDeleteCandidate(null)
    }
  }

  return (
    <>
      <div ref={containerRef} className="relative inline-block">
        {/* Trigger */}
        <button
          onClick={() => setOpen(v => !v)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-medium transition-colors"
        >
          <span className="max-w-[160px] truncate">{currentSession.name}</span>
          <ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>

        {/* Dropdown panel */}
        <AnimatePresence>
          {open && (
            <motion.div
              className="absolute left-0 top-full mt-1.5 z-40 bg-white rounded-xl shadow-lg border border-gray-100 w-72"
              initial={{ opacity: 0, y: -4, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.97 }}
              transition={{ duration: 0.12 }}
            >
              {/* Session list */}
              <ul className="max-h-72 overflow-y-auto py-1">
                {sessions.map(session => {
                  const configName = getConfig(session.configId).name
                  return (
                    <li
                      key={session.id}
                      className="group flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer"
                    >
                      {renameId === session.id ? (
                        <input
                          ref={renameInputRef}
                          value={renameValue}
                          onChange={e => setRenameValue(e.target.value.slice(0, MAX_NAME_LENGTH))}
                          onBlur={commitRename}
                          onKeyDown={handleRenameKey}
                          onClick={e => e.stopPropagation()}
                          maxLength={MAX_NAME_LENGTH}
                          className="flex-1 text-sm border border-indigo-300 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      ) : (
                        <button
                          className="flex-1 flex flex-col items-start min-w-0 text-left"
                          onClick={() => handleSelect(session.id)}
                        >
                          <div className="flex w-full items-center gap-2">
                            <span className="flex-1 truncate text-sm text-gray-800">{session.name}</span>
                            <span className="text-xs text-gray-400 shrink-0">({bookCount(session.id)})</span>
                            {currentSession.id === session.id && (
                              <Check size={13} className="text-indigo-600 shrink-0" />
                            )}
                          </div>
                          <span className="text-[11px] text-gray-400 truncate w-full">{configName}</span>
                        </button>
                      )}

                      {/* Rename + Delete icons — hidden for default session.
                          Always visible on touch devices (no hover); hover-reveal on desktop. */}
                      {session.id !== 'default' && renameId !== session.id && (
                        <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
                          <button
                            onClick={e => { e.stopPropagation(); startRename(session) }}
                            className="p-0.5 rounded text-gray-400 hover:text-indigo-600 transition-colors"
                            title="Rename session"
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); setDeleteCandidate(session) }}
                            className="p-0.5 rounded text-gray-400 hover:text-red-500 transition-colors"
                            title="Delete session"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>

              {/* Divider */}
              <div className="border-t border-gray-100" />

              {/* New session button — opens dialog */}
              <div className="p-2">
                <button
                  onClick={() => setCreateOpen(true)}
                  disabled={atCap}
                  title={atCap ? 'Maximum of 50 sessions reached.' : 'New session'}
                  className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Plus size={13} />
                  New session
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <CreateSessionDialog
        open={createOpen}
        configs={configs}
        onCancel={() => setCreateOpen(false)}
        onCreate={handleCreate}
      />

      {/* Delete confirmation dialog */}
      <DeleteSessionDialog
        session={deleteCandidate}
        bookCount={deleteCandidate ? bookCount(deleteCandidate.id) : 0}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteCandidate(null)}
      />
    </>
  )
}
