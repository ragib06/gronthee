import type { IncomingMessage, ServerResponse } from 'node:http'
import { createClient } from '@supabase/supabase-js'

export default async function handler(_req: IncomingMessage, res: ServerResponse) {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
  const { error } = await supabase.from('books').select('id').limit(1)
  if (error) {
    res.statusCode = 500
    res.end(`keepalive failed: ${error.message}`)
    return
  }
  res.statusCode = 200
  res.end('OK')
}
