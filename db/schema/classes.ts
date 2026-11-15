import { pgTable, uuid, text, timestamp, boolean, pgEnum, index, uniqueIndex, integer, jsonb } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { schools } from './tenants';
import { teachers, students } from './users';

export const classStatusEnum = pgEnum('class_status', ['active', 'archived', 'draft']);
export const termEnum = pgEnum('term', ['fall', 'spring', 'summer', 'year', 'quarter1', 'quarter2', 'quarter3', 'quarter4']);

export const classes = pgTable('classes', {
  id: uuid('id').defaultRandom().primaryKey(),
  schoolId: uuid('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  teacherId: uuid('teacher_id').notNull().references(() => teachers.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  subject: text('subject').notNull(),
  gradeLevel: integer('grade_level').notNull(),
  term: termEnum('term').notNull(),
  year: integer('year').notNull(),
  status: classStatusEnum('status').default('draft').notNull(),
  schedule: jsonb('schedule').default({}).notNull(), // { days: [], startTime, endTime, timezone }
  room: text('room'),
  maxStudents: integer('max_students').default(30).notNull(),
  settings: jsonb('settings').default({}).notNull(), // Class-specific settings
  ltiContextId: text('lti_context_id'), // LTI context for this class
  ltiResourceLinkId: text('lti_resource_link_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
}, (table) => ({
  schoolIdx: index('classes_school_id_idx').on(table.schoolId),
  teacherIdx: index('classes_teacher_id_idx').on(table.teacherId),
  statusIdx: index('classes_status_idx').on(table.status),
  termYearIdx: index('classes_term_year_idx').on(table.term, table.year),
  ltiContextIdx: index('classes_lti_context_id_idx').on(table.ltiContextId),
  uniqueClass: uniqueIndex('classes_unique_idx').on(table.schoolId, table.name, table.term, table.year),
}));

export const classStudents = pgTable('class_students', {
  id: uuid('id').defaultRandom().primaryKey(),
  classId: uuid('class_id').notNull().references(() => classes.id, { onDelete: 'cascade' }),
  studentId: uuid('student_id').notNull().references(() => students.id, { onDelete: 'cascade' }),
  enrolledAt: timestamp('enrolled_at', { withTimezone: true }).defaultNow().notNull(),
  droppedAt: timestamp('dropped_at', { withTimezone: true }),
  isActive: boolean('is_active').default(true).notNull(),
  seatNumber: integer('seat_number'),
  notes: text('notes'),
}, (table) => ({
  classIdx: index('class_students_class_id_idx').on(table.classId),
  studentIdx: index('class_students_student_id_idx').on(table.studentId),
  activeIdx: index('class_students_active_idx').on(table.isActive),
  uniqueEnrollment: uniqueIndex('class_students_unique_idx').on(table.classId, table.studentId),
}));

// Tutor Configuration - JSONB with typed interface
export interface TutorConfig {
  // Model settings
  model: {
    provider: 'openai' | 'anthropic' | 'google' | 'mistral' | 'neon';
    modelName: string;
    temperature: number;
    maxTokens: number;
    topP: number;
  };
  
  // System prompt customization
  systemPrompt: {
    base: string;
    subjectSpecific: string;
    gradeLevelAdjustments: string;
    customInstructions: string;
  };
  
  // Pedagogical settings
  pedagogy: {
    scaffoldingLevel: 'minimal' | 'moderate' | 'heavy';
    questionStyle: 'socratic' | 'direct' | 'guided' | 'adaptive';
    feedbackFrequency: 'immediate' | 'periodic' | 'end_of_session';
    encourageMetacognition: boolean;
    allowStruggleTime: number; // seconds before intervening
  };
  
  // Content settings
  content: {
    allowedTopics: string[];
    blockedTopics: string[];
    curriculumAlignment: string[]; // Standards codes
    difficultyRange: { min: number; max: number }; // 1-10
    language: string;
    enableMultiLanguage: boolean;
  };
  
  // Tool settings
  tools: {
    enableCalculator: boolean;
    enableCodeExecution: boolean;
    enableWebSearch: boolean;
    enableImageGeneration: boolean;
    enableRAG: boolean;
    ragCollections: string[]; // Collection names for RAG
    customTools: string[]; // Custom tool identifiers
  };
  
  // Session settings
  session: {
    maxDurationMinutes: number;
    maxMessagesPerSession: number;
    autoSummarize: boolean;
    summaryIntervalMinutes: number;
    requireLearningObjectives: boolean;
  };
  
  // Safety settings
  safety: {
    contentFilterLevel: 'strict' | 'moderate' | 'permissive';
    piiDetection: boolean;
    profanityFilter: boolean;
    escalationKeywords: string[];
    requireHumanReview: boolean;
  };
  
  // Analytics settings
  analytics: {
    trackEngagement: boolean;
    trackLearningProgress: boolean;
    trackMisconceptions: boolean;
    generateInsights: boolean;
    insightFrequency: 'session' | 'daily' | 'weekly';
  };
}

export const tutorConfigs = pgTable('tutor_configs', {
  id: uuid('id').defaultRandom().primaryKey(),
  classId: uuid('class_id').notNull().unique().references(() => classes.id, { onDelete: 'cascade' }),
  config: jsonb('config').notNull().$type<TutorConfig>(),
  version: integer('version').default(1).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdBy: uuid('created_by').notNull().references(() => teachers.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  classIdx: uniqueIndex('tutor_configs_class_id_idx').on(table.classId),
  activeIdx: index('tutor_configs_active_idx').on(table.isActive),
}));

export type Class = typeof classes.$inferSelect;
export type NewClass = typeof classes.$inferInsert;
export type ClassStudent = typeof classStudents.$inferSelect;
export type NewClassStudent = typeof classStudents.$inferInsert;
// TutorConfig type is already exported as interface above
export type TutorConfigTable = typeof tutorConfigs.$inferSelect;
export type NewTutorConfig = typeof tutorConfigs.$inferInsert;