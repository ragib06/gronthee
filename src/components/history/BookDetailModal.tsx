import { useEffect } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { X } from 'lucide-react'
import type { BookMetadata } from '@/types'
import { COLLECTION_LABELS, ITEM_TYPE_LABELS } from '@/constants/mappings'

interface BookDetailModalProps {
  book: BookMetadata | null
  onClose: () => void
  onEdit: (book: BookMetadata) => void
}

interface FieldRowProps {
  label: string
  value: string
}

function FieldRow({ label, value }: FieldRowProps) {
  return (
    <div>
      <dt className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-0.5">{label}</dt>
      <dd className="text-sm text-gray-900">{value || '—'}</dd>
    </div>
  )
}

export default function BookDetailModal({ book, onClose, onEdit }: BookDetailModalProps) {
  useEffect(() => {
    if (!book) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [book, onClose])

  return (
    <AnimatePresence>
      {book && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/50" onClick={onClose} />
          <motion.div
            className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-y-auto"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-start justify-between gap-4">
              <h2 className="text-lg font-semibold text-gray-900 leading-snug">{book.title || 'Untitled'}</h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 shrink-0 transition-colors"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="px-6 py-4">
              {/* Title Information */}
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Title Information</h3>
              <dl className="grid grid-cols-2 gap-4 mb-6">
                <FieldRow label="Title" value={book.title} />
                <FieldRow label="Subtitle" value={book.subTitle} />
                <FieldRow label="Other Title" value={book.otherTitle} />
              </dl>

              {/* People */}
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">People</h3>
              <dl className="grid grid-cols-2 gap-4 mb-6">
                <FieldRow label="Author" value={book.author} />
                <FieldRow label="Second Author" value={book.secondAuthor} />
                <FieldRow label="Editor" value={book.editor} />
                <FieldRow label="Translator" value={book.translator} />
                <FieldRow label="Illustrator" value={book.illustrator} />
              </dl>

              {/* Publication Details */}
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Publication Details</h3>
              <dl className="grid grid-cols-2 gap-4 mb-6">
                <FieldRow label="Publisher" value={book.publisher} />
                <FieldRow label="Year" value={book.publishedYear} />
                <FieldRow label="Publication Place" value={book.publicationPlace} />
                <FieldRow label="Edition" value={book.edition} />
                <FieldRow label="ISBN" value={book.isbn} />
                <FieldRow label="Pages" value={book.pageCount} />
                <FieldRow label="Language" value={book.language} />
              </dl>

              {/* Classification */}
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Classification</h3>
              <dl className="grid grid-cols-2 gap-4 mb-6">
                <FieldRow label="Category" value={book.category} />
                <FieldRow label="Genre" value={book.genre} />
                <FieldRow
                  label="Collection"
                  value={book.collection ? COLLECTION_LABELS[book.collection] : ''}
                />
                <FieldRow
                  label="Item Type"
                  value={book.itemType ? ITEM_TYPE_LABELS[book.itemType] : ''}
                />
              </dl>

              {/* Other */}
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Other</h3>
              <dl className="grid grid-cols-2 gap-4 mb-6">
                <FieldRow label="Scan Date" value={book.scanDate} />
              </dl>
              {book.summary && (
                <div className="mb-4">
                  <dt className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Summary</dt>
                  <dd className="text-sm text-gray-900 leading-relaxed">{book.summary}</dd>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => onEdit(book)}
                className="px-4 py-2 text-sm rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition-colors"
              >
                Edit
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
