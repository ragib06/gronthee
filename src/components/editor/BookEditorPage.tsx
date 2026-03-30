import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { ChevronLeft, ImageOff, X, ZoomIn, ZoomOut } from 'lucide-react'
import type { NavigateFn } from '@/App'
import type { BookMetadata } from '@/types'
import { useUserPreferences } from '@/hooks/useUserPreferences'
import BookForm from './BookForm'

interface BookEditorPageProps {
  navigate: NavigateFn
  book?: BookMetadata
  pendingMetadata?: Partial<BookMetadata>
  pendingImages: string[]
  onAdd: (book: BookMetadata) => void
  onUpdate: (book: BookMetadata) => void
}

export default function BookEditorPage({
  navigate,
  book,
  pendingMetadata,
  pendingImages,
  onAdd,
  onUpdate,
}: BookEditorPageProps) {
  const [zoomedImage, setZoomedImage] = useState<string | null>(null)
  const [zoomLevel, setZoomLevel] = useState(1)

  const ZOOM_STEPS = [1, 1.5, 2, 3]

  function openZoom(src: string) {
    setZoomedImage(src)
    setZoomLevel(1)
  }

  function closeZoom() {
    setZoomedImage(null)
    setZoomLevel(1)
  }

  function zoomIn() {
    setZoomLevel(prev => {
      const idx = ZOOM_STEPS.indexOf(prev)
      return ZOOM_STEPS[Math.min(idx + 1, ZOOM_STEPS.length - 1)]
    })
  }

  function zoomOut() {
    setZoomLevel(prev => {
      const idx = ZOOM_STEPS.indexOf(prev)
      return ZOOM_STEPS[Math.max(idx - 1, 0)]
    })
  }

  function toggleZoomOnTap() {
    setZoomLevel(prev => prev > 1 ? 1 : 2)
  }

  function generateId(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
    })
  }

  const isEdit = !!book
  const initialValues: Partial<BookMetadata> = book ?? pendingMetadata ?? {}
  const scanDate = book?.scanDate ?? new Date().toISOString().slice(0, 10)
  const { recordCorrections } = useUserPreferences()

  function handleSave(data: Omit<BookMetadata, 'id'>) {
    if (isEdit && book) {
      onUpdate({ ...data, id: book.id, scanDate })
    } else {
      if (pendingMetadata) recordCorrections(pendingMetadata, data)
      onAdd({ ...data, id: generateId(), scanDate })
    }
    navigate('history', { flashMessage: isEdit ? 'Book updated successfully.' : 'Book saved successfully.' })
  }

  function handleCancel() {
    navigate(isEdit ? 'history' : 'scan')
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
    >
      {/* Page Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={handleCancel}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ChevronLeft size={16} />
          Back
        </button>
        <h1 className="text-2xl font-semibold text-gray-900">
          {isEdit ? 'Edit Book' : 'Review & Save'}
        </h1>
      </div>

      {/* Two-column layout */}
      <div className="flex flex-col md:flex-row gap-6">
        {/* Left: Image thumbnails */}
        <div className="w-full md:w-1/3 shrink-0">
          {pendingImages.length > 0 ? (
            <div className="grid grid-cols-2 gap-2 max-w-[240px] md:max-w-none mx-auto md:mx-0">
              {pendingImages.map((src, i) => (
                <button
                  key={i}
                  onClick={() => openZoom(src)}
                  className="relative group rounded-lg overflow-hidden border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  aria-label={`View image ${i + 1} full size`}
                >
                  <img
                    src={src}
                    alt={`Book image ${i + 1}`}
                    className="w-full aspect-[3/4] object-cover"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 group-active:bg-black/20 transition-colors flex items-center justify-center">
                    <ZoomIn size={16} className="text-white opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity drop-shadow" />
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 p-12 text-center">
              <ImageOff size={32} className="text-gray-300" />
              <p className="text-sm text-gray-400">No images</p>
            </div>
          )}
        </div>

        {/* Right: Form */}
        <div className="flex-1 bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <BookForm
            initialValues={initialValues}
            scanDate={scanDate}
            onSave={handleSave}
            onCancel={handleCancel}
          />
        </div>
      </div>

      {/* Zoom modal */}
      <AnimatePresence>
        {zoomedImage && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeZoom}
          >
            {/* Scrollable image area */}
            <div className="w-full h-full flex items-center justify-center overflow-auto p-12">
              <motion.img
                src={zoomedImage}
                alt="Zoomed book image"
                className="rounded-xl object-contain select-none"
                style={{
                  maxWidth: zoomLevel === 1 ? '100%' : 'none',
                  maxHeight: zoomLevel === 1 ? '100%' : 'none',
                  cursor: zoomLevel < 3 ? 'zoom-in' : 'zoom-out',
                }}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: zoomLevel, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                onClick={e => { e.stopPropagation(); toggleZoomOnTap() }}
              />
            </div>

            {/* Top controls */}
            <div className="absolute top-4 left-0 right-0 flex items-center justify-between px-4 pointer-events-none">
              {/* Zoom level badge */}
              <span className="pointer-events-none bg-black/50 text-white text-xs px-2 py-1 rounded-md">
                {zoomLevel}×
              </span>

              {/* Close button */}
              <button
                onClick={closeZoom}
                className="pointer-events-auto w-9 h-9 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center transition-colors"
                aria-label="Close zoom"
              >
                <X size={18} />
              </button>
            </div>

            {/* Bottom zoom controls */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-black/60 rounded-full px-4 py-2">
              <button
                onClick={e => { e.stopPropagation(); zoomOut() }}
                disabled={zoomLevel <= 1}
                className="w-8 h-8 flex items-center justify-center text-white disabled:opacity-30 hover:text-indigo-300 transition-colors"
                aria-label="Zoom out"
              >
                <ZoomOut size={20} />
              </button>
              <div className="flex gap-1">
                {ZOOM_STEPS.map(step => (
                  <button
                    key={step}
                    onClick={e => { e.stopPropagation(); setZoomLevel(step) }}
                    className={`w-2 h-2 rounded-full transition-colors ${zoomLevel === step ? 'bg-white' : 'bg-white/30'}`}
                    aria-label={`Zoom ${step}×`}
                  />
                ))}
              </div>
              <button
                onClick={e => { e.stopPropagation(); zoomIn() }}
                disabled={zoomLevel >= ZOOM_STEPS[ZOOM_STEPS.length - 1]}
                className="w-8 h-8 flex items-center justify-center text-white disabled:opacity-30 hover:text-indigo-300 transition-colors"
                aria-label="Zoom in"
              >
                <ZoomIn size={20} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
