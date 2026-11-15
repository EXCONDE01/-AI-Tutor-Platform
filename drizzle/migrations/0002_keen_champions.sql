ALTER TABLE "artifact_embeddings" ALTER COLUMN "embedding" TYPE vector(1536) USING "embedding"::vector;--> statement-breakpoint
ALTER TABLE "knowledge_embeddings" ALTER COLUMN "embedding" TYPE vector(1536) USING "embedding"::vector;--> statement-breakpoint
ALTER TABLE "message_embeddings" ALTER COLUMN "embedding" TYPE vector(1536) USING "embedding"::vector;--> statement-breakpoint
ALTER TABLE "student_learning_embeddings" ALTER COLUMN "embedding" TYPE vector(1536) USING "embedding"::vector;--> statement-breakpoint

-- HNSW cosine similarity indexes for vector search
CREATE INDEX IF NOT EXISTS idx_message_embeddings_embedding_hnsw ON message_embeddings USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_artifact_embeddings_embedding_hnsw ON artifact_embeddings USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_knowledge_embeddings_embedding_hnsw ON knowledge_embeddings USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_student_learning_embeddings_embedding_hnsw ON student_learning_embeddings USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);