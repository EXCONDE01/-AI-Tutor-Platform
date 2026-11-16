import { pgTable, uuid, text, timestamp, boolean, pgEnum, index, uniqueIndex, integer, jsonb } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users';
import { districts, schools } from './tenants';
import { students } from './users';

export const consentTypeEnum = pgEnum('consent_type', [
  'terms_of_service',
  'privacy_policy',
  'data_processing',
  'ai_interaction',
  'data_sharing',
  'marketing',
  'analytics',
  'third_party_services',
  'parental_consent', // COPPA
  'ferpa_consent',
  'coppa_consent',
  'gdpr_consent',
  'state_privacy_law', // CCPA, etc.
  'custom'
]);

export const consentStatusEnum = pgEnum('consent_status', ['granted', 'denied', 'withdrawn', 'expired', 'pending']);
export const deletionStatusEnum = pgEnum('deletion_status', ['requested', 'verified', 'scheduled', 'in_progress', 'completed', 'failed', 'cancelled', 'rejected']);
export const retentionCategoryEnum = pgEnum('retention_category', [
  'audit_logs',
  'tutor_sessions',
  'messages',
  'interventions',
  'generated_artifacts',
  'export_jobs',
  'nrps_cache',
  'ags_scores',
  'oauth_tokens',
  'consent_records',
  'user_profiles',
  'lti_data',
  'analytics',
  'backups',
  'push_subscriptions',
  'session_summaries',
  'custom'
]);

export const consentRecords = pgTable('consent_records', {
  id: uuid('id').defaultRandom().primaryKey(),
  districtId: uuid('district_id').references(() => districts.id, { onDelete: 'cascade' }),
  schoolId: uuid('school_id').references(() => schools.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  studentId: uuid('student_id').references(() => students.id, { onDelete: 'cascade' }), // For parental consent
  type: consentTypeEnum('type').notNull(),
  status: consentStatusEnum('status').notNull(),
  version: text('version').notNull(), // Policy version consented to
  policyUrl: text('policy_url'), // Link to policy document
  consentText: text('consent_text'), // Actual text presented to user
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  witnessId: uuid('witness_id').references(() => users.id, { onDelete: 'set null' }), // For verbal consent
  metadata: jsonb('metadata').default({}).notNull(),
  grantedAt: timestamp('granted_at', { withTimezone: true }),
  withdrawnAt: timestamp('withdrawn_at', { withTimezone: true }),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  districtIdx: index('consent_records_district_id_idx').on(table.districtId),
  schoolIdx: index('consent_records_school_id_idx').on(table.schoolId),
  userIdx: index('consent_records_user_id_idx').on(table.userId),
  studentIdx: index('consent_records_student_id_idx').on(table.studentId),
  typeIdx: index('consent_records_type_idx').on(table.type),
  statusIdx: index('consent_records_status_idx').on(table.status),
  versionIdx: index('consent_records_version_idx').on(table.version),
  userTypeIdx: uniqueIndex('consent_records_user_type_version_idx').on(table.userId, table.type, table.version),
  expiresIdx: index('consent_records_expires_at_idx').on(table.expiresAt),
}));

export const dataDeletionRequests = pgTable('data_deletion_requests', {
  id: uuid('id').defaultRandom().primaryKey(),
  districtId: uuid('district_id').references(() => districts.id, { onDelete: 'cascade' }),
  schoolId: uuid('school_id').references(() => schools.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  studentId: uuid('student_id').references(() => students.id, { onDelete: 'cascade' }), // Parent requesting for student
  requestedBy: uuid('requested_by').notNull().references(() => users.id, { onDelete: 'cascade' }),
  status: deletionStatusEnum('status').default('requested').notNull(),
  reason: text('reason'),
  legalBasis: text('legal_basis'), // GDPR Art. 17, CCPA, COPPA, FERPA, etc.
  scope: jsonb('scope').default({}).notNull(), // { tables: [], dateRange: {}, includeBackups: boolean }
  verificationToken: text('verification_token'), // For email verification
  verificationExpiresAt: timestamp('verification_expires_at', { withTimezone: true }),
  verifiedAt: timestamp('verified_at', { withTimezone: true }),
  verifiedBy: uuid('verified_by').references(() => users.id, { onDelete: 'set null' }),
  scheduledAt: timestamp('scheduled_at', { withTimezone: true }),
  startedAt: timestamp('started_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  failedAt: timestamp('failed_at', { withTimezone: true }),
  errorMessage: text('error_message'),
  deletedRecordCounts: jsonb('deleted_record_counts').default({}).notNull(), // { table: count }
  metadata: jsonb('metadata').default({}).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  districtIdx: index('data_deletion_requests_district_id_idx').on(table.districtId),
  schoolIdx: index('data_deletion_requests_school_id_idx').on(table.schoolId),
  userIdx: index('data_deletion_requests_user_id_idx').on(table.userId),
  studentIdx: index('data_deletion_requests_student_id_idx').on(table.studentId),
  statusIdx: index('data_deletion_requests_status_idx').on(table.status),
  requestedByIdx: index('data_deletion_requests_requested_by_idx').on(table.requestedBy),
  verificationIdx: index('data_deletion_requests_verification_token_idx').on(table.verificationToken),
  scheduledIdx: index('data_deletion_requests_scheduled_at_idx').on(table.scheduledAt),
}));

export const retentionPolicies = pgTable('retention_policies', {
  id: uuid('id').defaultRandom().primaryKey(),
  districtId: uuid('district_id').references(() => districts.id, { onDelete: 'cascade' }), // Null = global default
  schoolId: uuid('school_id').references(() => schools.id, { onDelete: 'cascade' }), // Null = district-level
  category: retentionCategoryEnum('category').notNull(),
  description: text('description').notNull(),
  retentionDays: integer('retention_days').notNull(), // Days to retain
  archiveAfterDays: integer('archive_after_days'), // Move to cold storage
  deleteAfterDays: integer('delete_after_days').notNull(), // Hard delete
  legalBasis: text('legal_basis'), // Legal requirement citation
  appliesTo: jsonb('applies_to').default({}).notNull(), // { roles: [], dataTypes: [], conditions: {} }
  exceptions: jsonb('exceptions').default([]).notNull(), // Conditions that extend retention
  isActive: boolean('is_active').default(true).notNull(),
  priority: integer('priority').default(0).notNull(), // Higher priority wins conflicts
  createdBy: uuid('created_by').notNull().references(() => users.id, { onDelete: 'cascade' }),
  approvedBy: uuid('approved_by').references(() => users.id, { onDelete: 'set null' }),
  approvedAt: timestamp('approved_at', { withTimezone: true }),
  effectiveFrom: timestamp('effective_from', { withTimezone: true }).defaultNow().notNull(),
  effectiveUntil: timestamp('effective_until', { withTimezone: true }),
  metadata: jsonb('metadata').default({}).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  districtIdx: index('retention_policies_district_id_idx').on(table.districtId),
  schoolIdx: index('retention_policies_school_id_idx').on(table.schoolId),
  categoryIdx: index('retention_policies_category_idx').on(table.category),
  activeIdx: index('retention_policies_active_idx').on(table.isActive),
  effectiveIdx: index('retention_policies_effective_idx').on(table.effectiveFrom, table.effectiveUntil),
  priorityIdx: index('retention_policies_priority_idx').on(table.priority),
  uniquePolicy: uniqueIndex('retention_policies_unique_idx').on(table.districtId, table.schoolId, table.category),
}));

export const retentionJobs = pgTable('retention_jobs', {
  id: uuid('id').defaultRandom().primaryKey(),
  policyId: uuid('policy_id').notNull().references(() => retentionPolicies.id, { onDelete: 'cascade' }),
  status: text('status').default('pending').notNull(), // pending, running, completed, failed
  scope: jsonb('scope').default({}).notNull(),
  recordsProcessed: integer('records_processed').default(0).notNull(),
  recordsArchived: integer('records_archived').default(0).notNull(),
  recordsDeleted: integer('records_deleted').default(0).notNull(),
  errors: jsonb('errors').default([]).notNull(),
  startedAt: timestamp('started_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  nextRunAt: timestamp('next_run_at', { withTimezone: true }),
  metadata: jsonb('metadata').default({}).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  policyIdx: index('retention_jobs_policy_id_idx').on(table.policyId),
  statusIdx: index('retention_jobs_status_idx').on(table.status),
  nextRunIdx: index('retention_jobs_next_run_at_idx').on(table.nextRunAt),
}));

export type ConsentRecord = typeof consentRecords.$inferSelect;
export type NewConsentRecord = typeof consentRecords.$inferInsert;
export type DataDeletionRequest = typeof dataDeletionRequests.$inferSelect;
export type NewDataDeletionRequest = typeof dataDeletionRequests.$inferInsert;
export type RetentionPolicy = typeof retentionPolicies.$inferSelect;
export type NewRetentionPolicy = typeof retentionPolicies.$inferInsert;
export type RetentionJob = typeof retentionJobs.$inferSelect;
export type NewRetentionJob = typeof retentionJobs.$inferInsert;