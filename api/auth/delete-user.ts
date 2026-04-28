import type { IncomingMessage, ServerResponse } from 'node:http'
import { createClient } from '@supabase/supabase-js'

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

  const supabaseUrl = process.env.SUPABASE_URL
  const anonKey = process.env.SUPABASE_ANON_KEY
  const secretKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !anonKey || !secretKey) {
    res.statusCode = 500
    res.end('Supabase credentials not configured')
    return
  }

  const userClient = createClient(supabaseUrl, anonKey)
  const { data: userData, error: authError } = await userClient.auth.getUser(token)
  if (authError || !userData.user) {
    res.statusCode = 401
    res.end('Unauthorized')
    return
  }

  const adminClient = createClient(supabaseUrl, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { error: deleteError } = await adminClient.auth.admin.deleteUser(userData.user.id)
  if (deleteError) {
    res.statusCode = 500
    res.end(`Delete failed: ${deleteError.message}`)
    return
  }

  res.statusCode = 200
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify({ ok: true }))
}
