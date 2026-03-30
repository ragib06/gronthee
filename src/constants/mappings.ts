import type { CollectionCode, ItemTypeCode } from '@/types'

export const COLLECTION_LABELS: Record<CollectionCode, string> = {
  ART: 'Art',
  BIO: 'Biography',
  CHI: 'Children',
  COLL: 'Collection',
  CRI: 'Literary Criticism',
  FIC: 'Fiction',
  HYST: 'History',
  MYTH: 'Mythology',
  MISC: 'Miscellaneous',
  NFIC: 'Non-Fiction',
  PLAY: 'Play',
  POET: 'Poetry',
  REF: 'Reference',
  SCIFI: 'Science Fiction',
  SPI: 'Spiritual',
  SPO: 'Sports',
  TRVL: 'Travel',
  COOK: 'Cook',
  MUSC: 'Music',
  ESSY: 'Essay',
}

export const ITEM_TYPE_LABELS: Record<ItemTypeCode, string> = {
  BK: 'Book',
  ASB: 'Author Signed Book',
  RB: 'Rare Book',
  REF: 'Reference',
  MG: 'Magazine',
}

// Reverse maps: human-readable label → code (used by parseAIResponse)
export const LABEL_TO_COLLECTION: Record<string, CollectionCode> = Object.fromEntries(
  Object.entries(COLLECTION_LABELS).map(([code, label]) => [label, code as CollectionCode])
)

export const LABEL_TO_ITEM_TYPE: Record<string, ItemTypeCode> = Object.fromEntries(
  Object.entries(ITEM_TYPE_LABELS).map(([code, label]) => [label, code as ItemTypeCode])
)
