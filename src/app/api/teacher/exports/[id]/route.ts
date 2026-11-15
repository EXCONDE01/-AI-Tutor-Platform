/**
 * Export Job Status API - Check export job progress/result
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/server';
import { ensureAppUser } from '@/lib/auth/provision';
import { db } from '@/lib/db';
import { exportJobs } from '@/db/schema/artifacts';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authSession = await getSession(request);
    if (!authSession.data?.user) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const appUser = await ensureAppUser('teacher', request);
    if (!appUser || appUser.role !== 'teacher') {
      return NextResponse.json({ error: 'Teacher access required' }, { status: 403 });
    }

    const { id } = await params;

    const [job] = await db
      .select()
      .from(exportJobs)
      .where(eq(exportJobs.id, id))
      .limit(1);

    if (!job) {
      return NextResponse.json({ error: 'Export job not found' }, { status: 404 });
    }

    if (job.requestedBy !== appUser.user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    return NextResponse.json({ job });
  } catch (error) {
    console.error('[Export Job Status] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}