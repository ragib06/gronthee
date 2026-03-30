import type { Base64Image } from '@/types'

export function dataUrlToBase64Image(dataUrl: string): Base64Image {
  const commaIndex = dataUrl.indexOf(',')
  const header = dataUrl.slice(0, commaIndex)
  const data = dataUrl.slice(commaIndex + 1)
  const mimeMatch = header.match(/data:(image\/(?:jpeg|png|webp));base64/)
  const mimeType = (mimeMatch?.[1] ?? 'image/jpeg') as Base64Image['mimeType']
  return { data, mimeType }
}

function base64ByteSize(dataUrl: string): number {
  const base64 = dataUrl.split(',')[1] ?? ''
  return Math.floor(base64.length * 3 / 4)
}

// Resize to max 1568px (Anthropic's recommended max) and compress to JPEG
// until the image is safely under the 5 MB API limit.
export function compressImageForApi(dataUrl: string): Promise<string> {
  const MAX_DIM = 1568
  const MAX_BYTES = 4.5 * 1024 * 1024

  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      let { width, height } = img
      if (width > MAX_DIM || height > MAX_DIM) {
        if (width >= height) {
          height = Math.round(height * MAX_DIM / width)
          width = MAX_DIM
        } else {
          width = Math.round(width * MAX_DIM / height)
          height = MAX_DIM
        }
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) { reject(new Error('Canvas not supported')); return }
      ctx.drawImage(img, 0, 0, width, height)

      let quality = 0.85
      let result = canvas.toDataURL('image/jpeg', quality)
      while (base64ByteSize(result) > MAX_BYTES && quality > 0.1) {
        quality = Math.round((quality - 0.1) * 10) / 10
        result = canvas.toDataURL('image/jpeg', quality)
      }
      resolve(result)
    }
    img.onerror = () => reject(new Error('Failed to load image for compression'))
    img.src = dataUrl
  })
}
