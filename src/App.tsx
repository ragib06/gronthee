import { useState } from 'react'
import { AnimatePresence } from 'motion/react'
import AppShell from '@/components/layout/AppShell'
import ScannerPage from '@/components/scanner/ScannerPage'
import BookEditorPage from '@/components/editor/BookEditorPage'
import HistoryPage from '@/components/history/HistoryPage'
import UsernameDialog from '@/components/shared/UsernameDialog'
import { useBookHistory } from '@/hooks/useBookHistory'
import { getDefaultModel } from '@/config/ai-config'
import type { BookMetadata, SelectedModel } from '@/types'

const USERNAME_KEY = 'gronthee-username'

export type Page = 'scan' | 'editor' | 'history'

export interface EditorParams {
  book?: BookMetadata
  pendingMetadata?: Partial<BookMetadata>
  pendingImages?: string[]
  flashMessage?: string
}

export type NavigateFn = (page: Page, params?: EditorParams) => void

function App() {
  const [page, setPage] = useState<Page>('scan')
  const [editorParams, setEditorParams] = useState<EditorParams>({})
  const [selectedModel, setSelectedModel] = useState<SelectedModel>(getDefaultModel)
  const [username, setUsername] = useState<string>(() => localStorage.getItem(USERNAME_KEY) ?? '')
  const { books, addBook, updateBook, deleteBook } = useBookHistory()

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
            onModelChange={setSelectedModel}
            username={username}
          />
        )}
        {page === 'editor' && (
          <BookEditorPage
            key="editor"
            navigate={navigate}
            book={editorParams.book}
            pendingMetadata={editorParams.pendingMetadata}
            pendingImages={editorParams.pendingImages ?? []}
            onAdd={addBook}
            onUpdate={updateBook}
          />
        )}
        {page === 'history' && (
          <HistoryPage
            key="history"
            navigate={navigate}
            books={books}
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
