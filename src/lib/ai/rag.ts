/**
 * RAG retrieval service.
 *
 * Searches the knowledge base using vector similarity via the `search_knowledge_base`
 * SQL function, and builds a formatted context string for injection into tutor prompts.
 */

import { sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  knowledgeEmbeddings,
  type KnowledgeEmbedding,
} from '@/db/schema/vector';
import {
  KnowledgeSearchOptions,
} from '@/db/vector';
import { generateEmbedding } from '@/lib/ai/embeddings';

/**
 * A single knowledge chunk returned from RAG search.
 */
export interface KnowledgeChunk {
  id: string;
  collectionName: string;
  sourceId: string;
  sourceType: string;
  title: string | null;
  contentText: string;
  subject: string | null;
  gradeLevel: number | null;
  curriculumStandard: string | null;
  similarity: number;
  metadata: Record<string, unknown>;
}

/**
 * Search the knowledge base using vector similarity.
 * Calls the `search_knowledge_base` SQL function via Drizzle sql.raw().
 */
export async function searchKnowledgeBase(
  options: KnowledgeSearchOptions
): Promise<KnowledgeChunk[]> {
  const {
    queryEmbedding,
    collectionName,
    subject,
    gradeLevel,
    curriculumStandard,
    tags,
    language = 'en',
    limit = 10,
    similarityThreshold = 0.7,
  } = options;

  // Pass the query embedding as a JSON array; Postgres casts to vector automatically
  const embeddingJson = JSON.stringify(queryEmbedding);

  const query = sql`
    SELECT id,
           collection_name,
           source_id,
           source_type,
           title,
           content_text,
           subject,
           grade_level,
           curriculum_standard,
           similarity,
           metadata
    FROM search_knowledge_base(
      ${embeddingJson}::vector,
      ${collectionName ?? null},
      ${subject ?? null},
      ${gradeLevel ?? null},
      ${curriculumStandard ?? null},
      ${tags ?? null},
      ${language},
      ${limit},
      ${similarityThreshold}
    )
  `;

  const rows = await db.execute(query);

  return rows.rows.map((row: any) => ({
    id: row.id,
    collectionName: row.collection_name,
    sourceId: row.source_id,
    sourceType: row.source_type,
    title: row.title ?? null,
    contentText: row.content_text,
    subject: row.subject ?? null,
    gradeLevel: row.grade_level ?? null,
    curriculumStandard: row.curriculum_standard ?? null,
    similarity: Number(row.similarity),
    metadata: row.metadata ?? {},
  }));
}

/**
 * Search the knowledge base and return a formatted context string suitable for
 * injection into a tutor system prompt as a "Relevant knowledge:" section.
 *
 * @param studentQuery - The student's question/query
 * @param classId - Not used for knowledge search directly, but reserved for future class-scoped filtering
 * @param subject - Optional subject filter (e.g. 'math', 'science')
 * @param gradeLevel - Optional grade level filter
 * @param collections - Optional list of collections to search (defaults to 'openstax', 'khan')
 * @param limit - Max chunks to return
 * @param similarityThreshold - Min cosine similarity (default 0.7)
 */
export async function getRelevantContext({
  studentQuery,
  classId,
  subject,
  gradeLevel,
  collections = ['openstax', 'khan'],
  limit = 5,
  similarityThreshold = 0.7,
}: {
  studentQuery: string;
  classId: string;
  subject?: string;
  gradeLevel?: number;
  collections?: string[];
  limit?: number;
  similarityThreshold?: number;
}): Promise<string> {
  // Generate embedding for the query
  const queryEmbedding = await generateEmbedding(studentQuery);

  const allChunks: KnowledgeChunk[] = [];

  // Search each collection; use the first matching collection for the primary filter
  // If only one collection specified, pass it directly; otherwise search all and merge
  if (collections.length === 1) {
    const chunks = await searchKnowledgeBase({
      queryEmbedding,
      collectionName: collections[0],
      subject,
      gradeLevel,
      language: 'en',
      limit,
      similarityThreshold,
    });
    allChunks.push(...chunks);
  } else {
    // For multiple collections, do a broader search without collection filter
    // then dedupe by sourceId+chunkIndex and re-rank
    const chunks = await searchKnowledgeBase({
      queryEmbedding,
      subject,
      gradeLevel,
      language: 'en',
      limit: limit * collections.length,
      similarityThreshold,
    });
    allChunks.push(...chunks);
  }

  // Dedupe by collection+sourceId+chunkIndex, keep highest similarity
  const deduped = new Map<string, KnowledgeChunk>();
  for (const chunk of allChunks) {
    const key = `${chunk.collectionName}:${chunk.sourceId}:${chunk.id}`;
    const existing = deduped.get(key);
    if (!existing || chunk.similarity > existing.similarity) {
      deduped.set(key, chunk);
    }
  }

  // Sort by similarity desc and take top `limit`
  const ranked = Array.from(deduped.values())
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);

  if (ranked.length === 0) {
    return '';
  }

  // Format as a context section for the system prompt
  const parts: string[] = [];
  parts.push('Relevant knowledge:');
  for (const chunk of ranked) {
    const title = chunk.title ? ` (${chunk.title})` : '';
    const subjectPart = chunk.subject ? `, subject: ${chunk.subject}` : '';
    const gradePart = chunk.gradeLevel !== null ? `, grade: ${chunk.gradeLevel}` : '';
    parts.push(`- [${chunk.collectionName}${title}${subjectPart}${gradePart}] ${chunk.contentText}`);
  }

  return parts.join('\n');
}

/**
 * Type alias re-exported for consumers that want the DB-layer options.
 */
export type { KnowledgeSearchOptions };