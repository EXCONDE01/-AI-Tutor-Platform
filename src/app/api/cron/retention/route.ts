/**
 * Cron endpoint for automated retention policy execution
 * Called by Vercel Cron daily
 */

import { NextRequest, NextResponse } from 'next/server';
import { runAllRetentionPolicies } from '@/lib/compliance';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Run all active retention policies
    // Using a system user ID for cron jobs
    const systemUserId = 'cron-system';
    const results = await runAllRetentionPolicies(systemUserId);

    const summary = {
      totalPolicies: results.length,
      totalProcessed: results.reduce((sum, r) => sum + r.recordsProcessed, 0),
      totalArchived: results.reduce((sum, r) => sum + r.recordsArchived, 0),
      totalDeleted: results.reduce((sum, r) => sum + r.recordsDeleted, 0),
      errors: results.filter(r => r.errors.length > 0).length,
      results,
    };

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary,
    });
  } catch (error) {
    console.error('[cron/retention] Error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // Also support POST for manual triggering
  return GET(request);
}