import { useState, useCallback, useRef, useEffect } from 'react'
import { motion } from 'motion/react'
import { ScanLine } from 'lucide-react'
import type { NavigateFn } from '@/App'
import type { BookMetadata, Session, SelectedModel } from '@/types'
import SessionSelector from '@/components/shared/SessionSelector'
import { extractBookMetadata } from '@/services/ai'
import { dataUrlToBase64Image, compressImageForApi } from '@/utils/imageToBase64'
import { loadPreferences, applyPreferences } from '@/utils/applyPreferences'
import ModelSelector from './ModelSelector'
import DropZone from './DropZone'
import WebcamCapture from './WebcamCapture'
import ImagePreview from './ImagePreview'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import ErrorBanner from '@/components/shared/ErrorBanner'
import PagesDialog from '@/components/shared/PagesDialog'

interface ScannerPageProps {
  navigate: NavigateFn
  selectedModel: SelectedModel
  onModelChange: (m: SelectedModel) => void
  username: string
  sessions: Session[]
  currentSession: Session
  books: BookMetadata[]
  onSelectSession: (id: string) => void
  onCreateSession: (name: string) => Session | null
  onRenameSession: (id: string, newName: string) => void
  onDeleteSession: (id: string) => void
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function ScannerPage({
  navigate,
  selectedModel,
  onModelChange,
  username,
  sessions,
  currentSession,
  books,
  onSelectSession,
  onCreateSession,
  onRenameSession,
  onDeleteSession,
}: ScannerPageProps) {
  const [tab, setTab] = useState<'upload' | 'webcam'>(() => {
    return (localStorage.getItem('scanner-tab') as 'upload' | 'webcam') ?? 'upload'
  })
  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputAreaRef = useRef<HTMLDivElement>(null)

  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current)
    inactivityTimer.current = setTimeout(() => {
      setTab('upload')
      localStorage.removeItem('scanner-tab')
    }, 3 * 60 * 1000)
  }, [])

  useEffect(() => {
    if (tab !== 'webcam') {
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current)
      return
    }
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'] as const
    resetInactivityTimer()
    events.forEach(e => window.addEventListener(e, resetInactivityTimer))
    return () => {
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current)
      events.forEach(e => window.removeEventListener(e, resetInactivityTimer))
    }
  }, [tab, resetInactivityTimer])

  function handleTabChange(t: 'upload' | 'webcam') {
    setTab(t)
    if (t === 'webcam') {
      localStorage.setItem('scanner-tab', 'webcam')
    } else {
      localStorage.removeItem('scanner-tab')
    }
  }
  const [images, setImages] = useState<string[]>([])
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPagesDialog, setShowPagesDialog] = useState(false)

  const handleFiles = useCallback(async (files: File[]) => {
    const dataUrls = await Promise.all(files.map(fileToDataUrl))
    setImages(prev => [...prev, ...dataUrls].slice(0, 4))
  }, [])

  const handleCapture = useCallback((dataUrl: string) => {
    setImages(prev => [...prev, dataUrl].slice(0, 4))
  }, [])

  const handleRemove = useCallback((index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index))
  }, [])

  function handleScan() {
    if (images.length === 0 || isScanning) return
    setShowPagesDialog(true)
  }

  async function handlePagesSubmit(pageCount: string) {
    setShowPagesDialog(false)
    setIsScanning(true)
    setError(null)
    try {
      const compressed = await Promise.all(images.map(compressImageForApi))
      const base64Images = compressed.map(dataUrlToBase64Image)
      const { metadata, confidence, raw: rawAIOutput } = await extractBookMetadata(base64Images, selectedModel)
      const prefs = loadPreferences()
      const withPrefs = applyPreferences(metadata as Record<string, string>, prefs) as Partial<BookMetadata>
      const finalMetadata = pageCount ? { ...withPrefs, pageCount } : withPrefs
      navigate('editor', {
        pendingMetadata: finalMetadata,
        pendingImages: images,
        pendingConfidence: confidence,
        pendingRawAIOutput: rawAIOutput,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to scan book. Please try again.')
    } finally {
      setIsScanning(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      className={tab === 'webcam' ? 'pb-[50vh]' : undefined}
    >
      {showPagesDialog && <PagesDialog onSubmit={handlePagesSubmit} />}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <p className="text-sm text-gray-400 mb-0.5">Welcome, {username}</p>
          <h1 className="text-2xl font-semibold text-gray-900">Scan a Book</h1>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-xs text-gray-400">Session:</span>
            <SessionSelector
              sessions={sessions}
              currentSession={currentSession}
              books={books}
              onSelect={onSelectSession}
              onCreate={onCreateSession}
              onRename={onRenameSession}
              onDelete={onDeleteSession}
            />
          </div>
        </div>
        <ModelSelector selectedModel={selectedModel} onChange={onModelChange} />
      </div>

      {/* Error Banner */}
      {error !== null && (
        <div className="mb-4">
          <ErrorBanner message={error} onDismiss={() => setError(null)} />
        </div>
      )}

      {/* Tab Switcher */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-lg w-fit mb-4">
        {(['upload', 'webcam'] as const).map(t => (
          <button
            key={t}
            onClick={() => handleTabChange(t)}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              tab === t
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'upload' ? 'Upload' : 'Webcam'}
          </button>
        ))}
      </div>

      {/* Input Area */}
      <div ref={inputAreaRef} className="relative bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
        {tab === 'upload' ? (
          <DropZone onFiles={handleFiles} disabled={images.length >= 4} />
        ) : (
          <WebcamCapture onCapture={handleCapture} disabled={images.length >= 4} />
        )}
        {isScanning && (
          <div className="absolute inset-0 bg-white/80 rounded-xl flex items-center justify-center">
            <LoadingSpinner label="Scanning..." />
          </div>
        )}
      </div>

      {/* Image Preview */}
      {images.length > 0 && (
        <div className="mb-4">
          <ImagePreview images={images} onRemove={handleRemove} />
        </div>
      )}

      {/* Scan Button */}
      <div className="flex justify-end">
        <button
          onClick={handleScan}
          disabled={images.length === 0 || isScanning}
          className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
        >
          {isScanning ? (
            <>
              <LoadingSpinner size="sm" />
              Scanning...
            </>
          ) : (
            <>
              <ScanLine size={16} />
              Scan Book
            </>
          )}
        </button>
      </div>
    </motion.div>
  )
}
