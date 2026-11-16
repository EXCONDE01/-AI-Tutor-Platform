/**
 * Retention Engine - Actual implementation of retention policies
 * Handles FERPA/COPPA/GDPR compliant data retention and deletion
 */

import { getDb } from '@/lib/db';
import {
  auditLogs,
  consentRecords,
  dataDeletionRequests,
  generatedArtifacts,
  messages,
  oauthTokens,
  pushSubscriptions,
  retentionJobs,
  retentionPolicies,
  sessionSummaries,
  tutorSessions,
  users,
  students,
  teachers,
} from '@/db/schema';
import { and, desc, eq, gte, inArray, lte, lt, sql } from 'drizzle-orm';
import { createAuditLog } from './audit';
import type { RetentionJobResult } from './types';
import type { RetentionCategory } from './types';

// Type for inactive users query result
interface InactiveUser { id: string; }
interface DeletionStudentId { studentId: string | null; }
interface SessionId { id: string; }

interface RetentionCategoryConfig {
  table: string;
  dateColumn: string;
  foreignKeys?: { table: string; column: string }[];
  // For categories that don't have direct date column, use join
  joinConfig?: {
    joinTable: ReturnType<typeof import('drizzle-orm/pg-core').pgTable>;
    onClause: ReturnType<typeof import('drizzle-orm').eq>;
    dateColumn: string;
  };
}

const RETENTION_TABLE_MAP: Record<RetentionCategory, RetentionCategoryConfig> = {
  audit_logs: {
    table: 'audit_logs',
    dateColumn: 'created_at',
  },
  tutor_sessions: {
    table: 'tutor_sessions',
    dateColumn: 'started_at',
  },
  messages: {
    table: 'messages',
    dateColumn: 'created_at',
  },
  interventions: {
    table: 'interventions',
    dateColumn: 'created_at',
  },
  generated_artifacts: {
    table: 'generated_artifacts',
    dateColumn: 'created_at',
  },
  export_jobs: {
    table: 'export_jobs',
    dateColumn: 'created_at',
  },
  nrps_cache: {
    table: 'nrps_cache',
    dateColumn: 'fetched_at',
  },
  ags_scores: {
    table: 'ags_scores',
    dateColumn: 'created_at',
  },
  oauth_tokens: {
    table: 'oauth_tokens',
    dateColumn: 'created_at',
  },
  consent_records: {
    table: 'consent_records',
    dateColumn: 'created_at',
  },
  user_profiles: {
    table: 'users',
    dateColumn: 'updated_at',
  },
  lti_data: {
    table: 'lti_launch',
    dateColumn: 'created_at',
  },
  analytics: {
    table: 'session_summaries',
    dateColumn: 'generated_at',
  },
  backups: {
    table: 'audit_logs', // Backups tracked via audit logs
    dateColumn: 'created_at',
  },
  push_subscriptions: {
    table: 'push_subscriptions',
    dateColumn: 'created_at',
  },
  session_summaries: {
    table: 'session_summaries',
    dateColumn: 'generated_at',
  },
  custom: {
    table: '',
    dateColumn: '',
  },
};

async function deleteOldRecords(
  database: ReturnType<typeof getDb>,
  category: RetentionCategory,
  deleteBefore: Date,
  dryRun: boolean = false
): Promise<{ deletedCount: number; table: string }> {
  const config = RETENTION_TABLE_MAP[category];
  if (!config.table) {
    return { deletedCount: 0, table: 'custom' };
  }

  try {
    // Use raw SQL for dynamic table/column names
    const query = dryRun
      ? sql`SELECT COUNT(*) as count FROM ${sql.raw(config.table)} WHERE ${sql.raw(config.dateColumn)} < ${deleteBefore.toISOString()}`
      : sql`DELETE FROM ${sql.raw(config.table)} WHERE ${sql.raw(config.dateColumn)} < ${deleteBefore.toISOString()} RETURNING 1`;

    const result = await database.execute(query);
    const count = dryRun ? Number(result.rows[0]?.count || 0) : result.rowCount || 0;
    
    return { deletedCount: count, table: config.table };
  } catch (error) {
    console.error(`[Retention] Error processing ${category}:`, error);
    return { deletedCount: 0, table: config.table };
  }
}

async function archiveOldRecords(
  database: ReturnType<typeof getDb>,
  category: RetentionCategory,
  archiveBefore: Date,
  deleteBefore: Date,
  dryRun: boolean = false
): Promise<{ archivedCount: number; table: string }> {
  // For now, archiving is just marking records (in production, would move to cold storage)
  const config = RETENTION_TABLE_MAP[category];
  if (!config.table || category === 'audit_logs') {
    return { archivedCount: 0, table: config.table };
  }

  try {
    // Add an archived_at column or move to archive table in production
    // For now, we'll just count what would be archived
    const query = sql`SELECT COUNT(*) as count FROM ${sql.raw(config.table)} WHERE ${sql.raw(config.dateColumn)} < ${archiveBefore.toISOString()} AND ${sql.raw(config.dateColumn)} >= ${deleteBefore.toISOString()}`;
    const result = await database.execute(query);
    const count = Number(result.rows[0]?.count || 0);
    
    return { archivedCount: count, table: config.table };
  } catch (error) {
    console.error(`[Retention] Error archiving ${category}:`, error);
    return { archivedCount: 0, table: config.table };
  }
}

/**
 * Execute retention job with actual deletion logic
 */
export async function executeRetentionJob(
  policyId: string,
  triggeredBy: string
): Promise<RetentionJobResult> {
  const database = getDb();
  const startTime = Date.now();

  const [policy] = await database
    .select()
    .from(retentionPolicies)
    .where(eq(retentionPolicies.id, policyId))
    .limit(1);

  if (!policy || !policy.isActive) {
    throw new Error('Policy not found or inactive');
  }

  // Create job record
  const [job] = await database
    .insert(retentionJobs)
    .values({
      policyId,
      status: 'running',
      scope: { triggeredBy, triggeredAt: new Date().toISOString() },
      startedAt: new Date(),
    })
    .returning();

  await createAuditLog({
    action: 'retention_job_started',
    resourceType: 'retention_job',
    resourceId: job.id,
    userId: triggeredBy,
    severity: 'info',
    description: `Retention job started for policy ${policy.category}`,
    metadata: { policyCategory: policy.category, deleteAfterDays: policy.deleteAfterDays },
  });

  const errors: Array<{ table: string; error: string }> = [];
  let totalProcessed = 0;
  let totalArchived = 0;
  let totalDeleted = 0;

  try {
    const now = new Date();
    const deleteBefore = new Date(now.getTime() - policy.deleteAfterDays * 24 * 60 * 60 * 1000);
    const archiveBefore = policy.archiveAfterDays
      ? new Date(now.getTime() - policy.archiveAfterDays * 24 * 60 * 60 * 1000)
      : null;

    // Special handling for each category
    switch (policy.category) {
      case 'messages': {
        // FERPA: 1 year for student messages, COPPA: delete on request
        // Also need to check for data deletion requests
        const deletionRequests = await database
          .select({ studentId: dataDeletionRequests.studentId })
          .from(dataDeletionRequests)
          .where(eq(dataDeletionRequests.status, 'completed')) as DeletionStudentId[];

        const deletedStudentIds = deletionRequests.map(r => r.studentId).filter((id): id is string => Boolean(id));

        if (deletedStudentIds.length > 0) {
          // Delete messages for students with completed deletion requests
          const sessionIdsResult = await database
            .select({ id: tutorSessions.id })
            .from(tutorSessions)
            .where(inArray(tutorSessions.studentId, deletedStudentIds as string[]));

          const sessionIds = sessionIdsResult.map(s => s.id);
          if (sessionIds.length > 0) {
            const result = await database
              .delete(messages)
              .where(inArray(messages.sessionId, sessionIds))
              .returning();
            totalDeleted += result.length;
            totalProcessed += result.length;
          }
        }

        // Regular retention cleanup
        const regularResult = await deleteOldRecords(database, 'messages', deleteBefore);
        totalDeleted += regularResult.deletedCount;
        totalProcessed += regularResult.deletedCount;

        if (archiveBefore) {
          const archiveResult = await archiveOldRecords(database, 'messages', archiveBefore, deleteBefore);
          totalArchived += archiveResult.archivedCount;
          totalProcessed += archiveResult.archivedCount;
        }
        break;
      }

      case 'tutor_sessions': {
        // Check for data deletion requests
        const deletionRequests = await database
          .select({ studentId: dataDeletionRequests.studentId })
          .from(dataDeletionRequests)
          .where(eq(dataDeletionRequests.status, 'completed')) as DeletionStudentId[];

        const deletedStudentIds = deletionRequests.map(r => r.studentId).filter((id): id is string => Boolean(id));

        if (deletedStudentIds.length > 0) {
          const result = await database
            .delete(tutorSessions)
            .where(inArray(tutorSessions.studentId, deletedStudentIds as string[]))
            .returning();
          totalDeleted += result.length;
          totalProcessed += result.length;
        }

        const regularResult = await deleteOldRecords(database, 'tutor_sessions', deleteBefore);
        totalDeleted += regularResult.deletedCount;
        totalProcessed += regularResult.deletedCount;

        if (archiveBefore) {
          const archiveResult = await archiveOldRecords(database, 'tutor_sessions', archiveBefore, deleteBefore);
          totalArchived += archiveResult.archivedCount;
          totalProcessed += archiveResult.archivedCount;
        }
        break;
      }

      case 'audit_logs': {
        // FERPA: 7 years retention for audit logs
        // Never archive audit logs - they are the source of truth
        const regularResult = await deleteOldRecords(database, 'audit_logs', deleteBefore);
        totalDeleted += regularResult.deletedCount;
        totalProcessed += regularResult.deletedCount;
        break;
      }

      case 'generated_artifacts': {
        const regularResult = await deleteOldRecords(database, 'generated_artifacts', deleteBefore);
        totalDeleted += regularResult.deletedCount;
        totalProcessed += regularResult.deletedCount;

        if (archiveBefore) {
          const archiveResult = await archiveOldRecords(database, 'generated_artifacts', archiveBefore, deleteBefore);
          totalArchived += archiveResult.archivedCount;
          totalProcessed += archiveResult.archivedCount;
        }
        break;
      }

      case 'session_summaries': {
        const regularResult = await deleteOldRecords(database, 'session_summaries', deleteBefore);
        totalDeleted += regularResult.deletedCount;
        totalProcessed += regularResult.deletedCount;

        if (archiveBefore) {
          const archiveResult = await archiveOldRecords(database, 'session_summaries', archiveBefore, deleteBefore);
          totalArchived += archiveResult.archivedCount;
          totalProcessed += archiveResult.archivedCount;
        }
        break;
      }
      case 'analytics': {
        const regularResult = await deleteOldRecords(database, 'analytics', deleteBefore);
        totalDeleted += regularResult.deletedCount;
        totalProcessed += regularResult.deletedCount;

        if (archiveBefore) {
          const archiveResult = await archiveOldRecords(database, 'analytics', archiveBefore, deleteBefore);
          totalArchived += archiveResult.archivedCount;
          totalProcessed += archiveResult.archivedCount;
        }
        break;
      }

      case 'consent_records': {
        // Consent records: FERPA 7 years, but keep granted consent records longer
        // Only delete denied/withdrawn/expired older than retention period
        const cutoff = deleteBefore.toISOString();
        const query = sql`
          DELETE FROM ${sql.raw('consent_records')}
          WHERE created_at < ${cutoff}
          AND status IN ('denied', 'withdrawn', 'expired')
          RETURNING 1
        `;
        const result = await database.execute(query);
        totalDeleted += result.rowCount || 0;
        totalProcessed += result.rowCount || 0;
        break;
      }

      case 'oauth_tokens': {
        // Delete tokens for inactive/deleted users
        const inactiveUsers = await database
          .select({ id: users.id })
          .from(users)
          .where(eq(users.status, 'inactive')) as InactiveUser[];

        if (inactiveUsers.length > 0) {
          const userIds = inactiveUsers.map(u => u.id);
          const result = await database
            .delete(oauthTokens)
            .where(inArray(oauthTokens.userId, userIds))
            .returning();
          totalDeleted += result.length;
          totalProcessed += result.length;
        }

        // Also clean old tokens beyond retention period
        const regularResult = await deleteOldRecords(database, 'oauth_tokens', deleteBefore);
        totalDeleted += regularResult.deletedCount;
        totalProcessed += regularResult.deletedCount;
        break;
      }

      case 'push_subscriptions': {
        // Delete subscriptions for inactive users
        const inactiveUsers = await database
          .select({ id: users.id })
          .from(users)
          .where(eq(users.status, 'inactive')) as InactiveUser[];

        if (inactiveUsers.length > 0) {
          const userIds = inactiveUsers.map(u => u.id);
          const result = await database
            .delete(pushSubscriptions)
            .where(inArray(pushSubscriptions.userId, userIds))
            .returning();
          totalDeleted += result.length;
          totalProcessed += result.length;
        }

        const regularResult = await deleteOldRecords(database, 'push_subscriptions', deleteBefore);
        totalDeleted += regularResult.deletedCount;
        totalProcessed += regularResult.deletedCount;
        break;
      }

      case 'nrps_cache': {
        const regularResult = await deleteOldRecords(database, 'nrps_cache', deleteBefore);
        totalDeleted += regularResult.deletedCount;
        totalProcessed += regularResult.deletedCount;
        break;
      }

      case 'ags_scores': {
        const regularResult = await deleteOldRecords(database, 'ags_scores', deleteBefore);
        totalDeleted += regularResult.deletedCount;
        totalProcessed += regularResult.deletedCount;
        break;
      }

      case 'user_profiles': {
        // Anonymize inactive users older than retention period
        const inactiveUsers = await database
          .select({ id: users.id })
          .from(users)
          .where(and(
            eq(users.status, 'inactive'),
            lt(users.updatedAt, deleteBefore)
          )) as InactiveUser[];

        for (const user of inactiveUsers) {
          await database
            .update(users)
            .set({
              email: `deleted_${user.id}@deleted.local`,
              emailVerified: false,
              firstName: 'Deleted',
              lastName: 'User',
              displayName: 'Deleted User',
              avatarUrl: null,
              passwordHash: null,
              externalId: null,
              metadata: { deletedAt: new Date().toISOString(), deletedBy: 'retention_policy' },
            })
            .where(eq(users.id, user.id));
          totalProcessed++;
        }
        break;
      }

      default: {
        // Generic handler for other categories
        const regularResult = await deleteOldRecords(database, policy.category, deleteBefore);
        totalDeleted += regularResult.deletedCount;
        totalProcessed += regularResult.deletedCount;

        if (archiveBefore) {
          const archiveResult = await archiveOldRecords(database, policy.category, archiveBefore, deleteBefore);
          totalArchived += archiveResult.archivedCount;
          totalProcessed += archiveResult.archivedCount;
        }
      }
    }

    // Update job record
    const durationMs = Date.now() - startTime;
    await database
      .update(retentionJobs)
      .set({
        status: 'completed',
        recordsProcessed: totalProcessed,
        recordsArchived: totalArchived,
        recordsDeleted: totalDeleted,
        errors: errors.length > 0 ? errors : [],
        completedAt: new Date(),
        nextRunAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      })
      .where(eq(retentionJobs.id, job.id));

    const result: RetentionJobResult = {
      policyId,
      recordsProcessed: totalProcessed,
      recordsArchived: totalArchived,
      recordsDeleted: totalDeleted,
      errors,
      durationMs,
    };

    await createAuditLog({
      action: 'retention_job_completed',
      resourceType: 'retention_job',
      resourceId: job.id,
      userId: triggeredBy,
      severity: 'info',
      description: `Retention job completed for policy ${policy.category}`,
      metadata: result,
    });

    return result;
  } catch (error) {
    await database
      .update(retentionJobs)
      .set({
        status: 'failed',
        errors: [{ table: 'unknown', error: error instanceof Error ? error.message : 'Unknown error' }],
        completedAt: new Date(),
      })
      .where(eq(retentionJobs.id, job.id));

    await createAuditLog({
      action: 'retention_job_failed',
      resourceType: 'retention_job',
      resourceId: job.id,
      userId: triggeredBy,
      severity: 'critical',
      description: `Retention job failed for policy ${policy.category}`,
      metadata: { error: error instanceof Error ? error.message : 'Unknown error' },
    });

    throw error;
  }
}

/**
 * Create default retention policies for a district
 */
export async function createDefaultRetentionPolicies(
  districtId: string | null,
  schoolId: string | null,
  createdBy: string
): Promise<void> {
  const database = getDb();

  const defaults: Array<{
    category: RetentionCategory;
    description: string;
    retentionDays: number;
    archiveAfterDays?: number;
    deleteAfterDays: number;
    legalBasis: string;
    appliesTo: Record<string, any>;
  }> = [
    {
      category: 'audit_logs',
      description: 'FERPA-required audit log retention (7 years)',
      retentionDays: 2555, // 7 years
      deleteAfterDays: 2555,
      legalBasis: 'FERPA 34 CFR § 99.32',
      appliesTo: { roles: ['admin'], dataTypes: ['audit'] },
    },
    {
      category: 'tutor_sessions',
      description: 'FERPA educational records retention (1 year after student leaves)',
      retentionDays: 365,
      archiveAfterDays: 180,
      deleteAfterDays: 365,
      legalBasis: 'FERPA 34 CFR § 99.3',
      appliesTo: { roles: ['student', 'teacher'], dataTypes: ['educational_record'] },
    },
    {
      category: 'messages',
      description: 'Student chat messages (1 year, COPPA delete on request)',
      retentionDays: 365,
      archiveAfterDays: 90,
      deleteAfterDays: 365,
      legalBasis: 'FERPA 34 CFR § 99.3; COPPA 16 CFR § 312',
      appliesTo: { roles: ['student'], dataTypes: ['chat', 'educational_record'] },
    },
    {
      category: 'interventions',
      description: 'Teacher intervention records (1 year)',
      retentionDays: 365,
      archiveAfterDays: 180,
      deleteAfterDays: 365,
      legalBasis: 'FERPA 34 CFR § 99.3',
      appliesTo: { roles: ['teacher'], dataTypes: ['intervention'] },
    },
    {
      category: 'generated_artifacts',
      description: 'AI-generated worksheets/quizzes (1 year)',
      retentionDays: 365,
      archiveAfterDays: 180,
      deleteAfterDays: 365,
      legalBasis: 'FERPA 34 CFR § 99.3',
      appliesTo: { roles: ['teacher', 'student'], dataTypes: ['artifact'] },
    },
    {
      category: 'export_jobs',
      description: 'Export job records (90 days)',
      retentionDays: 90,
      deleteAfterDays: 90,
      legalBasis: 'Operational',
      appliesTo: { roles: ['teacher'], dataTypes: ['export'] },
    },
    {
      category: 'nrps_cache',
      description: 'LTI NRPS membership cache (30 days)',
      retentionDays: 30,
      deleteAfterDays: 30,
      legalBasis: 'LTI 1.3 Spec',
      appliesTo: { roles: ['system'], dataTypes: ['lti_cache'] },
    },
    {
      category: 'ags_scores',
      description: 'LTI AGS scores (1 year)',
      retentionDays: 365,
      deleteAfterDays: 365,
      legalBasis: 'LTI 1.3 AGS',
      appliesTo: { roles: ['student', 'teacher'], dataTypes: ['grade'] },
    },
    {
      category: 'oauth_tokens',
      description: 'OAuth tokens (deleted on user deletion + 30 days)',
      retentionDays: 30,
      deleteAfterDays: 30,
      legalBasis: 'OAuth 2.0 / Security',
      appliesTo: { roles: ['all'], dataTypes: ['auth_token'] },
    },
    {
      category: 'consent_records',
      description: 'Consent records (FERPA 7 years for granted, 1 year for denied)',
      retentionDays: 365,
      deleteAfterDays: 2555, // 7 years for granted consent
      legalBasis: 'FERPA 34 CFR § 99.32; COPPA 16 CFR § 312',
      appliesTo: { roles: ['parent', 'student'], dataTypes: ['consent'] },
    },
    {
      category: 'analytics',
      description: 'Session summaries and analytics (1 year)',
      retentionDays: 365,
      archiveAfterDays: 180,
      deleteAfterDays: 365,
      legalBasis: 'FERPA 34 CFR § 99.3',
      appliesTo: { roles: ['teacher', 'admin'], dataTypes: ['analytics'] },
    },
    {
      category: 'user_profiles',
      description: 'Inactive user profiles (anonymize after 1 year)',
      retentionDays: 365,
      deleteAfterDays: 365,
      legalBasis: 'GDPR Art. 5; COPPA 16 CFR § 312',
      appliesTo: { roles: ['all'], dataTypes: ['profile'] },
    },
  ];

  for (const def of defaults) {
    try {
      await database.insert(retentionPolicies).values({
        districtId,
        schoolId,
        category: def.category,
        description: def.description,
        retentionDays: def.retentionDays,
        archiveAfterDays: def.archiveAfterDays ?? null,
        deleteAfterDays: def.deleteAfterDays,
        legalBasis: def.legalBasis,
        appliesTo: def.appliesTo,
        exceptions: [],
        isActive: true,
        priority: 0,
        createdBy,
      }).onConflictDoNothing(); // Skip if already exists
    } catch (error) {
      console.error(`[Retention] Failed to create default policy for ${def.category}:`, error);
    }
  }
}

/**
 * Run all active retention policies (for cron job)
 */
export async function runAllRetentionPolicies(
  triggeredBy: string,
  districtId?: string,
  schoolId?: string
): Promise<RetentionJobResult[]> {
  const database = getDb();

  const conditions = [eq(retentionPolicies.isActive, true)];
  if (districtId) conditions.push(eq(retentionPolicies.districtId, districtId));
  if (schoolId) conditions.push(eq(retentionPolicies.schoolId, schoolId));

  const policies = await database
    .select()
    .from(retentionPolicies)
    .where(and(...conditions))
    .orderBy(retentionPolicies.priority);

  const results: RetentionJobResult[] = [];

  for (const policy of policies) {
    try {
      const result = await executeRetentionJob(policy.id, triggeredBy);
      results.push(result);
    } catch (error) {
      console.error(`[Retention] Policy ${policy.category} failed:`, error);
      results.push({
        policyId: policy.id,
        recordsProcessed: 0,
        recordsArchived: 0,
        recordsDeleted: 0,
        errors: [{ table: policy.category, error: error instanceof Error ? error.message : 'Unknown error' }],
        durationMs: 0,
      });
    }
  }

  return results;
}