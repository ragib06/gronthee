import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mocks — must be hoisted before module import
// ---------------------------------------------------------------------------

vi.mock('aws4fetch', () => ({
  AwsClient: vi.fn(),
}))

vi.mock('./imageCompression', () => ({
  compressImage: vi.fn(),
}))

// ---------------------------------------------------------------------------
// Imports (after mocks are registered)
// ---------------------------------------------------------------------------

import { uploadImagesToR2 } from './r2Storage'
import { AwsClient } from 'aws4fetch'
import { compressImage } from './imageCompression'

const mockFetch = vi.fn()
const MockAwsClient = AwsClient as ReturnType<typeof vi.fn>
const mockCompressImage = compressImage as ReturnType<typeof vi.fn>

const FAKE_BLOB = new Blob(['compressed'], { type: 'image/jpeg' })

// Env vars required by r2Storage
const ENV = {
  VITE_CLOUDFLARE_ACCOUNT_ID: 'acc123',
  VITE_CLOUDFLARE_R2_ACCESS_KEY_ID: 'key-id',
  VITE_CLOUDFLARE_R2_API_KEY: 'secret',
  VITE_CLOUDFLARE_R2_BUCKET_NAME: 'test-bucket',
}

beforeEach(() => {
  vi.clearAllMocks()
  // Must use a regular function (not arrow) — arrow functions can't be constructors
  MockAwsClient.mockImplementation(function() { return { fetch: mockFetch } })
  mockCompressImage.mockResolvedValue(FAKE_BLOB)
  mockFetch.mockResolvedValue({ ok: true, text: async () => '' })
  for (const [k, v] of Object.entries(ENV)) {
    vi.stubEnv(k, v)
  }
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('uploadImagesToR2', () => {
  it('returns empty result when credentials are not configured', async () => {
    vi.stubEnv('VITE_CLOUDFLARE_ACCOUNT_ID', '')
    const result = await uploadImagesToR2('book-1', ['data:image/jpeg;base64,abc'])
    expect(result).toEqual({ urls: [], failed: 0 })
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('returns public URL for each successfully uploaded image', async () => {
    const result = await uploadImagesToR2('book-1', ['data:image/jpeg;base64,a', 'data:image/jpeg;base64,b'])
    expect(result.urls).toHaveLength(2)
    expect(result.urls[0]).toBe('https://pub-ee6eff0f380e4682848807d6c0e6fa9e.r2.dev/book-1/1.jpg')
    expect(result.urls[1]).toBe('https://pub-ee6eff0f380e4682848807d6c0e6fa9e.r2.dev/book-1/2.jpg')
    expect(result.failed).toBe(0)
  })

  it('uses the correct R2 path and method', async () => {
    await uploadImagesToR2('abc', ['data:image/jpeg;base64,x'])
    expect(mockFetch).toHaveBeenCalledWith(
      'https://acc123.r2.cloudflarestorage.com/test-bucket/abc/1.jpg',
      expect.objectContaining({ method: 'PUT' }),
    )
  })

  it('sets Content-Type to image/jpeg', async () => {
    await uploadImagesToR2('abc', ['data:image/jpeg;base64,x'])
    const callArgs = mockFetch.mock.calls[0][1] as RequestInit & { headers: Record<string, string> }
    expect(callArgs.headers['Content-Type']).toBe('image/jpeg')
  })

  it('calls compressImage for each image', async () => {
    await uploadImagesToR2('book-1', ['a', 'b', 'c'])
    expect(mockCompressImage).toHaveBeenCalledTimes(3)
  })

  it('returns empty string and increments failed when an upload errors', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, text: async () => '' })
      .mockRejectedValueOnce(new Error('network error'))

    const result = await uploadImagesToR2('book-1', ['img1', 'img2'])
    expect(result.urls[0]).toBe('https://pub-ee6eff0f380e4682848807d6c0e6fa9e.r2.dev/book-1/1.jpg')
    expect(result.urls[1]).toBe('')
    expect(result.failed).toBe(1)
  })

  it('returns empty string when server responds with non-ok status', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 403, text: async () => 'Forbidden' })

    const result = await uploadImagesToR2('book-1', ['img1'])
    expect(result.urls[0]).toBe('')
    expect(result.failed).toBe(1)
  })

  it('counts all as failed when every upload fails', async () => {
    mockFetch.mockRejectedValue(new Error('timeout'))

    const result = await uploadImagesToR2('book-1', ['a', 'b', 'c'])
    expect(result.failed).toBe(3)
    expect(result.urls).toEqual(['', '', ''])
  })

  it('handles an empty images array gracefully', async () => {
    const result = await uploadImagesToR2('book-1', [])
    expect(result).toEqual({ urls: [], failed: 0 })
    expect(mockFetch).not.toHaveBeenCalled()
  })
})
