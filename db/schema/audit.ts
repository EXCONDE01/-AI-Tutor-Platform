import { pgTable, uuid, text, timestamp, boolean, pgEnum, index, uniqueIndex, integer, jsonb } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users';
import { districts, schools } from './tenants';

export const auditActionEnum = pgEnum('audit_action', [
  'create',
  'read',
  'update',
  'delete',
  'login',
  'logout',
  'login_failed',
  'password_change',
  'password_reset',
  'mfa_enable',
  'mfa_disable',
  'consent_given',
  'consent_withdrawn',
  'data_export',
  'data_import',
  'data_deletion_request',
  'data_deletion_executed',
  'role_change',
  'permission_change',
  'settings_change',
  'lti_launch',
  'lti_nrps_sync',
  'lti_ags_score',
  'ai_session_start',
  'ai_session_end',
  'ai_message_sent',
  'ai_tool_used',
  'artifact_generated',
  'artifact_exported',
  'intervention_created',
  'intervention_resolved',
  'config_change',
  'bulk_operation',
  'api_access',
  'security_event',
  'custom'
]);

export const auditResourceTypeEnum = pgEnum('audit_resource_type', [
  'district',
  'school',
  'user',
  'teacher',
  'student',
  'parent',
  'class',
  'tutor_session',
  'message',
  'intervention',
  'tutor_config',
  'generated_artifact',
  'export_job',
  'lti_platform',
  'lti_deployment',
  'lti_launch',
  'nrps_cache',
  'ags_line_item',
  'ags_score',
  'oauth_token',
  'consent_record',
  'data_deletion_request',
  'retention_policy',
  'audit_log',
  'system',
  'custom'
]);

export const auditSeverityEnum = pgEnum('audit_severity', ['low', 'medium', 'high', 'critical']);

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  districtId: uuid('district_id').references(() => districts.id, { onDelete: 'set null' }),
  schoolId: uuid('school_id').references(() => schools.id, { onDelete: 'set null' }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  impersonatorId: uuid('impersonator_id').references(() => users.id, { onDelete: 'set null' }), // For admin impersonation
  action: auditActionEnum('action').notNull(),
  resourceType: auditResourceTypeEnum('resource_type').notNull(),
  resourceId: uuid('resource_id'), // ID of the affected resource
  severity: auditSeverityEnum('severity').default('low').notNull(),
  description: text('description').notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  requestId: text('request_id'), // Correlation ID for request tracing
  sessionId: text('session_id'), // User session ID
  oldValues: jsonb('old_values').default({}).notNull(), // Previous state
  newValues: jsonb('new_values').default({}).notNull(), // New state
  metadata: jsonb('metadata').default({}).notNull(), // Additional context
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  districtIdx: index('audit_logs_district_id_idx').on(table.districtId),
  schoolIdx: index('audit_logs_school_id_idx').on(table.schoolId),
  userIdx: index('audit_logs_user_id_idx').on(table.userId),
  actionIdx: index('audit_logs_action_idx').on(table.action),
  resourceTypeIdx: index('audit_logs_resource_type_idx').on(table.resourceType),
  resourceIdx: index('audit_logs_resource_idx').on(table.resourceType, table.resourceId),
  severityIdx: index('audit_logs_severity_idx').on(table.severity),
  createdIdx: index('audit_logs_created_at_idx').on(table.createdAt),
  requestIdx: index('audit_logs_request_id_idx').on(table.requestId),
  sessionIdx: index('audit_logs_session_id_idx').on(table.sessionId),
  // Partitioning hint for large tables (PostgreSQL 11+)
  // This would be implemented as a partitioned table in production
}));

// Partitioned audit logs by month for performance (optional, for production scale)
// This is a template - actual partitioning would be done via raw SQL
export const auditLogsPartitioned = pgTable('audit_logs_partitioned', {
  id: uuid('id').defaultRandom().primaryKey(),
  districtId: uuid('district_id').references(() => districts.id, { onDelete: 'set null' }),
  schoolId: uuid('school_id').references(() => schools.id, { onDelete: 'set null' }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  impersonatorId: uuid('impersonator_id').references(() => users.id, { onDelete: 'set null' }),
  action: auditActionEnum('action').notNull(),
  resourceType: auditResourceTypeEnum('resource_type').notNull(),
  resourceId: uuid('resource_id'),
  severity: auditSeverityEnum('severity').default('low').notNull(),
  description: text('description').notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  requestId: text('request_id'),
  sessionId: text('session_id'),
  oldValues: jsonb('old_values').default({}).notNull(),
  newValues: jsonb('new_values').default({}).notNull(),
  metadata: jsonb('metadata').default({}).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  createdIdx: index('audit_logs_partitioned_created_at_idx').on(table.createdAt),
}));

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;