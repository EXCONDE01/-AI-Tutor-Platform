import { pgTable, uuid, text, timestamp, boolean, pgEnum, index, uniqueIndex, integer, jsonb } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

/**
 * Performance Indexes for AI Tutor Platform
 * 
 * These indexes optimize common query patterns across the platform.
 * Run these after table creation and RLS policies.
 */

// ============================================================================
// COMPOSITE INDEXES FOR COMMON QUERY PATTERNS
// ============================================================================

export const performanceIndexes = [
  // ==========================================================================
  // USERS - Authentication & Lookup Patterns
  // ==========================================================================
  // Email lookup (login)
  `CREATE INDEX IF NOT EXISTS idx_users_email_lookup ON users (email) WHERE status = 'active';`,
  
  // External ID lookup (LTI, Clever, etc.)
  `CREATE INDEX IF NOT EXISTS idx_users_external_lookup ON users (external_id, auth_provider) WHERE external_id IS NOT NULL;`,
  
  // School + Role + Status (admin dashboards)
  `CREATE INDEX IF NOT EXISTS idx_users_school_role_status ON users (school_id, role, status) WHERE status = 'active';`,
  
  // Last login tracking
  `CREATE INDEX IF NOT EXISTS idx_users_last_login ON users (last_login_at DESC) WHERE last_login_at IS NOT NULL;`,

  // ==========================================================================
  // TEACHERS - Dashboard & Reporting
  // ==========================================================================
  // Teacher with user info (join optimization)
  `CREATE INDEX IF NOT EXISTS idx_teachers_user_school ON teachers (user_id) INCLUDE (employee_id, department);`,
  
  // Grade/subject filtering
  `CREATE INDEX IF NOT EXISTS idx_teachers_grade_subject ON teachers USING GIN (grade_levels, subjects);`,

  // ==========================================================================
  // STUDENTS - Enrollment & Progress Tracking
  // ==========================================================================
  // Student with user info
  `CREATE INDEX IF NOT EXISTS idx_students_user_school ON students (user_id) INCLUDE (grade_level, student_number);`,
  
  // Grade level queries
  `CREATE INDEX IF NOT EXISTS idx_students_grade_active ON students (grade_level) WHERE grade_level IS NOT NULL;`,
  
  // IEP/ELL filtering
  `CREATE INDEX IF NOT EXISTS idx_students_accommodations ON students (iep_status, ell_status) WHERE iep_status = true OR ell_status = true;`,

  // ==========================================================================
  // CLASSES - Scheduling & Enrollment
  // ==========================================================================
  // Active classes for teacher
  `CREATE INDEX IF NOT EXISTS idx_classes_teacher_active ON classes (teacher_id, status) WHERE status = 'active';`,
  
  // School term/year queries
  `CREATE INDEX IF NOT EXISTS idx_classes_school_term_year ON classes (school_id, term, year, status);`,
  
  // LTI context lookup
  `CREATE INDEX IF NOT EXISTS idx_classes_lti_context ON classes (lti_context_id) WHERE lti_context_id IS NOT NULL;`,
  
  // Subject/grade filtering
  `CREATE INDEX IF NOT EXISTS idx_classes_subject_grade ON classes (subject, grade_level, status) WHERE status = 'active';`,

  // ==========================================================================
  // CLASS_STUDENTS - Enrollment Management
  // ==========================================================================
  // Active enrollment lookup
  `CREATE INDEX IF NOT EXISTS idx_class_students_active_enrollment ON class_students (class_id, student_id) WHERE is_active = true;`,
  
  // Student's active classes
  `CREATE INDEX IF NOT EXISTS idx_class_students_student_active ON class_students (student_id, is_active) WHERE is_active = true;`,
  
  // Class roster with student details (covering index)
  `CREATE INDEX IF NOT EXISTS idx_class_students_roster ON class_students (class_id, is_active, enrolled_at) WHERE is_active = true;`,

  // ==========================================================================
  // TUTOR_CONFIGS - Configuration Lookup
  // ==========================================================================
  // Active config for class
  `CREATE INDEX IF NOT EXISTS idx_tutor_configs_class_active ON tutor_configs (class_id, is_active) WHERE is_active = true;`,

  // ==========================================================================
  // TUTOR_SESSIONS - Session Queries
  // ==========================================================================
  // Student's recent sessions
  `CREATE INDEX IF NOT EXISTS idx_tutor_sessions_student_recent ON tutor_sessions (student_id, started_at DESC) WHERE status IN ('active', 'completed');`,
  
  // Teacher's class sessions (for dashboard)
  `CREATE INDEX IF NOT EXISTS idx_tutor_sessions_class_teacher ON tutor_sessions (class_id, started_at DESC);`,
  
  // Active sessions (for monitoring)
  `CREATE INDEX IF NOT EXISTS idx_tutor_sessions_active ON tutor_sessions (status, started_at) WHERE status = 'active';`,
  
  // Session with config (join optimization)
  `CREATE INDEX IF NOT EXISTS idx_tutor_sessions_config ON tutor_sessions (tutor_config_id) INCLUDE (class_id, student_id, status);`,
  
  // Date range queries (analytics)
  `CREATE INDEX IF NOT EXISTS idx_tutor_sessions_date_range ON tutor_sessions (started_at, class_id, student_id);`,

  // ==========================================================================
  // MESSAGES - Conversation Queries
  // ==========================================================================
  // Session messages in order (primary access pattern)
  `CREATE INDEX IF NOT EXISTS idx_messages_session_sequence ON messages (session_id, sequence);`,
  
  // Recent messages across sessions (for context)
  `CREATE INDEX IF NOT EXISTS idx_messages_recent ON messages (session_id, created_at DESC);`,
  
  // Tool usage analytics
  `CREATE INDEX IF NOT EXISTS idx_messages_tool_calls ON messages USING GIN (tool_calls) WHERE tool_calls != '[]'::jsonb;`,
  
  // Role-based filtering
  `CREATE INDEX IF NOT EXISTS idx_messages_role_session ON messages (role, session_id) WHERE role IN ('user', 'assistant');`,

  // ==========================================================================
  // SESSION_SUMMARIES - Progress Tracking
  // ==========================================================================
  // Student progress over time
  `CREATE INDEX IF NOT EXISTS idx_session_summaries_student_time ON session_summaries (student_id, generated_at DESC);`,
  
  // Class progress overview
  `CREATE INDEX IF NOT EXISTS idx_session_summaries_class_time ON session_summaries (class_id, generated_at DESC);`,
  
  // Engagement analytics
  `CREATE INDEX IF NOT EXISTS idx_session_summaries_engagement ON session_summaries (engagement_score) WHERE engagement_score IS NOT NULL;`,

  // ==========================================================================
  // INTERVENTIONS - Teacher Dashboard
  // ==========================================================================
  // Pending interventions for teacher
  `CREATE INDEX IF NOT EXISTS idx_interventions_teacher_pending ON interventions (teacher_id, status, severity, created_at DESC) WHERE status IN ('pending', 'acknowledged');`,
  
  // Student intervention history
  `CREATE INDEX IF NOT EXISTS idx_interventions_student_history ON interventions (student_id, created_at DESC);`,
  
  // Class intervention overview
  `CREATE INDEX IF NOT EXISTS idx_interventions_class_overview ON interventions (class_id, status, severity, created_at DESC);`,
  
  // Type-based analytics
  `CREATE INDEX IF NOT EXISTS idx_interventions_type_severity ON interventions (type, severity, status);`,
  
  // Message-linked interventions
  `CREATE INDEX IF NOT EXISTS idx_interventions_message ON interventions (message_id) WHERE message_id IS NOT NULL;`,

  // ==========================================================================
  // INTERVENTION_ACTIONS - Action Tracking
  // ==========================================================================
  `CREATE INDEX IF NOT EXISTS idx_intervention_actions_intervention ON intervention_actions (intervention_id, performed_at);`,
  
  `CREATE INDEX IF NOT EXISTS idx_intervention_actions_teacher ON intervention_actions (performed_by, performed_at DESC) WHERE performed_by IS NOT NULL;`,

  // ==========================================================================
  // LTI - Platform & Deployment Queries
  // ==========================================================================
  // Active platforms for district
  `CREATE INDEX IF NOT EXISTS idx_lti_platforms_district_active ON lti_platforms (district_id, status) WHERE status = 'active';`,
  
  // Deployment lookup by platform
  `CREATE INDEX IF NOT EXISTS idx_lti_deployments_platform_school ON lti_deployments (platform_id, school_id, status);`,

  // ==========================================================================
  // NRPS_CACHE - Membership Sync
  // ==========================================================================
  // Context membership queries
  `CREATE INDEX IF NOT EXISTS idx_nrps_cache_context_active ON nrps_cache (context_id, status) WHERE status = 'active';`,
  
  // User membership across contexts
  `CREATE INDEX IF NOT EXISTS idx_nrps_cache_user_contexts ON nrps_cache (user_id, context_id, status);`,
  
  // Role-based queries
  `CREATE INDEX IF NOT EXISTS idx_nrps_cache_roles ON nrps_cache USING GIN (roles);`,

  // ==========================================================================
  // AGS - Grade Sync
  // ==========================================================================
  // Line items for context
  `CREATE INDEX IF NOT EXISTS idx_ags_line_items_context ON ags_line_items (context_id, is_active) WHERE is_active = true;`,
  
  // Scores for line item (gradebook)
  `CREATE INDEX IF NOT EXISTS idx_ags_scores_line_item_user ON ags_scores (line_item_id, user_id);`,
  
  // Pending score submissions
  `CREATE INDEX IF NOT EXISTS idx_ags_scores_pending ON ags_scores (status, timestamp) WHERE status = 'pending';`,
  
  // User's scores across items
  `CREATE INDEX IF NOT EXISTS idx_ags_scores_user_items ON ags_scores (user_id, line_item_id, timestamp DESC);`,

  // ==========================================================================
  // GENERATED_ARTIFACTS - Content Library
  // ==========================================================================
  // Teacher's artifacts by type
  `CREATE INDEX IF NOT EXISTS idx_generated_artifacts_teacher_type ON generated_artifacts (teacher_id, type, status, created_at DESC);`,
  
  // Class artifacts
  `CREATE INDEX IF NOT EXISTS idx_generated_artifacts_class ON generated_artifacts (class_id, type, status);`,
  
  // Student-specific artifacts
  `CREATE INDEX IF NOT EXISTS idx_generated_artifacts_student ON generated_artifacts (student_id, type, status) WHERE student_id IS NOT NULL;`,
  
  // Template library
  `CREATE INDEX IF NOT EXISTS idx_generated_artifacts_templates ON generated_artifacts (is_template, type, subject, grade_level) WHERE is_template = true;`,
  
  // Curriculum standard alignment
  `CREATE INDEX IF NOT EXISTS idx_generated_artifacts_standards ON generated_artifacts USING GIN (curriculum_standards);`,
  
  // Full-text search on title/description
  `CREATE INDEX IF NOT EXISTS idx_generated_artifacts_search ON generated_artifacts USING GIN (
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, ''))
  );`,

  // ==========================================================================
  // EXPORT_JOBS - Job Queue
  // ==========================================================================
  // Pending jobs for processing
  `CREATE INDEX IF NOT EXISTS idx_export_jobs_pending ON export_jobs (status, created_at) WHERE status IN ('pending', 'processing');`,
  
  // Teacher's export history
  `CREATE INDEX IF NOT EXISTS idx_export_jobs_teacher ON export_jobs (requested_by, created_at DESC);`,

  // ==========================================================================
  // OAUTH_TOKENS - Token Management
  // ==========================================================================
  // Active tokens expiring soon (refresh job)
  `CREATE INDEX IF NOT EXISTS idx_oauth_tokens_expiring ON oauth_tokens (expires_at, is_active) WHERE is_active = true AND expires_at IS NOT NULL;`,
  
  // Provider-specific queries
  `CREATE INDEX IF NOT EXISTS idx_oauth_tokens_provider_user ON oauth_tokens (provider, user_id, is_active) WHERE is_active = true;`,

  // ==========================================================================
  // AUDIT_LOGS - Compliance & Security
  // ==========================================================================
  // Time-series partitioning hint (monthly)
  // Actual partitioning would be done via CREATE TABLE ... PARTITION BY RANGE
  `CREATE INDEX IF NOT EXISTS idx_audit_logs_time_series ON audit_logs (created_at DESC);`,
  
  // Security event monitoring
  `CREATE INDEX IF NOT EXISTS idx_audit_logs_security ON audit_logs (severity, action, created_at DESC) WHERE severity IN ('high', 'critical');`,
  
  // User activity trail
  `CREATE INDEX IF NOT EXISTS idx_audit_logs_user_activity ON audit_logs (user_id, created_at DESC) WHERE user_id IS NOT NULL;`,
  
  // Resource change tracking
  `CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_changes ON audit_logs (resource_type, resource_id, created_at DESC) WHERE resource_id IS NOT NULL;`,
  
  // Request tracing
  `CREATE INDEX IF NOT EXISTS idx_audit_logs_request_trace ON audit_logs (request_id, created_at) WHERE request_id IS NOT NULL;`,

  // ==========================================================================
  // CONSENT_RECORDS - Compliance
  // ==========================================================================
  // User's current consents
  `CREATE INDEX IF NOT EXISTS idx_consent_records_user_current ON consent_records (user_id, type, status) WHERE status IN ('granted', 'pending');`,
  
  // Expiring consents
  `CREATE INDEX IF NOT EXISTS idx_consent_records_expiring ON consent_records (expires_at, status) WHERE expires_at IS NOT NULL AND status = 'granted';`,
  
  // District compliance reporting
  `CREATE INDEX IF NOT EXISTS idx_consent_records_district_report ON consent_records (district_id, type, status, granted_at);`,
  
  // Parental consent lookup
  `CREATE INDEX IF NOT EXISTS idx_consent_records_parental ON consent_records (student_id, type, status) WHERE type = 'parental_consent';`,

  // ==========================================================================
  // DATA_DELETION_REQUESTS - GDPR/CCPA
  // ==========================================================================
  // Pending requests for processing
  `CREATE INDEX IF NOT EXISTS idx_deletion_requests_pending ON data_deletion_requests (status, created_at) WHERE status IN ('requested', 'verified', 'scheduled');`,
  
  // User's requests
  `CREATE INDEX IF NOT EXISTS idx_deletion_requests_user ON data_deletion_requests (user_id, status, created_at DESC);`,

  // ==========================================================================
  // RETENTION_POLICIES - Data Lifecycle
  // ==========================================================================
  // Active policies by category
  `CREATE INDEX IF NOT EXISTS idx_retention_policies_active ON retention_policies (category, is_active, priority DESC) WHERE is_active = true;`,
  
  // District/school policies
  `CREATE INDEX IF NOT EXISTS idx_retention_policies_scope ON retention_policies (district_id, school_id, category);`,

  // ==========================================================================
  // RETENTION_JOBS - Job Scheduling
  // ==========================================================================
  // Next scheduled runs
  `CREATE INDEX IF NOT EXISTS idx_retention_jobs_schedule ON retention_jobs (next_run_at, status) WHERE status = 'pending' AND next_run_at IS NOT NULL;`,
];

// ============================================================================
// PARTIAL INDEXES FOR SOFT DELETES & STATUS FILTERS
// ============================================================================

export const partialIndexes = [
  // Only index active records where status matters
  `CREATE INDEX IF NOT EXISTS idx_users_active_only ON users (id) WHERE status = 'active';`,
  `CREATE INDEX IF NOT EXISTS idx_classes_active_only ON classes (id) WHERE status = 'active';`,
  `CREATE INDEX IF NOT EXISTS idx_class_students_active_only ON class_students (class_id, student_id) WHERE is_active = true;`,
  `CREATE INDEX IF NOT EXISTS idx_tutor_sessions_not_archived ON tutor_sessions (id) WHERE status != 'archived';`,
  `CREATE INDEX IF NOT EXISTS idx_generated_artifacts_not_archived ON generated_artifacts (id) WHERE status != 'archived';`,
  `CREATE INDEX IF NOT EXISTS idx_lti_platforms_active_only ON lti_platforms (id) WHERE status = 'active';`,
  `CREATE INDEX IF NOT EXISTS idx_nrps_cache_active_only ON nrps_cache (id) WHERE status = 'active';`,
  `CREATE INDEX IF NOT EXISTS idx_ags_line_items_active_only ON ags_line_items (id) WHERE is_active = true;`,
  `CREATE INDEX IF NOT EXISTS idx_oauth_tokens_active_only ON oauth_tokens (id) WHERE is_active = true;`,
];

// ============================================================================
// GIN INDEXES FOR JSONB COLUMNS
// ============================================================================

export const jsonbIndexes = [
  // Users metadata
  `CREATE INDEX IF NOT EXISTS idx_users_metadata_gin ON users USING GIN (metadata);`,
  
  // Teachers preferences/certifications
  `CREATE INDEX IF NOT EXISTS idx_teachers_preferences_gin ON teachers USING GIN (preferences);`,
  `CREATE INDEX IF NOT EXISTS idx_teachers_certifications_gin ON teachers USING GIN (certifications);`,
  
  // Students accommodations/preferences
  `CREATE INDEX IF NOT EXISTS idx_students_accommodations_gin ON students USING GIN (accommodations);`,
  `CREATE INDEX IF NOT EXISTS idx_students_learning_prefs_gin ON students USING GIN (learning_preferences);`,
  
  // Classes settings/schedule
  `CREATE INDEX IF NOT EXISTS idx_classes_settings_gin ON classes USING GIN (settings);`,
  `CREATE INDEX IF NOT EXISTS idx_classes_schedule_gin ON classes USING GIN (schedule);`,
  
  // Tutor configs (full config search)
  `CREATE INDEX IF NOT EXISTS idx_tutor_configs_config_gin ON tutor_configs USING GIN (config);`,
  
  // Sessions metadata/token_usage
  `CREATE INDEX IF NOT EXISTS idx_tutor_sessions_metadata_gin ON tutor_sessions USING GIN (metadata);`,
  `CREATE INDEX IF NOT EXISTS idx_tutor_sessions_token_usage_gin ON tutor_sessions USING GIN (token_usage);`,
  
  // Messages metadata/tool_calls/tool_results
  `CREATE INDEX IF NOT EXISTS idx_messages_metadata_gin ON messages USING GIN (metadata);`,
  `CREATE INDEX IF NOT EXISTS idx_messages_tool_calls_gin ON messages USING GIN (tool_calls);`,
  `CREATE INDEX IF NOT EXISTS idx_messages_tool_results_gin ON messages USING GIN (tool_results);`,
  
  // Interventions evidence/metadata
  `CREATE INDEX IF NOT EXISTS idx_interventions_evidence_gin ON interventions USING GIN (evidence);`,
  `CREATE INDEX IF NOT EXISTS idx_interventions_metadata_gin ON interventions USING GIN (metadata);`,
  
  // Artifacts content/metadata
  `CREATE INDEX IF NOT EXISTS idx_generated_artifacts_content_gin ON generated_artifacts USING GIN (content);`,
  `CREATE INDEX IF NOT EXISTS idx_generated_artifacts_metadata_gin ON generated_artifacts USING GIN (metadata);`,
  
  // Export jobs options
  `CREATE INDEX IF NOT EXISTS idx_export_jobs_options_gin ON export_jobs USING GIN (options);`,
  
  // Audit logs old/new values
  `CREATE INDEX IF NOT EXISTS idx_audit_logs_old_values_gin ON audit_logs USING GIN (old_values);`,
  `CREATE INDEX IF NOT EXISTS idx_audit_logs_new_values_gin ON audit_logs USING GIN (new_values);`,
  `CREATE INDEX IF NOT EXISTS idx_audit_logs_metadata_gin ON audit_logs USING GIN (metadata);`,
  
  // Consent records metadata
  `CREATE INDEX IF NOT EXISTS idx_consent_records_metadata_gin ON consent_records USING GIN (metadata);`,
  
  // Deletion requests scope
  `CREATE INDEX IF NOT EXISTS idx_deletion_requests_scope_gin ON data_deletion_requests USING GIN (scope);`,
  
  // Retention policies applies_to/exceptions
  `CREATE INDEX IF NOT EXISTS idx_retention_policies_applies_gin ON retention_policies USING GIN (applies_to);`,
  `CREATE INDEX IF NOT EXISTS idx_retention_policies_exceptions_gin ON retention_policies USING GIN (exceptions);`,
];

// ============================================================================
// BRIN INDEXES FOR TIME-SERIES DATA (Large Tables)
// ============================================================================

export const brinIndexes = [
  // Audit logs (very large, time-series)
  `CREATE INDEX IF NOT EXISTS idx_audit_logs_created_brin ON audit_logs USING BRIN (created_at);`,
  
  // Messages (high volume)
  `CREATE INDEX IF NOT EXISTS idx_messages_created_brin ON messages USING BRIN (created_at);`,
  
  // Tutor sessions
  `CREATE INDEX IF NOT EXISTS idx_tutor_sessions_started_brin ON tutor_sessions USING BRIN (started_at);`,
  
  // Session summaries
  `CREATE INDEX IF NOT EXISTS idx_session_summaries_generated_brin ON session_summaries USING BRIN (generated_at);`,
];

// ============================================================================
// STATISTICS TARGETS FOR QUERY PLANNER
// ============================================================================

export const statisticsTargets = [
  // Increase statistics for high-cardinality columns used in joins
  `ALTER TABLE users ALTER COLUMN school_id SET STATISTICS 1000;`,
  `ALTER TABLE users ALTER COLUMN role SET STATISTICS 100;`,
  `ALTER TABLE classes ALTER COLUMN school_id SET STATISTICS 1000;`,
  `ALTER TABLE classes ALTER COLUMN teacher_id SET STATISTICS 1000;`,
  `ALTER TABLE class_students ALTER COLUMN class_id SET STATISTICS 1000;`,
  `ALTER TABLE class_students ALTER COLUMN student_id SET STATISTICS 1000;`,
  `ALTER TABLE tutor_sessions ALTER COLUMN class_id SET STATISTICS 1000;`,
  `ALTER TABLE tutor_sessions ALTER COLUMN student_id SET STATISTICS 1000;`,
  `ALTER TABLE messages ALTER COLUMN session_id SET STATISTICS 1000;`,
  `ALTER TABLE interventions ALTER COLUMN class_id SET STATISTICS 1000;`,
  `ALTER TABLE interventions ALTER COLUMN student_id SET STATISTICS 1000;`,
  `ALTER TABLE generated_artifacts ALTER COLUMN class_id SET STATISTICS 1000;`,
  `ALTER TABLE generated_artifacts ALTER COLUMN teacher_id SET STATISTICS 1000;`,
  `ALTER TABLE audit_logs ALTER COLUMN user_id SET STATISTICS 1000;`,
  `ALTER TABLE audit_logs ALTER COLUMN resource_type SET STATISTICS 100;`,
];

// ============================================================================
// ALL INDEXES COMBINED
// ============================================================================

export const allIndexes = [
  ...performanceIndexes,
  ...partialIndexes,
  ...jsonbIndexes,
  ...brinIndexes,
  ...statisticsTargets,
];