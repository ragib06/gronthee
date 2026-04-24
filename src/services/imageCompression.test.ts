import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { compressImage } from './imageCompression'

// ---------------------------------------------------------------------------
// Helpers — minimal browser API mocks (not available in jsdom)
// ---------------------------------------------------------------------------

function makeMockCanvas(blob: Blob | null, contextOk = true) {
  const ctx = { drawImage: vi.fn() }
  return {
    width: 0,
    height: 0,
    getContext: vi.fn(() => (contextOk ? ctx : null)),
    toBlob: vi.fn((cb: (b: Blob | null) => void) => cb(blob)),
    _ctx: ctx,
  }
}

class MockImage {
  onload: (() => void) | null = null
  onerror: ((e: Event) => void) | null = null
  width = 800
  height = 600
  private _src = ''
  get src() { return this._src }
  set src(v: string) {
    this._src = v
    // Fire onload on next tick so the promise chain resolves
    Promise.resolve().then(() => this.onload?.())
  }
}

let originalCreateElement: typeof document.createElement

beforeEach(() => {
  originalCreateElement = document.createElement.bind(document)
  vi.stubGlobal('Image', MockImage)
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('compressImage', () => {
  it('returns a Blob on success', async () => {
    const blob = new Blob(['jpeg'], { type: 'image/jpeg' })
    const canvas = makeMockCanvas(blob)
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'canvas') return canvas as unknown as HTMLCanvasElement
      return originalCreateElement(tag)
    })

    const result = await compressImage('data:image/jpeg;base64,abc')
    expect(result).toBeInstanceOf(Blob)
  })

  it('calls drawImage on the canvas context', async () => {
    const blob = new Blob(['jpeg'], { type: 'image/jpeg' })
    const canvas = makeMockCanvas(blob)
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'canvas') return canvas as unknown as HTMLCanvasElement
      return originalCreateElement(tag)
    })

    await compressImage('data:image/jpeg;base64,abc')
    expect(canvas._ctx.drawImage).toHaveBeenCalledOnce()
  })

  it('scales down an oversized image to maxDim', async () => {
    // Image is 2400×1800 — should be scaled to 1200×900
    class WideImage extends MockImage {
      override width = 2400
      override height = 1800
    }
    vi.stubGlobal('Image', WideImage)

    const blob = new Blob(['jpeg'], { type: 'image/jpeg' })
    const canvas = makeMockCanvas(blob)
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'canvas') return canvas as unknown as HTMLCanvasElement
      return originalCreateElement(tag)
    })

    await compressImage('data:image/jpeg;base64,abc', 1200)
    expect(canvas.width).toBe(1200)
    expect(canvas.height).toBe(900)
  })

  it('does not upscale a small image', async () => {
    // Image is 400×300 — smaller than maxDim, should not be resized
    class SmallImage extends MockImage {
      override width = 400
      override height = 300
    }
    vi.stubGlobal('Image', SmallImage)

    const blob = new Blob(['jpeg'], { type: 'image/jpeg' })
    const canvas = makeMockCanvas(blob)
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'canvas') return canvas as unknown as HTMLCanvasElement
      return originalCreateElement(tag)
    })

    await compressImage('data:image/jpeg;base64,abc', 1200)
    expect(canvas.width).toBe(400)
    expect(canvas.height).toBe(300)
  })

  it('scales portrait images by height', async () => {
    // Image is 600×2400 — height is the limiting dimension, should be scaled to 300×1200
    class TallImage extends MockImage {
      override width = 600
      override height = 2400
    }
    vi.stubGlobal('Image', TallImage)

    const blob = new Blob(['jpeg'], { type: 'image/jpeg' })
    const canvas = makeMockCanvas(blob)
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'canvas') return canvas as unknown as HTMLCanvasElement
      return originalCreateElement(tag)
    })

    await compressImage('data:image/jpeg;base64,abc', 1200)
    expect(canvas.height).toBe(1200)
    expect(canvas.width).toBe(300)
  })

  it('rejects when canvas context is unavailable', async () => {
    const canvas = makeMockCanvas(null, false) // getContext returns null
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'canvas') return canvas as unknown as HTMLCanvasElement
      return originalCreateElement(tag)
    })

    await expect(compressImage('data:image/jpeg;base64,abc')).rejects.toThrow()
  })

  it('rejects when toBlob returns null', async () => {
    const canvas = makeMockCanvas(null) // toBlob calls cb(null)
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'canvas') return canvas as unknown as HTMLCanvasElement
      return originalCreateElement(tag)
    })

    await expect(compressImage('data:image/jpeg;base64,abc')).rejects.toThrow()
  })

  it('rejects when the image fails to load', async () => {
    class FailImage extends MockImage {
      override set src(_v: string) {
        Promise.resolve().then(() => this.onerror?.(new Event('error')))
      }
    }
    vi.stubGlobal('Image', FailImage)

    const blob = new Blob(['jpeg'], { type: 'image/jpeg' })
    const canvas = makeMockCanvas(blob)
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'canvas') return canvas as unknown as HTMLCanvasElement
      return originalCreateElement(tag)
    })

    await expect(compressImage('data:image/jpeg;base64,bad')).rejects.toThrow()
  })
})
