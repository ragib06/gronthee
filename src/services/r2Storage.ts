import { compressImage } from './imageCompression'
import { supabase } from '@/lib/supabase'

export interface UploadResult {
  urls: string[]   // public URL for each image in order; '' for any that failed
  failed: number   // count of images that failed to upload
}

interface PresignedUpload {
  presignedUrl: string
  publicUrl: string
}

interface PresignResponse {
  uploads: PresignedUpload[]
}

/**
 * Compresses and uploads all pendingImages for a book to R2 via /api/r2/presign.
 * Files are stored at {bookId}/{index}.jpg (1-based index).
 * Returns public URLs; degrades silently if not authenticated or presign fails.
 */
export async function uploadImagesToR2(
  bookId: string,
  images: string[],
): Promise<UploadResult> {
  if (images.length === 0) return { urls: [], failed: 0 }

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    console.warn('R2 storage: not authenticated — skipping upload')
    return { urls: [], failed: 0 }
  }

  let presigned: PresignResponse
  try {
    const res = await fetch('/api/r2/presign', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ bookId, count: images.length }),
    })
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${await res.text()}`)
    }
    presigned = await res.json() as PresignResponse
  } catch (err) {
    console.error('R2 presign failed:', err)
    return { urls: images.map(() => ''), failed: images.length }
  }

  const results = await Promise.all(
    images.map(async (dataUrl, i) => {
      const upload = presigned.uploads[i]
      if (!upload) return ''
      try {
        const blob = await compressImage(dataUrl)
        const response = await fetch(upload.presignedUrl, {
          method: 'PUT',
          body: blob,
          headers: { 'Content-Type': 'image/jpeg' },
        })
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${await response.text()}`)
        }
        return upload.publicUrl
      } catch (err) {
        console.error(`R2 upload failed for image ${i + 1}:`, err)
        return ''
      }
    }),
  )

  const failed = results.filter(url => url === '').length
  return { urls: results, failed }
}
