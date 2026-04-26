import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mocks — must be hoisted before module import
// ---------------------------------------------------------------------------

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
    },
  },
}))

vi.mock('./imageCompression', () => ({
  compressImage: vi.fn(),
}))

// ---------------------------------------------------------------------------
// Imports (after mocks are registered)
// ---------------------------------------------------------------------------

import { uploadImagesToR2 } from './r2Storage'
import { supabase } from '@/lib/supabase'
import { compressImage } from './imageCompression'

const mockGetSession = supabase.auth.getSession as ReturnType<typeof vi.fn>
const mockCompressImage = compressImage as ReturnType<typeof vi.fn>
const mockFetch = vi.fn()

const FAKE_BLOB = new Blob(['compressed'], { type: 'image/jpeg' })
const SESSION = { access_token: 'jwt-abc' }

function presignResponseFor(bookId: string, count: number) {
  const uploads = Array.from({ length: count }, (_, i) => ({
    presignedUrl: `https://acc.r2.cloudflarestorage.com/bucket/${bookId}/${i + 1}.jpg?X-Amz-Signature=sig${i + 1}`,
    publicUrl: `https://pub-test.r2.dev/${bookId}/${i + 1}.jpg`,
  }))
  return {
    ok: true,
    status: 200,
    json: async () => ({ uploads }),
    text: async () => '',
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('fetch', mockFetch)
  mockGetSession.mockResolvedValue({ data: { session: SESSION } })
  mockCompressImage.mockResolvedValue(FAKE_BLOB)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('uploadImagesToR2', () => {
  it('returns empty result for empty images array without making any network call', async () => {
    const result = await uploadImagesToR2('book-1', [])
    expect(result).toEqual({ urls: [], failed: 0 })
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('skips upload when not authenticated', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } })
    const result = await uploadImagesToR2('book-1', ['data:image/jpeg;base64,a'])
    expect(result).toEqual({ urls: [], failed: 0 })
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('calls /api/r2/presign with bookId, count, and bearer token', async () => {
    mockFetch.mockResolvedValueOnce(presignResponseFor('book-1', 2))
    mockFetch.mockResolvedValue({ ok: true, status: 200, text: async () => '' })

    await uploadImagesToR2('book-1', ['a', 'b'])

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/r2/presign',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Authorization': 'Bearer jwt-abc',
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({ bookId: 'book-1', count: 2 }),
      }),
    )
  })

  it('returns the public URL for each successfully uploaded image', async () => {
    mockFetch.mockResolvedValueOnce(presignResponseFor('book-1', 2))
    mockFetch.mockResolvedValue({ ok: true, status: 200, text: async () => '' })

    const result = await uploadImagesToR2('book-1', ['data:image/jpeg;base64,a', 'data:image/jpeg;base64,b'])

    expect(result.urls).toHaveLength(2)
    expect(result.urls[0]).toBe('https://pub-test.r2.dev/book-1/1.jpg')
    expect(result.urls[1]).toBe('https://pub-test.r2.dev/book-1/2.jpg')
    expect(result.failed).toBe(0)
  })

  it('PUTs each compressed blob to its presigned URL with image/jpeg content-type', async () => {
    mockFetch.mockResolvedValueOnce(presignResponseFor('abc', 1))
    mockFetch.mockResolvedValue({ ok: true, status: 200, text: async () => '' })

    await uploadImagesToR2('abc', ['data:image/jpeg;base64,x'])

    expect(mockFetch).toHaveBeenCalledWith(
      'https://acc.r2.cloudflarestorage.com/bucket/abc/1.jpg?X-Amz-Signature=sig1',
      expect.objectContaining({
        method: 'PUT',
        body: FAKE_BLOB,
        headers: { 'Content-Type': 'image/jpeg' },
      }),
    )
  })

  it('compresses every image once', async () => {
    mockFetch.mockResolvedValueOnce(presignResponseFor('book-1', 3))
    mockFetch.mockResolvedValue({ ok: true, status: 200, text: async () => '' })

    await uploadImagesToR2('book-1', ['a', 'b', 'c'])

    expect(mockCompressImage).toHaveBeenCalledTimes(3)
  })

  it('returns empty string and increments failed when an upload errors', async () => {
    mockFetch.mockResolvedValueOnce(presignResponseFor('book-1', 2))
    mockFetch
      .mockResolvedValueOnce({ ok: true, status: 200, text: async () => '' })
      .mockRejectedValueOnce(new Error('network error'))

    const result = await uploadImagesToR2('book-1', ['img1', 'img2'])
    expect(result.urls[0]).toBe('https://pub-test.r2.dev/book-1/1.jpg')
    expect(result.urls[1]).toBe('')
    expect(result.failed).toBe(1)
  })

  it('returns empty string when an upload responds with non-ok status', async () => {
    mockFetch.mockResolvedValueOnce(presignResponseFor('book-1', 1))
    mockFetch.mockResolvedValue({ ok: false, status: 403, text: async () => 'Forbidden' })

    const result = await uploadImagesToR2('book-1', ['img1'])
    expect(result.urls[0]).toBe('')
    expect(result.failed).toBe(1)
  })

  it('marks all images failed when presign call fails', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500, text: async () => 'Server error' })

    const result = await uploadImagesToR2('book-1', ['a', 'b', 'c'])
    expect(result.urls).toEqual(['', '', ''])
    expect(result.failed).toBe(3)
  })

  it('marks all images failed when presign throws', async () => {
    mockFetch.mockRejectedValueOnce(new Error('network down'))

    const result = await uploadImagesToR2('book-1', ['a', 'b'])
    expect(result.urls).toEqual(['', ''])
    expect(result.failed).toBe(2)
  })
})
