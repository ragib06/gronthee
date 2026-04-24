/**
 * One-time setup: configures CORS on the R2 bucket so the browser app can PUT objects.
 * Run from the project root:  node scripts/setup-r2-cors.mjs
 *
 * Reads credentials from .env.local (same file used by Vite).
 * Requires Node.js 18+ (native fetch + crypto).
 */

import { readFileSync } from 'fs'
import { AwsClient } from 'aws4fetch'

// ---------------------------------------------------------------------------
// Load .env.local
// ---------------------------------------------------------------------------
function loadEnvLocal() {
  try {
    return Object.fromEntries(
      readFileSync('.env.local', 'utf8')
        .split('\n')
        .filter(line => line.includes('=') && !line.startsWith('#'))
        .map(line => {
          const idx = line.indexOf('=')
          const key = line.slice(0, idx).trim()
          // Strip surrounding single or double quotes (Vite does this automatically)
          const value = line.slice(idx + 1).trim().replace(/^(['"])(.*)\1$/, '$2')
          return [key, value]
        }),
    )
  } catch {
    console.error('Could not read .env.local — make sure you run this from the project root.')
    process.exit(1)
  }
}

const env = loadEnvLocal()
const accountId = env.VITE_CLOUDFLARE_ACCOUNT_ID
const accessKey = env.VITE_CLOUDFLARE_R2_ACCESS_KEY_ID
const secretKey = env.VITE_CLOUDFLARE_R2_API_KEY
const bucket    = env.VITE_CLOUDFLARE_R2_BUCKET_NAME

function preview(s) {
  if (!s) return '(missing)'
  return `len=${s.length} first4=${s.slice(0, 4)} last4=${s.slice(-4)}`
}
console.log('Loaded credentials:')
console.log(`  VITE_CLOUDFLARE_ACCOUNT_ID         ${preview(accountId)}`)
console.log(`  VITE_CLOUDFLARE_R2_ACCESS_KEY_ID   ${preview(accessKey)}`)
console.log(`  VITE_CLOUDFLARE_R2_API_KEY         ${preview(secretKey)}`)
console.log(`  VITE_CLOUDFLARE_R2_BUCKET_NAME     ${bucket || '(missing)'}`)
console.log()

if (!accountId || !accessKey || !secretKey || !bucket) {
  console.error(
    'Missing one or more required vars in .env.local:\n' +
    '  VITE_CLOUDFLARE_ACCOUNT_ID\n' +
    '  VITE_CLOUDFLARE_R2_ACCESS_KEY_ID\n' +
    '  VITE_CLOUDFLARE_R2_API_KEY\n' +
    '  VITE_CLOUDFLARE_R2_BUCKET_NAME',
  )
  process.exit(1)
}

// ---------------------------------------------------------------------------
// CORS XML — allow PUT from any origin (tighten AllowedOrigin for production)
// ---------------------------------------------------------------------------
const corsXml = `<?xml version="1.0" encoding="UTF-8"?>
<CORSConfiguration>
  <CORSRule>
    <AllowedOrigin>*</AllowedOrigin>
    <AllowedMethod>GET</AllowedMethod>
    <AllowedMethod>PUT</AllowedMethod>
    <AllowedMethod>POST</AllowedMethod>
    <AllowedMethod>HEAD</AllowedMethod>
    <AllowedHeader>*</AllowedHeader>
    <MaxAgeSeconds>3000</MaxAgeSeconds>
  </CORSRule>
</CORSConfiguration>`

// ---------------------------------------------------------------------------
// PUT /{bucket}?cors  (S3 PutBucketCors)
// ---------------------------------------------------------------------------
const client = new AwsClient({
  accessKeyId:     accessKey,
  secretAccessKey: secretKey,
  service:         's3',
  region:          'auto',
})

const url = `https://${accountId}.r2.cloudflarestorage.com/${bucket}?cors`
console.log(`Setting CORS on: ${url}`)

const response = await client.fetch(url, {
  method:  'PUT',
  body:    corsXml,
  headers: { 'Content-Type': 'application/xml' },
})

if (!response.ok) {
  const body = await response.text()
  console.error(`✗ PUT failed (HTTP ${response.status}):\n${body}`)
  process.exit(1)
}
console.log('✓ PUT succeeded. Verifying by reading config back…\n')

// ---------------------------------------------------------------------------
// GET /{bucket}?cors  (verify)
// ---------------------------------------------------------------------------
const verify = await client.fetch(url, { method: 'GET' })
const body = await verify.text()
console.log(`HTTP ${verify.status}`)
console.log(body)
