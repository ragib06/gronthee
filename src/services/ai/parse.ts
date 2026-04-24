import type { BookMetadata, ConfidenceLevel, FieldConfidence } from '@/types'
import { LABEL_TO_COLLECTION, LABEL_TO_ITEM_TYPE } from '@/constants/mappings'

export interface ParsedAIResponse {
  metadata: Partial<BookMetadata>
  confidence: FieldConfidence
  raw: string   // JSON substring from the AI response (markdown fences + surrounding prose stripped), preserved for R&D export
}

// Strip markdown fences and any prose before/after the JSON object so `raw`
// contains only `{…}` — safer for downstream R&D analysis.
function extractJson(text: string): string {
  const stripped = text.replace(/^```(?:json)?\s*/m, '').replace(/\s*```\s*$/m, '').trim()
  const first = stripped.indexOf('{')
  const last = stripped.lastIndexOf('}')
  if (first === -1 || last === -1 || last < first) return stripped
  return stripped.slice(first, last + 1)
}

export function parseAIResponse(raw: string): ParsedAIResponse {
  const cleaned = extractJson(raw)

  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(cleaned) as Record<string, unknown>
  } catch {
    return { metadata: {}, confidence: {}, raw: cleaned }
  }

  function str(val: unknown): string {
    return typeof val === 'string' ? val : ''
  }

  const rawConfidence = (parsed['confidence'] ?? {}) as Record<string, unknown>
  const confidence: FieldConfidence = {}
  for (const [key, val] of Object.entries(rawConfidence)) {
    if (val === 'very low' || val === 'low' || val === 'high') {
      confidence[key] = val as ConfidenceLevel
    }
  }

  const collectionLabel = str(parsed['collection'])
  const itemTypeLabel = str(parsed['itemType'])
  const title = str(parsed['title'])
  const otherTitleRaw = str(parsed['otherTitle'])

  const metadata: Partial<BookMetadata> = {
    title,
    subTitle: str(parsed['subTitle']),
    otherTitle: otherTitleRaw.toLowerCase() === title.toLowerCase() ? '' : otherTitleRaw,
    author: str(parsed['author']) || 'N/A',
    secondAuthor: str(parsed['secondAuthor']),
    editor: str(parsed['editor']),
    translator: str(parsed['translator']),
    illustrator: str(parsed['illustrator']),
    publisher: str(parsed['publisher']),
    publishedYear: str(parsed['publishedYear']),
    publishedYearBengali: str(parsed['publishedYearBengali']),
    isbn: str(parsed['isbn']).replace(/[\s-]/g, '') || 'N/A',
    category: str(parsed['category']),
    genre: str(parsed['genre']),
    collection: LABEL_TO_COLLECTION[collectionLabel] ?? '',
    itemType: LABEL_TO_ITEM_TYPE[itemTypeLabel] ?? '',
    pageCount: str(parsed['pageCount']),
    language: str(parsed['language']).toUpperCase(),
    edition: str(parsed['edition']),
    publicationPlace: str(parsed['publicationPlace']).replace(/^calcutta$/i, 'Kolkata'),
    summary: str(parsed['summary']),
  }

  return { metadata, confidence, raw: cleaned }
}
