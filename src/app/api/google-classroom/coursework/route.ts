/**
 * Google Classroom — List coursework
 * GET /api/google-classroom/coursework?courseId=...
 * Admin only. Requires stored tokens for the current user.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAppRole } from '@/lib/auth/require-app-role';
import {
  GoogleClassroomClient,
  GoogleClassroomError,
  getTokens,
} from '@/lib/google-classroom/client';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAppRole('admin', request);
    if (!auth.ok) return auth.response;

    const userId = auth.appUser.user.id;
    const tokens = getTokens(userId);
    if (!tokens) {
      return NextResponse.json(
        { error: 'Google Classroom not connected. Connect your account first.' },
        { status: 404 },
      );
    }

    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('courseId');
    if (!courseId) {
      return NextResponse.json(
        { error: 'courseId query parameter is required' },
        { status: 400 },
      );
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri =
      `${process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin}/api/google-classroom/callback`;

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: 'Google Classroom OAuth not configured' },
        { status: 503 },
      );
    }

    const client = new GoogleClassroomClient(tokens, clientId, clientSecret, redirectUri);

    let coursework;
    try {
      coursework = await client.listCoursework(courseId);
    } catch (err) {
      if (err instanceof GoogleClassroomError) {
        return NextResponse.json(
          { error: err.message },
          { status: err.status },
        );
      }
      throw err;
    }

    return NextResponse.json({
      data: coursework,
    });
  } catch (error) {
    console.error('[Google Classroom coursework] Failed:', error);
    return NextResponse.json(
      { error: 'Failed to list Google Classroom coursework' },
      { status: 500 },
    );
  }
}
