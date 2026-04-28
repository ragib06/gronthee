import type { IncomingMessage, ServerResponse } from 'node:http'
import { createClient } from '@supabase/supabase-js'

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const expected = process.env.CRON_SECRET
  if (!expected) {
    res.statusCode = 500
    res.end('CRON_SECRET not configured')
    return
  }
  if (req.headers.authorization !== `Bearer ${expected}`) {
    res.statusCode = 401
    res.end('Unauthorized')
    return
  }

  const secretKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!secretKey) {
    res.statusCode = 500
    res.end('Supabase secret key not configured')
    return
  }
  const supabase = createClient(process.env.SUPABASE_URL!, secretKey)
  const { error } = await supabase.from('profiles').select('count').limit(1)
  if (error) {
    res.statusCode = 500
    res.end(`keepalive failed: ${error.message}`)
    return
  }
  res.statusCode = 200
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify({ ok: true }))
}
