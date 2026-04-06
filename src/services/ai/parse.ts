import type { BookMetadata } from '@/types'
import { LABEL_TO_COLLECTION, LABEL_TO_ITEM_TYPE } from '@/constants/mappings'

export function parseAIResponse(raw: string): Partial<BookMetadata> {
  const cleaned = raw.replace(/^```(?:json)?\s*/m, '').replace(/\s*```\s*$/m, '').trim()

  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(cleaned) as Record<string, unknown>
  } catch {
    return {}
  }

  function str(val: unknown): string {
    return typeof val === 'string' ? val : ''
  }

  const collectionLabel = str(parsed['collection'])
  const itemTypeLabel = str(parsed['itemType'])

  const title = str(parsed['title'])
  const otherTitle = str(parsed['otherTitle'])

  return {
    title,
    subTitle: str(parsed['subTitle']),
    otherTitle: otherTitle.toLowerCase() === title.toLowerCase() ? '' : otherTitle,
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
    publicationPlace: str(parsed['publicationPlace']),
    summary: str(parsed['summary']),
  }
}
