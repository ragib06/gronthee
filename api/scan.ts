import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { PROMPT } from '../src/services/ai/prompt'

type AIProvider = 'anthropic' | 'openai' | 'gemini' | 'openrouter'

interface Base64Image {
  data: string
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp'
}

interface ScanRequest {
  provider: AIProvider
  modelId: string
  images: Base64Image[]
}

type ReasoningEffort = 'xhigh' | 'high' | 'medium' | 'low' | 'minimal' | 'none'

const enc = new TextEncoder()
const sse = (data: string) => enc.encode(`data: ${data}\n\n`)

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  const auth = req.headers.get('Authorization')
  if (!auth?.startsWith('Bearer ')) {
    return new Response('Unauthorized', { status: 401 })
  }
  const token = auth.slice(7)

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
  )
  const { error: authError } = await supabase.auth.getUser(token)
  if (authError) return new Response('Unauthorized', { status: 401 })

  const { provider, modelId, images } = await req.json() as ScanRequest

  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>()
  const writer = writable.getWriter()

  const write = (data: string) => writer.write(sse(data))

  ;(async () => {
    try {
      if (provider === 'anthropic') {
        const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
        const imageBlocks: Anthropic.ImageBlockParam[] = images.map(img => ({
          type: 'image',
          source: { type: 'base64', media_type: img.mimeType, data: img.data },
        }))
        const stream = await client.messages.create({
          model: modelId,
          max_tokens: 2048,
          stream: true,
          messages: [{ role: 'user', content: [...imageBlocks, { type: 'text', text: PROMPT }] }],
        })
        for await (const event of stream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            await write(JSON.stringify({ text: event.delta.text }))
          }
        }

      } else if (provider === 'openai') {
        const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
        const imageParts: OpenAI.ChatCompletionContentPartImage[] = images.map(img => ({
          type: 'image_url',
          image_url: { url: `data:${img.mimeType};base64,${img.data}` },
        }))
        const stream = await client.chat.completions.create({
          model: modelId,
          max_tokens: 1024,
          stream: true,
          messages: [{ role: 'user', content: [...imageParts, { type: 'text', text: PROMPT }] }],
        })
        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta?.content ?? ''
          if (text) await write(JSON.stringify({ text }))
        }

      } else if (provider === 'gemini') {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
        const model = genAI.getGenerativeModel({ model: modelId })
        const imageParts = images.map(img => ({
          inlineData: { mimeType: img.mimeType, data: img.data },
        }))
        const result = await model.generateContentStream([...imageParts, { text: PROMPT }])
        for await (const chunk of result.stream) {
          const text = chunk.text()
          if (text) await write(JSON.stringify({ text }))
        }

      } else if (provider === 'openrouter') {
        const client = new OpenAI({
          apiKey: process.env.OPENROUTER_API_KEY,
          baseURL: 'https://openrouter.ai/api/v1',
        })
        const imageParts: OpenAI.ChatCompletionContentPartImage[] = images.map(img => ({
          type: 'image_url',
          image_url: { url: `data:${img.mimeType};base64,${img.data}` },
        }))
        const params: OpenAI.ChatCompletionCreateParamsStreaming & { reasoning?: { effort: ReasoningEffort } } = {
          model: modelId,
          max_tokens: 8192,
          stream: true,
          reasoning: { effort: 'medium' },
          messages: [{ role: 'user', content: [...imageParts, { type: 'text', text: PROMPT }] }],
        }
        const stream = await client.chat.completions.create(params)
        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta?.content ?? ''
          if (text) await write(JSON.stringify({ text }))
        }
      }

      await write('[DONE]')
    } catch (err) {
      await write(JSON.stringify({ error: String(err) }))
    } finally {
      await writer.close()
    }
  })().catch(() => { writer.close().catch(() => {}) })

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no',
    },
  })
}
