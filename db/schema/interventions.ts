import { pgTable, uuid, text, timestamp, boolean, pgEnum, index, uniqueIndex, integer, jsonb } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { tutorSessions, messages } from './sessions';
import { students, teachers } from './users';
import { classes } from './classes';

export const interventionTypeEnum = pgEnum('intervention_type', [
  'misconception',
  'off_topic',
  'frustration',
  'disengagement',
  'inappropriate_content',
  'learning_gap',
  'pace_too_fast',
  'pace_too_slow',
  'technical_issue',
  'custom'
]);

export const interventionSeverityEnum = pgEnum('intervention_severity', ['low', 'medium', 'high', 'critical']);
export const interventionStatusEnum = pgEnum('intervention_status', ['pending', 'acknowledged', 'resolved', 'dismissed', 'escalated']);
export const interventionActionEnum = pgEnum('intervention_action', [
  'notify_teacher',
  'adjust_difficulty',
  'change_approach',
  'provide_hint',
  'review_prerequisites',
  'schedule_check_in',
  'parent_notification',
  'counselor_referral',
  'content_filter',
  'session_pause',
  'custom'
]);

export const interventions = pgTable('interventions', {
  id: uuid('id').defaultRandom().primaryKey(),
  sessionId: uuid('session_id').notNull().references(() => tutorSessions.id, { onDelete: 'cascade' }),
  studentId: uuid('student_id').notNull().references(() => students.id, { onDelete: 'cascade' }),
  classId: uuid('class_id').notNull().references(() => classes.id, { onDelete: 'cascade' }),
  teacherId: uuid('teacher_id').references(() => teachers.id, { onDelete: 'set null' }),
  messageId: uuid('message_id').references(() => messages.id, { onDelete: 'set null' }),
  type: interventionTypeEnum('type').notNull(),
  severity: interventionSeverityEnum('severity').default('medium').notNull(),
  status: interventionStatusEnum('status').default('pending').notNull(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  evidence: jsonb('evidence').default({}).notNull(), // { messageIds, patterns, metrics }
  suggestedActions: interventionActionEnum('suggested_actions').array().default(sql`'{}'::intervention_action[]`).notNull(),
  teacherNotes: text('teacher_notes'),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  resolvedBy: uuid('resolved_by').references(() => teachers.id, { onDelete: 'set null' }),
  metadata: jsonb('metadata').default({}).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  sessionIdx: index('interventions_session_id_idx').on(table.sessionId),
  studentIdx: index('interventions_student_id_idx').on(table.studentId),
  classIdx: index('interventions_class_id_idx').on(table.classId),
  teacherIdx: index('interventions_teacher_id_idx').on(table.teacherId),
  typeIdx: index('interventions_type_idx').on(table.type),
  severityIdx: index('interventions_severity_idx').on(table.severity),
  statusIdx: index('interventions_status_idx').on(table.status),
  messageIdx: index('interventions_message_id_idx').on(table.messageId),
  createdIdx: index('interventions_created_at_idx').on(table.createdAt),
  studentStatusIdx: index('interventions_student_status_idx').on(table.studentId, table.status),
}));

export const interventionActions = pgTable('intervention_actions', {
  id: uuid('id').defaultRandom().primaryKey(),
  interventionId: uuid('intervention_id').notNull().references(() => interventions.id, { onDelete: 'cascade' }),
  action: interventionActionEnum('action').notNull(),
  description: text('description').notNull(),
  performedBy: uuid('performed_by').references(() => teachers.id, { onDelete: 'set null' }),
  performedAt: timestamp('performed_at', { withTimezone: true }).defaultNow().notNull(),
  result: text('result'),
  metadata: jsonb('metadata').default({}).notNull(),
}, (table) => ({
  interventionIdx: index('intervention_actions_intervention_id_idx').on(table.interventionId),
  performedByIdx: index('intervention_actions_performed_by_idx').on(table.performedBy),
}));

export type Intervention = typeof interventions.$inferSelect;
export type NewIntervention = typeof interventions.$inferInsert;
export type InterventionAction = typeof interventionActions.$inferSelect;
export type NewInterventionAction = typeof interventionActions.$inferInsert;