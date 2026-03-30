import { useState, useCallback } from 'react'
import { motion } from 'motion/react'
import { ScanLine } from 'lucide-react'
import type { NavigateFn } from '@/App'
import type { BookMetadata, SelectedModel } from '@/types'
import { extractBookMetadata } from '@/services/ai'
import { dataUrlToBase64Image, compressImageForApi } from '@/utils/imageToBase64'
import { loadPreferences, applyPreferences } from '@/utils/applyPreferences'
import ModelSelector from './ModelSelector'
import DropZone from './DropZone'
import WebcamCapture from './WebcamCapture'
import ImagePreview from './ImagePreview'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import ErrorBanner from '@/components/shared/ErrorBanner'

interface ScannerPageProps {
  navigate: NavigateFn
  selectedModel: SelectedModel
  onModelChange: (m: SelectedModel) => void
  username: string
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function ScannerPage({ navigate, selectedModel, onModelChange, username }: ScannerPageProps) {
  const [tab, setTab] = useState<'upload' | 'webcam'>('upload')
  const [images, setImages] = useState<string[]>([])
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  async function handleScan() {
    if (images.length === 0 || isScanning) return
    setIsScanning(true)
    setError(null)
    try {
      const compressed = await Promise.all(images.map(compressImageForApi))
      const base64Images = compressed.map(dataUrlToBase64Image)
      const raw = await extractBookMetadata(base64Images, selectedModel)
      const prefs = loadPreferences()
      const withPrefs = applyPreferences(raw as Record<string, string>, prefs) as Partial<BookMetadata>
      navigate('editor', { pendingMetadata: withPrefs, pendingImages: images })
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
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <p className="text-sm text-gray-400 mb-0.5">Welcome, {username}</p>
          <h1 className="text-2xl font-semibold text-gray-900">Scan a Book</h1>
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
            onClick={() => setTab(t)}
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
      <div className="relative bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
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
