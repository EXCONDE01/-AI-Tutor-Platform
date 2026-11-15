/**
 * RAG search API endpoint.
 *
 * POST { query, classId, subject, gradeLevel, collection?, limit?, threshold? }
 * Returns knowledge chunks matching the query via vector similarity.
 *
 * Protected by requireAppRole('teacher' | 'admin').
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAppRole } from '@/lib/auth/require-app-role';
import { getRelevantContext, searchKnowledgeBase } from '@/lib/ai/rag';
import { generateEmbedding } from '@/lib/ai/embeddings';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const bodySchema = z.object({
  query: z.string().trim().min(1, 'Query is required').max(2000, 'Query is too long'),
  classId: z.string().optional(),
  subject: z.string().optional(),
  gradeLevel: z.number().int().min(1).max(12).optional(),
  collection: z.string().optional(),
  limit: z.number().int().min(1).max(20).default(10),
  threshold: z.number().min(0).max(1).default(0.7),
});

export async function POST(request: NextRequest) {
  try {
    // Authorization: teacher or admin only
    const auth = await requireAppRole(['teacher', 'admin'], request);
    if (!auth.ok) {
      return auth.response;
    }

    const body = await request.json().catch((err) => {
      console.error('[rag/search] JSON parse error:', err);
      return null;
    });

    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid request' },
        { status: 400 }
      );
    }

    const { query, classId, subject, gradeLevel, collection, limit, threshold } =
      parsed.data;

    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(query);

    // Search knowledge base
    const chunks = await searchKnowledgeBase({
      queryEmbedding,
      collectionName: collection ?? undefined,
      subject,
      gradeLevel,
      language: 'en',
      limit,
      similarityThreshold: threshold,
    });

    return NextResponse.json({
      query,
      collection: collection ?? 'all',
      count: chunks.length,
      chunks,
    });
  } catch (error) {
    console.error('[rag/search] Request failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET endpoint for quick context retrieval (teacher/admin only).
 * Returns a formatted context string for injection into tutor prompts.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAppRole(['teacher', 'admin'], request);
    if (!auth.ok) {
      return auth.response;
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');
    const classId = searchParams.get('classId');
    const subject = searchParams.get('subject') || undefined;
    const gradeLevel = searchParams.get('gradeLevel')
      ? Number(searchParams.get('gradeLevel'))
      : undefined;
    const collection = searchParams.get('collection') || undefined;
    const limit = searchParams.get('limit')
      ? Number(searchParams.get('limit'))
      : 5;

    if (!query) {
      return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
    }

    const context = await getRelevantContext({
      studentQuery: query,
      classId: classId ?? '',
      subject,
      gradeLevel,
      collections: collection ? [collection] : ['openstax', 'khan'],
      limit,
    });

    return NextResponse.json({
      query,
      context,
    });
  } catch (error) {
    console.error('[rag/search] GET request failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}