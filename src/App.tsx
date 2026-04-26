import { useEffect, useState } from 'react'
import { AnimatePresence } from 'motion/react'
import AppShell from '@/components/layout/AppShell'
import ScannerPage from '@/components/scanner/ScannerPage'
import BookEditorPage from '@/components/editor/BookEditorPage'
import HistoryPage from '@/components/history/HistoryPage'
import ConfigsPage from '@/components/configs/ConfigsPage'
import UsernameDialog from '@/components/shared/UsernameDialog'
import LoginPage from '@/components/auth/LoginPage'
import AuthCallback from '@/components/auth/AuthCallback'
import LocalStorageMigrationDialog, { hasPendingMigration } from '@/components/shared/LocalStorageMigrationDialog'
import { useAuth } from '@/hooks/useAuth'
import { useBookHistory } from '@/hooks/useBookHistory'
import { useSessions } from '@/hooks/useSessions'
import { useExportConfigs } from '@/hooks/useExportConfigs'
import { getDefaultModel, resolveModel } from '@/config/ai-config'
import { supabase } from '@/lib/supabase'
import type { BookMetadata, FieldConfidence, SelectedModel } from '@/types'

const MODEL_KEY = 'gronthee:selectedModel'

function loadSavedModel(): SelectedModel {
  try {
    const saved = JSON.parse(localStorage.getItem(MODEL_KEY) ?? '{}') as { provider?: string; modelId?: string }
    if (saved.provider && saved.modelId) {
      return resolveModel(saved.provider as SelectedModel['provider'], saved.modelId)
    }
  } catch {}
  return getDefaultModel()
}

function saveModel(model: SelectedModel) {
  localStorage.setItem(MODEL_KEY, JSON.stringify({ provider: model.provider, modelId: model.modelId }))
}

export type Page = 'scan' | 'editor' | 'history' | 'configs'

export interface EditorParams {
  book?: BookMetadata
  pendingMetadata?: Partial<BookMetadata>
  pendingImages?: string[]
  pendingConfidence?: FieldConfidence
  pendingRawAIOutput?: string
  flashMessage?: string
}

export type NavigateFn = (page: Page, params?: EditorParams) => void

function App() {
  const { user, loading: authLoading, signOut } = useAuth()
  const [username, setUsername] = useState<string | null>(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [showMigration, setShowMigration] = useState(false)

  const [page, setPage] = useState<Page>('scan')
  const [editorParams, setEditorParams] = useState<EditorParams>({})
  const [selectedModel, setSelectedModel] = useState<SelectedModel>(loadSavedModel)

  const { books, addBook, updateBook, deleteBook, reassignBooksToSession } = useBookHistory(user?.id ?? null)
  const {
    sessions,
    currentSession,
    setCurrentSession,
    createSession,
    renameSession,
    deleteSession,
    reassignSessionsConfig,
  } = useSessions(user?.id ?? null)
  const {
    configs,
    getConfig,
    isBuiltIn,
    createConfig,
    updateConfig,
    deleteConfig,
    cloneConfig,
  } = useExportConfigs()

  // Load profile when user is known
  useEffect(() => {
    if (!user) {
      setUsername(null)
      return
    }
    setProfileLoading(true)
    supabase
      .from('profiles')
      .select('username')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        setUsername(data?.username ?? null)
        setProfileLoading(false)
        if (data?.username && hasPendingMigration()) setShowMigration(true)
      })
  }, [user])

  async function handleCreateProfile(name: string) {
    if (!user) return
    const { error } = await supabase
      .from('profiles')
      .insert({ id: user.id, username: name })
    if (!error) {
      setUsername(name)
      if (hasPendingMigration()) setShowMigration(true)
    }
  }

  function handleModelChange(model: SelectedModel) {
    saveModel(model)
    setSelectedModel(model)
  }

  function handleDeleteSession(id: string) {
    reassignBooksToSession(id, 'default')
    deleteSession(id)
  }

  function handleDeleteConfig(id: string): boolean {
    reassignSessionsConfig(id, 'dishari')
    return deleteConfig(id)
  }

  const navigate: NavigateFn = (newPage, params = {}) => {
    setEditorParams(params)
    setPage(newPage)
  }

  // Handle magic-link callback route
  if (window.location.pathname === '/auth/callback') {
    return <AuthCallback />
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
      </div>
    )
  }

  if (!user) {
    return <LoginPage />
  }

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
      </div>
    )
  }

  if (!username) {
    return <UsernameDialog onSubmit={handleCreateProfile} />
  }

  return (
    <>
    {showMigration && user && (
      <LocalStorageMigrationDialog
        userId={user.id}
        onDone={() => setShowMigration(false)}
      />
    )}
    <AppShell currentPage={page} navigate={navigate} onSignOut={signOut}>
      <AnimatePresence mode="wait">
        {page === 'scan' && (
          <ScannerPage
            key="scan"
            navigate={navigate}
            selectedModel={selectedModel}
            onModelChange={handleModelChange}
            username={username}
            sessions={sessions}
            currentSession={currentSession}
            books={books}
            configs={configs}
            getConfig={getConfig}
            onSelectSession={setCurrentSession}
            onCreateSession={createSession}
            onRenameSession={renameSession}
            onDeleteSession={handleDeleteSession}
          />
        )}
        {page === 'editor' && (
          <BookEditorPage
            key="editor"
            navigate={navigate}
            book={editorParams.book}
            pendingMetadata={editorParams.pendingMetadata}
            pendingImages={editorParams.pendingImages ?? []}
            pendingConfidence={editorParams.pendingConfidence}
            pendingRawAIOutput={editorParams.pendingRawAIOutput}
            currentSession={currentSession}
            onAdd={addBook}
            onUpdate={updateBook}
          />
        )}
        {page === 'history' && (
          <HistoryPage
            key="history"
            navigate={navigate}
            books={books}
            sessions={sessions}
            getConfig={getConfig}
            onDelete={deleteBook}
            username={username}
            flashMessage={editorParams.flashMessage}
          />
        )}
        {page === 'configs' && (
          <ConfigsPage
            key="configs"
            configs={configs}
            getConfig={getConfig}
            isBuiltIn={isBuiltIn}
            createConfig={createConfig}
            updateConfig={updateConfig}
            deleteConfig={handleDeleteConfig}
            cloneConfig={cloneConfig}
          />
        )}
      </AnimatePresence>
    </AppShell>
    </>
  )
}

export default App
