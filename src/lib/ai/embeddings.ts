/**
 * Embedding client using Neon AI Gateway (free models hosted on Neon)
 * Falls back to OpenRouter if Neon AI Gateway is unavailable
 */

import { sql } from 'drizzle-orm';
import { db, getDb } from '@/lib/db';
import { EMBEDDING_MODELS, getDefaultEmbeddingModel, getEmbeddingModelConfig, type EmbeddingModelKey } from '@/db/vector';

/**
 * Generate embedding using Neon AI Gateway (free, hosted on Neon)
 * Uses bge-base (768 dims) or e5-base (768 dims) by default
 */
export async function generateEmbedding(
  text: string,
  modelKey: EmbeddingModelKey = getDefaultEmbeddingModel()
): Promise<number[]> {
  const config = getEmbeddingModelConfig(modelKey);
  
  if (config.provider === 'neon') {
    return generateEmbeddingNeon(text, modelKey);
  }
  
  // Fallback to OpenRouter for other providers
  return generateEmbeddingOpenRouter(text, modelKey);
}

/**
 * Generate embedding via Neon AI Gateway using @neondatabase/serverless
 * Neon AI Gateway provides free embeddings for bge-base, bge-large, e5-base, e5-large
 */
async function generateEmbeddingNeon(text: string, modelKey: EmbeddingModelKey): Promise<number[]> {
  const database = getDb();
  const config = getEmbeddingModelConfig(modelKey);
  
  // Use Neon's built-in embedding function via AI Gateway
  // The SQL function `ai.embed` is available in Neon AI Gateway
  try {
    const result = await database.execute(sql`
      SELECT ai.embed(${config.name}, ${text}) as embedding
    `);
    
    const embedding = result.rows[0]?.embedding;
    if (!embedding) {
      throw new Error('No embedding returned from Neon AI Gateway');
    }
    
    // Parse the vector result
    const parsed = typeof embedding === 'string' ? JSON.parse(embedding) : embedding;
    return parsed as number[];
  } catch (error) {
    console.error('[embeddings] Neon AI Gateway failed, falling back to OpenRouter:', error);
    return generateEmbeddingOpenRouter(text, modelKey);
  }
}

/**
 * Generate embedding via OpenRouter API
 * Used as fallback when Neon AI Gateway is unavailable
 */
async function generateEmbeddingOpenRouter(text: string, modelKey: EmbeddingModelKey): Promise<number[]> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not set for embedding fallback');
  }

  const config = getEmbeddingModelConfig(modelKey);
  const modelId = config.provider === 'openai' ? config.name : `openrouter/${config.name}`;

  const response = await fetch('https://openrouter.ai/api/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.OPENROUTER_SITE_URL ?? 'http://localhost:3000',
      'X-Title': process.env.OPENROUTER_APP_NAME ?? 'AI Tutor',
    },
    body: JSON.stringify({
      model: modelId,
      input: text,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(`OpenRouter embedding failed: ${JSON.stringify(error)}`);
  }

  const data = await response.json();
  const embedding = data.data?.[0]?.embedding;
  if (!embedding) {
    throw new Error('No embedding returned from OpenRouter');
  }

  return embedding as number[];
}

/**
 * Simple token-aware text chunking
 * ~1000 chars ≈ 250 tokens for most embedding models
 * Splits on sentence boundaries when possible
 */
export function chunkText(text: string, maxChars: number = 1000): string[] {
  if (text.length <= maxChars) return [text];

  const chunks: string[] = [];
  let currentChunk = '';
  const sentences = text.match(/[^.!?]+[.!?]+/g) ?? [text];

  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > maxChars && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk += sentence;
    }
  }

  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }

  return chunks.length > 0 ? chunks : [text];
}

/**
 * Chunk text and generate embeddings for each chunk
 * Returns array of { chunkText, embedding, chunkIndex, chunkCount }
 */
export async function embedChunks(
  text: string,
  modelKey: EmbeddingModelKey = getDefaultEmbeddingModel()
): Promise<Array<{ chunkText: string; embedding: number[]; chunkIndex: number; chunkCount: number }>> {
  const chunks = chunkText(text);
  const results = [];

  for (let i = 0; i < chunks.length; i++) {
    const embedding = await generateEmbedding(chunks[i], modelKey);
    results.push({
      chunkText: chunks[i],
      embedding,
      chunkIndex: i,
      chunkCount: chunks.length,
    });
  }

  return results;
}

/**
 * Get the default embedding model (Neon bge-base - 768 dims, free)
 */
export function getDefaultModel(): EmbeddingModelKey {
  return getDefaultEmbeddingModel();
}

/**
 * Get embedding model configuration
 */
export function getModelConfig(key: EmbeddingModelKey) {
  return getEmbeddingModelConfig(key);
}

/**
 * List available embedding models
 */
export function listModels() {
  return Object.entries(EMBEDDING_MODELS).map(([key, config]) => ({
    key: key as EmbeddingModelKey,
    ...config,
  }));
}