import { AwsClient } from 'aws4fetch'
import { compressImage } from './imageCompression'

// Read env vars lazily so tests can override them via vi.stubEnv
function env() {
  return {
    accountId: import.meta.env.VITE_CLOUDFLARE_ACCOUNT_ID as string | undefined,
    accessKey: import.meta.env.VITE_CLOUDFLARE_R2_ACCESS_KEY_ID as string | undefined,
    secretKey: import.meta.env.VITE_CLOUDFLARE_R2_API_KEY as string | undefined,
    bucket:    import.meta.env.VITE_CLOUDFLARE_R2_BUCKET_NAME as string | undefined,
    publicUrl: import.meta.env.VITE_CLOUDFLARE_R2_PUBLIC_URL as string | undefined,
  }
}

function isConfigured(): boolean {
  const { accountId, accessKey, secretKey, bucket, publicUrl } = env()
  return Boolean(accountId && accessKey && secretKey && bucket && publicUrl)
}

function getClient(): AwsClient {
  const { accessKey, secretKey } = env()
  return new AwsClient({
    accessKeyId:     accessKey!,
    secretAccessKey: secretKey!,
    service:         's3',
    region:          'auto',
  })
}

export interface UploadResult {
  urls: string[]   // public URL for each image in order; '' for any that failed
  failed: number   // count of images that failed to upload
}

/**
 * Compresses and uploads all pendingImages for a book to R2.
 * Files are stored at {bookId}/{index}.jpg (1-based index).
 * Returns public URLs; degrades silently if credentials are not configured.
 */
export async function uploadImagesToR2(
  bookId: string,
  images: string[],
): Promise<UploadResult> {
  if (!isConfigured()) {
    console.warn('R2 storage: credentials not configured — skipping upload')
    return { urls: [], failed: 0 }
  }

  const client = getClient()
  const { accountId, bucket, publicUrl } = env()
  const endpoint = `https://${accountId}.r2.cloudflarestorage.com`

  // bucket may be "name" or "name/prefix/path" — split out the actual bucket name and key prefix
  const slashIdx = bucket!.indexOf('/')
  const bucketName = slashIdx >= 0 ? bucket!.slice(0, slashIdx) : bucket!
  const keyPrefix  = slashIdx >= 0 ? bucket!.slice(slashIdx + 1) + '/' : ''

  const results = await Promise.all(
    images.map(async (dataUrl, i) => {
      const key = `${keyPrefix}${bookId}/${i + 1}.jpg`
      try {
        const blob = await compressImage(dataUrl)
        const response = await client.fetch(
          `${endpoint}/${bucketName}/${key}`,
          {
            method: 'PUT',
            body: blob,
            headers: { 'Content-Type': 'image/jpeg' },
          },
        )
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${await response.text()}`)
        }
        return `${publicUrl}/${key}`
      } catch (err) {
        console.error(`R2 upload failed for ${key}:`, err)
        return ''
      }
    }),
  )

  const failed = results.filter(url => url === '').length
  return { urls: results, failed }
}
