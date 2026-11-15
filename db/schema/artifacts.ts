import { pgTable, uuid, text, timestamp, boolean, pgEnum, index, uniqueIndex, integer, jsonb } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { tutorSessions } from './sessions';
import { students, teachers } from './users';
import { classes } from './classes';

export const artifactTypeEnum = pgEnum('artifact_type', [
  'lesson_plan',
  'worksheet',
  'quiz',
  'assessment',
  'rubric',
  'study_guide',
  'flashcards',
  'summary',
  'report',
  'presentation',
  'code',
  'diagram',
  'custom'
]);

export const artifactStatusEnum = pgEnum('artifact_status', ['draft', 'generated', 'reviewed', 'approved', 'published', 'archived']);
export const exportStatusEnum = pgEnum('export_status', ['pending', 'processing', 'completed', 'failed', 'cancelled']);
export const exportFormatEnum = pgEnum('export_format', [
  'pdf',
  'docx',
  'html',
  'markdown',
  'json',
  'csv',
  'xlsx',
  'google_docs',
  'google_forms',
  'google_slides',
  'canvas',
  'schoology',
]);
export const oauthProviderEnum = pgEnum('oauth_provider', ['google', 'microsoft', 'canvas', 'schoology', 'blackboard', 'clever', 'classlink']);

// Declare table first to avoid circular reference
const generatedArtifactsTable = pgTable('generated_artifacts', {
  id: uuid('id').defaultRandom().primaryKey(),
  sessionId: uuid('session_id').references(() => tutorSessions.id, { onDelete: 'set null' }),
  studentId: uuid('student_id').references(() => students.id, { onDelete: 'set null' }),
  classId: uuid('class_id').notNull().references(() => classes.id, { onDelete: 'cascade' }),
  teacherId: uuid('teacher_id').notNull().references(() => teachers.id, { onDelete: 'cascade' }),
  type: artifactTypeEnum('type').notNull(),
  status: artifactStatusEnum('status').default('draft').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  content: jsonb('content').notNull(),
  markdownContent: text('markdown_content'),
  htmlContent: text('html_content'),
  metadata: jsonb('metadata').default({}).notNull(),
  tags: text('tags').array().default(sql`'{}'::text[]`).notNull(),
  curriculumStandards: text('curriculum_standards').array().default(sql`'{}'::text[]`).notNull(),
  gradeLevel: integer('grade_level'),
  subject: text('subject'),
  difficulty: integer('difficulty'),
  estimatedDurationMinutes: integer('estimated_duration_minutes'),
  language: text('language').default('en').notNull(),
  version: integer('version').default(1).notNull(),
  parentArtifactId: uuid('parent_artifact_id').references((): any => generatedArtifactsTable.id, { onDelete: 'set null' }),
  isTemplate: boolean('is_template').default(false).notNull(),
  generatedBy: text('generated_by').notNull(),
  aiModel: text('ai_model'),
  aiPrompt: text('ai_prompt'),
  reviewNotes: text('review_notes'),
  reviewedBy: uuid('reviewed_by').references(() => teachers.id, { onDelete: 'set null' }),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  sessionIdx: index('generated_artifacts_session_id_idx').on(table.sessionId),
  studentIdx: index('generated_artifacts_student_id_idx').on(table.studentId),
  classIdx: index('generated_artifacts_class_id_idx').on(table.classId),
  teacherIdx: index('generated_artifacts_teacher_id_idx').on(table.teacherId),
  typeIdx: index('generated_artifacts_type_idx').on(table.type),
  statusIdx: index('generated_artifacts_status_idx').on(table.status),
  templateIdx: index('generated_artifacts_template_idx').on(table.isTemplate),
  parentIdx: index('generated_artifacts_parent_idx').on(table.parentArtifactId),
  createdIdx: index('generated_artifacts_created_at_idx').on(table.createdAt),
}));

export const generatedArtifacts = generatedArtifactsTable;

export const exportJobs = pgTable('export_jobs', {
  id: uuid('id').defaultRandom().primaryKey(),
  artifactId: uuid('artifact_id').references(() => generatedArtifacts.id, { onDelete: 'cascade' }),
  requestedBy: uuid('requested_by').notNull().references(() => teachers.id, { onDelete: 'cascade' }),
  format: exportFormatEnum('format').notNull(),
  status: exportStatusEnum('status').default('pending').notNull(),
  destination: text('destination'),
  destinationType: text('destination_type'),
  options: jsonb('options').default({}).notNull(),
  resultUrl: text('result_url'),
  errorMessage: text('error_message'),
  progress: integer('progress').default(0).notNull(),
  startedAt: timestamp('started_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  metadata: jsonb('metadata').default({}).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  artifactIdx: index('export_jobs_artifact_id_idx').on(table.artifactId),
  requestedByIdx: index('export_jobs_requested_by_idx').on(table.requestedBy),
  statusIdx: index('export_jobs_status_idx').on(table.status),
  formatIdx: index('export_jobs_format_idx').on(table.format),
  createdIdx: index('export_jobs_created_at_idx').on(table.createdAt),
}));

export const oauthTokens = pgTable('oauth_tokens', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  provider: oauthProviderEnum('provider').notNull(),
  providerUserId: text('provider_user_id').notNull(),
  accessToken: text('access_token').notNull(),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  tokenType: text('token_type').default('Bearer').notNull(),
  scope: text('scope'),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  refreshExpiresAt: timestamp('refresh_expires_at', { withTimezone: true }),
  isActive: boolean('is_active').default(true).notNull(),
  metadata: jsonb('metadata').default({}).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userIdx: index('oauth_tokens_user_id_idx').on(table.userId),
  providerIdx: index('oauth_tokens_provider_idx').on(table.provider),
  providerUserIdx: uniqueIndex('oauth_tokens_provider_user_idx').on(table.provider, table.providerUserId),
  activeIdx: index('oauth_tokens_active_idx').on(table.isActive),
  expiresIdx: index('oauth_tokens_expires_at_idx').on(table.expiresAt),
}));

// Need to import users
import { users } from './users';

export type GeneratedArtifact = typeof generatedArtifacts.$inferSelect;
export type NewGeneratedArtifact = typeof generatedArtifacts.$inferInsert;
export type ExportJob = typeof exportJobs.$inferSelect;
export type NewExportJob = typeof exportJobs.$inferInsert;
export type OAuthToken = typeof oauthTokens.$inferSelect;
export type NewOAuthToken = typeof oauthTokens.$inferInsert;