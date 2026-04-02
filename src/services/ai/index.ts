import type { Base64Image, BookMetadata, SelectedModel } from '@/types'
import { extractWithAnthropic } from './anthropic'
import { extractWithOpenAI } from './openai'
import { extractWithGemini } from './gemini'
import { extractWithOpenRouter } from './openrouter'

export async function extractBookMetadata(
  images: Base64Image[],
  model: SelectedModel
): Promise<Partial<BookMetadata>> {
  switch (model.provider) {
    case 'anthropic':
      return extractWithAnthropic(images, model.modelId, model.apiKey)
    case 'openai':
      return extractWithOpenAI(images, model.modelId, model.apiKey)
    case 'gemini':
      return extractWithGemini(images, model.modelId, model.apiKey)
    case 'openrouter':
      return extractWithOpenRouter(images, model.modelId, model.apiKey)
  }
}
