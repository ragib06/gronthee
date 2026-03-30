import type { BookMetadata, CollectionCode, ItemTypeCode } from '@/types'
import { COLLECTION_LABELS, ITEM_TYPE_LABELS } from '@/constants/mappings'

const HEADERS = [
  'Title', 'Sub Title', 'Other Title', 'Author', 'Second Author', 'Editor',
  'Translator', 'Illustrator', 'Publisher', 'Published Year', 'ISBN',
  'Category', 'Genre', 'Collection', 'Item Type', 'Page Count', 'Language',
  'Edition', 'Publication Place', 'Scan Date', 'Summary',
]

function escape(val: string): string {
  if (val.includes(',') || val.includes('"') || val.includes('\n')) {
    return `"${val.replace(/"/g, '""')}"`
  }
  return val
}

function toRow(book: BookMetadata): string[] {
  return [
    book.title,
    book.subTitle,
    book.otherTitle,
    book.author,
    book.secondAuthor,
    book.editor,
    book.translator,
    book.illustrator,
    book.publisher,
    book.publishedYear,
    book.isbn,
    book.category,
    book.genre,
    book.collection ? COLLECTION_LABELS[book.collection as CollectionCode] : '',
    book.itemType ? ITEM_TYPE_LABELS[book.itemType as ItemTypeCode] : '',
    book.pageCount,
    book.language,
    book.edition,
    book.publicationPlace,
    book.scanDate,
    book.summary,
  ]
}

export function defaultCsvFilename(username: string): string {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const datetime = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`
  return `gronthee-${username}-${datetime}.csv`
}

export function exportToCsv(books: BookMetadata[], filename: string): void {
  const rows = [
    HEADERS.map(escape).join(','),
    ...books.map(b => toRow(b).map(escape).join(',')),
  ]
  const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
