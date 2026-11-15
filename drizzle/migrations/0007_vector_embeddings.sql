-- Custom SQL migration file, put your code below! --

-- ============================================================================
-- M4 WS1 — Database Schema + pgvector Migrations
-- ============================================================================

-- pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================================
-- MESSAGE EMBEDDINGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS message_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES tutor_sessions(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    
    -- Embedding vector (1536 dimensions for OpenAI text-embedding-3-small / Neon models)
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
    metadata JSONB DEFAULT '{}'::jsonb NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_message_chunk UNIQUE (message_id, chunk_index)
);

-- HNSW index for vector similarity search
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

-- ============================================================================
-- ARTIFACT EMBEDDINGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS artifact_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    artifact_id UUID NOT NULL,
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    
    embedding VECTOR(1536) NOT NULL,
    
    model_provider TEXT NOT NULL,
    model_name TEXT NOT NULL,
    dimensions INTEGER NOT NULL DEFAULT 1536,
    
    -- What part of the artifact was embedded
    content_type TEXT NOT NULL, -- 'title', 'description', 'full_content', 'summary'
    content_text TEXT, -- The text that was embedded
    
    metadata JSONB DEFAULT '{}'::jsonb NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT unique_artifact_content_type UNIQUE (artifact_id, content_type)
);

-- HNSW index for fast similarity search
CREATE INDEX IF NOT EXISTS idx_artifact_embeddings_vector_hnsw 
ON artifact_embeddings 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Filter indexes
CREATE INDEX IF NOT EXISTS idx_artifact_embeddings_class ON artifact_embeddings (class_id);
CREATE INDEX IF NOT EXISTS idx_artifact_embeddings_teacher ON artifact_embeddings (teacher_id);
CREATE INDEX IF NOT EXISTS idx_artifact_embeddings_type ON artifact_embeddings (content_type);

-- ============================================================================
-- KNOWLEDGE BASE EMBEDDINGS TABLE
-- ============================================================================

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
    language TEXT DEFAULT 'en' NOT NULL,
    tags TEXT[] DEFAULT '{}',
    
    metadata JSONB DEFAULT '{}'::jsonb NOT NULL,
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

-- ============================================================================
-- STUDENT LEARNING EMBEDDINGS TABLE
-- ============================================================================

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
    metadata JSONB DEFAULT '{}'::jsonb NOT NULL,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- HNSW index for fast similarity search
CREATE INDEX IF NOT EXISTS idx_student_learning_embeddings_vector_hnsw 
ON student_learning_embeddings 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

CREATE INDEX IF NOT EXISTS idx_student_learning_embeddings_student ON student_learning_embeddings (student_id, embedding_type);
CREATE INDEX IF NOT EXISTS idx_student_learning_embeddings_class ON student_learning_embeddings (class_id, embedding_type);
CREATE INDEX IF NOT EXISTS idx_student_learning_embeddings_type ON student_learning_embeddings (embedding_type);
CREATE INDEX IF NOT EXISTS idx_student_learning_embeddings_topic ON student_learning_embeddings (topic);

-- ============================================================================
-- EMBEDDING JOBS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS embedding_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
    artifact_id UUID,
    knowledge_id UUID REFERENCES knowledge_embeddings(id) ON DELETE CASCADE,
    student_learning_id UUID REFERENCES student_learning_embeddings(id) ON DELETE CASCADE,
    
    model_provider TEXT NOT NULL,
    model_name TEXT NOT NULL,
    target_dimensions INTEGER DEFAULT 1536 NOT NULL,
    
    -- For chunking
    chunk_text TEXT,
    chunk_index INTEGER DEFAULT 0 NOT NULL,
    chunk_count INTEGER DEFAULT 1 NOT NULL,
    
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    priority INTEGER DEFAULT 0 NOT NULL,
    error_message TEXT,
    attempts INTEGER DEFAULT 0 NOT NULL,
    max_attempts INTEGER DEFAULT 3 NOT NULL,
    
    scheduled_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
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

-- ============================================================================
-- HYBRID SEARCH FUNCTIONS
-- ============================================================================

-- Search messages with vector similarity + metadata filters
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

-- Search knowledge base with curriculum filters
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

-- Find similar student learning patterns
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

-- Search artifacts by semantic similarity
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