/**
 * Export Jobs API - Create export job from artifact or direct content
 * Teachers can export generated artifacts to Google Workspace
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/server';
import { ensureAppUser } from '@/lib/auth/provision';
import { db } from '@/lib/db';
import { exportJobs, generatedArtifacts } from '@/db/schema/artifacts';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const authSession = await getSession(request);
    if (!authSession.data?.user) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const appUser = await ensureAppUser('teacher', request);
    if (!appUser || appUser.role !== 'teacher') {
      return NextResponse.json({ error: 'Teacher access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    const jobs = await db
      .select()
      .from(exportJobs)
      .where(eq(exportJobs.requestedBy, appUser.user.id))
      .orderBy(eq(exportJobs.createdAt, eq(exportJobs.createdAt, exportJobs.createdAt)))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({ jobs });
  } catch (error) {
    console.error('[Export Jobs GET] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authSession = await getSession(request);
    if (!authSession.data?.user) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const appUser = await ensureAppUser('teacher', request);
    if (!appUser || appUser.role !== 'teacher') {
      return NextResponse.json({ error: 'Teacher access required' }, { status: 403 });
    }

    const body = await request.json();
    const { artifactId, format, destination } = body;

    // If artifactId provided, verify it exists and belongs to this teacher
    let artifactTitle: string | null = null;
    if (artifactId) {
      const [artifact] = await db
        .select()
        .from(generatedArtifacts)
        .where(eq(generatedArtifacts.id, artifactId))
        .limit(1);

      if (!artifact) {
        return NextResponse.json({ error: 'Artifact not found' }, { status: 404 });
      }
      if (artifact.teacherId !== appUser.user.id) {
        return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
      }
      artifactTitle = artifact.title;
    }

    const [job] = await db
      .insert(exportJobs)
      .values({
        artifactId: artifactId ?? null,
        requestedBy: appUser.user.id,
        format,
        status: 'pending',
        destination,
        destinationType: format,
        resultUrl: null,
        completedAt: null,
      })
      .returning();

    return NextResponse.json({ job });
  } catch (error) {
    console.error('[Export Jobs POST] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}