import { motion } from 'motion/react'
import { Trash2 } from 'lucide-react'
import type { BookMetadata } from '@/types'
import { COLLECTION_LABELS, ITEM_TYPE_LABELS } from '@/constants/mappings'

interface BookCardProps {
  book: BookMetadata
  onClick: () => void
  onDelete: () => void
}

export default function BookCard({ book, onClick, onDelete }: BookCardProps) {
  const collectionLabel = book.collection ? COLLECTION_LABELS[book.collection] : 'Book'
  const itemTypeLabel = book.itemType ? ITEM_TYPE_LABELS[book.itemType] : null

  return (
    <motion.div
      className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden cursor-pointer"
      whileHover={{ y: -2 }}
      transition={{ duration: 0.15 }}
      onClick={onClick}
    >
      <div className="p-4">
        {/* Badges */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
            {collectionLabel}
          </span>
          {itemTypeLabel && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
              {itemTypeLabel}
            </span>
          )}
        </div>

        {/* Title & Author */}
        <h3 className="font-semibold text-gray-900 text-sm leading-snug line-clamp-2 mb-1">
          {book.title || 'Untitled'}
        </h3>
        {book.author && (
          <p className="text-sm text-gray-500 line-clamp-1">{book.author}</p>
        )}

        {/* Publisher + Year */}
        {(book.publisher || book.publishedYear) && (
          <p className="text-xs text-gray-400 mt-1 line-clamp-1">
            {[book.publisher, book.publishedYear].filter(Boolean).join(' · ')}
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-50 px-4 py-2 flex items-center justify-between">
        <span className="text-xs text-gray-400">{book.scanDate}</span>
        <button
          onClick={e => { e.stopPropagation(); onDelete() }}
          className="text-gray-300 hover:text-red-500 transition-colors p-1 rounded"
          aria-label="Delete book"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </motion.div>
  )
}
