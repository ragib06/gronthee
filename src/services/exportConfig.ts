import type { BookField, ExportColumn, ExportConfig } from '@/types'
import { toSlug } from '@/utils/slug'
import dishariJson from '@/config/dishari-export-config.json'

const BOOK_FIELDS: ReadonlySet<BookField> = new Set<BookField>([
  'title', 'subTitle', 'otherTitle',
  'author', 'secondAuthor', 'editor', 'translator', 'illustrator',
  'publisher', 'publishedYear', 'publishedYearBengali',
  'isbn', 'category', 'genre', 'collection', 'itemType',
  'pageCount', 'language', 'edition', 'publicationPlace',
  'scanDate', 'summary',
])

export const ALL_BOOK_FIELDS: readonly BookField[] = [...BOOK_FIELDS]

const MAX_HEADER_LEN = 200
const MAX_COLUMNS = 200

export function isBookField(value: unknown): value is BookField {
  return typeof value === 'string' && BOOK_FIELDS.has(value as BookField)
}

export interface ValidationError { error: string }

export function isValidationError(result: ExportConfig | ValidationError): result is ValidationError {
  return 'error' in result
}

export function validateConfig(input: unknown): ExportConfig | ValidationError {
  if (!input || typeof input !== 'object') {
    return { error: 'Config must be an object.' }
  }
  const obj = input as Record<string, unknown>

  const name = typeof obj.name === 'string' ? obj.name.trim() : ''
  if (!name) return { error: "Config 'name' is required." }

  if (!Array.isArray(obj.columns)) {
    return { error: "Config 'columns' must be an array." }
  }
  if (obj.columns.length === 0) {
    return { error: 'Config must have at least one column.' }
  }
  if (obj.columns.length > MAX_COLUMNS) {
    return { error: `Config has too many columns (max ${MAX_COLUMNS}).` }
  }

  const columns: ExportColumn[] = []
  for (let i = 0; i < obj.columns.length; i++) {
    const raw = obj.columns[i]
    if (!raw || typeof raw !== 'object') {
      return { error: `Column ${i}: must be an object.` }
    }
    const col = raw as Record<string, unknown>
    const header = typeof col.header === 'string' ? col.header : ''
    if (!header) return { error: `Column ${i}: 'header' is required.` }
    if (header.length > MAX_HEADER_LEN) {
      return { error: `Column ${i}: 'header' exceeds ${MAX_HEADER_LEN} characters.` }
    }

    if (col.type === 'mapped') {
      if (!isBookField(col.field)) {
        return { error: `Column ${i} ('${header}'): unknown field '${String(col.field)}'.` }
      }
      columns.push({ type: 'mapped', header, field: col.field })
    } else if (col.type === 'constant') {
      const value = typeof col.value === 'string' ? col.value : ''
      columns.push({ type: 'constant', header, value })
    } else {
      return { error: `Column ${i} ('${header}'): unknown type '${String(col.type)}'.` }
    }
  }

  const id = typeof obj.id === 'string' && obj.id ? obj.id : toSlug(name)
  const now = new Date().toISOString()
  const createdAt = typeof obj.createdAt === 'string' ? obj.createdAt : now
  const updatedAt = typeof obj.updatedAt === 'string' ? obj.updatedAt : now

  const result: ExportConfig = { id, name, columns, createdAt, updatedAt }
  if (typeof obj.description === 'string' && obj.description) {
    result.description = obj.description
  }
  if (obj.builtIn === true) {
    result.builtIn = true
  }
  return result
}

export function serializeForShare(config: ExportConfig): string {
  // Strip id and builtIn — the recipient re-derives an id from the name and
  // imported configs are always editable user configs.
  const exported: {
    name: string
    description?: string
    columns: ExportColumn[]
    createdAt: string
    updatedAt: string
  } = {
    name: config.name,
    columns: config.columns,
    createdAt: config.createdAt,
    updatedAt: config.updatedAt,
  }
  if (config.description) exported.description = config.description
  return JSON.stringify(exported, null, 2)
}

export function parseImported(json: string): ExportConfig | ValidationError {
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    return { error: 'This file is not valid JSON.' }
  }
  const result = validateConfig(parsed)
  if (isValidationError(result)) {
    const msg = result.error.replace(/^Config /, '')
    return { error: `This file isn't a valid Gronthee export config — ${msg.charAt(0).toLowerCase()}${msg.slice(1)}` }
  }
  delete result.builtIn
  return result
}

const DISHARI_VALIDATED = validateConfig(dishariJson)
if (isValidationError(DISHARI_VALIDATED)) {
  throw new Error(`Bundled Dishari config is invalid: ${DISHARI_VALIDATED.error}`)
}

export const DISHARI_CONFIG: ExportConfig = { ...DISHARI_VALIDATED, builtIn: true }
