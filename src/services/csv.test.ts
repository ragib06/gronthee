import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { sessionCsvFilename, exportSessionsToCsv, exportToCsv } from './csv'
import { DISHARI_CONFIG } from './exportConfig'
import type { BookMetadata, ExportConfig, Session } from '@/types'

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
  return { id, name, createdAt: new Date().toISOString(), configId: 'dishari' }
}

const resolveDishari = () => DISHARI_CONFIG

// Capture-Blob helper used across tests
function withCapturedBlob(run: () => void): string {
  let captured = ''
  const OriginalBlob = globalThis.Blob
  vi.spyOn(globalThis, 'Blob').mockImplementation(function(
    this: unknown,
    parts?: BlobPart[],
    opts?: BlobPropertyBag,
  ) {
    if (parts) captured = parts.join('')
    return new OriginalBlob(parts, opts)
  } as unknown as typeof Blob)
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock')
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
  const fakeA = document.createElement('a')
  vi.spyOn(fakeA, 'click').mockImplementation(() => {})
  vi.spyOn(document, 'createElement').mockReturnValue(fakeA as unknown as HTMLElement)

  run()

  vi.restoreAllMocks()
  return captured
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

  it('prefixes with rnd- when includeRnd is true', () => {
    const filename = sessionCsvFilename('ragib', 'Fiction', true)
    expect(filename).toMatch(/^gronthee-rnd-ragib-fiction-\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}\.csv$/)
  })

  it('no rnd- prefix when includeRnd is false or omitted', () => {
    expect(sessionCsvFilename('ragib', 'Fiction', false)).not.toContain('rnd-')
    expect(sessionCsvFilename('ragib', 'Fiction')).not.toContain('rnd-')
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
        vi.spyOn(el as HTMLAnchorElement, 'click').mockImplementation(clickSpy as () => void)
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
    exportSessionsToCsv(sessions, books, 'ragib', resolveDishari)
    vi.runAllTimers()
    expect(clickSpy).toHaveBeenCalledTimes(2)
  })

  it('single session triggers one download', () => {
    const sessions = [makeSession('default', 'Default')]
    const books = [makeBook('default')]
    exportSessionsToCsv(sessions, books, 'ragib', resolveDishari)
    vi.runAllTimers()
    expect(clickSpy).toHaveBeenCalledTimes(1)
  })

  it('empty session still produces a download (header-only CSV)', () => {
    const sessions = [makeSession('empty', 'Empty')]
    exportSessionsToCsv(sessions, [], 'ragib', resolveDishari)
    vi.runAllTimers()
    expect(clickSpy).toHaveBeenCalledTimes(1)
  })

  it('resolves config per session via resolveConfig callback', () => {
    const customConfig: ExportConfig = {
      id: 'custom',
      name: 'Custom',
      columns: [
        { type: 'mapped', header: 'TITLE_ONLY', field: 'title' },
      ],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    }
    const sessions = [makeSession('default', 'Default'), { ...makeSession('custom-sess', 'Custom Session'), configId: 'custom' }]
    const books = [makeBook('default'), makeBook('custom-sess')]
    const resolveSpy = vi.fn((id: string): ExportConfig => id === 'custom' ? customConfig : DISHARI_CONFIG)
    exportSessionsToCsv(sessions, books, 'ragib', resolveSpy)
    vi.runAllTimers()
    expect(resolveSpy).toHaveBeenCalledWith('dishari')
    expect(resolveSpy).toHaveBeenCalledWith('custom')
  })
})

describe('exportToCsv with Dishari config', () => {
  it('CSV contains expected headers in order', () => {
    const captured = withCapturedBlob(() => {
      exportToCsv([makeBook()], 'test.csv', DISHARI_CONFIG)
    })
    const header = captured.split('\n')[0] ?? ''
    expect(header).toContain('ISBN')
    expect(header).toContain('Author')
    expect(header).toContain('Title')
    expect(header).toContain('Item Type')
    expect(header).toContain('Collection')
    // R&D columns should NOT be present by default
    expect(header).not.toContain('Book ID')
    expect(header).not.toContain('Images')
    expect(header).not.toContain('Prompt Output')
  })

  // Backward-compat guard: Dishari output must remain byte-identical to the
  // pre-feature hard-coded CSV. If this fails, a column has drifted.
  it('produces byte-identical CSV to the legacy hard-coded format', () => {
    const LEGACY_HEADERS = [
      'ISBN', 'Language', 'Author', 'Title', 'Sub Title', 'Other Title',
      'Edition', 'Publication Place', 'Publisher', 'Published Year',
      'Page Count', 'other physical details', 'Series', 'Note Area',
      'Category', 'Genre', 'Subject 3', 'Subject 4', 'Subject 5',
      'Second Author', 'Third Column', 'Editor', 'Compiler',
      'Translator', 'Illustrator', 'Item Type', 'Status', 'Collection',
      'Home Branch', 'Holding Branch', 'Shelving Location', 'Scan Date',
      'Source of Aquisition', 'Cost, normal purchase price', 'Call No',
      'BarCode', 'Public Note', 'Second Copy', 'Third Copy', 'Fourth Copy',
    ]
    const escape = (val: string) =>
      (val.includes(',') || val.includes('"') || val.includes('\n'))
        ? `"${val.replace(/"/g, '""')}"`
        : val
    const legacyRow = (b: BookMetadata) => [
      b.isbn, b.language, b.author, b.title, b.subTitle, b.otherTitle,
      b.edition, b.publicationPlace, b.publisher, b.publishedYear,
      b.pageCount, '', '', '',
      b.category, b.genre, '', '', '',
      b.secondAuthor, '', b.editor, '',
      b.translator, b.illustrator, b.itemType, '', b.collection,
      '', '', '', b.scanDate,
      '', '', '', '', '', '', '', '',
    ]

    // Fixture exercises commas, quotes, newlines, empty fields
    const tricky: BookMetadata = {
      ...makeBook(),
      title: 'Quoted "thing", with comma',
      author: 'Line\nBreak',
      summary: '',
      subTitle: '',
    }
    const books = [makeBook(), tricky]

    const captured = withCapturedBlob(() => {
      exportToCsv(books, 'test.csv', DISHARI_CONFIG)
    })

    const expected = [
      LEGACY_HEADERS.map(escape).join(','),
      ...books.map(b => legacyRow(b).map(escape).join(',')),
    ].join('\n')

    expect(captured).toBe(expected)
  })
})

describe('exportToCsv with R&D columns', () => {
  it('appends Book ID, Images, Prompt Output headers when includeRnd=true', () => {
    const captured = withCapturedBlob(() => {
      exportToCsv([makeBook()], 'test.csv', DISHARI_CONFIG, true)
    })
    const header = captured.split('\n')[0] ?? ''
    expect(header).toContain('Book ID')
    expect(header).toContain('Images')
    expect(header).toContain('Prompt Output')
  })

  it('data row contains book id, JSON-encoded image urls, and raw AI output', () => {
    const book: BookMetadata = {
      ...makeBook(),
      id: 'book-abc',
      imageUrls: ['https://pub.example/x/1.jpg', 'https://pub.example/x/2.jpg'],
      rawAIOutput: '{"title":"My Book"}',
    }
    const captured = withCapturedBlob(() => {
      exportToCsv([book], 'test.csv', DISHARI_CONFIG, true)
    })
    const row = captured.split('\n')[1] ?? ''
    expect(row).toContain('book-abc')
    expect(row).toContain('https://pub.example/x/1.jpg')
    expect(row).toContain('https://pub.example/x/2.jpg')
    expect(row).toContain('{""title"":""My Book""}')
  })

  it('leaves R&D cells empty for pre-feature books (no imageUrls / no rawAIOutput)', () => {
    const captured = withCapturedBlob(() => {
      exportToCsv([makeBook()], 'test.csv', DISHARI_CONFIG, true)
    })
    const row = captured.split('\n')[1] ?? ''
    // Book id should be present in the third-from-last cell
    expect(row.split(',').slice(-3, -2)[0]).toMatch(/^[\w-]+$/)
    // Images + Prompt Output trail empty (",,")
    expect(row).toMatch(/,,\s*$/)
  })

  it('R&D columns work with a custom config too', () => {
    const customConfig: ExportConfig = {
      id: 'minimal',
      name: 'Minimal',
      columns: [
        { type: 'mapped', header: 'Title', field: 'title' },
        { type: 'constant', header: 'Marker', value: 'X' },
      ],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    }
    const book: BookMetadata = {
      ...makeBook(),
      id: 'book-z',
      imageUrls: ['https://pub.example/z/1.jpg'],
      rawAIOutput: '{"k":"v"}',
    }
    const captured = withCapturedBlob(() => {
      exportToCsv([book], 'test.csv', customConfig, true)
    })
    const lines = captured.split('\n')
    expect(lines[0]).toBe('Title,Marker,Book ID,Images,Prompt Output')
    expect(lines[1]).toContain('book-z')
    expect(lines[1]).toContain('https://pub.example/z/1.jpg')
  })
})

describe('renderCell behavior', () => {
  it('mapped column with empty BookMetadata field renders empty string', () => {
    const config: ExportConfig = {
      id: 'tiny', name: 'Tiny',
      columns: [{ type: 'mapped', header: 'Sub', field: 'subTitle' }],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    }
    const book = { ...makeBook(), subTitle: '' }
    const captured = withCapturedBlob(() => exportToCsv([book], 'test.csv', config))
    expect(captured.split('\n')[1]).toBe('')
  })

  it('constant column renders the literal value, even when empty', () => {
    const config: ExportConfig = {
      id: 'tiny', name: 'Tiny',
      columns: [
        { type: 'constant', header: 'Marker', value: 'fixed' },
        { type: 'constant', header: 'Empty', value: '' },
      ],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    }
    const captured = withCapturedBlob(() => exportToCsv([makeBook()], 'test.csv', config))
    expect(captured.split('\n')[1]).toBe('fixed,')
  })
})
