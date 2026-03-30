import { GoogleGenerativeAI } from '@google/generative-ai'
import type { Base64Image, BookMetadata } from '@/types'
import { PROMPT } from './prompt'
import { parseAIResponse } from './parse'

export async function extractWithGemini(
  images: Base64Image[],
  modelId: string,
  apiKey: string
): Promise<Partial<BookMetadata>> {
  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: modelId })

  const imageParts = images.map(img => ({
    inlineData: { mimeType: img.mimeType, data: img.data },
  }))

  const result = await model.generateContent([...imageParts, { text: PROMPT }])
  const text = result.response.text()
  return parseAIResponse(text)
}
