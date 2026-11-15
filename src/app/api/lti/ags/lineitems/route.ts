/**
 * LTI AGS Line Items API - Create and manage line items
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/server';
import { ensureAppUser } from '@/lib/auth/provision';
import { db } from '@/lib/db';
import { ltiDeployments, agsLineItems, classes, tutorSessions } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { createAGSClient, createLineItemFromSession } from '@/lib/lti/ags-client';

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
    const deploymentId = searchParams.get('deploymentId');
    const contextId = searchParams.get('contextId');

    if (!deploymentId || !contextId) {
      return NextResponse.json({ error: 'deploymentId and contextId required' }, { status: 400 });
    }

    // Verify teacher owns this deployment
    const [deployment] = await db
      .select()
      .from(ltiDeployments)
      .where(eq(ltiDeployments.id, deploymentId))
      .limit(1);

    if (!deployment) {
      return NextResponse.json({ error: 'Deployment not found' }, { status: 404 });
    }

    const client = await createAGSClient(deploymentId);
    const lineItems = await client.getLineItems(contextId);

    return NextResponse.json({ lineItems });
  } catch (error) {
    console.error('[AGS Line Items GET] Error:', error);
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
    const { deploymentId, contextId, sessionId, label, scoreMaximum, type } = body;

    if (!deploymentId || !contextId) {
      return NextResponse.json({ error: 'deploymentId and contextId required' }, { status: 400 });
    }

    // Verify teacher owns this deployment
    const [deployment] = await db
      .select()
      .from(ltiDeployments)
      .where(eq(ltiDeployments.id, deploymentId))
      .limit(1);

    if (!deployment) {
      return NextResponse.json({ error: 'Deployment not found' }, { status: 404 });
    }

    let lineItem;
    if (sessionId) {
      // Create line item from session
      lineItem = await createLineItemFromSession(
        deploymentId,
        contextId,
        sessionId,
        label || `Session: ${sessionId}`,
        scoreMaximum || 100,
        type || 'score'
      );
    } else {
      // Create custom line item
      const client = await createAGSClient(deploymentId);
      lineItem = await client.createLineItem(contextId, {
        label: label || 'Untitled Assignment',
        scoreMaximum: scoreMaximum || 100,
        type: type || 'score',
      });
    }

    return NextResponse.json({ lineItem });
  } catch (error) {
    console.error('[AGS Line Items POST] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}