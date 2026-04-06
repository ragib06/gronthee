export type CollectionCode =
  | 'ART' | 'BIO' | 'CHI' | 'COLL' | 'CRI'
  | 'FIC' | 'HIST' | 'MYTH' | 'MISC' | 'NFIC'
  | 'PLAY' | 'POET' | 'REF' | 'SCIFI' | 'SPI'
  | 'SPO' | 'TRVL' | 'COOK' | 'MUSC' | 'ESSY'

export type ItemTypeCode = 'BK' | 'ASB' | 'RB' | 'REF' | 'MG'

export type AIProvider = 'anthropic' | 'openai' | 'gemini' | 'openrouter'

export interface BookMetadata {
  id: string
  title: string
  subTitle: string
  otherTitle: string
  author: string
  secondAuthor: string
  editor: string
  translator: string
  illustrator: string
  publisher: string
  publishedYear: string        // YYYY (Gregorian)
  publishedYearBengali: string // Bengali era year, e.g. "1407" — present when book shows it or was converted
  isbn: string
  category: string
  genre: string
  collection: CollectionCode | ''
  itemType: ItemTypeCode | ''
  pageCount: string
  language: string             // ISO 639-1
  edition: string
  publicationPlace: string
  scanDate: string             // YYYY-MM-DD, auto, non-editable
  summary: string
}

// Raw AI output before corrections — collection/itemType are human-readable strings
export interface AIRawResponse {
  title: string
  subTitle: string
  otherTitle: string
  author: string
  secondAuthor: string
  editor: string
  translator: string
  illustrator: string
  publisher: string
  publishedYear: string
  publishedYearBengali: string
  isbn: string
  category: string
  genre: string
  collection: string    // e.g. "Fiction" — mapped to code by parseAIResponse
  itemType: string      // e.g. "Book" — mapped to code by parseAIResponse
  pageCount: string
  language: string
  edition: string
  publicationPlace: string
  summary: string
}

// After code mapping — ready to fill BookMetadata (minus id and scanDate)
export type RawBookMetadata = Omit<BookMetadata, 'id' | 'scanDate'>

export interface ModelDefinition {
  id: string
  label: string
}

export interface ProviderConfig {
  provider: AIProvider
  label: string
  models: ModelDefinition[]
}

export interface AIConfig {
  defaultProvider: AIProvider
  defaultModelId: string
  providers: ProviderConfig[]
}

export interface SelectedModel {
  provider: AIProvider
  modelId: string
  apiKey: string
}

export type ConfidenceLevel = 'very low' | 'low' | 'high'
export type FieldConfidence = Record<string, ConfidenceLevel>

export interface UserPreferences {
  corrections: Record<string, Record<string, string>>
}

export interface Base64Image {
  data: string
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp'
}
