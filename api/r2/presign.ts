import type { IncomingMessage, ServerResponse } from 'node:http'
import { createClient } from '@supabase/supabase-js'
import { AwsClient } from 'aws4fetch'

interface PresignRequest {
  bookId: string
  count: number
}

interface PresignedUpload {
  presignedUrl: string
  publicUrl: string
}

const EXPIRES_SECONDS = 300

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(chunk as Buffer)
  return Buffer.concat(chunks).toString('utf-8')
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'POST') {
    res.statusCode = 405
    res.end('Method Not Allowed')
    return
  }

  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) {
    res.statusCode = 401
    res.end('Unauthorized')
    return
  }
  const token = auth.slice(7)

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
  )
  const { error: authError } = await supabase.auth.getUser(token)
  if (authError) {
    res.statusCode = 401
    res.end('Unauthorized')
    return
  }

  let body: PresignRequest
  try {
    body = JSON.parse(await readBody(req)) as PresignRequest
  } catch {
    res.statusCode = 400
    res.end('Invalid JSON')
    return
  }

  const { bookId, count } = body
  if (!bookId || typeof bookId !== 'string' || !Number.isInteger(count) || count < 1 || count > 20) {
    res.statusCode = 400
    res.end('Invalid bookId or count')
    return
  }

  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
  const accessKey = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID
  const secretKey = process.env.CLOUDFLARE_R2_SECRET_KEY
  const bucket = process.env.CLOUDFLARE_R2_BUCKET_NAME
  const publicBase = process.env.CLOUDFLARE_R2_PUBLIC_URL

  if (!accountId || !accessKey || !secretKey || !bucket || !publicBase) {
    res.statusCode = 500
    res.end('R2 credentials not configured')
    return
  }

  const slashIdx = bucket.indexOf('/')
  const bucketName = slashIdx >= 0 ? bucket.slice(0, slashIdx) : bucket
  const keyPrefix = slashIdx >= 0 ? bucket.slice(slashIdx + 1) + '/' : ''

  const aws = new AwsClient({
    accessKeyId: accessKey,
    secretAccessKey: secretKey,
    service: 's3',
    region: 'auto',
  })

  try {
    const uploads: PresignedUpload[] = await Promise.all(
      Array.from({ length: count }, async (_, i) => {
        const key = `${keyPrefix}${bookId}/${i + 1}.jpg`
        const url = new URL(`https://${accountId}.r2.cloudflarestorage.com/${bucketName}/${key}`)
        url.searchParams.set('X-Amz-Expires', String(EXPIRES_SECONDS))
        const signed = await aws.sign(url.toString(), {
          method: 'PUT',
          aws: { signQuery: true },
        })
        return {
          presignedUrl: signed.url,
          publicUrl: `${publicBase}/${key}`,
        }
      }),
    )

    res.statusCode = 200
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ uploads }))
  } catch (err) {
    res.statusCode = 500
    res.end(`Presign failed: ${String(err)}`)
  }
}
