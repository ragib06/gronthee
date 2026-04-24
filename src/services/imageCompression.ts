/**
 * Compresses a base64 data URL to a JPEG Blob using the Canvas API.
 * Scales the image down if either dimension exceeds maxDim, preserving aspect ratio.
 */
export function compressImage(
  dataUrl: string,
  maxDim = 1200,
  quality = 0.8,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      let { width, height } = img
      if (width > maxDim || height > maxDim) {
        if (width >= height) {
          height = Math.round((height * maxDim) / width)
          width = maxDim
        } else {
          width = Math.round((width * maxDim) / height)
          height = maxDim
        }
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) { reject(new Error('Canvas 2D context unavailable')); return }
      ctx.drawImage(img, 0, 0, width, height)
      canvas.toBlob(
        blob => {
          if (blob) resolve(blob)
          else reject(new Error('Canvas toBlob returned null'))
        },
        'image/jpeg',
        quality,
      )
    }
    img.onerror = () => reject(new Error('Failed to load image for compression'))
    img.src = dataUrl
  })
}
