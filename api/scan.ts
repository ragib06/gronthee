import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { GoogleGenerativeAI } from '@google/generative-ai'
const PROMPT = `You are a book cataloging assistant. You will be given one or more images of a book (cover, title page, copyright page, or back cover). Extract the book's metadata and return it as a single JSON object.

CRITICAL RULES:
1. ALL output values MUST be in English or romanised/transliterated form. Translate summaries, publisher names, author names (transliterate if needed), and all other text fields into English. EXCEPTION — see rule 13 for title fields.
13. For "title" and "otherTitle": always use the title exactly as it appears on the book (romanised/transliterated if it uses a non-Latin script) as "title". If an English translation of that title also appears on the book, put it in "otherTitle". NEVER put an English translation in "title" when the original title is available — the original (even if non-English) always takes priority for "title".
2. Return ONLY a raw JSON object — no markdown fences, no commentary, no explanation.
3. If a field cannot be determined from the images, use an empty string "".
4. The "language" field is the ISO 639-1 code of the book's ORIGINAL language in ALL CAPS (e.g., "EN", "BN", "FR", "AR") — this is the one field that is NOT translated.
5. For "publishedYear" and "publishedYearBengali":
   - "publishedYear" must always be a 4-digit Gregorian year string (e.g., "2019") or "".
   - "publishedYearBengali" must be the Bengali era (Bangla Saal) year as a numeric string (e.g., "1407") or "".
   - If multiple years appear (e.g. different editions), always use the LATEST year.
   - If the book shows only a Bengali year (e.g., "Boishakh 1407"), convert to Gregorian by adding 593 (1407 + 593 = 2000) and fill both fields.
   - If the book shows only a Gregorian year, subtract 593 to derive the Bengali year and fill both fields.
   - If both appear on the book, fill both directly.
   - If neither can be determined, use "" for both.
6. For "pageCount", return only a numeric string (e.g., "312") or "".
7. For "category", return exactly one of these values or "":
   Fiction, Non-Fiction, Miscellaneous
15. For "genre", return exactly one of these values or "":
   Agriculture, Analytical Essays, Art, Art History, Autobiography, Belles Letters, Bilingual, Biography, Children, Collected Works, Comedy, Cooking, Crime, Culture, Dictionary, Drama, Education, Essay, Fiction, Historical Fiction, History, Indian Magazine, Indian Philosophy, Islamic History, Letters, Literary Criticism, Lyrics, Magazine, Math, Memoir, Miscellaneous, Muktijuddha, Mythology, Nature, Non-Fiction, Novel, Novella, Partitition, Philosophy, Play, Poetry, Reference, Religion, Sanskrit, Science, Science Fiction, Short Stories, Song, Spirituality, Story, Tagore, Thriller, Translation, Travel, Travelogue, Workbook
8. For "collection", return one of these exact human-readable values or "":
   Art, Biography, Children, Collection, Literary Criticism, Fiction, History, Mythology, Miscellaneous, Non-Fiction, Play, Poetry, Reference, Science Fiction, Spiritual, Sports, Travel, Cook, Music, Essay
9. For "itemType", return one of these exact human-readable values or "":
   Book, Author Signed Book, Rare Book, Reference, Magazine
10. For "summary", write 1-2 sentences in English describing the book's subject matter.
11. For "edition", use ordinal form: "1st", "2nd", "3rd", etc., or "". Only consider edition or publication dates — ignore impression numbers, print run numbers, and reprint dates entirely. If multiple editions are mentioned, always return the highest (latest) one.
12. For "publicationPlace", return the city name only — do not include country or state (e.g., "New York", not "New York, USA").
16. For "publisher": on Bengali books, use the name listed under প্রকাশক (publisher) — NOT পরিবেশক (distributor). If both appear, always use প্রকাশক.
14. For every field, include a corresponding entry in the "confidence" object using one of these exact values:
    - "high": the value is clearly and unambiguously visible in the images
    - "low": the value is present but partially obscured, inferred, or uncertain
    - "very low": the value is not visible and is mostly guessed or unavailable

Return this exact JSON structure:
{
  "title": "",
  "subTitle": "",
  "otherTitle": "",
  "author": "",
  "secondAuthor": "",
  "editor": "",
  "translator": "",
  "illustrator": "",
  "publisher": "",
  "publishedYear": "",
  "publishedYearBengali": "",
  "isbn": "",
  "category": "",
  "genre": "",
  "collection": "",
  "itemType": "",
  "pageCount": "",
  "language": "",
  "edition": "",
  "publicationPlace": "",
  "summary": "",
  "confidence": {
    "title": "high",
    "subTitle": "high",
    "otherTitle": "high",
    "author": "high",
    "secondAuthor": "high",
    "editor": "high",
    "translator": "high",
    "illustrator": "high",
    "publisher": "high",
    "publishedYear": "high",
    "publishedYearBengali": "high",
    "isbn": "high",
    "category": "high",
    "genre": "high",
    "collection": "high",
    "itemType": "high",
    "pageCount": "high",
    "language": "high",
    "edition": "high",
    "publicationPlace": "high",
    "summary": "high"
  }
}`

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
