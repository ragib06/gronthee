import OpenAI from 'openai'
import type { Base64Image, BookMetadata } from '@/types'
import { PROMPT } from './prompt'
import { parseAIResponse } from './parse'

export async function extractWithOpenAI(
  images: Base64Image[],
  modelId: string,
  apiKey: string
): Promise<Partial<BookMetadata>> {
  const client = new OpenAI({ apiKey, dangerouslyAllowBrowser: true })

  const imageParts: OpenAI.ChatCompletionContentPartImage[] = images.map(img => ({
    type: 'image_url',
    image_url: { url: `data:${img.mimeType};base64,${img.data}` },
  }))

  const response = await client.chat.completions.create({
    model: modelId,
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: [
          ...imageParts,
          { type: 'text', text: PROMPT },
        ],
      },
    ],
  })

  const text = response.choices[0]?.message.content ?? ''
  return parseAIResponse(text)
}
