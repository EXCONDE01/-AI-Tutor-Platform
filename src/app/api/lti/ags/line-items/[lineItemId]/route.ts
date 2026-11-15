/**
 * LTI AGS Single Line Item API
 * GET: Get a single line item by external LTI line item ID (ltiLineItemUrl)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAppRole } from '@/lib/auth/require-app-role';
import { getDb } from '@/lib/db';
import { agsLineItems } from '@/db/schema/lti';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ lineItemId: string }> }
) {
  try {
    const auth = await requireAppRole('admin', request);
    if (!auth.ok) return auth.response;

    const database = getDb();
    const { lineItemId } = await params;

    // The lineItemId param is the external LTI line item URL (ltiLineItemUrl)
    const [lineItem] = await database
      .select()
      .from(agsLineItems)
      .where(eq(agsLineItems.ltiLineItemUrl, lineItemId))
      .limit(1);

    if (!lineItem) {
      return NextResponse.json({ error: 'Line item not found' }, { status: 404 });
    }

    return NextResponse.json(lineItem);
  } catch (error) {
    console.error('[lti/ags/line-items/[lineItemId]] GET Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}