import { pgTable, uuid, text, timestamp, pgEnum, index, uniqueIndex, integer, jsonb, customType } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { messages, tutorSessions } from './sessions';
import { classes } from './classes';
import { students, teachers } from './users';

// ============================================================================
// CUSTOM VECTOR TYPE FOR PGVECTOR
// ============================================================================

/**
 * Custom Drizzle type for pgvector vectors with 1536 dimensions
 * Maps to PostgreSQL's vector(1536) type
 */
const vector1536 = customType<{ data: number[]; driverData: string }>({
  dataType() { return 'vector(1536)'; },
  toDriver(value: number[]) { return `[${value.join(',')}]`; },
  fromDriver(value: unknown) { return JSON.parse(value as string) as number[]; },
});

// ============================================================================
// ENUMS
// ============================================================================

export const embeddingModelProviderEnum = pgEnum('embedding_model_provider', ['openai', 'anthropic', 'google', 'mistral', 'neon']);
export const embeddingTypeEnum = pgEnum('embedding_type', ['misconception', 'strength', 'learning_style', 'progress_summary', 'work_sample']);
export const knowledgeSourceTypeEnum = pgEnum('knowledge_source_type', ['standard', 'textbook', 'lesson_plan', 'worksheet', 'web_page', 'custom']);
export const artifactContentTypeEnum = pgEnum('artifact_content_type', ['title', 'description', 'full_content', 'summary']);
export const embeddingJobStatusEnum = pgEnum('embedding_job_status', ['pending', 'processing', 'completed', 'failed']);

// ============================================================================
// MESSAGE EMBEDDINGS TABLE
// ============================================================================

/**
 * Message Embeddings Table
 * Stores embeddings for semantic search on conversation history
 */
export const messageEmbeddings = pgTable('message_embeddings', {
  id: uuid('id').defaultRandom().primaryKey(),
  messageId: uuid('message_id').notNull().references(() => messages.id, { onDelete: 'cascade' }),
  sessionId: uuid('session_id').notNull().references(() => tutorSessions.id, { onDelete: 'cascade' }),
  studentId: uuid('student_id').notNull().references(() => students.id, { onDelete: 'cascade' }),
  classId: uuid('class_id').notNull().references(() => classes.id, { onDelete: 'cascade' }),
  
  // Embedding vector (1536 dimensions for OpenAI text-embedding-3-small / Neon models)
  embedding: vector1536('embedding').notNull(),
  
  // Model info
  modelProvider: embeddingModelProviderEnum('model_provider').notNull(),
  modelName: text('model_name').notNull(),
  dimensions: integer('dimensions').notNull().default(1536),
  
  // Chunking info (for long messages split into chunks)
  chunkIndex: integer('chunk_index').notNull().default(0),
  chunkCount: integer('chunk_count').notNull().default(1),
  chunkText: text('chunk_text'),
  
  // Metadata
  metadata: jsonb('metadata').default({}).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  sessionIdx: index('idx_message_embeddings_session').on(table.sessionId),
  studentIdx: index('idx_message_embeddings_student').on(table.studentId),
  classIdx: index('idx_message_embeddings_class').on(table.classId),
  modelIdx: index('idx_message_embeddings_model').on(table.modelProvider, table.modelName),
  createdIdx: index('idx_message_embeddings_created').on(table.createdAt),
  uniqueChunk: uniqueIndex('unique_message_chunk').on(table.messageId, table.chunkIndex),
}));

// ============================================================================
// ARTIFACT EMBEDDINGS TABLE
// ============================================================================

/**
 * Artifact Embeddings Table
 * Stores embeddings for generated artifacts for semantic search/recommendation
 */
export const artifactEmbeddings = pgTable('artifact_embeddings', {
  id: uuid('id').defaultRandom().primaryKey(),
  artifactId: uuid('artifact_id').notNull(),
  classId: uuid('class_id').notNull().references(() => classes.id, { onDelete: 'cascade' }),
  teacherId: uuid('teacher_id').notNull().references(() => teachers.id, { onDelete: 'cascade' }),
  
  embedding: vector1536('embedding').notNull(),
  
  modelProvider: embeddingModelProviderEnum('model_provider').notNull(),
  modelName: text('model_name').notNull(),
  dimensions: integer('dimensions').notNull().default(1536),
  
  contentType: artifactContentTypeEnum('content_type').notNull(),
  contentText: text('content_text'),
  
  metadata: jsonb('metadata').default({}).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  classIdx: index('idx_artifact_embeddings_class').on(table.classId),
  teacherIdx: index('idx_artifact_embeddings_teacher').on(table.teacherId),
  typeIdx: index('idx_artifact_embeddings_type').on(table.contentType),
  uniqueContent: uniqueIndex('unique_artifact_content_type').on(table.artifactId, table.contentType),
}));

// ============================================================================
// KNOWLEDGE BASE EMBEDDINGS TABLE
// ============================================================================

/**
 * Knowledge Base Embeddings Table
 * For RAG - stores embeddings of curriculum documents, textbooks, standards, etc.
 */
export const knowledgeEmbeddings = pgTable('knowledge_embeddings', {
  id: uuid('id').defaultRandom().primaryKey(),
  collectionName: text('collection_name').notNull(),
  sourceId: text('source_id').notNull(),
  sourceType: knowledgeSourceTypeEnum('source_type').notNull(),
  
  embedding: vector1536('embedding').notNull(),
  
  modelProvider: embeddingModelProviderEnum('model_provider').notNull(),
  modelName: text('model_name').notNull(),
  dimensions: integer('dimensions').notNull().default(1536),
  
  title: text('title'),
  contentText: text('content_text').notNull(),
  chunkIndex: integer('chunk_index').notNull().default(0),
  chunkCount: integer('chunk_count').notNull().default(1),
  
  subject: text('subject'),
  gradeLevel: integer('grade_level'),
  curriculumStandard: text('curriculum_standard'),
  language: text('language').default('en').notNull(),
  tags: text('tags').array().default(sql`'{}'::text[]`).notNull(),
  
  metadata: jsonb('metadata').default({}).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  collectionIdx: index('idx_knowledge_embeddings_collection').on(table.collectionName),
  subjectGradeIdx: index('idx_knowledge_embeddings_subject_grade').on(table.subject, table.gradeLevel),
  standardIdx: index('idx_knowledge_embeddings_standard').on(table.curriculumStandard),
  tagsIdx: index('idx_knowledge_embeddings_tags').on(table.tags),
  sourceIdx: index('idx_knowledge_embeddings_source').on(table.sourceType, table.sourceId),
  hybridIdx: index('idx_knowledge_embeddings_hybrid').on(table.collectionName, table.subject, table.gradeLevel, table.language),
  uniqueChunk: uniqueIndex('unique_knowledge_chunk').on(table.collectionName, table.sourceId, table.chunkIndex),
}));

// ============================================================================
// STUDENT LEARNING EMBEDDINGS TABLE
// ============================================================================

/**
 * Student Learning Embeddings Table
 * Stores embeddings of student work, misconceptions, learning patterns for personalization
 */
export const studentLearningEmbeddings = pgTable('student_learning_embeddings', {
  id: uuid('id').defaultRandom().primaryKey(),
  studentId: uuid('student_id').notNull().references(() => students.id, { onDelete: 'cascade' }),
  classId: uuid('class_id').notNull().references(() => classes.id, { onDelete: 'cascade' }),
  sessionId: uuid('session_id').references(() => tutorSessions.id, { onDelete: 'set null' }),
  
  embedding: vector1536('embedding').notNull(),
  
  modelProvider: embeddingModelProviderEnum('model_provider').notNull(),
  modelName: text('model_name').notNull(),
  dimensions: integer('dimensions').notNull().default(1536),
  
  embeddingType: embeddingTypeEnum('embedding_type').notNull(),
  
  sourceText: text('source_text').notNull(),
  relatedMessageIds: uuid('related_message_ids').array().default(sql`'{}'::uuid[]`).notNull(),
  relatedInterventionIds: uuid('related_intervention_ids').array().default(sql`'{}'::uuid[]`).notNull(),
  
  topic: text('topic'),
  difficultyLevel: integer('difficulty_level'),
  confidenceScore: integer('confidence_score'), // Store as integer (0-100) for precision
  metadata: jsonb('metadata').default({}).notNull(),
  
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  studentTypeIdx: index('idx_student_learning_embeddings_student').on(table.studentId, table.embeddingType),
  classTypeIdx: index('idx_student_learning_embeddings_class').on(table.classId, table.embeddingType),
  typeIdx: index('idx_student_learning_embeddings_type').on(table.embeddingType),
  topicIdx: index('idx_student_learning_embeddings_topic').on(table.topic),
}));

// ============================================================================
// EMBEDDING JOBS TABLE
// ============================================================================

export const embeddingJobs = pgTable('embedding_jobs', {
  id: uuid('id').defaultRandom().primaryKey(),
  messageId: uuid('message_id').references(() => messages.id, { onDelete: 'cascade' }),
  artifactId: uuid('artifact_id'),
  knowledgeId: uuid('knowledge_id').references(() => knowledgeEmbeddings.id, { onDelete: 'cascade' }),
  studentLearningId: uuid('student_learning_id').references(() => studentLearningEmbeddings.id, { onDelete: 'cascade' }),
  
  modelProvider: embeddingModelProviderEnum('model_provider').notNull(),
  modelName: text('model_name').notNull(),
  targetDimensions: integer('target_dimensions').default(1536).notNull(),
  
  chunkText: text('chunk_text'),
  chunkIndex: integer('chunk_index').default(0).notNull(),
  chunkCount: integer('chunk_count').default(1).notNull(),
  
  status: embeddingJobStatusEnum('status').default('pending').notNull(),
  priority: integer('priority').default(0).notNull(),
  errorMessage: text('error_message'),
  attempts: integer('attempts').default(0).notNull(),
  maxAttempts: integer('max_attempts').default(3).notNull(),
  
  scheduledAt: timestamp('scheduled_at', { withTimezone: true }).defaultNow().notNull(),
  startedAt: timestamp('started_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  queueIdx: index('idx_embedding_jobs_queue').on(table.status, table.priority, table.scheduledAt),
  messageIdx: index('idx_embedding_jobs_message').on(table.messageId),
  artifactIdx: index('idx_embedding_jobs_artifact').on(table.artifactId),
  knowledgeIdx: index('idx_embedding_jobs_knowledge').on(table.knowledgeId),
  studentLearningIdx: index('idx_embedding_jobs_student_learning').on(table.studentLearningId),
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type MessageEmbedding = typeof messageEmbeddings.$inferSelect;
export type NewMessageEmbedding = typeof messageEmbeddings.$inferInsert;

export type ArtifactEmbedding = typeof artifactEmbeddings.$inferSelect;
export type NewArtifactEmbedding = typeof artifactEmbeddings.$inferInsert;

export type KnowledgeEmbedding = typeof knowledgeEmbeddings.$inferSelect;
export type NewKnowledgeEmbedding = typeof knowledgeEmbeddings.$inferInsert;

export type StudentLearningEmbedding = typeof studentLearningEmbeddings.$inferSelect;
export type NewStudentLearningEmbedding = typeof studentLearningEmbeddings.$inferInsert;

export type EmbeddingJob = typeof embeddingJobs.$inferSelect;
export type NewEmbeddingJob = typeof embeddingJobs.$inferInsert;