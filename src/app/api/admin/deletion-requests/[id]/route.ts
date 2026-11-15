/**
 * Admin API - Update deletion request status
 * PATCH: verify, schedule, cancel, reject
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAppRole } from '@/lib/auth/require-app-role';
import { getDeletionRequestById, updateDeletionRequestStatus } from '@/lib/compliance/deletion';
import type { DeletionStatus } from '@/lib/compliance/deletion';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const patchSchema = z.object({
  status: z.enum(['verified', 'scheduled', 'cancelled', 'rejected']),
  actorId: z.string().uuid().optional(),
  note: z.string().max(1000).optional(),
  scheduledAt: z.string().datetime().optional(),
});

export async function PATCH(
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

    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failure', issues: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { status, actorId, note, scheduledAt } = parsed.data;

    const requestRecord = await getDeletionRequestById(id);
    if (!requestRecord) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const effectiveActorId = actorId || appUser.user.id;
    await updateDeletionRequestStatus(id, status as DeletionStatus, effectiveActorId, {
      note,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
    });

    // Return updated record
    const updated = await getDeletionRequestById(id);
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof Error && error.message.includes('Invalid status transition')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('[admin/deletion-requests/[id] PATCH] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}