/**
 * Compliance Audit Logging
 * Enhanced audit logging for compliance events
 */

import { getDb } from '@/lib/db';
import { auditLogs, users, consentRecords, students } from '@/db/schema';
import { eq, and, gte, lte, desc, count, sql } from 'drizzle-orm';
import { ComplianceAuditEvent, ComplianceAuditAction } from './types';
import { mapAuditSeverity } from './severity';

/**
 * Map compliance audit actions to existing auditActionEnum values
 */
function mapComplianceActionToEnum(action: ComplianceAuditAction): string {
  const actionMap: Record<string, string> = {
    // Consent -> existing actions
    'consent_granted': 'consent_given',
    'consent_denied': 'custom',
    'consent_withdrawn': 'consent_withdrawn',
    'consent_expired': 'custom',
    'parental_consent_requested': 'custom',
    'parental_consent_received': 'custom',
    'parental_consent_denied': 'custom',
    // Data Deletion
    'deletion_requested': 'data_deletion_request',
    'deletion_verified': 'custom',
    'deletion_scheduled': 'custom',
    'deletion_started': 'custom',
    'deletion_completed': 'data_deletion_executed',
    'deletion_failed': 'custom',
    'deletion_cancelled': 'custom',
    // Retention
    'retention_policy_created': 'config_change',
    'retention_policy_updated': 'config_change',
    'retention_policy_deactivated': 'config_change',
    'retention_job_started': 'custom',
    'retention_job_completed': 'custom',
    'retention_job_failed': 'security_event',
    // FERPA
    'ferpa_optout_requested': 'custom',
    'ferpa_optout_approved': 'custom',
    'ferpa_optout_denied': 'custom',
    'ferpa_record_requested': 'custom',
    'ferpa_record_fulfilled': 'custom',
    'ferpa_record_denied': 'custom',
    'ferpa_disclosure_logged': 'custom',
    // GDPR
    'gdpr_access_requested': 'data_export',
    'gdpr_access_fulfilled': 'data_export',
    'gdpr_rectification_requested': 'custom',
    'gdpr_rectification_completed': 'custom',
    'gdpr_erasure_requested': 'data_deletion_request',
    'gdpr_erasure_completed': 'data_deletion_executed',
    'gdpr_portability_requested': 'data_export',
    'gdpr_portability_fulfilled': 'data_export',
    'gdpr_objection_logged': 'custom',
    // COPPA
    'coppa_age_verified': 'custom',
    'coppa_consent_expired_notification': 'custom',
    'coppa_data_deletion_requested': 'data_deletion_request',
    // General
    'privacy_policy_updated': 'settings_change',
    'terms_updated': 'settings_change',
    'data_breach_detected': 'security_event',
    'data_breach_notified': 'security_event',
    // LTI Platform
    'lti_platform_created': 'config_change',
    'lti_platform_updated': 'config_change',
    'lti_platform_deleted': 'delete',
    'lti_platform_keys_rotated': 'config_change',
    'lti_deployment_created': 'config_change',
    'lti_deployment_updated': 'config_change',
    'lti_deployment_deleted': 'delete',
    // LTI Launch
    'lti_launch_initiated': 'lti_launch',
    'lti_launch_succeeded': 'lti_launch',
    'lti_launch_failed': 'lti_launch',
    // Google Classroom
    'google_classroom_connected': 'custom',
    'google_classroom_sync_started': 'custom',
  };
  
  return actionMap[action] || 'custom';
}

/**
 * Map compliance resource types to existing auditResourceTypeEnum values
 */
function mapComplianceResourceType(resourceType: string): string {
  const resourceMap: Record<string, string> = {
    'consent_record': 'consent_record',
    'data_deletion_request': 'data_deletion_request',
    'retention_policy': 'retention_policy',
    'retention_job': 'custom',
    'user': 'user',
    'student': 'student',
    'district': 'district',
    'school': 'school',
    'lti_platform': 'lti_platform',
    'lti_deployment': 'lti_deployment',
    'lti_launch': 'lti_launch',
    // Google Classroom
    'google_classroom': 'custom',
  };
  
  return resourceMap[resourceType] || 'custom';
}

/**
 * Keys that must never be persisted in an audit payload.
 * Matched case-insensitively; PEM bodies are also scrubbed.
 */
const SENSITIVE_KEYS = ['privatekey', 'clientsecret', 'password', 'apikey'];

/**
 * Strip secrets from an audit snapshot.
 * Returns `{}` for missing values because `audit_logs.old_values` / `new_values`
 * are `notNull()` with a `{}` default (passing `null` fails the insert).
 */
function sanitizeAuditValues(values?: Record<string, any>): Record<string, any> {
  if (!values || typeof values !== 'object') return {};

  const out: Record<string, any> = {};
  for (const [key, value] of Object.entries(values)) {
    if (SENSITIVE_KEYS.includes(key.toLowerCase())) continue;
    out[key] = value;
  }
  return out;
}

/**
 * Create a compliance audit log entry
 */
export async function createAuditLog(event: ComplianceAuditEvent): Promise<void> {
  const database = getDb();

  try {
    // Map the compliance action to a valid enum value, store original in metadata
    const mappedAction = mapComplianceActionToEnum(event.action);
    const mappedResourceType = mapComplianceResourceType(event.resourceType);
    const mappedSeverity = mapAuditSeverity(event.severity);
    
    await database.insert(auditLogs).values({
      districtId: event.districtId || null,
      schoolId: event.schoolId || null,
      userId: event.userId || null,
      impersonatorId: null,
      action: mappedAction as any,
      resourceType: mappedResourceType as any,
      resourceId: event.resourceId || null,
      severity: mappedSeverity as any,
      description: event.description,
      oldValues: sanitizeAuditValues(event.oldValues),
      newValues: sanitizeAuditValues(event.newValues),
      ipAddress: event.ipAddress || null,
      userAgent: event.userAgent || null,
      requestId: event.requestId || null,
      sessionId: event.sessionId || null,
      metadata: {
        ...event.metadata,
        complianceAction: event.action, // Store original action
      },
    });
  } catch (error) {
    // Don't throw - audit logging failures shouldn't break the main flow
    console.error('[Compliance Audit] Failed to create audit log:', error);
  }
}

/**
 * Batch create audit logs
 */
export async function createAuditLogs(events: ComplianceAuditEvent[]): Promise<void> {
  if (events.length === 0) return;

  const database = getDb();

  try {
    await database.insert(auditLogs).values(
      events.map(event => {
        const mappedAction = mapComplianceActionToEnum(event.action);
        const mappedResourceType = mapComplianceResourceType(event.resourceType);
        const mappedSeverity = mapAuditSeverity(event.severity);
        return {
          districtId: event.districtId || null,
          schoolId: event.schoolId || null,
          userId: event.userId || null,
          impersonatorId: null,
          action: mappedAction as any,
          resourceType: mappedResourceType as any,
          resourceId: event.resourceId || null,
          severity: mappedSeverity as any,
          description: event.description,
          oldValues: sanitizeAuditValues(event.oldValues),
          newValues: sanitizeAuditValues(event.newValues),
          ipAddress: event.ipAddress || null,
          userAgent: event.userAgent || null,
          requestId: event.requestId || null,
          sessionId: event.sessionId || null,
          metadata: {
            ...event.metadata,
            complianceAction: event.action,
          },
        };
      })
    );
  } catch (error) {
    console.error('[Compliance Audit] Failed to create batch audit logs:', error);
  }
}

/**
 * Query audit logs with compliance filters
 */
export async function queryComplianceAuditLogs(filters: {
  startDate?: Date;
  endDate?: Date;
  actions?: ComplianceAuditAction[];
  resourceTypes?: string[];
  userId?: string;
  studentId?: string;
  districtId?: string;
  schoolId?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  limit?: number;
  offset?: number;
}) {
  const database = getDb();

  const conditions = [];

  if (filters.startDate) {
    conditions.push(gte(auditLogs.createdAt, filters.startDate));
  }

  if (filters.endDate) {
    conditions.push(lte(auditLogs.createdAt, filters.endDate));
  }

  if (filters.actions && filters.actions.length > 0) {
    conditions.push(sql`${auditLogs.action} = ANY(${filters.actions})`);
  }

  if (filters.resourceTypes && filters.resourceTypes.length > 0) {
    conditions.push(sql`${auditLogs.resourceType} = ANY(${filters.resourceTypes})`);
  }

  if (filters.userId) {
    conditions.push(eq(auditLogs.userId, filters.userId));
  }

  if (filters.studentId) {
    conditions.push(sql`${auditLogs.metadata}->>'studentId' = ${filters.studentId}`);
  }

  if (filters.districtId) {
    conditions.push(eq(auditLogs.districtId, filters.districtId));
  }

  if (filters.schoolId) {
    conditions.push(eq(auditLogs.schoolId, filters.schoolId));
  }

  if (filters.severity) {
    conditions.push(eq(auditLogs.severity, filters.severity as any));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [totalResult] = await database
    .select({ value: count() })
    .from(auditLogs)
    .where(whereClause);

  const data = await database
    .select({
      id: auditLogs.id,
      districtId: auditLogs.districtId,
      schoolId: auditLogs.schoolId,
      userId: auditLogs.userId,
      userEmail: users.email,
      action: auditLogs.action,
      resourceType: auditLogs.resourceType,
      resourceId: auditLogs.resourceId,
      severity: auditLogs.severity,
      description: auditLogs.description,
      oldValues: auditLogs.oldValues,
      newValues: auditLogs.newValues,
      ipAddress: auditLogs.ipAddress,
      userAgent: auditLogs.userAgent,
      requestId: auditLogs.requestId,
      sessionId: auditLogs.sessionId,
      metadata: auditLogs.metadata,
      createdAt: auditLogs.createdAt,
    })
    .from(auditLogs)
    .leftJoin(users, eq(users.id, auditLogs.userId))
    .where(whereClause)
    .orderBy(desc(auditLogs.createdAt))
    .limit(filters.limit || 100)
    .offset(filters.offset || 0);

  return {
    data,
    total: Number(totalResult.value),
  };
}

/**
 * Get compliance audit statistics
 */
export async function getComplianceAuditStats(districtId?: string, schoolId?: string, days: number = 30) {
  const database = getDb();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const conditions = [gte(auditLogs.createdAt, startDate)];
  
  if (districtId) conditions.push(eq(auditLogs.districtId, districtId));
  if (schoolId) conditions.push(eq(auditLogs.schoolId, schoolId));

  const whereClause = and(...conditions);

  // Total events by severity
  const severityStats = await database
    .select({
      severity: auditLogs.severity,
      count: count(),
    })
    .from(auditLogs)
    .where(whereClause)
    .groupBy(auditLogs.severity);

  // Total events by action
  const actionStats = await database
    .select({
      action: auditLogs.action,
      count: count(),
    })
    .from(auditLogs)
    .where(whereClause)
    .groupBy(auditLogs.action)
    .orderBy(desc(count()))
    .limit(20);

  // Total events by resource type
  const resourceStats = await database
    .select({
      resourceType: auditLogs.resourceType,
      count: count(),
    })
    .from(auditLogs)
    .where(whereClause)
    .groupBy(auditLogs.resourceType)
    .orderBy(desc(count()));

  // Events over time (daily)
  const dailyStats = await database
    .select({
      date: sql<Date>`DATE(${auditLogs.createdAt})`,
      count: count(),
    })
    .from(auditLogs)
    .where(whereClause)
    .groupBy(sql`DATE(${auditLogs.createdAt})`)
    .orderBy(sql`DATE(${auditLogs.createdAt})`);

  return {
    totalEvents: severityStats.reduce((sum, s) => sum + Number(s.count), 0),
    bySeverity: severityStats.map(s => ({ severity: s.severity, count: Number(s.count) })),
    byAction: actionStats.map(s => ({ action: s.action, count: Number(s.count) })),
    byResourceType: resourceStats.map(s => ({ resourceType: s.resourceType, count: Number(s.count) })),
    daily: dailyStats.map(s => ({ date: s.date, count: Number(s.count) })),
  };
}

/**
 * Check for compliance violations (e.g., missing consent, expired consent)
 */
export async function checkComplianceViolations(districtId?: string): Promise<{
  missingConsent: number;
  expiredConsent: number;
  withdrawnConsent: number;
  pendingDeletionRequests: number;
  overdueDeletionRequests: number;
}> {
  const database = getDb();
  const { students } = await import('@/db/schema');
  const { eq, and } = await import('drizzle-orm');
  
  const conditions = districtId ? [eq(consentRecords.districtId, districtId)] : [];
  
  // Count missing consent (students without parental consent)
  const studentsWithoutConsent = await database
    .select({ count: sql`count(*)` })
    .from(students)
    .where(and(...conditions))
    .then(rows => Number(rows[0]?.count || 0));

  return {
    missingConsent: studentsWithoutConsent,
    expiredConsent: 0, // Would need date logic
    withdrawnConsent: 0,
    pendingDeletionRequests: 0,
    overdueDeletionRequests: 0,
  };
}

/**
 * Export audit logs for compliance reporting
 */
export async function exportAuditLogs(
  filters: Parameters<typeof queryComplianceAuditLogs>[0],
  format: 'json' | 'csv' = 'json'
): Promise<string> {
  const { data } = await queryComplianceAuditLogs({ ...filters, limit: 10000 });

  if (format === 'csv') {
    const headers = [
      'id',
      'createdAt',
      'action',
      'resourceType',
      'resourceId',
      'userId',
      'userEmail',
      'severity',
      'description',
      'ipAddress',
      'districtId',
      'schoolId',
    ];

    const rows = data.map(log => [
      log.id,
      log.createdAt.toISOString(),
      log.action,
      log.resourceType,
      log.resourceId || '',
      log.userId || '',
      log.userEmail || '',
      log.severity,
      log.description,
      log.ipAddress || '',
      log.districtId || '',
      log.schoolId || '',
    ]);

    return [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');
  }

  return JSON.stringify(data, null, 2);
}