/**
 * Neon Realtime token endpoint for teacher monitoring
 * Returns a JWT token for the teacher_monitoring publication
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/server';
import { ensureAppUser } from '@/lib/auth/provision';
import { getDb } from '@/lib/db';
import { teachers } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { createRealtimeToken, getRealtimeConfig, canAccessPublication } from '@/lib/realtime/server';

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

    // Get teacher profile
    const database = getDb();
    const [teacherRow] = await database
      .select({ id: teachers.id })
      .from(teachers)
      .where(eq(teachers.userId, appUser.user.id))
      .limit(1);

    if (!teacherRow) {
      return NextResponse.json({ error: 'Teacher profile not found' }, { status: 404 });
    }

    // Verify access to teacher_monitoring publication
    if (!canAccessPublication('teacher', 'teacher_monitoring')) {
      return NextResponse.json({ error: 'Access denied to teacher_monitoring publication' }, { status: 403 });
    }

    // Generate realtime token
    const token = await createRealtimeToken(
      appUser.user.id,
      'teacher',
      ['teacher_monitoring'],
      3600 // 1 hour
    );

    const config = getRealtimeConfig('teacher');

    return NextResponse.json({
      token,
      endpoint: config.endpoint,
      publications: ['teacher_monitoring'],
      expiresIn: 3600,
    });
  } catch (error) {
    console.error('[realtime/teacher-monitoring] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}