import type { Base64Image, SelectedModel } from '@/types'
import { extractViaProxy } from './proxy'
import type { ParsedAIResponse } from './parse'

export async function extractBookMetadata(
  images: Base64Image[],
  model: SelectedModel,
): Promise<ParsedAIResponse> {
  return extractViaProxy(images, model.provider, model.modelId)
}
