/**
 * Admin API - Execute data deletion
 * POST: mark in_progress, perform deletion, mark completed/failed
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAppRole } from '@/lib/auth/require-app-role';
import { executeDeletion, getDeletionRequestById } from '@/lib/compliance/deletion';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAppRole('admin', request);
    if (!auth.ok) return auth.response;
    const appUser = auth.appUser;

    const { id } = await params;
    if (!UUID_REGEX.test(id)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    const requestRecord = await getDeletionRequestById(id);
    if (!requestRecord) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (requestRecord.status !== 'scheduled') {
      return NextResponse.json(
        { error: 'Deletion request must be scheduled before execution' },
        { status: 409 }
      );
    }

    const result = await executeDeletion(id, appUser.user.id);

    return NextResponse.json(
      { status: 'accepted', deletedRecordCounts: result.deletedRecordCounts },
      { status: 202 }
    );
  } catch (error) {
    console.error('[admin/deletion-requests/[id]/execute POST] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}