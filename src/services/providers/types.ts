import { ItemType } from '../../types';

// Represents a single text or image input for the API
export type EmbeddingInput = { id: string, content: string | Blob, type: ItemType };

// Represents the output from the API, mapping the original ID to its vector
export type EmbeddingOutput = { id: string, vector: number[] };

export interface EmbeddingProvider {
  id: string; // e.g., 'google-gemini', 'openai-clip'
  name: string; // e.g., 'Google Gemini', 'OpenAI CLIP'
  
  // Batches multiple items for efficiency
  generateEmbeddings(items: EmbeddingInput[]): Promise<EmbeddingOutput[]>;
}
