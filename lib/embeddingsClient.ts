import { pipeline, env } from '@xenova/transformers';

// Only load models from the Hugging Face Hub (or browser cache)
env.allowLocalModels = false;

let embedder: any = null;
let initPromise: Promise<any> | null = null;

/**
 * Generates a 384-dimensional embedding for the given text using
 * the Xenova/all-MiniLM-L6-v2 model entirely in the browser.
 */
export async function getEmbedding(text: string): Promise<number[]> {
  if (!initPromise) {
    initPromise = pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  }
  if (!embedder) {
    embedder = await initPromise;
  }
  
  // Run inference
  const output = await embedder(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data);
}

/**
 * Computes cosine similarity between two vectors.
 * Returns a value between -1 and 1.
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Helper to hash a string to determine if project content changed
 * to avoid re-computing embeddings unnecessarily.
 */
export async function hashText(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-1', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
