import { supabase } from '@/lib/supabase'
import type { Base64Image, AIProvider } from '@/types'
import { parseAIResponse, type ParsedAIResponse } from './parse'

export async function extractViaProxy(
  images: Base64Image[],
  provider: AIProvider,
  modelId: string,
): Promise<ParsedAIResponse> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')

  const res = await fetch('/api/scan', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ provider, modelId, images }),
  })

  if (!res.ok) throw new Error(`Scan failed: ${res.statusText}`)
  if (!res.body) throw new Error('No response body')

  const reader = res.body.getReader()
  const dec = new TextDecoder()
  let fullText = ''
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += dec.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6).trim()
      if (data === '[DONE]') { reader.cancel(); break }
      try {
        const parsed = JSON.parse(data) as { text?: string; error?: string }
        if (parsed.error) throw new Error(parsed.error)
        if (parsed.text) fullText += parsed.text
      } catch (e) {
        if (e instanceof SyntaxError) continue
        throw e
      }
    }
  }

  return parseAIResponse(fullText)
}
