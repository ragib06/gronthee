import Anthropic from '@anthropic-ai/sdk'
import type { Base64Image } from '@/types'
import { PROMPT } from './prompt'
import { parseAIResponse, type ParsedAIResponse } from './parse'

export async function extractWithAnthropic(
  images: Base64Image[],
  modelId: string,
  apiKey: string
): Promise<ParsedAIResponse> {
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true })

  const imageBlocks: Anthropic.ImageBlockParam[] = images.map(img => ({
    type: 'image',
    source: {
      type: 'base64',
      media_type: img.mimeType,
      data: img.data,
    },
  }))

  const response = await client.messages.create({
    model: modelId,
    max_tokens: 2048,
    messages: [
      {
        role: 'user',
        content: [
          ...imageBlocks,
          { type: 'text', text: PROMPT },
        ],
      },
    ],
  })

  const textBlock = response.content.find(b => b.type === 'text')
  const text = textBlock?.type === 'text' ? textBlock.text : ''
  return parseAIResponse(text)
}
