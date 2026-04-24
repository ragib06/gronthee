import type { BookMetadata, Session } from '@/types'

const HEADERS = [
  'ISBN',
  'Language',
  'Author',
  'Title',
  'Sub Title',
  'Other Title',
  'Edition',
  'Publication Place',
  'Publisher',
  'Published Year',
  'Page Count',
  'other physical details',
  'Series',
  'Note Area',
  'Category',
  'Genre',
  'Subject 3',
  'Subject 4',
  'Subject 5',
  'Second Author',
  'Third Column',
  'Editor',
  'Compiler',
  'Translator',
  'Illustrator',
  'Item Type',
  'Status',
  'Collection',
  'Home Branch',
  'Holding Branch',
  'Shelving Location',
  'Scan Date',
  'Source of Aquisition',
  'Cost, normal purchase price',
  'Call No',
  'BarCode',
  'Public Note',
  'Second Copy',
  'Third Copy',
  'Fourth Copy',
]

function escape(val: string): string {
  if (val.includes(',') || val.includes('"') || val.includes('\n')) {
    return `"${val.replace(/"/g, '""')}"`
  }
  return val
}

const EMPTY = ''

function toRow(book: BookMetadata): string[] {
  return [
    book.isbn,
    book.language,
    book.author,
    book.title,
    book.subTitle,
    book.otherTitle,
    book.edition,
    book.publicationPlace,
    book.publisher,
    book.publishedYear,
    book.pageCount,
    EMPTY,               // other physical details
    EMPTY,               // Series
    EMPTY,               // Note Area
    book.category,
    book.genre,
    EMPTY,               // Subject 3
    EMPTY,               // Subject 4
    EMPTY,               // Subject 5
    book.secondAuthor,
    EMPTY,               // Third Column
    book.editor,
    EMPTY,               // Compiler
    book.translator,
    book.illustrator,
    book.itemType,
    EMPTY,               // Status
    book.collection,
    EMPTY,               // Home Branch
    EMPTY,               // Holding Branch
    EMPTY,               // Shelving Location
    book.scanDate,
    EMPTY,               // Source of Aquisition
    EMPTY,               // Cost, normal purchase price
    EMPTY,               // Call No
    EMPTY,               // BarCode
    EMPTY,               // Public Note
    EMPTY,               // Second Copy
    EMPTY,               // Third Copy
    EMPTY,               // Fourth Copy
  ]
}

function datetimeStamp(): string {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`
}

function nameToSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-') || 'session'
}

export function defaultCsvFilename(username: string): string {
  return `gronthee-${username}-${datetimeStamp()}.csv`
}

export function sessionCsvFilename(username: string, sessionName: string): string {
  return `gronthee-${username}-${nameToSlug(sessionName)}-${datetimeStamp()}.csv`
}

function downloadCsv(books: BookMetadata[], filename: string): void {
  const rows = [
    HEADERS.map(escape).join(','),
    ...books.map(b => toRow(b).map(escape).join(',')),
  ]
  const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function exportToCsv(books: BookMetadata[], filename: string): void {
  downloadCsv(books, filename)
}

export function exportSessionsToCsv(
  sessions: Session[],
  books: BookMetadata[],
  username: string,
): void {
  // Stagger downloads by 300 ms each — browsers silently drop simultaneous
  // programmatic clicks so only the first file would otherwise be saved.
  sessions.forEach((session, i) => {
    setTimeout(() => {
      const sessionBooks = books.filter(b => b.sessionId === session.id)
      downloadCsv(sessionBooks, sessionCsvFilename(username, session.name))
    }, i * 300)
  })
}
