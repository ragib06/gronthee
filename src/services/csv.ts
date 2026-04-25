import type { BookMetadata, ExportColumn, ExportConfig, Session } from '@/types'

const RND_HEADERS = ['Book ID', 'Images', 'Prompt Output']

function escape(val: string): string {
  if (val.includes(',') || val.includes('"') || val.includes('\n')) {
    return `"${val.replace(/"/g, '""')}"`
  }
  return val
}

function rndRow(book: BookMetadata): string[] {
  return [
    book.id,
    book.imageUrls && book.imageUrls.length > 0 ? JSON.stringify(book.imageUrls) : '',
    book.rawAIOutput ?? '',
  ]
}

function renderCell(book: BookMetadata, column: ExportColumn): string {
  if (column.type === 'constant') return column.value
  return (book[column.field] as string | undefined) ?? ''
}

function buildHeaders(config: ExportConfig, includeRnd: boolean): string[] {
  const headers = config.columns.map(c => c.header)
  return includeRnd ? [...headers, ...RND_HEADERS] : headers
}

function buildRow(book: BookMetadata, config: ExportConfig, includeRnd: boolean): string[] {
  const cells = config.columns.map(c => renderCell(book, c))
  return includeRnd ? [...cells, ...rndRow(book)] : cells
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

export function defaultCsvFilename(username: string, includeRnd = false): string {
  const prefix = includeRnd ? 'gronthee-rnd-' : 'gronthee-'
  return `${prefix}${username}-${datetimeStamp()}.csv`
}

export function sessionCsvFilename(username: string, sessionName: string, includeRnd = false): string {
  const prefix = includeRnd ? 'gronthee-rnd-' : 'gronthee-'
  return `${prefix}${username}-${nameToSlug(sessionName)}-${datetimeStamp()}.csv`
}

function downloadCsv(books: BookMetadata[], filename: string, config: ExportConfig, includeRnd: boolean): void {
  const headers = buildHeaders(config, includeRnd)
  const rows = [
    headers.map(escape).join(','),
    ...books.map(b => buildRow(b, config, includeRnd).map(escape).join(',')),
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

export function exportToCsv(
  books: BookMetadata[],
  filename: string,
  config: ExportConfig,
  includeRnd = false,
): void {
  downloadCsv(books, filename, config, includeRnd)
}

export function exportSessionsToCsv(
  sessions: Session[],
  books: BookMetadata[],
  username: string,
  resolveConfig: (id: string) => ExportConfig,
  includeRnd = false,
): void {
  // Stagger downloads by 300 ms each — browsers silently drop simultaneous
  // programmatic clicks so only the first file would otherwise be saved.
  sessions.forEach((session, i) => {
    setTimeout(() => {
      const sessionBooks = books.filter(b => b.sessionId === session.id)
      const config = resolveConfig(session.configId)
      downloadCsv(sessionBooks, sessionCsvFilename(username, session.name, includeRnd), config, includeRnd)
    }, i * 300)
  })
}
