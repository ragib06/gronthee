import OpenAI from 'openai'
import type { Base64Image } from '@/types'
import { PROMPT } from './prompt'
import { parseAIResponse, type ParsedAIResponse } from './parse'

export async function extractWithOpenRouter(
  images: Base64Image[],
  modelId: string,
  apiKey: string
): Promise<ParsedAIResponse> {
  const client = new OpenAI({
    apiKey,
    baseURL: 'https://openrouter.ai/api/v1',
    dangerouslyAllowBrowser: true,
  })

  const imageParts: OpenAI.ChatCompletionContentPartImage[] = images.map(img => ({
    type: 'image_url',
    image_url: { url: `data:${img.mimeType};base64,${img.data}` },
  }))

  type ReasoningEffort = 'xhigh' | 'high' | 'medium' | 'low' | 'minimal' | 'none'
  const params: OpenAI.ChatCompletionCreateParamsNonStreaming & { reasoning?: { effort: ReasoningEffort } } = {
    model: modelId,
    max_tokens: 8192,
    reasoning: { effort: 'medium' },
    messages: [
      {
        role: 'user',
        content: [
          ...imageParts,
          { type: 'text', text: PROMPT },
        ],
      },
    ],
  }

  const response = await client.chat.completions.create(params)

  const text = response.choices[0]?.message.content ?? ''
  return parseAIResponse(text)
}
