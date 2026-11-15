/**
 * Data Deletion Workflow Service
 * Handles GDPR/CCPA/COPPA/FERPA data deletion requests end-to-end
 */

import { getDb } from '@/lib/db';
import {
  dataDeletionRequests,
  users,
  consentRecords,
  tutorSessions,
  messages,
  interventions,
  generatedArtifacts,
  exportJobs,
  oauthTokens,
  pushSubscriptions,
  students,
  teachers,
  parents,
  studentParents,
} from '@/db/schema';
import { eq, desc, sql, inArray } from 'drizzle-orm';
import { randomBytes } from 'crypto';
import { createAuditLog } from './audit';
import type { ComplianceAuditAction } from './types';

export type DeletionStatus =
  | 'requested'
  | 'verified'
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'rejected';

export interface DeletionScope {
  tables?: string[];
  dateRange?: { from?: string; to?: string };
  includeBackups?: boolean;
}

export interface CreateDeletionRequestInput {
  userId: string;              // the user whose data is being deleted (self or student)
  studentId?: string;          // if parent requesting for a child
  requestedBy: string;         // the user making the request
  reason?: string;
  legalBasis?: string;         // 'gdpr' | 'ccpa' | 'coppa' | 'ferpa'
  scope?: DeletionScope;
  districtId?: string;
  schoolId?: string;
}

export interface DeletionRequestRow {
  id: string;
  districtId: string | null;
  schoolId: string | null;
  userId: string;
  studentId: string | null;
  requestedBy: string;
  status: DeletionStatus;
  reason: string | null;
  legalBasis: string | null;
  scope: DeletionScope;
  verificationToken: string | null;
  verificationExpiresAt: Date | null;
  verifiedAt: Date | null;
  verifiedBy: string | null;
  scheduledAt: Date | null;
  startedAt: Date | null;
  completedAt: Date | null;
  failedAt: Date | null;
  errorMessage: string | null;
  deletedRecordCounts: Record<string, number>;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const VALID_TRANSITIONS: Record<DeletionStatus, DeletionStatus[]> = {
  requested: ['verified', 'cancelled', 'rejected'],
  verified: ['scheduled', 'cancelled', 'rejected'],
  scheduled: ['in_progress', 'cancelled', 'rejected'],
  in_progress: ['completed', 'failed'],
  completed: [],
  failed: [],
  cancelled: [],
  rejected: [],
};

const ADMIN_CANCELLABLE_STATUSES: DeletionStatus[] = ['requested', 'verified', 'scheduled'];

const ADMIN_REJECTABLE_STATUSES: DeletionStatus[] = ['requested', 'verified', 'scheduled'];

/**
 * Create a new data deletion request
 */
export async function createDeletionRequest(input: CreateDeletionRequestInput): Promise<{ id: string; verificationToken: string }> {
  const database = getDb();
  const now = new Date();

  // Generate verification token (32 bytes = 64 hex chars)
  const verificationToken = randomBytes(32).toString('hex');
  const verificationExpiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours

  const [record] = await database
    .insert(dataDeletionRequests)
    .values({
      userId: input.userId,
      studentId: input.studentId || null,
      requestedBy: input.requestedBy,
      status: 'requested',
      reason: input.reason || null,
      legalBasis: input.legalBasis || null,
      scope: input.scope || {},
      districtId: input.districtId || null,
      schoolId: input.schoolId || null,
      verificationToken,
      verificationExpiresAt,
      metadata: {
        ...input.scope,
        legalBasis: input.legalBasis,
        reason: input.reason,
      },
    })
    .returning();

  await createAuditLog({
    action: 'deletion_requested' as ComplianceAuditAction,
    resourceType: 'data_deletion_request',
    resourceId: record.id,
    userId: input.requestedBy,
    studentId: input.studentId,
    districtId: input.districtId,
    schoolId: input.schoolId,
    severity: 'info',
    description: `Data deletion requested for user ${input.userId}${input.studentId ? ` (student ${input.studentId})` : ''}`,
    metadata: {
      complianceAction: 'deletion_requested',
      legalBasis: input.legalBasis,
      reason: input.reason,
      scope: input.scope,
    },
  });

  return { id: record.id, verificationToken };
}

/**
 * Get deletion requests by user (requester or student's user)
 */
export async function getDeletionRequestsByUser(userId: string): Promise<DeletionRequestRow[]> {
  const database = getDb();

  const results = await database
    .select()
    .from(dataDeletionRequests)
    .where(
      sql`${dataDeletionRequests.requestedBy} = ${userId} OR ${dataDeletionRequests.userId} = ${userId}`
    )
    .orderBy(desc(dataDeletionRequests.createdAt));

  return results as DeletionRequestRow[];
}

/**
 * Get all deletion requests joined with user email (admin)
 */
export async function getAllDeletionRequests(): Promise<DeletionRequestRow[]> {
  const database = getDb();

  const results = await database
    .select({
      id: dataDeletionRequests.id,
      districtId: dataDeletionRequests.districtId,
      schoolId: dataDeletionRequests.schoolId,
      userId: dataDeletionRequests.userId,
      studentId: dataDeletionRequests.studentId,
      requestedBy: dataDeletionRequests.requestedBy,
      status: dataDeletionRequests.status,
      reason: dataDeletionRequests.reason,
      legalBasis: dataDeletionRequests.legalBasis,
      scope: dataDeletionRequests.scope,
      verificationToken: dataDeletionRequests.verificationToken,
      verificationExpiresAt: dataDeletionRequests.verificationExpiresAt,
      verifiedAt: dataDeletionRequests.verifiedAt,
      verifiedBy: dataDeletionRequests.verifiedBy,
      scheduledAt: dataDeletionRequests.scheduledAt,
      startedAt: dataDeletionRequests.startedAt,
      completedAt: dataDeletionRequests.completedAt,
      failedAt: dataDeletionRequests.failedAt,
      errorMessage: dataDeletionRequests.errorMessage,
      deletedRecordCounts: dataDeletionRequests.deletedRecordCounts,
      metadata: dataDeletionRequests.metadata,
      createdAt: dataDeletionRequests.createdAt,
      updatedAt: dataDeletionRequests.updatedAt,
      userEmail: users.email,
      studentUserId: students.userId,
    })
    .from(dataDeletionRequests)
    .leftJoin(users, eq(users.id, dataDeletionRequests.userId))
    .leftJoin(students, eq(students.id, dataDeletionRequests.studentId))
    .orderBy(desc(dataDeletionRequests.createdAt));

  return results as DeletionRequestRow[];
}

/**
 * Get a deletion request by ID
 */
export async function getDeletionRequestById(id: string): Promise<DeletionRequestRow | null> {
  const database = getDb();

  const [record] = await database
    .select()
    .from(dataDeletionRequests)
    .where(eq(dataDeletionRequests.id, id))
    .limit(1);

  return record as DeletionRequestRow | null;
}

/**
 * Update deletion request status with audit logging
 */
export async function updateDeletionRequestStatus(
  id: string,
  status: DeletionStatus,
  actorId: string,
  opts?: { note?: string; scheduledAt?: Date }
): Promise<void> {
  const database = getDb();
  const now = new Date();

  // Get current record
  const [current] = await database
    .select()
    .from(dataDeletionRequests)
    .where(eq(dataDeletionRequests.id, id))
    .limit(1);

  if (!current) {
    throw new Error('Deletion request not found');
  }

  // Validate transition
  const allowed = VALID_TRANSITIONS[current.status as DeletionStatus] || [];
  const adminCancel = status === 'cancelled' && ADMIN_CANCELLABLE_STATUSES.includes(current.status as DeletionStatus);
  const adminReject = status === 'rejected' && ADMIN_REJECTABLE_STATUSES.includes(current.status as DeletionStatus);

  if (!allowed.includes(status) && !adminCancel && !adminReject) {
    throw new Error(`Invalid status transition: ${current.status} → ${status}`);
  }

  // Build update data
  const updateData: Record<string, any> = {
    status,
    updatedAt: now,
    metadata: {
      ...(current.metadata as Record<string, any> || {}),
      lastTransition: {
        from: current.status,
        to: status,
        at: now.toISOString(),
        by: actorId,
        note: opts?.note,
      },
    },
  };

  // Set timestamp fields based on status
  switch (status) {
    case 'verified':
      updateData.verifiedAt = now;
      updateData.verifiedBy = actorId;
      break;
    case 'scheduled':
      updateData.scheduledAt = opts?.scheduledAt || now;
      break;
    case 'in_progress':
      updateData.startedAt = now;
      break;
    case 'completed':
      updateData.completedAt = now;
      break;
    case 'failed':
      updateData.failedAt = now;
      if (opts?.note) updateData.errorMessage = opts.note;
      break;
    case 'cancelled':
    case 'rejected':
      if (opts?.note) updateData.errorMessage = opts.note;
      break;
  }

  await database
    .update(dataDeletionRequests)
    .set(updateData)
    .where(eq(dataDeletionRequests.id, id));

  // Audit log
  const actionMap: Record<DeletionStatus, ComplianceAuditAction> = {
    verified: 'deletion_verified',
    scheduled: 'deletion_scheduled',
    in_progress: 'deletion_started',
    completed: 'deletion_completed',
    failed: 'deletion_failed',
    cancelled: 'deletion_cancelled',
    rejected: 'deletion_cancelled',
    requested: 'deletion_requested',
  };

  await createAuditLog({
    action: actionMap[status] || 'deletion_cancelled' as ComplianceAuditAction,
    resourceType: 'data_deletion_request',
    resourceId: id,
    userId: actorId,
    studentId: current.studentId || undefined,
    districtId: current.districtId || undefined,
    schoolId: current.schoolId || undefined,
    severity: status === 'failed' ? 'error' : status === 'completed' ? 'warning' : 'info',
    description: `Data deletion request ${status}${opts?.note ? `: ${opts.note}` : ''}`,
    oldValues: { status: current.status },
    newValues: { status },
    metadata: {
      complianceAction: actionMap[status] || 'deletion_cancelled',
      note: opts?.note,
    },
  });
}

/**
 * Execute the actual data deletion
 * Returns deleted record counts per table
 */
export async function executeDeletion(
  id: string,
  actorId: string
): Promise<{ deletedRecordCounts: Record<string, number> }> {
  const database = getDb();
  const now = new Date();
  const deletedRecordCounts: Record<string, number> = {};

  // Get the request
  const [request] = await database
    .select()
    .from(dataDeletionRequests)
    .where(eq(dataDeletionRequests.id, id))
    .limit(1);

  if (!request) {
    throw new Error('Deletion request not found');
  }

  if (request.status !== 'scheduled' && request.status !== 'verified') {
    throw new Error(`Cannot execute deletion from status: ${request.status}`);
  }

  // Mark as in_progress
  await database
    .update(dataDeletionRequests)
    .set({
      status: 'in_progress',
      startedAt: now,
      updatedAt: now,
    })
    .where(eq(dataDeletionRequests.id, id));

  try {
    // Determine the target user IDs
    const targetUserId = request.userId;
    const targetStudentId = request.studentId;

    // If studentId is provided, get the student's user ID
    let studentUserId: string | null = null;
    if (targetStudentId) {
      const [student] = await database
        .select({ userId: students.userId })
        .from(students)
        .where(eq(students.id, targetStudentId))
        .limit(1);
      studentUserId = student?.userId || null;
    }

    // Helper to safely delete and count
    const safeDelete = async (
      tableName: string,
      deleteBuilder: () => Promise<any[]>
    ): Promise<number> => {
      try {
        const result = await deleteBuilder();
        const count = Array.isArray(result) ? result.length : 0;
        deletedRecordCounts[tableName] = count;
        return count;
      } catch (e) {
        console.error(`[Deletion] ${tableName}:`, e);
        deletedRecordCounts[tableName] = 0;
        return 0;
      }
    };

    // Determine which user ID(s) to delete data for
    const deleteUserIds = studentUserId ? [studentUserId, targetUserId] : [targetUserId];
    // (deleteUserIds retained for future scope filtering; currently all deletions use targetUserId/targetStudentId directly)

    // 1. Delete consent_records for target user
    await safeDelete('consent_records', async () => {
      const result = await database
        .delete(consentRecords)
        .where(eq(consentRecords.userId, targetUserId))
        .returning();
      return result;
    });

    // 2. Delete tutor_sessions for the student
    if (targetStudentId) {
      await safeDelete('tutor_sessions', async () => {
        const result = await database
          .delete(tutorSessions)
          .where(eq(tutorSessions.studentId, targetStudentId))
          .returning();
        return result;
      });

      // 3. Delete messages for those sessions
      await safeDelete('messages', async () => {
        const sessionRows = await database
          .select({ id: tutorSessions.id })
          .from(tutorSessions)
          .where(eq(tutorSessions.studentId, targetStudentId));
        if (sessionRows.length > 0) {
          const sessionIds = sessionRows.map(s => s.id);
          const result = await database
            .delete(messages)
            .where(inArray(messages.sessionId, sessionIds))
            .returning();
          return result;
        }
        return [];
      });

      // 4. Delete interventions for the student
      await safeDelete('interventions', async () => {
        const result = await database
          .delete(interventions)
          .where(eq(interventions.studentId, targetStudentId))
          .returning();
        return result;
      });

      // 5. Delete generated_artifacts for the student
      await safeDelete('generated_artifacts', async () => {
        const result = await database
          .delete(generatedArtifacts)
          .where(eq(generatedArtifacts.studentId, targetStudentId))
          .returning();
        return result;
      });

      // 6. Delete ags_scores for the student's user
      const agsUserId = studentUserId || targetUserId;
      try {
        const { agsScores } = await import('@/db/schema');
        await safeDelete('ags_scores', async () => {
          const result = await database
            .delete(agsScores)
            .where(eq(agsScores.userId, agsUserId))
            .returning();
          return result;
        });
      } catch (e) {
        console.error('[Deletion] ags_scores:', e);
        deletedRecordCounts.ags_scores = 0;
      }
    }

    // 7. Delete export_jobs for the teacher (if user is teacher)
    const teacherUserId = studentUserId || targetUserId;
    try {
      const [teacher] = await database
        .select({ id: teachers.id })
        .from(teachers)
        .where(eq(teachers.userId, teacherUserId))
        .limit(1);
      if (teacher) {
        await safeDelete('export_jobs', async () => {
          const result = await database
            .delete(exportJobs)
            .where(eq(exportJobs.requestedBy, teacher.id))
            .returning();
          return result;
        });
      }
    } catch (e) {
      console.error('[Deletion] export_jobs:', e);
      deletedRecordCounts.export_jobs = 0;
    }

    // 8. Delete oauth_tokens for the user
    await safeDelete('oauth_tokens', async () => {
      const result = await database
        .delete(oauthTokens)
        .where(eq(oauthTokens.userId, targetUserId))
        .returning();
      return result;
    });

    // 9. Delete push_subscriptions for the user
    await safeDelete('push_subscriptions', async () => {
      const result = await database
        .delete(pushSubscriptions)
        .where(eq(pushSubscriptions.userId, targetUserId))
        .returning();
      return result;
    });

    // 10. Delete student_parents links for the student
    if (targetStudentId) {
      await safeDelete('student_parents', async () => {
        const result = await database
          .delete(studentParents)
          .where(eq(studentParents.studentId, targetStudentId))
          .returning();
        return result;
      });
    }

    // 11. Anonymize the user record (don't delete - keep FK integrity)
    try {
      await database
        .update(users)
        .set({
          email: `deleted_${targetUserId}@deleted.local`,
          emailVerified: false,
          firstName: 'Deleted',
          lastName: 'User',
          displayName: 'Deleted User',
          avatarUrl: null,
          passwordHash: null,
          externalId: null,
          metadata: {
            ...(request.metadata as Record<string, any> || {}),
            deletedAt: now.toISOString(),
            deletedBy: actorId,
          },
          status: 'inactive',
          updatedAt: now,
        })
        .where(eq(users.id, targetUserId));
      deletedRecordCounts.users_anonymized = 1;
    } catch (e) {
      console.error('[Deletion] users anonymize:', e);
      deletedRecordCounts.users_anonymized = 0;
    }

    // Also anonymize student record if applicable
    if (targetStudentId) {
      try {
        await database
          .update(students)
          .set({
            studentNumber: null,
            dateOfBirth: null,
            iepStatus: false,
            ellStatus: false,
            accommodations: {},
            learningPreferences: {},
            updatedAt: now,
          })
          .where(eq(students.id, targetStudentId));
        deletedRecordCounts.students_anonymized = 1;
      } catch (e) {
        console.error('[Deletion] students anonymize:', e);
        deletedRecordCounts.students_anonymized = 0;
      }
    }

    // Mark as completed
    await database
      .update(dataDeletionRequests)
      .set({
        status: 'completed',
        completedAt: now,
        deletedRecordCounts,
        updatedAt: now,
      })
      .where(eq(dataDeletionRequests.id, id));

    // Audit log
    await createAuditLog({
      action: 'deletion_completed' as ComplianceAuditAction,
      resourceType: 'data_deletion_request',
      resourceId: id,
      userId: actorId,
      studentId: request.studentId || undefined,
      districtId: request.districtId || undefined,
      schoolId: request.schoolId || undefined,
      severity: 'warning',
      description: `Data deletion executed for user ${targetUserId}${targetStudentId ? ` (student ${targetStudentId})` : ''}`,
      newValues: { deletedRecordCounts },
      metadata: {
        complianceAction: 'deletion_completed',
        deletedRecordCounts,
      },
    });

    return { deletedRecordCounts };
  } catch (error) {
    // Mark as failed
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await database
      .update(dataDeletionRequests)
      .set({
        status: 'failed',
        failedAt: now,
        errorMessage,
        updatedAt: now,
      })
      .where(eq(dataDeletionRequests.id, id));

    await createAuditLog({
      action: 'deletion_failed' as ComplianceAuditAction,
      resourceType: 'data_deletion_request',
      resourceId: id,
      userId: actorId,
      studentId: request.studentId || undefined,
      districtId: request.districtId || undefined,
      schoolId: request.schoolId || undefined,
      severity: 'error',
      description: `Data deletion failed: ${errorMessage}`,
      metadata: {
        complianceAction: 'deletion_failed',
        error: errorMessage,
      },
    });

    // Don't throw - return the counts we have
    return { deletedRecordCounts };
  }
}
