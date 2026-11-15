/**
 * Knowledge base ingestion script for OpenStax and Khan Academy content.
 *
 * Run once to populate the knowledge_embeddings table:
 *   npx tsx src/scripts/ingest-openstax.ts [--source openstax|khan|all] [--limit <books>]
 *
 * Downloads OpenStax textbooks (CC-BY / public domain) via their public API,
 * chunks content, generates embeddings using Neon AI Gateway (bge-base, 768 dims),
 * and inserts into knowledge_embeddings with collectionName: 'openstax'.
 *
 * Also supports Khan Academy topic tree (public API) with collectionName: 'khan'.
 *
 * Uses embeddingJobs queue for async processing OR direct insert for small sets.
 */

import { z } from 'zod';
import { getDb } from '@/lib/db';
import {
  knowledgeEmbeddings,
  embeddingJobs,
  embeddingJobStatusEnum,
  embeddingModelProviderEnum,
} from '@/db/schema/vector';
import { generateEmbedding, chunkText, embedChunks } from '@/lib/ai/embeddings';
import { sql } from 'drizzle-orm';

const args = process.argv.slice(2);
const sourceArg = args.find((a) => a.startsWith('--source='))?.split('=')[1] ?? 'all';
const limitArg = Number(args.find((a) => a.startsWith('--limit='))?.split('=')[1]) ?? 5;
const dryRun = args.includes('--dry-run');

const SOURCE_CHOICES = ['openstax', 'khan', 'all'] as const;
type Source = (typeof SOURCE_CHOICES)[number];
const SOURCE: Source = SOURCE_CHOICES.includes(sourceArg as Source) ? (sourceArg as Source) : 'all';

const OPENSTAX_API = 'https://api.openstax.org/v1';
const KHAN_API = 'https://www.khanacademy.org/api/internal';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) {
      console.error(`[ingest] ${url} -> ${res.status} ${res.statusText}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (err) {
    console.error(`[ingest] fetch failed for ${url}:`, err);
    return null;
  }
}

async function insertChunk({
  database,
  collectionName,
  sourceId,
  sourceType,
  title,
  contentText,
  chunkIndex,
  chunkCount,
  subject,
  gradeLevel,
  curriculumStandard,
  language = 'en',
  tags = [],
  metadata = {},
}: {
  database: ReturnType<typeof getDb>;
  collectionName: string;
  sourceId: string;
  sourceType: 'textbook' | 'lesson_plan' | 'web_page' | 'custom';
  title: string | null;
  contentText: string;
  chunkIndex: number;
  chunkCount: number;
  subject?: string | null;
  gradeLevel?: number | null;
  curriculumStandard?: string | null;
  language?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}): Promise<void> {
  if (dryRun) {
    console.log(
      `[dry-run] Would insert chunk: ${collectionName}/${sourceId}#${chunkIndex} "${title ?? '(no title)'}"`
    );
    return;
  }

  const embedding = await generateEmbedding(contentText);

  await database.insert(knowledgeEmbeddings).values({
    collectionName,
    sourceId,
    sourceType,
    embedding,
    modelProvider: 'neon',
    modelName: 'bge-base',
    dimensions: 768,
    title,
    contentText,
    chunkIndex,
    chunkCount,
    subject,
    gradeLevel,
    curriculumStandard,
    language,
    tags,
    metadata,
  });
}

// ---------------------------------------------------------------------------
// OpenStax ingestion
// ---------------------------------------------------------------------------

interface OpenStaxBook {
  id: string;
  title: string;
  subject: string;
  grade_level?: number;
  isbn?: string;
  cover?: string;
  description?: string;
  books?: Array<{ id: string; title: string }>;
}

interface OpenStaxContent {
  id: string;
  title: string;
  body?: string;
  chapters?: Array<{ id: string; title: string; body?: string }>;
}

/**
 * Fetch the list of OpenStax textbooks.
 */
async function listOpenStaxBooks(): Promise<Array<{ id: string; title: string; subject: string; gradeLevel?: number }>> {
  const data = await fetchJson<Array<OpenStaxBook>>(`${OPENSTAX_API}/books`);
  if (!data) return [];

  return data.map((book) => ({
    id: book.id,
    title: book.title,
    subject: book.subject ?? 'general',
    gradeLevel: book.grade_level ?? undefined,
  }));
}

/**
 * Fetch a single OpenStax book's content (chapters/sections).
 */
async function fetchOpenStaxBookContent(bookId: string): Promise<Array<{ title: string; body: string }>> {
  const data = await fetchJson<OpenStaxContent>(`${OPENSTAX_API}/books/${bookId}`);
  if (!data) return [];

  const sections: Array<{ title: string; body: string }> = [];

  if (data.body) {
    sections.push({ title: data.title, body: data.body });
  }

  for (const chapter of data.chapters ?? []) {
    if (chapter.body) {
      sections.push({ title: chapter.title, body: chapter.body });
    }
  }

  return sections;
}

/**
 * Ingest OpenStax textbooks into the knowledge base.
 */
async function ingestOpenStax(limit: number): Promise<void> {
  const database = getDb();
  const books = await listOpenStaxBooks();
  const selected = books.slice(0, limit);

  console.log(`[ingest] OpenStax: found ${books.length} books, ingesting ${selected.length}`);

  let inserted = 0;
  for (const book of selected) {
    console.log(`[ingest] OpenStax: "${book.title}" (${book.subject})`);
    const sections = await fetchOpenStaxBookContent(book.id);

    for (const section of sections) {
      const chunks = chunkText(section.body, 1000);
      for (let i = 0; i < chunks.length; i++) {
        await insertChunk({
          database,
          collectionName: 'openstax',
          sourceId: `openstax:${book.id}`,
          sourceType: 'textbook',
          title: section.title,
          contentText: chunks[i],
          chunkIndex: i,
          chunkCount: chunks.length,
          subject: book.subject,
          gradeLevel: book.gradeLevel,
          curriculumStandard: 'CCSS',
          tags: ['openstax', 'textbook', book.subject],
          metadata: { source: 'openstax', bookId: book.id, bookTitle: book.title },
        });
        inserted++;
      }
    }
  }

  console.log(`[ingest] OpenStax: inserted ${inserted} chunks`);
}

// ---------------------------------------------------------------------------
// Khan Academy ingestion
// ---------------------------------------------------------------------------

interface KhanTopic {
  id: string;
  title: string;
  kind: string; // 'Topic', 'Video', 'Exercise', 'Article'
  children?: KhanTopic[];
  description?: string;
}

/**
 * Fetch Khan Academy topic tree.
 */
async function fetchKhanTopics(kind?: string): Promise<KhanTopic[]> {
  const url = kind
    ? `${KHAN_API}/topics?kind=${kind}`
    : `${KHAN_API}/topics`;
  const data = await fetchJson<KhanTopic[]>(url);
  return data ?? [];
}

/**
 * Recursively collect leaf topics (articles/exercises) with content.
 */
async function collectKhanContent(
  topics: KhanTopic[],
  depth = 0,
  maxDepth = 3
): Promise<Array<{ title: string; body: string; subject?: string }>> {
  const results: Array<{ title: string; body: string; subject?: string }> = [];

  for (const topic of topics) {
    if (depth >= maxDepth) continue;

    // Leaf nodes with content
    if ((topic.kind === 'Article' || topic.kind === 'Video') && topic.description) {
      results.push({
        title: topic.title,
        body: topic.description,
        subject: topic.kind,
      });
    }

    // Recurse into children
    if (topic.children?.length) {
      results.push(...(await collectKhanContent(topic.children, depth + 1, maxDepth)));
    }
  }

  return results;
}

/**
 * Ingest Khan Academy topics into the knowledge base.
 */
async function ingestKhan(limit: number): Promise<void> {
  const database = getDb();
  const topics = await fetchKhanTopics();
  const leaves = await collectKhanContent(topics, 0, 3);
  const selected = leaves.slice(0, limit);

  console.log(`[ingest] Khan: found ${leaves.length} leaves, ingesting ${selected.length}`);

  let inserted = 0;
  for (const leaf of selected) {
    const chunks = chunkText(leaf.body, 1000);
    for (let i = 0; i < chunks.length; i++) {
      await insertChunk({
        database,
        collectionName: 'khan',
        sourceId: `khan:${leaf.title}`,
        sourceType: 'web_page',
        title: leaf.title,
        contentText: chunks[i],
        chunkIndex: i,
        chunkCount: chunks.length,
        subject: leaf.subject,
        gradeLevel: undefined,
        curriculumStandard: undefined,
        tags: ['khan', 'academy', leaf.subject ?? 'general'],
        metadata: { source: 'khan_academy', topicTitle: leaf.title },
      });
      inserted++;
    }
  }

  console.log(`[ingest] Khan: inserted ${inserted} chunks`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log(`[ingest] Starting knowledge base ingestion (source=${SOURCE}, limit=${limitArg}, dry-run=${dryRun})`);

  if (SOURCE === 'openstax' || SOURCE === 'all') {
    await ingestOpenStax(limitArg);
  }

  if (SOURCE === 'khan' || SOURCE === 'all') {
    await ingestKhan(limitArg);
  }

  console.log('[ingest] Ingestion complete.');
}

main().catch((err) => {
  console.error('[ingest] Fatal error:', err);
  process.exit(1);
});