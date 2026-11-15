import { pgTable, uuid, text, timestamp, boolean, pgEnum, index, uniqueIndex, integer, jsonb } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { classes, tutorConfigs } from './classes';
import { students, teachers } from './users';

export const sessionStatusEnum = pgEnum('session_status', ['active', 'paused', 'completed', 'abandoned', 'error']);
export const messageRoleEnum = pgEnum('message_role', ['user', 'assistant', 'system', 'tool']);

export const tutorSessions = pgTable('tutor_sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  classId: uuid('class_id').notNull().references(() => classes.id, { onDelete: 'cascade' }),
  studentId: uuid('student_id').notNull().references(() => students.id, { onDelete: 'cascade' }),
  tutorConfigId: uuid('tutor_config_id').notNull().references(() => tutorConfigs.id, { onDelete: 'cascade' }),
  status: sessionStatusEnum('status').default('active').notNull(),
  title: text('title'),
  learningObjectives: text('learning_objectives').array().default(sql`'{}'::text[]`).notNull(),
  startedAt: timestamp('started_at', { withTimezone: true }).defaultNow().notNull(),
  endedAt: timestamp('ended_at', { withTimezone: true }),
  pausedAt: timestamp('paused_at', { withTimezone: true }),
  totalDurationSeconds: integer('total_duration_seconds').default(0).notNull(),
  messageCount: integer('message_count').default(0).notNull(),
  tokenUsage: jsonb('token_usage').default({}).notNull(), // { prompt, completion, total, cost }
  metadata: jsonb('metadata').default({}).notNull(), // Session metadata, context, etc.
  summary: text('summary'), // AI-generated session summary
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  classIdx: index('tutor_sessions_class_id_idx').on(table.classId),
  studentIdx: index('tutor_sessions_student_id_idx').on(table.studentId),
  configIdx: index('tutor_sessions_tutor_config_id_idx').on(table.tutorConfigId),
  statusIdx: index('tutor_sessions_status_idx').on(table.status),
  startedIdx: index('tutor_sessions_started_at_idx').on(table.startedAt),
  classStudentIdx: index('tutor_sessions_class_student_idx').on(table.classId, table.studentId),
}));

export const messages = pgTable('messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  sessionId: uuid('session_id').notNull().references(() => tutorSessions.id, { onDelete: 'cascade' }),
  role: messageRoleEnum('role').notNull(),
  content: text('content').notNull(),
  contentType: text('content_type').default('text').notNull(), // text, markdown, html, json
  sequence: integer('sequence').notNull(), // Order in conversation
  toolCalls: jsonb('tool_calls').default([]).notNull(), // [{ id, name, arguments, result }]
  toolResults: jsonb('tool_results').default([]).notNull(), // [{ tool_call_id, content, error }]
  metadata: jsonb('metadata').default({}).notNull(), // { model, tokens, latency, finish_reason, etc. }
  embedding: text('embedding'), // Vector embedding as JSON string (pgvector stores separately)
  isEdited: boolean('is_edited').default(false).notNull(),
  editedAt: timestamp('edited_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  sessionIdx: index('messages_session_id_idx').on(table.sessionId),
  roleIdx: index('messages_role_idx').on(table.role),
  sequenceIdx: index('messages_sequence_idx').on(table.sessionId, table.sequence),
  createdIdx: index('messages_created_at_idx').on(table.createdAt),
}));

export const sessionSummaries = pgTable('session_summaries', {
  id: uuid('id').defaultRandom().primaryKey(),
  sessionId: uuid('session_id').notNull().unique().references(() => tutorSessions.id, { onDelete: 'cascade' }),
  studentId: uuid('student_id').notNull().references(() => students.id, { onDelete: 'cascade' }),
  classId: uuid('class_id').notNull().references(() => classes.id, { onDelete: 'cascade' }),
  summary: text('summary').notNull(),
  keyTopics: text('key_topics').array().default(sql`'{}'::text[]`).notNull(),
  learningProgress: jsonb('learning_progress').default({}).notNull(), // { objectiveId: progress }
  misconceptions: text('misconceptions').array().default(sql`'{}'::text[]`).notNull(),
  strengths: text('strengths').array().default(sql`'{}'::text[]`).notNull(),
  areasForImprovement: text('areas_for_improvement').array().default(sql`'{}'::text[]`).notNull(),
  engagementScore: integer('engagement_score'), // 1-100
  messageCount: integer('message_count').notNull(),
  durationSeconds: integer('duration_seconds').notNull(),
  tokenUsage: jsonb('token_usage').default({}).notNull(),
  generatedAt: timestamp('generated_at', { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  sessionIdx: uniqueIndex('session_summaries_session_id_idx').on(table.sessionId),
  studentIdx: index('session_summaries_student_id_idx').on(table.studentId),
  classIdx: index('session_summaries_class_id_idx').on(table.classId),
  generatedIdx: index('session_summaries_generated_at_idx').on(table.generatedAt),
}));

export type TutorSession = typeof tutorSessions.$inferSelect;
export type NewTutorSession = typeof tutorSessions.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
export type SessionSummary = typeof sessionSummaries.$inferSelect;
export type NewSessionSummary = typeof sessionSummaries.$inferInsert;