export const runtime = 'edge'

import { createClient } from '@supabase/supabase-js'

export default async function handler(): Promise<Response> {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
  const { error } = await supabase.from('books').select('id').limit(1)
  if (error) return new Response(`keepalive failed: ${error.message}`, { status: 500 })
  return new Response('OK')
}
