import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { sessionCsvFilename, exportSessionsToCsv, exportToCsv } from './csv'
import type { BookMetadata, Session } from '@/types'

function makeBook(sessionId = 'default'): BookMetadata {
  return {
    id: crypto.randomUUID(),
    sessionId,
    title: 'My Book',
    subTitle: '',
    otherTitle: '',
    author: 'Jane Doe',
    secondAuthor: '',
    editor: '',
    translator: '',
    illustrator: '',
    publisher: 'Publisher',
    publishedYear: '2020',
    publishedYearBengali: '',
    isbn: '9780000000000',
    category: 'Fiction',
    genre: 'Novel',
    collection: 'FIC',
    itemType: 'BK',
    pageCount: '300',
    language: 'en',
    edition: '1st',
    publicationPlace: 'Dhaka',
    scanDate: '2026-01-01',
    summary: 'Summary',
  }
}

function makeSession(id: string, name: string): Session {
  return { id, name, createdAt: new Date().toISOString() }
}

describe('sessionCsvFilename', () => {
  it('follows expected format', () => {
    const filename = sessionCsvFilename('ragib', 'Fiction')
    expect(filename).toMatch(/^gronthee-ragib-fiction-\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}\.csv$/)
  })

  it('slugifies spaces in session name', () => {
    const filename = sessionCsvFilename('ragib', 'Summer 2025')
    expect(filename).toContain('summer-2025')
  })

  it('strips special chars from session name', () => {
    const filename = sessionCsvFilename('ragib', 'Books & More!')
    expect(filename).not.toContain('&')
    expect(filename).not.toContain('!')
  })
})

describe('exportSessionsToCsv', () => {
  let clickSpy: ReturnType<typeof vi.fn>
  let originalCreateElement: typeof document.createElement

  beforeEach(() => {
    vi.useFakeTimers()
    clickSpy = vi.fn()
    originalCreateElement = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = originalCreateElement(tag)
      if (tag === 'a') {
        vi.spyOn(el as HTMLAnchorElement, 'click').mockImplementation(clickSpy)
      }
      return el
    })
    vi.spyOn(document.body, 'appendChild').mockImplementation(node => node)
    vi.spyOn(document.body, 'removeChild').mockImplementation(node => node)
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('triggers one download per selected session', () => {
    const sessions = [makeSession('default', 'Default'), makeSession('sci-fi', 'Sci-Fi')]
    const books = [makeBook('default'), makeBook('sci-fi'), makeBook('sci-fi')]
    exportSessionsToCsv(sessions, books, 'ragib')
    vi.runAllTimers()
    expect(clickSpy).toHaveBeenCalledTimes(2)
  })

  it('single session triggers one download', () => {
    const sessions = [makeSession('default', 'Default')]
    const books = [makeBook('default')]
    exportSessionsToCsv(sessions, books, 'ragib')
    vi.runAllTimers()
    expect(clickSpy).toHaveBeenCalledTimes(1)
  })

  it('empty session still produces a download (header-only CSV)', () => {
    const sessions = [makeSession('empty', 'Empty')]
    exportSessionsToCsv(sessions, [], 'ragib')
    vi.runAllTimers()
    expect(clickSpy).toHaveBeenCalledTimes(1)
  })
})

describe('exportToCsv column order', () => {
  it('CSV contains expected headers in order', () => {
    let capturedContent = ''
    const OriginalBlob = globalThis.Blob

    // Must use a regular function (not arrow) so it can act as a constructor
    vi.spyOn(globalThis, 'Blob').mockImplementation(function(
      this: unknown,
      parts?: BlobPart[],
      opts?: BlobPropertyBag,
    ) {
      if (parts) capturedContent = parts.join('')
      return new OriginalBlob(parts, opts)
    } as unknown as typeof Blob)

    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    // Use a real anchor element so appendChild/removeChild work in jsdom
    const fakeA = document.createElement('a')
    vi.spyOn(fakeA, 'click').mockImplementation(() => {})
    vi.spyOn(document, 'createElement').mockReturnValue(fakeA as unknown as HTMLElement)

    exportToCsv([makeBook()], 'test.csv')

    const header = capturedContent.split('\n')[0] ?? ''
    expect(header).toContain('ISBN')
    expect(header).toContain('Author')
    expect(header).toContain('Title')
    expect(header).toContain('Item Type')
    expect(header).toContain('Collection')

    vi.restoreAllMocks()
  })
})
