import { useState } from 'react'
import { AnimatePresence } from 'motion/react'
import AppShell from '@/components/layout/AppShell'
import ScannerPage from '@/components/scanner/ScannerPage'
import BookEditorPage from '@/components/editor/BookEditorPage'
import HistoryPage from '@/components/history/HistoryPage'
import UsernameDialog from '@/components/shared/UsernameDialog'
import { useBookHistory } from '@/hooks/useBookHistory'
import { useSessions } from '@/hooks/useSessions'
import { getDefaultModel, resolveModel } from '@/config/ai-config'
import type { BookMetadata, FieldConfidence, SelectedModel } from '@/types'

const USERNAME_KEY = 'gronthee-username'
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

export type Page = 'scan' | 'editor' | 'history'

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
  const [page, setPage] = useState<Page>('scan')
  const [editorParams, setEditorParams] = useState<EditorParams>({})
  const [selectedModel, setSelectedModel] = useState<SelectedModel>(loadSavedModel)

  function handleModelChange(model: SelectedModel) {
    saveModel(model)
    setSelectedModel(model)
  }
  const [username, setUsername] = useState<string>(() => localStorage.getItem(USERNAME_KEY) ?? '')
  const { books, addBook, updateBook, deleteBook, reassignBooksToSession } = useBookHistory()
  const {
    sessions,
    currentSession,
    setCurrentSession,
    createSession,
    renameSession,
    deleteSession,
  } = useSessions()

  function handleDeleteSession(id: string) {
    reassignBooksToSession(id, 'default')
    deleteSession(id)
  }

  const navigate: NavigateFn = (newPage, params = {}) => {
    setEditorParams(params)
    setPage(newPage)
  }

  function handleUsernameSubmit(name: string) {
    localStorage.setItem(USERNAME_KEY, name)
    setUsername(name)
  }

  if (!username) {
    return <UsernameDialog onSubmit={handleUsernameSubmit} />
  }

  return (
    <AppShell currentPage={page} navigate={navigate}>
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
            onDelete={deleteBook}
            username={username}
            flashMessage={editorParams.flashMessage}
          />
        )}
      </AnimatePresence>
    </AppShell>
  )
}

export default App
