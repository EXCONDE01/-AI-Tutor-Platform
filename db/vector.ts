import { sql } from 'drizzle-orm';
import { pgTable, uuid, text, timestamp, boolean, pgEnum, index, uniqueIndex, integer, jsonb, customType } from 'drizzle-orm/pg-core';

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

/**
 * pgvector Setup for AI Tutor Platform
 * 
 * This module provides the SQL migrations and utilities for vector embeddings
 * used in RAG (Retrieval-Augmented Generation) and semantic search.
 * 
 * Requirements:
 * - PostgreSQL with pgvector extension (version 0.5.0+)
 * - Neon Postgres supports pgvector natively
 */

// ============================================================================
// DRIZZLE TABLE DEFINITIONS FOR VECTOR EMBEDDINGS
// ============================================================================

export const embeddingModelProviderEnum = pgEnum('embedding_model_provider', ['openai', 'anthropic', 'google', 'mistral', 'neon']);
export const embeddingTypeEnum = pgEnum('embedding_type', ['misconception', 'strength', 'learning_style', 'progress_summary', 'work_sample']);
export const knowledgeSourceTypeEnum = pgEnum('knowledge_source_type', ['standard', 'textbook', 'lesson_plan', 'worksheet', 'web_page', 'custom']);
export const artifactContentTypeEnum = pgEnum('artifact_content_type', ['title', 'description', 'full_content', 'summary']);
export const embeddingJobStatusEnum = pgEnum('embedding_job_status', ['pending', 'processing', 'completed', 'failed']);
export const embeddingJobTargetTypeEnum = pgEnum('embedding_job_target_type', ['message', 'artifact', 'knowledge', 'student_learning']);

/**
 * Message Embeddings Table
 * Stores embeddings for semantic search on conversation history
 */
const messageEmbeddingsTable = pgTable('message_embeddings', {
  id: uuid('id').defaultRandom().primaryKey(),
  messageId: uuid('message_id').notNull(),
  sessionId: uuid('session_id').notNull(),
  studentId: uuid('student_id').notNull(),
  classId: uuid('class_id').notNull(),
  
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

export const messageEmbeddings = messageEmbeddingsTable;

/**
 * Artifact Embeddings Table
 * Stores embeddings for generated artifacts for semantic search/recommendation
 */
export const artifactEmbeddings = pgTable('artifact_embeddings', {
  id: uuid('id').defaultRandom().primaryKey(),
  artifactId: uuid('artifact_id').notNull(),
  classId: uuid('class_id').notNull(),
  teacherId: uuid('teacher_id').notNull(),
  
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

/**
 * Student Learning Embeddings Table
 * Stores embeddings of student work, misconceptions, learning patterns for personalization
 */
export const studentLearningEmbeddings = pgTable('student_learning_embeddings', {
  id: uuid('id').defaultRandom().primaryKey(),
  studentId: uuid('student_id').notNull(),
  classId: uuid('class_id').notNull(),
  sessionId: uuid('session_id'),
  
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

export const embeddingJobs = pgTable('embedding_jobs', {
  id: uuid('id').defaultRandom().primaryKey(),
  messageId: uuid('message_id'),
  artifactId: uuid('artifact_id'),
  knowledgeId: uuid('knowledge_id'),
  studentLearningId: uuid('student_learning_id'),
  
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
// EXTENSION SETUP
// ============================================================================

export const vectorExtensionSetup = `
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Verify installation
SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';
`;

// ============================================================================
// VECTOR TABLES
// ============================================================================

/**
 * Message Embeddings Table
 * Stores embeddings for semantic search on conversation history
 */
export const createMessageEmbeddingsTable = `
CREATE TABLE IF NOT EXISTS message_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES tutor_sessions(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    
    -- Embedding vector (dimensions depend on model: 1536 for OpenAI text-embedding-3-small, 3072 for 3-large)
    embedding VECTOR(1536) NOT NULL,
    
    -- Model info
    model_provider TEXT NOT NULL, -- 'openai', 'anthropic', 'google', 'mistral', 'neon'
    model_name TEXT NOT NULL,     -- 'text-embedding-3-small', 'text-embedding-ada-002', etc.
    dimensions INTEGER NOT NULL DEFAULT 1536,
    
    -- Chunking info (for long messages split into chunks)
    chunk_index INTEGER NOT NULL DEFAULT 0,
    chunk_count INTEGER NOT NULL DEFAULT 1,
    chunk_text TEXT, -- The text chunk that was embedded
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_message_chunk UNIQUE (message_id, chunk_index)
);

-- Indexes for vector similarity search
CREATE INDEX IF NOT EXISTS idx_message_embeddings_vector_hnsw 
ON message_embeddings 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Filter indexes for hybrid search
CREATE INDEX IF NOT EXISTS idx_message_embeddings_session ON message_embeddings (session_id);
CREATE INDEX IF NOT EXISTS idx_message_embeddings_student ON message_embeddings (student_id);
CREATE INDEX IF NOT EXISTS idx_message_embeddings_class ON message_embeddings (class_id);
CREATE INDEX IF NOT EXISTS idx_message_embeddings_model ON message_embeddings (model_provider, model_name);
CREATE INDEX IF NOT EXISTS idx_message_embeddings_created ON message_embeddings (created_at DESC);

-- Partial index for latest embeddings only
CREATE INDEX IF NOT EXISTS idx_message_embeddings_latest 
ON message_embeddings (session_id, chunk_index) 
WHERE chunk_index = 0;
`;

/**
 * Artifact Embeddings Table
 * Stores embeddings for generated artifacts for semantic search/recommendation
 */
export const createArtifactEmbeddingsTable = `
CREATE TABLE IF NOT EXISTS artifact_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    artifact_id UUID NOT NULL REFERENCES generated_artifacts(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    
    embedding VECTOR(1536) NOT NULL,
    
    model_provider TEXT NOT NULL,
    model_name TEXT NOT NULL,
    dimensions INTEGER NOT NULL DEFAULT 1536,
    
    -- What part of the artifact was embedded
    content_type TEXT NOT NULL, -- 'title', 'description', 'full_content', 'summary'
    content_text TEXT, -- The text that was embedded
    
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT unique_artifact_content_type UNIQUE (artifact_id, content_type)
);

CREATE INDEX IF NOT EXISTS idx_artifact_embeddings_vector_hnsw 
ON artifact_embeddings 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

CREATE INDEX IF NOT EXISTS idx_artifact_embeddings_class ON artifact_embeddings (class_id);
CREATE INDEX IF NOT EXISTS idx_artifact_embeddings_teacher ON artifact_embeddings (teacher_id);
CREATE INDEX IF NOT EXISTS idx_artifact_embeddings_type ON artifact_embeddings (content_type);
`;

/**
 * Knowledge Base Embeddings Table
 * For RAG - stores embeddings of curriculum documents, textbooks, standards, etc.
 */
export const createKnowledgeEmbeddingsTable = `
CREATE TABLE IF NOT EXISTS knowledge_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collection_name TEXT NOT NULL, -- e.g., 'common_core_math', 'ngss_science', 'custom_curriculum'
    source_id TEXT NOT NULL, -- External identifier (ISBN, standard code, document ID)
    source_type TEXT NOT NULL, -- 'standard', 'textbook', 'lesson_plan', 'worksheet', 'web_page', 'custom'
    
    embedding VECTOR(1536) NOT NULL,
    
    model_provider TEXT NOT NULL,
    model_name TEXT NOT NULL,
    dimensions INTEGER NOT NULL DEFAULT 1536,
    
    -- Content
    title TEXT,
    content_text TEXT NOT NULL, -- The chunk that was embedded
    chunk_index INTEGER NOT NULL DEFAULT 0,
    chunk_count INTEGER NOT NULL DEFAULT 1,
    
    -- Metadata for filtering
    subject TEXT,
    grade_level INTEGER,
    curriculum_standard TEXT, -- e.g., 'CCSS.MATH.CONTENT.3.OA.A.1'
    language TEXT DEFAULT 'en',
    tags TEXT[] DEFAULT '{}',
    
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT unique_knowledge_chunk UNIQUE (collection_name, source_id, chunk_index)
);

-- HNSW index for fast similarity search
CREATE INDEX IF NOT EXISTS idx_knowledge_embeddings_vector_hnsw 
ON knowledge_embeddings 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Filter indexes for hybrid search
CREATE INDEX IF NOT EXISTS idx_knowledge_embeddings_collection ON knowledge_embeddings (collection_name);
CREATE INDEX IF NOT EXISTS idx_knowledge_embeddings_subject_grade ON knowledge_embeddings (subject, grade_level);
CREATE INDEX IF NOT EXISTS idx_knowledge_embeddings_standard ON knowledge_embeddings (curriculum_standard);
CREATE INDEX IF NOT EXISTS idx_knowledge_embeddings_tags ON knowledge_embeddings USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_knowledge_embeddings_source ON knowledge_embeddings (source_type, source_id);

-- Composite filter index
CREATE INDEX IF NOT EXISTS idx_knowledge_embeddings_hybrid 
ON knowledge_embeddings (collection_name, subject, grade_level, language);
`;

/**
 * Student Learning Embeddings Table
 * Stores embeddings of student work, misconceptions, learning patterns for personalization
 */
export const createStudentLearningEmbeddingsTable = `
CREATE TABLE IF NOT EXISTS student_learning_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    session_id UUID REFERENCES tutor_sessions(id) ON DELETE SET NULL,
    
    embedding VECTOR(1536) NOT NULL,
    
    model_provider TEXT NOT NULL,
    model_name TEXT NOT NULL,
    dimensions INTEGER NOT NULL DEFAULT 1536,
    
    -- Embedding type
    embedding_type TEXT NOT NULL, -- 'misconception', 'strength', 'learning_style', 'progress_summary', 'work_sample'
    
    -- Source content
    source_text TEXT NOT NULL,
    related_message_ids UUID[] DEFAULT '{}',
    related_intervention_ids UUID[] DEFAULT '{}',
    
    -- Metadata
    topic TEXT,
    difficulty_level INTEGER, -- 1-10
    confidence_score REAL, -- 0-1
    metadata JSONB DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_student_learning_embeddings_vector_hnsw 
ON student_learning_embeddings 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

CREATE INDEX IF NOT EXISTS idx_student_learning_embeddings_student ON student_learning_embeddings (student_id, embedding_type);
CREATE INDEX IF NOT EXISTS idx_student_learning_embeddings_class ON student_learning_embeddings (class_id, embedding_type);
CREATE INDEX IF NOT EXISTS idx_student_learning_embeddings_type ON student_learning_embeddings (embedding_type);
CREATE INDEX IF NOT EXISTS idx_student_learning_embeddings_topic ON student_learning_embeddings (topic);
`;

// ============================================================================
// VECTOR SEARCH FUNCTIONS
// ============================================================================

/**
 * Hybrid search function combining vector similarity with metadata filters
 */
export const createHybridSearchFunction = `
CREATE OR REPLACE FUNCTION hybrid_search_messages(
    query_embedding VECTOR(1536),
    p_student_id UUID DEFAULT NULL,
    p_class_id UUID DEFAULT NULL,
    p_session_id UUID DEFAULT NULL,
    p_limit INTEGER DEFAULT 10,
    p_similarity_threshold REAL DEFAULT 0.7,
    p_model_provider TEXT DEFAULT NULL,
    p_model_name TEXT DEFAULT NULL
)
RETURNS TABLE (
    message_id UUID,
    session_id UUID,
    student_id UUID,
    class_id UUID,
    content_text TEXT,
    similarity REAL,
    metadata JSONB,
    created_at TIMESTAMPTZ
) LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT 
        me.message_id,
        me.session_id,
        me.student_id,
        me.class_id,
        me.chunk_text AS content_text,
        1 - (me.embedding <=> query_embedding) AS similarity,
        me.metadata,
        me.created_at
    FROM message_embeddings me
    WHERE 1 - (me.embedding <=> query_embedding) >= p_similarity_threshold
      AND (p_student_id IS NULL OR me.student_id = p_student_id)
      AND (p_class_id IS NULL OR me.class_id = p_class_id)
      AND (p_session_id IS NULL OR me.session_id = p_session_id)
      AND (p_model_provider IS NULL OR me.model_provider = p_model_provider)
      AND (p_model_name IS NULL OR me.model_name = p_model_name)
      AND me.chunk_index = 0 -- Only search primary chunks by default
    ORDER BY me.embedding <=> query_embedding
    LIMIT p_limit;
END;
$$;
`;

/**
 * Search knowledge base with curriculum filters
 */
export const createKnowledgeSearchFunction = `
CREATE OR REPLACE FUNCTION search_knowledge_base(
    query_embedding VECTOR(1536),
    p_collection_name TEXT DEFAULT NULL,
    p_subject TEXT DEFAULT NULL,
    p_grade_level INTEGER DEFAULT NULL,
    p_curriculum_standard TEXT DEFAULT NULL,
    p_tags TEXT[] DEFAULT NULL,
    p_language TEXT DEFAULT 'en',
    p_limit INTEGER DEFAULT 10,
    p_similarity_threshold REAL DEFAULT 0.7
)
RETURNS TABLE (
    id UUID,
    collection_name TEXT,
    source_id TEXT,
    source_type TEXT,
    title TEXT,
    content_text TEXT,
    subject TEXT,
    grade_level INTEGER,
    curriculum_standard TEXT,
    similarity REAL,
    metadata JSONB
) LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ke.id,
        ke.collection_name,
        ke.source_id,
        ke.source_type,
        ke.title,
        ke.content_text,
        ke.subject,
        ke.grade_level,
        ke.curriculum_standard,
        1 - (ke.embedding <=> query_embedding) AS similarity,
        ke.metadata
    FROM knowledge_embeddings ke
    WHERE 1 - (ke.embedding <=> query_embedding) >= p_similarity_threshold
      AND (p_collection_name IS NULL OR ke.collection_name = p_collection_name)
      AND (p_subject IS NULL OR ke.subject = p_subject)
      AND (p_grade_level IS NULL OR ke.grade_level = p_grade_level)
      AND (p_curriculum_standard IS NULL OR ke.curriculum_standard = p_curriculum_standard)
      AND (p_tags IS NULL OR ke.tags && p_tags)
      AND ke.language = p_language
    ORDER BY ke.embedding <=> query_embedding
    LIMIT p_limit;
END;
$$;
`;

/**
 * Find similar student learning patterns
 */
export const createStudentPatternSearchFunction = `
CREATE OR REPLACE FUNCTION find_similar_student_patterns(
    query_embedding VECTOR(1536),
    p_student_id UUID DEFAULT NULL,
    p_class_id UUID DEFAULT NULL,
    p_embedding_type TEXT DEFAULT NULL,
    p_topic TEXT DEFAULT NULL,
    p_limit INTEGER DEFAULT 5,
    p_similarity_threshold REAL DEFAULT 0.75
)
RETURNS TABLE (
    id UUID,
    student_id UUID,
    class_id UUID,
    embedding_type TEXT,
    topic TEXT,
    source_text TEXT,
    similarity REAL,
    confidence_score REAL,
    created_at TIMESTAMPTZ
) LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sle.id,
        sle.student_id,
        sle.class_id,
        sle.embedding_type,
        sle.topic,
        sle.source_text,
        1 - (sle.embedding <=> query_embedding) AS similarity,
        sle.confidence_score,
        sle.created_at
    FROM student_learning_embeddings sle
    WHERE 1 - (sle.embedding <=> query_embedding) >= p_similarity_threshold
      AND (p_student_id IS NULL OR sle.student_id = p_student_id)
      AND (p_class_id IS NULL OR sle.class_id = p_class_id)
      AND (p_embedding_type IS NULL OR sle.embedding_type = p_embedding_type)
      AND (p_topic IS NULL OR sle.topic = p_topic)
    ORDER BY sle.embedding <=> query_embedding
    LIMIT p_limit;
END;
$$;
`;

/**
 * Search artifacts by semantic similarity
 */
export const createArtifactSearchFunction = `
CREATE OR REPLACE FUNCTION search_artifacts_semantic(
    query_embedding VECTOR(1536),
    p_teacher_id UUID DEFAULT NULL,
    p_class_id UUID DEFAULT NULL,
    p_type TEXT DEFAULT NULL,
    p_status TEXT DEFAULT NULL,
    p_subject TEXT DEFAULT NULL,
    p_grade_level INTEGER DEFAULT NULL,
    p_limit INTEGER DEFAULT 10,
    p_similarity_threshold REAL DEFAULT 0.7
)
RETURNS TABLE (
    artifact_id UUID,
    class_id UUID,
    teacher_id UUID,
    type TEXT,
    title TEXT,
    content_type TEXT,
    content_text TEXT,
    similarity REAL,
    metadata JSONB
) LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ae.artifact_id,
        ae.class_id,
        ae.teacher_id,
        ga.type,
        ga.title,
        ae.content_type,
        ae.content_text,
        1 - (ae.embedding <=> query_embedding) AS similarity,
        ae.metadata
    FROM artifact_embeddings ae
    JOIN generated_artifacts ga ON ae.artifact_id = ga.id
    WHERE 1 - (ae.embedding <=> query_embedding) >= p_similarity_threshold
      AND (p_teacher_id IS NULL OR ae.teacher_id = p_teacher_id)
      AND (p_class_id IS NULL OR ae.class_id = p_class_id)
      AND (p_type IS NULL OR ga.type = p_type)
      AND (p_status IS NULL OR ga.status = p_status)
      AND (p_subject IS NULL OR ga.subject = p_subject)
      AND (p_grade_level IS NULL OR ga.grade_level = p_grade_level)
    ORDER BY ae.embedding <=> query_embedding
    LIMIT p_limit;
END;
$$;
`;

// ============================================================================
// EMBEDDING MAINTENANCE FUNCTIONS
// ============================================================================

/**
 * Trigger function to auto-generate embeddings for new messages
 * (Requires application-level embedding generation, this just shows the pattern)
 */
export const createEmbeddingTriggerFunction = `
-- This is a template - actual embedding generation should happen in application layer
-- due to API calls to embedding models

CREATE OR REPLACE FUNCTION log_embedding_request(
    p_message_id UUID,
    p_model_provider TEXT,
    p_model_name TEXT
) RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    -- Log that embedding needs to be generated
    INSERT INTO embedding_jobs (message_id, model_provider, model_name, status)
    VALUES (p_message_id, p_model_provider, p_model_name, 'pending')
    ON CONFLICT (message_id, model_provider, model_name) DO NOTHING;
    RETURN NEW;
END;
$$;

-- Embedding job queue table
CREATE TABLE IF NOT EXISTS embedding_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
    artifact_id UUID REFERENCES generated_artifacts(id) ON DELETE CASCADE,
    knowledge_id UUID REFERENCES knowledge_embeddings(id) ON DELETE CASCADE,
    model_provider TEXT NOT NULL,
    model_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    priority INTEGER DEFAULT 0,
    error_message TEXT,
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    scheduled_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT one_target CHECK (
        (message_id IS NOT NULL AND artifact_id IS NULL AND knowledge_id IS NULL) OR
        (message_id IS NULL AND artifact_id IS NOT NULL AND knowledge_id IS NULL) OR
        (message_id IS NULL AND artifact_id IS NULL AND knowledge_id IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_embedding_jobs_pending ON embedding_jobs (status, priority DESC, scheduled_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_embedding_jobs_message ON embedding_jobs (message_id) WHERE message_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_embedding_jobs_artifact ON embedding_jobs (artifact_id) WHERE artifact_id IS NOT NULL;
`;

export const createEmbeddingJobQueue = `
CREATE TABLE IF NOT EXISTS embedding_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
    artifact_id UUID REFERENCES generated_artifacts(id) ON DELETE CASCADE,
    knowledge_id UUID REFERENCES knowledge_embeddings(id) ON DELETE CASCADE,
    student_learning_id UUID REFERENCES student_learning_embeddings(id) ON DELETE CASCADE,
    
    model_provider TEXT NOT NULL,
    model_name TEXT NOT NULL,
    target_dimensions INTEGER DEFAULT 1536,
    
    -- For chunking
    chunk_text TEXT,
    chunk_index INTEGER DEFAULT 0,
    chunk_count INTEGER DEFAULT 1,
    
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    priority INTEGER DEFAULT 0,
    error_message TEXT,
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    
    scheduled_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT one_target CHECK (
        (message_id IS NOT NULL)::int + 
        (artifact_id IS NOT NULL)::int + 
        (knowledge_id IS NOT NULL)::int + 
        (student_learning_id IS NOT NULL)::int = 1
    )
);

CREATE INDEX IF NOT EXISTS idx_embedding_jobs_queue ON embedding_jobs (status, priority DESC, scheduled_at) WHERE status IN ('pending', 'processing');
CREATE INDEX IF NOT EXISTS idx_embedding_jobs_message ON embedding_jobs (message_id) WHERE message_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_embedding_jobs_artifact ON embedding_jobs (artifact_id) WHERE artifact_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_embedding_jobs_knowledge ON embedding_jobs (knowledge_id) WHERE knowledge_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_embedding_jobs_student_learning ON embedding_jobs (student_learning_id) WHERE student_learning_id IS NOT NULL;
`;

// ============================================================================
// VECTOR DIMENSION MANAGEMENT
// ============================================================================

/**
 * Migration helper to change vector dimensions
 * Use when switching embedding models with different dimensions
 */
export const changeVectorDimensions = (tableName: string, columnName: string, newDimensions: number) => `
-- Step 1: Add new column with new dimensions
ALTER TABLE ${tableName} ADD COLUMN ${columnName}_new VECTOR(${newDimensions});

-- Step 2: Backfill (requires re-embedding - do in application)
-- UPDATE ${tableName} SET ${columnName}_new = ... 

-- Step 3: Swap columns
ALTER TABLE ${tableName} DROP COLUMN ${columnName};
ALTER TABLE ${tableName} RENAME COLUMN ${columnName}_new TO ${columnName};

-- Step 4: Recreate HNSW index
DROP INDEX IF EXISTS idx_${tableName}_${columnName}_hnsw;
CREATE INDEX idx_${tableName}_${columnName}_hnsw ON ${tableName} USING hnsw (${columnName} vector_cosine_ops) WITH (m = 16, ef_construction = 64);
`;

// ============================================================================
// ALL VECTOR MIGRATIONS
// ============================================================================

export const allVectorMigrations = [
  vectorExtensionSetup,
  createMessageEmbeddingsTable,
  createArtifactEmbeddingsTable,
  createKnowledgeEmbeddingsTable,
  createStudentLearningEmbeddingsTable,
  createEmbeddingJobQueue,
  createHybridSearchFunction,
  createKnowledgeSearchFunction,
  createStudentPatternSearchFunction,
  createArtifactSearchFunction,
];

// ============================================================================
// TYPESCRIPT INTERFACES FOR APPLICATION LAYER
// ============================================================================

export interface VectorSearchOptions {
  queryEmbedding: number[];
  studentId?: string;
  classId?: string;
  sessionId?: string;
  limit?: number;
  similarityThreshold?: number;
  modelProvider?: string;
  modelName?: string;
}

export interface KnowledgeSearchOptions {
  queryEmbedding: number[];
  collectionName?: string;
  subject?: string;
  gradeLevel?: number;
  curriculumStandard?: string;
  tags?: string[];
  language?: string;
  limit?: number;
  similarityThreshold?: number;
}

export interface ArtifactSearchOptions {
  queryEmbedding: number[];
  teacherId?: string;
  classId?: string;
  type?: string;
  status?: string;
  subject?: string;
  gradeLevel?: number;
  limit?: number;
  similarityThreshold?: number;
}

export interface StudentPatternSearchOptions {
  queryEmbedding: number[];
  studentId?: string;
  classId?: string;
  embeddingType?: 'misconception' | 'strength' | 'learning_style' | 'progress_summary' | 'work_sample';
  topic?: string;
  limit?: number;
  similarityThreshold?: number;
}

export interface EmbeddingJob {
  id: string;
  messageId?: string;
  artifactId?: string;
  knowledgeId?: string;
  studentLearningId?: string;
  modelProvider: string;
  modelName: string;
  targetDimensions: number;
  chunkText?: string;
  chunkIndex: number;
  chunkCount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  priority: number;
  errorMessage?: string;
  attempts: number;
  maxAttempts: number;
  scheduledAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// EMBEDDING MODEL CONFIGURATIONS
// ============================================================================

export const EMBEDDING_MODELS = {
  'openai:text-embedding-3-small': { provider: 'openai', name: 'text-embedding-3-small', dimensions: 1536, maxTokens: 8191 },
  'openai:text-embedding-3-large': { provider: 'openai', name: 'text-embedding-3-large', dimensions: 3072, maxTokens: 8191 },
  'openai:text-embedding-ada-002': { provider: 'openai', name: 'text-embedding-ada-002', dimensions: 1536, maxTokens: 8191 },
  'neon:bge-base': { provider: 'neon', name: 'bge-base', dimensions: 768, maxTokens: 512 },
  'neon:bge-large': { provider: 'neon', name: 'bge-large', dimensions: 1024, maxTokens: 512 },
  'neon:e5-base': { provider: 'neon', name: 'e5-base', dimensions: 768, maxTokens: 512 },
  'neon:e5-large': { provider: 'neon', name: 'e5-large', dimensions: 1024, maxTokens: 512 },
} as const;

export type EmbeddingModelKey = keyof typeof EMBEDDING_MODELS;

export function getEmbeddingModelConfig(key: EmbeddingModelKey) {
  return EMBEDDING_MODELS[key];
}

export function getDefaultEmbeddingModel(): EmbeddingModelKey {
  return 'neon:bge-base'; // Default to Neon-hosted model for cost efficiency
}

// ============================================================================
// EXPORTS
// ============================================================================

export const vectorSchema = {
  migrations: allVectorMigrations,
  functions: {
    hybridSearchMessages: createHybridSearchFunction,
    searchKnowledgeBase: createKnowledgeSearchFunction,
    findSimilarStudentPatterns: createStudentPatternSearchFunction,
    searchArtifactsSemantic: createArtifactSearchFunction,
  },
  models: EMBEDDING_MODELS,
  getDefaultModel: getDefaultEmbeddingModel,
  getModelConfig: getEmbeddingModelConfig,
};