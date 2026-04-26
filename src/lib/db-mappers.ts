import type { BookMetadata, Session } from '@/types'
import type { Database } from './supabase-types'

type BookRow = Database['public']['Tables']['books']['Row']
type BookInsert = Database['public']['Tables']['books']['Insert']
type SessionRow = Database['public']['Tables']['sessions']['Row']
type SessionInsert = Database['public']['Tables']['sessions']['Insert']

export function toBookRow(book: BookMetadata, userId: string): BookInsert {
  return {
    id: book.id,
    user_id: userId,
    session_id: book.sessionId === 'default' ? null : book.sessionId,
    title: book.title,
    sub_title: book.subTitle || null,
    other_title: book.otherTitle || null,
    author: book.author || null,
    second_author: book.secondAuthor || null,
    editor: book.editor || null,
    translator: book.translator || null,
    illustrator: book.illustrator || null,
    publisher: book.publisher || null,
    published_year: book.publishedYear || null,
    published_year_bengali: book.publishedYearBengali || null,
    isbn: book.isbn || null,
    category: book.category || null,
    genre: book.genre || null,
    collection: book.collection || null,
    item_type: book.itemType || null,
    page_count: book.pageCount || null,
    language: book.language || null,
    edition: book.edition || null,
    publication_place: book.publicationPlace || null,
    scan_date: book.scanDate,
    summary: book.summary || null,
    image_urls: book.imageUrls ?? null,
    raw_ai_output: book.rawAIOutput ?? null,
  }
}

export function toSessionRow(session: Session, userId: string): SessionInsert {
  return {
    id: session.id,
    user_id: userId,
    name: session.name,
    config_id: session.configId,
    created_at: session.createdAt,
  }
}

export function fromSessionRow(row: SessionRow): Session {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    configId: row.config_id,
  }
}

export function fromBookRow(row: BookRow): BookMetadata {
  return {
    id: row.id,
    sessionId: row.session_id ?? 'default',
    title: row.title,
    subTitle: row.sub_title ?? '',
    otherTitle: row.other_title ?? '',
    author: row.author ?? '',
    secondAuthor: row.second_author ?? '',
    editor: row.editor ?? '',
    translator: row.translator ?? '',
    illustrator: row.illustrator ?? '',
    publisher: row.publisher ?? '',
    publishedYear: row.published_year ?? '',
    publishedYearBengali: row.published_year_bengali ?? '',
    isbn: row.isbn ?? '',
    category: row.category ?? '',
    genre: row.genre ?? '',
    collection: (row.collection ?? '') as BookMetadata['collection'],
    itemType: (row.item_type ?? '') as BookMetadata['itemType'],
    pageCount: row.page_count ?? '',
    language: row.language ?? '',
    edition: row.edition ?? '',
    publicationPlace: row.publication_place ?? '',
    scanDate: row.scan_date,
    summary: row.summary ?? '',
    imageUrls: row.image_urls != null ? (row.image_urls as string[]) : undefined,
    rawAIOutput: row.raw_ai_output ?? undefined,
  }
}
