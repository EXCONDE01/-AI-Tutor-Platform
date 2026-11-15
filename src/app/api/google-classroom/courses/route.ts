/**
 * Google Classroom — List courses
 * GET /api/google-classroom/courses
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

    let courses;
    try {
      courses = await client.listCourses();
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
      data: courses,
      pagination: null,
    });
  } catch (error) {
    console.error('[Google Classroom courses] Failed:', error);
    return NextResponse.json(
      { error: 'Failed to list Google Classroom courses' },
      { status: 500 },
    );
  }
}
