CREATE TYPE "public"."district_status" AS ENUM('active', 'inactive', 'pending');--> statement-breakpoint
CREATE TYPE "public"."school_status" AS ENUM('active', 'inactive', 'pending');--> statement-breakpoint
CREATE TYPE "public"."auth_provider" AS ENUM('email', 'google', 'microsoft', 'clever', 'lti', 'saml');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('teacher', 'student', 'parent', 'admin');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('active', 'inactive', 'pending', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."class_status" AS ENUM('active', 'archived', 'draft');--> statement-breakpoint
CREATE TYPE "public"."term" AS ENUM('fall', 'spring', 'summer', 'year', 'quarter1', 'quarter2', 'quarter3', 'quarter4');--> statement-breakpoint
CREATE TYPE "public"."message_role" AS ENUM('user', 'assistant', 'system', 'tool');--> statement-breakpoint
CREATE TYPE "public"."session_status" AS ENUM('active', 'paused', 'completed', 'abandoned', 'error');--> statement-breakpoint
CREATE TYPE "public"."intervention_action" AS ENUM('notify_teacher', 'adjust_difficulty', 'change_approach', 'provide_hint', 'review_prerequisites', 'schedule_check_in', 'parent_notification', 'counselor_referral', 'content_filter', 'session_pause', 'custom');--> statement-breakpoint
CREATE TYPE "public"."intervention_severity" AS ENUM('low', 'medium', 'high', 'critical');--> statement-breakpoint
CREATE TYPE "public"."intervention_status" AS ENUM('pending', 'acknowledged', 'resolved', 'dismissed', 'escalated');--> statement-breakpoint
CREATE TYPE "public"."intervention_type" AS ENUM('misconception', 'off_topic', 'frustration', 'disengagement', 'inappropriate_content', 'learning_gap', 'pace_too_fast', 'pace_too_slow', 'technical_issue', 'custom');--> statement-breakpoint
CREATE TYPE "public"."ags_line_item_type" AS ENUM('score', 'grade', 'participation', 'completion');--> statement-breakpoint
CREATE TYPE "public"."ags_score_status" AS ENUM('pending', 'submitted', 'accepted', 'rejected', 'error');--> statement-breakpoint
CREATE TYPE "public"."lti_deployment_status" AS ENUM('active', 'inactive', 'pending');--> statement-breakpoint
CREATE TYPE "public"."lti_platform_status" AS ENUM('active', 'inactive', 'pending', 'error');--> statement-breakpoint
CREATE TYPE "public"."nrps_role" AS ENUM('instructor', 'learner', 'administrator', 'content_developer', 'teaching_assistant', 'mentor', 'observer');--> statement-breakpoint
CREATE TYPE "public"."artifact_status" AS ENUM('draft', 'generated', 'reviewed', 'approved', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."artifact_type" AS ENUM('lesson_plan', 'worksheet', 'quiz', 'assessment', 'rubric', 'study_guide', 'flashcards', 'summary', 'report', 'presentation', 'code', 'diagram', 'custom');--> statement-breakpoint
CREATE TYPE "public"."export_format" AS ENUM('pdf', 'docx', 'html', 'markdown', 'json', 'csv', 'xlsx', 'google_docs', 'canvas', 'schoology');--> statement-breakpoint
CREATE TYPE "public"."export_status" AS ENUM('pending', 'processing', 'completed', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."oauth_provider" AS ENUM('google', 'microsoft', 'canvas', 'schoology', 'blackboard', 'clever', 'classlink');--> statement-breakpoint
CREATE TYPE "public"."audit_action" AS ENUM('create', 'read', 'update', 'delete', 'login', 'logout', 'login_failed', 'password_change', 'password_reset', 'mfa_enable', 'mfa_disable', 'consent_given', 'consent_withdrawn', 'data_export', 'data_import', 'data_deletion_request', 'data_deletion_executed', 'role_change', 'permission_change', 'settings_change', 'lti_launch', 'lti_nrps_sync', 'lti_ags_score', 'ai_session_start', 'ai_session_end', 'ai_message_sent', 'ai_tool_used', 'artifact_generated', 'artifact_exported', 'intervention_created', 'intervention_resolved', 'config_change', 'bulk_operation', 'api_access', 'security_event', 'custom');--> statement-breakpoint
CREATE TYPE "public"."audit_resource_type" AS ENUM('district', 'school', 'user', 'teacher', 'student', 'parent', 'class', 'tutor_session', 'message', 'intervention', 'tutor_config', 'generated_artifact', 'export_job', 'lti_platform', 'lti_deployment', 'nrps_cache', 'ags_line_item', 'ags_score', 'oauth_token', 'consent_record', 'data_deletion_request', 'retention_policy', 'audit_log', 'system', 'custom');--> statement-breakpoint
CREATE TYPE "public"."audit_severity" AS ENUM('low', 'medium', 'high', 'critical');--> statement-breakpoint
CREATE TYPE "public"."consent_status" AS ENUM('granted', 'denied', 'withdrawn', 'expired', 'pending');--> statement-breakpoint
CREATE TYPE "public"."consent_type" AS ENUM('terms_of_service', 'privacy_policy', 'data_processing', 'ai_interaction', 'data_sharing', 'marketing', 'analytics', 'third_party_services', 'parental_consent', 'ferpa_consent', 'coppa_consent', 'gdpr_consent', 'state_privacy_law', 'custom');--> statement-breakpoint
CREATE TYPE "public"."deletion_status" AS ENUM('requested', 'verified', 'scheduled', 'in_progress', 'completed', 'failed', 'cancelled', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."retention_category" AS ENUM('audit_logs', 'tutor_sessions', 'messages', 'interventions', 'generated_artifacts', 'export_jobs', 'nrps_cache', 'ags_scores', 'oauth_tokens', 'consent_records', 'user_profiles', 'lti_data', 'analytics', 'backups', 'custom');--> statement-breakpoint
CREATE TYPE "public"."artifact_content_type" AS ENUM('title', 'description', 'full_content', 'summary');--> statement-breakpoint
CREATE TYPE "public"."embedding_job_status" AS ENUM('pending', 'processing', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."embedding_job_target_type" AS ENUM('message', 'artifact', 'knowledge', 'student_learning');--> statement-breakpoint
CREATE TYPE "public"."embedding_model_provider" AS ENUM('openai', 'anthropic', 'google', 'mistral', 'neon');--> statement-breakpoint
CREATE TYPE "public"."embedding_type" AS ENUM('misconception', 'strength', 'learning_style', 'progress_summary', 'work_sample');--> statement-breakpoint
CREATE TYPE "public"."knowledge_source_type" AS ENUM('standard', 'textbook', 'lesson_plan', 'worksheet', 'web_page', 'custom');--> statement-breakpoint
CREATE TABLE "districts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"status" "district_status" DEFAULT 'pending' NOT NULL,
	"settings" text DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "schools" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"district_id" uuid NOT NULL,
	"name" text NOT NULL,
	"status" "school_status" DEFAULT 'pending' NOT NULL,
	"settings" text DEFAULT '{}' NOT NULL,
	"address" text,
	"phone" text,
	"email" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "parents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"relationship" text NOT NULL,
	"phone_number" text,
	"preferred_contact_method" text DEFAULT 'email' NOT NULL,
	"notification_preferences" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "parents_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "student_parents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"parent_id" uuid NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"can_view_grades" boolean DEFAULT true NOT NULL,
	"can_view_progress" boolean DEFAULT true NOT NULL,
	"can_receive_alerts" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "students" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"student_number" text,
	"grade_level" integer,
	"date_of_birth" timestamp with time zone,
	"iep_status" boolean DEFAULT false NOT NULL,
	"ell_status" boolean DEFAULT false NOT NULL,
	"accommodations" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"learning_preferences" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "students_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "teachers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"employee_id" text,
	"department" text,
	"grade_levels" text[] DEFAULT '{}'::text[] NOT NULL,
	"subjects" text[] DEFAULT '{}'::text[] NOT NULL,
	"certifications" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"preferences" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "teachers_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"role" "user_role" NOT NULL,
	"status" "user_status" DEFAULT 'pending' NOT NULL,
	"auth_provider" "auth_provider" DEFAULT 'email' NOT NULL,
	"external_id" text,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"password_hash" text,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"display_name" text,
	"avatar_url" text,
	"locale" text DEFAULT 'en-US' NOT NULL,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "class_students" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"class_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"enrolled_at" timestamp with time zone DEFAULT now() NOT NULL,
	"dropped_at" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	"seat_number" integer,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "classes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"teacher_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"subject" text NOT NULL,
	"grade_level" integer NOT NULL,
	"term" "term" NOT NULL,
	"year" integer NOT NULL,
	"status" "class_status" DEFAULT 'draft' NOT NULL,
	"schedule" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"room" text,
	"max_students" integer DEFAULT 30 NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"lti_context_id" text,
	"lti_resource_link_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "tutor_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"class_id" uuid NOT NULL,
	"config" jsonb NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tutor_configs_class_id_unique" UNIQUE("class_id")
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"role" "message_role" NOT NULL,
	"content" text NOT NULL,
	"content_type" text DEFAULT 'text' NOT NULL,
	"sequence" integer NOT NULL,
	"tool_calls" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"tool_results" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"embedding" text,
	"is_edited" boolean DEFAULT false NOT NULL,
	"edited_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session_summaries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"class_id" uuid NOT NULL,
	"summary" text NOT NULL,
	"key_topics" text[] DEFAULT '{}'::text[] NOT NULL,
	"learning_progress" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"misconceptions" text[] DEFAULT '{}'::text[] NOT NULL,
	"strengths" text[] DEFAULT '{}'::text[] NOT NULL,
	"areas_for_improvement" text[] DEFAULT '{}'::text[] NOT NULL,
	"engagement_score" integer,
	"message_count" integer NOT NULL,
	"duration_seconds" integer NOT NULL,
	"token_usage" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "session_summaries_session_id_unique" UNIQUE("session_id")
);
--> statement-breakpoint
CREATE TABLE "tutor_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"class_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"tutor_config_id" uuid NOT NULL,
	"status" "session_status" DEFAULT 'active' NOT NULL,
	"title" text,
	"learning_objectives" text[] DEFAULT '{}'::text[] NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	"paused_at" timestamp with time zone,
	"total_duration_seconds" integer DEFAULT 0 NOT NULL,
	"message_count" integer DEFAULT 0 NOT NULL,
	"token_usage" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"summary" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "intervention_actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"intervention_id" uuid NOT NULL,
	"action" "intervention_action" NOT NULL,
	"description" text NOT NULL,
	"performed_by" uuid,
	"performed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"result" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "interventions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"class_id" uuid NOT NULL,
	"teacher_id" uuid,
	"message_id" uuid,
	"type" "intervention_type" NOT NULL,
	"severity" "intervention_severity" DEFAULT 'medium' NOT NULL,
	"status" "intervention_status" DEFAULT 'pending' NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"evidence" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"suggested_actions" "intervention_action"[] DEFAULT '{}'::intervention_action[] NOT NULL,
	"teacher_notes" text,
	"resolved_at" timestamp with time zone,
	"resolved_by" uuid,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ags_line_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deployment_id" uuid NOT NULL,
	"context_id" text NOT NULL,
	"resource_link_id" text,
	"label" text NOT NULL,
	"score_maximum" integer DEFAULT 100 NOT NULL,
	"score_minimum" integer DEFAULT 0 NOT NULL,
	"type" "ags_line_item_type" DEFAULT 'score' NOT NULL,
	"resource_id" text,
	"tag" text,
	"start_date_time" timestamp with time zone,
	"end_date_time" timestamp with time zone,
	"lti_line_item_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ags_scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"line_item_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"session_id" uuid,
	"score_given" integer NOT NULL,
	"score_maximum" integer NOT NULL,
	"comment" text,
	"activity_progress" text DEFAULT 'Completed' NOT NULL,
	"grading_progress" text DEFAULT 'FullyGraded' NOT NULL,
	"status" "ags_score_status" DEFAULT 'pending' NOT NULL,
	"lti_score_url" text,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL,
	"submitted_at" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lti_deployments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"platform_id" uuid NOT NULL,
	"school_id" uuid,
	"deployment_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"target_link_uri" text NOT NULL,
	"custom_parameters" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" "lti_deployment_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lti_platforms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"district_id" uuid,
	"name" text NOT NULL,
	"issuer" text NOT NULL,
	"client_id" text NOT NULL,
	"deployment_id" text,
	"auth_login_url" text NOT NULL,
	"auth_token_url" text NOT NULL,
	"auth_audience" text,
	"jwks_url" text NOT NULL,
	"public_key" text,
	"private_key" text,
	"key_rotation_url" text,
	"scopes" text[] DEFAULT '{}'::text[] NOT NULL,
	"supports_nrps" boolean DEFAULT false NOT NULL,
	"supports_ags" boolean DEFAULT false NOT NULL,
	"supports_deep_linking" boolean DEFAULT false NOT NULL,
	"supports_assignment_selection" boolean DEFAULT false NOT NULL,
	"supports_resource_link_message" boolean DEFAULT false NOT NULL,
	"status" "lti_platform_status" DEFAULT 'pending' NOT NULL,
	"configuration" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"last_validated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nrps_cache" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deployment_id" uuid NOT NULL,
	"context_id" text NOT NULL,
	"user_id" text NOT NULL,
	"roles" "nrps_role"[] DEFAULT '{}'::nrps_role[] NOT NULL,
	"lis_person_sourced_id" text,
	"lis_person_name_given" text,
	"lis_person_name_family" text,
	"lis_person_name_full" text,
	"lis_person_email" text,
	"user_image" text,
	"status" text DEFAULT 'active' NOT NULL,
	"membership_id" text,
	"raw_data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"last_synced_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "export_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"artifact_id" uuid NOT NULL,
	"requested_by" uuid NOT NULL,
	"format" "export_format" NOT NULL,
	"status" "export_status" DEFAULT 'pending' NOT NULL,
	"destination" text,
	"destination_type" text,
	"options" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"result_url" text,
	"error_message" text,
	"progress" integer DEFAULT 0 NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "generated_artifacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid,
	"student_id" uuid,
	"class_id" uuid NOT NULL,
	"teacher_id" uuid NOT NULL,
	"type" "artifact_type" NOT NULL,
	"status" "artifact_status" DEFAULT 'draft' NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"content" jsonb NOT NULL,
	"markdown_content" text,
	"html_content" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"curriculum_standards" text[] DEFAULT '{}'::text[] NOT NULL,
	"grade_level" integer,
	"subject" text,
	"difficulty" integer,
	"estimated_duration_minutes" integer,
	"language" text DEFAULT 'en' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"parent_artifact_id" uuid,
	"is_template" boolean DEFAULT false NOT NULL,
	"generated_by" text NOT NULL,
	"ai_model" text,
	"ai_prompt" text,
	"review_notes" text,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "oauth_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" "oauth_provider" NOT NULL,
	"provider_user_id" text NOT NULL,
	"access_token" text NOT NULL,
	"refresh_token" text,
	"id_token" text,
	"token_type" text DEFAULT 'Bearer' NOT NULL,
	"scope" text,
	"expires_at" timestamp with time zone,
	"refresh_expires_at" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"district_id" uuid,
	"school_id" uuid,
	"user_id" uuid,
	"impersonator_id" uuid,
	"action" "audit_action" NOT NULL,
	"resource_type" "audit_resource_type" NOT NULL,
	"resource_id" uuid,
	"severity" "audit_severity" DEFAULT 'low' NOT NULL,
	"description" text NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"request_id" text,
	"session_id" text,
	"old_values" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"new_values" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs_partitioned" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"district_id" uuid,
	"school_id" uuid,
	"user_id" uuid,
	"impersonator_id" uuid,
	"action" "audit_action" NOT NULL,
	"resource_type" "audit_resource_type" NOT NULL,
	"resource_id" uuid,
	"severity" "audit_severity" DEFAULT 'low' NOT NULL,
	"description" text NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"request_id" text,
	"session_id" text,
	"old_values" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"new_values" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consent_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"district_id" uuid,
	"school_id" uuid,
	"user_id" uuid NOT NULL,
	"student_id" uuid,
	"type" "consent_type" NOT NULL,
	"status" "consent_status" NOT NULL,
	"version" text NOT NULL,
	"policy_url" text,
	"consent_text" text,
	"ip_address" text,
	"user_agent" text,
	"witness_id" uuid,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"granted_at" timestamp with time zone,
	"withdrawn_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "data_deletion_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"district_id" uuid,
	"school_id" uuid,
	"user_id" uuid NOT NULL,
	"student_id" uuid,
	"requested_by" uuid NOT NULL,
	"status" "deletion_status" DEFAULT 'requested' NOT NULL,
	"reason" text,
	"legal_basis" text,
	"scope" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"verification_token" text,
	"verification_expires_at" timestamp with time zone,
	"verified_at" timestamp with time zone,
	"verified_by" uuid,
	"scheduled_at" timestamp with time zone,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"failed_at" timestamp with time zone,
	"error_message" text,
	"deleted_record_counts" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "retention_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"policy_id" uuid NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"scope" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"records_processed" integer DEFAULT 0 NOT NULL,
	"records_archived" integer DEFAULT 0 NOT NULL,
	"records_deleted" integer DEFAULT 0 NOT NULL,
	"errors" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"next_run_at" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "retention_policies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"district_id" uuid,
	"school_id" uuid,
	"category" "retention_category" NOT NULL,
	"description" text NOT NULL,
	"retention_days" integer NOT NULL,
	"archive_after_days" integer,
	"delete_after_days" integer NOT NULL,
	"legal_basis" text,
	"applies_to" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"exceptions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"created_by" uuid NOT NULL,
	"approved_by" uuid,
	"approved_at" timestamp with time zone,
	"effective_from" timestamp with time zone DEFAULT now() NOT NULL,
	"effective_until" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "artifact_embeddings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"artifact_id" uuid NOT NULL,
	"class_id" uuid NOT NULL,
	"teacher_id" uuid NOT NULL,
	"embedding" text NOT NULL,
	"model_provider" "embedding_model_provider" NOT NULL,
	"model_name" text NOT NULL,
	"dimensions" integer DEFAULT 1536 NOT NULL,
	"content_type" "artifact_content_type" NOT NULL,
	"content_text" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "embedding_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"message_id" uuid,
	"artifact_id" uuid,
	"knowledge_id" uuid,
	"student_learning_id" uuid,
	"model_provider" "embedding_model_provider" NOT NULL,
	"model_name" text NOT NULL,
	"target_dimensions" integer DEFAULT 1536 NOT NULL,
	"chunk_text" text,
	"chunk_index" integer DEFAULT 0 NOT NULL,
	"chunk_count" integer DEFAULT 1 NOT NULL,
	"status" "embedding_job_status" DEFAULT 'pending' NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"error_message" text,
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 3 NOT NULL,
	"scheduled_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knowledge_embeddings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"collection_name" text NOT NULL,
	"source_id" text NOT NULL,
	"source_type" "knowledge_source_type" NOT NULL,
	"embedding" text NOT NULL,
	"model_provider" "embedding_model_provider" NOT NULL,
	"model_name" text NOT NULL,
	"dimensions" integer DEFAULT 1536 NOT NULL,
	"title" text,
	"content_text" text NOT NULL,
	"chunk_index" integer DEFAULT 0 NOT NULL,
	"chunk_count" integer DEFAULT 1 NOT NULL,
	"subject" text,
	"grade_level" integer,
	"curriculum_standard" text,
	"language" text DEFAULT 'en' NOT NULL,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "message_embeddings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"message_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"class_id" uuid NOT NULL,
	"embedding" text NOT NULL,
	"model_provider" "embedding_model_provider" NOT NULL,
	"model_name" text NOT NULL,
	"dimensions" integer DEFAULT 1536 NOT NULL,
	"chunk_index" integer DEFAULT 0 NOT NULL,
	"chunk_count" integer DEFAULT 1 NOT NULL,
	"chunk_text" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "student_learning_embeddings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"class_id" uuid NOT NULL,
	"session_id" uuid,
	"embedding" text NOT NULL,
	"model_provider" "embedding_model_provider" NOT NULL,
	"model_name" text NOT NULL,
	"dimensions" integer DEFAULT 1536 NOT NULL,
	"embedding_type" "embedding_type" NOT NULL,
	"source_text" text NOT NULL,
	"related_message_ids" uuid[] DEFAULT '{}'::uuid[] NOT NULL,
	"related_intervention_ids" uuid[] DEFAULT '{}'::uuid[] NOT NULL,
	"topic" text,
	"difficulty_level" integer,
	"confidence_score" integer,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "schools" ADD CONSTRAINT "schools_district_id_districts_id_fk" FOREIGN KEY ("district_id") REFERENCES "public"."districts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parents" ADD CONSTRAINT "parents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_parents" ADD CONSTRAINT "student_parents_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_parents" ADD CONSTRAINT "student_parents_parent_id_parents_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."parents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teachers" ADD CONSTRAINT "teachers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_students" ADD CONSTRAINT "class_students_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_students" ADD CONSTRAINT "class_students_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_teacher_id_teachers_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."teachers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tutor_configs" ADD CONSTRAINT "tutor_configs_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tutor_configs" ADD CONSTRAINT "tutor_configs_created_by_teachers_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."teachers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_session_id_tutor_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."tutor_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_summaries" ADD CONSTRAINT "session_summaries_session_id_tutor_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."tutor_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_summaries" ADD CONSTRAINT "session_summaries_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_summaries" ADD CONSTRAINT "session_summaries_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tutor_sessions" ADD CONSTRAINT "tutor_sessions_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tutor_sessions" ADD CONSTRAINT "tutor_sessions_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tutor_sessions" ADD CONSTRAINT "tutor_sessions_tutor_config_id_tutor_configs_id_fk" FOREIGN KEY ("tutor_config_id") REFERENCES "public"."tutor_configs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intervention_actions" ADD CONSTRAINT "intervention_actions_intervention_id_interventions_id_fk" FOREIGN KEY ("intervention_id") REFERENCES "public"."interventions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intervention_actions" ADD CONSTRAINT "intervention_actions_performed_by_teachers_id_fk" FOREIGN KEY ("performed_by") REFERENCES "public"."teachers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interventions" ADD CONSTRAINT "interventions_session_id_tutor_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."tutor_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interventions" ADD CONSTRAINT "interventions_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interventions" ADD CONSTRAINT "interventions_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interventions" ADD CONSTRAINT "interventions_teacher_id_teachers_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."teachers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interventions" ADD CONSTRAINT "interventions_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interventions" ADD CONSTRAINT "interventions_resolved_by_teachers_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."teachers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ags_line_items" ADD CONSTRAINT "ags_line_items_deployment_id_lti_deployments_id_fk" FOREIGN KEY ("deployment_id") REFERENCES "public"."lti_deployments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ags_scores" ADD CONSTRAINT "ags_scores_line_item_id_ags_line_items_id_fk" FOREIGN KEY ("line_item_id") REFERENCES "public"."ags_line_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ags_scores" ADD CONSTRAINT "ags_scores_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ags_scores" ADD CONSTRAINT "ags_scores_session_id_tutor_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."tutor_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lti_deployments" ADD CONSTRAINT "lti_deployments_platform_id_lti_platforms_id_fk" FOREIGN KEY ("platform_id") REFERENCES "public"."lti_platforms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lti_deployments" ADD CONSTRAINT "lti_deployments_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lti_platforms" ADD CONSTRAINT "lti_platforms_district_id_districts_id_fk" FOREIGN KEY ("district_id") REFERENCES "public"."districts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nrps_cache" ADD CONSTRAINT "nrps_cache_deployment_id_lti_deployments_id_fk" FOREIGN KEY ("deployment_id") REFERENCES "public"."lti_deployments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "export_jobs" ADD CONSTRAINT "export_jobs_artifact_id_generated_artifacts_id_fk" FOREIGN KEY ("artifact_id") REFERENCES "public"."generated_artifacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "export_jobs" ADD CONSTRAINT "export_jobs_requested_by_teachers_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."teachers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generated_artifacts" ADD CONSTRAINT "generated_artifacts_session_id_tutor_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."tutor_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generated_artifacts" ADD CONSTRAINT "generated_artifacts_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generated_artifacts" ADD CONSTRAINT "generated_artifacts_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generated_artifacts" ADD CONSTRAINT "generated_artifacts_teacher_id_teachers_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."teachers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generated_artifacts" ADD CONSTRAINT "generated_artifacts_parent_artifact_id_generated_artifacts_id_fk" FOREIGN KEY ("parent_artifact_id") REFERENCES "public"."generated_artifacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generated_artifacts" ADD CONSTRAINT "generated_artifacts_reviewed_by_teachers_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."teachers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_tokens" ADD CONSTRAINT "oauth_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_district_id_districts_id_fk" FOREIGN KEY ("district_id") REFERENCES "public"."districts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_impersonator_id_users_id_fk" FOREIGN KEY ("impersonator_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs_partitioned" ADD CONSTRAINT "audit_logs_partitioned_district_id_districts_id_fk" FOREIGN KEY ("district_id") REFERENCES "public"."districts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs_partitioned" ADD CONSTRAINT "audit_logs_partitioned_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs_partitioned" ADD CONSTRAINT "audit_logs_partitioned_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs_partitioned" ADD CONSTRAINT "audit_logs_partitioned_impersonator_id_users_id_fk" FOREIGN KEY ("impersonator_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_district_id_districts_id_fk" FOREIGN KEY ("district_id") REFERENCES "public"."districts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_witness_id_users_id_fk" FOREIGN KEY ("witness_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_deletion_requests" ADD CONSTRAINT "data_deletion_requests_district_id_districts_id_fk" FOREIGN KEY ("district_id") REFERENCES "public"."districts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_deletion_requests" ADD CONSTRAINT "data_deletion_requests_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_deletion_requests" ADD CONSTRAINT "data_deletion_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_deletion_requests" ADD CONSTRAINT "data_deletion_requests_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_deletion_requests" ADD CONSTRAINT "data_deletion_requests_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_deletion_requests" ADD CONSTRAINT "data_deletion_requests_verified_by_users_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "retention_jobs" ADD CONSTRAINT "retention_jobs_policy_id_retention_policies_id_fk" FOREIGN KEY ("policy_id") REFERENCES "public"."retention_policies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "retention_policies" ADD CONSTRAINT "retention_policies_district_id_districts_id_fk" FOREIGN KEY ("district_id") REFERENCES "public"."districts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "retention_policies" ADD CONSTRAINT "retention_policies_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "retention_policies" ADD CONSTRAINT "retention_policies_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "retention_policies" ADD CONSTRAINT "retention_policies_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "districts_name_idx" ON "districts" USING btree ("name");--> statement-breakpoint
CREATE INDEX "districts_status_idx" ON "districts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "schools_district_id_idx" ON "schools" USING btree ("district_id");--> statement-breakpoint
CREATE UNIQUE INDEX "schools_district_name_idx" ON "schools" USING btree ("district_id","name");--> statement-breakpoint
CREATE INDEX "schools_status_idx" ON "schools" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "parents_user_id_idx" ON "parents" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "student_parents_student_id_idx" ON "student_parents" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "student_parents_parent_id_idx" ON "student_parents" USING btree ("parent_id");--> statement-breakpoint
CREATE UNIQUE INDEX "student_parents_unique_idx" ON "student_parents" USING btree ("student_id","parent_id");--> statement-breakpoint
CREATE UNIQUE INDEX "students_user_id_idx" ON "students" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "students_student_number_idx" ON "students" USING btree ("student_number");--> statement-breakpoint
CREATE INDEX "students_grade_level_idx" ON "students" USING btree ("grade_level");--> statement-breakpoint
CREATE UNIQUE INDEX "teachers_user_id_idx" ON "teachers" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "teachers_employee_id_idx" ON "teachers" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "users_school_id_idx" ON "users" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "users_role_idx" ON "users" USING btree ("role");--> statement-breakpoint
CREATE INDEX "users_status_idx" ON "users" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "users_external_id_idx" ON "users" USING btree ("external_id");--> statement-breakpoint
CREATE INDEX "users_school_role_idx" ON "users" USING btree ("school_id","role");--> statement-breakpoint
CREATE INDEX "class_students_class_id_idx" ON "class_students" USING btree ("class_id");--> statement-breakpoint
CREATE INDEX "class_students_student_id_idx" ON "class_students" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "class_students_active_idx" ON "class_students" USING btree ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "class_students_unique_idx" ON "class_students" USING btree ("class_id","student_id");--> statement-breakpoint
CREATE INDEX "classes_school_id_idx" ON "classes" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "classes_teacher_id_idx" ON "classes" USING btree ("teacher_id");--> statement-breakpoint
CREATE INDEX "classes_status_idx" ON "classes" USING btree ("status");--> statement-breakpoint
CREATE INDEX "classes_term_year_idx" ON "classes" USING btree ("term","year");--> statement-breakpoint
CREATE INDEX "classes_lti_context_id_idx" ON "classes" USING btree ("lti_context_id");--> statement-breakpoint
CREATE UNIQUE INDEX "classes_unique_idx" ON "classes" USING btree ("school_id","name","term","year");--> statement-breakpoint
CREATE UNIQUE INDEX "tutor_configs_class_id_idx" ON "tutor_configs" USING btree ("class_id");--> statement-breakpoint
CREATE INDEX "tutor_configs_active_idx" ON "tutor_configs" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "messages_session_id_idx" ON "messages" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "messages_role_idx" ON "messages" USING btree ("role");--> statement-breakpoint
CREATE INDEX "messages_sequence_idx" ON "messages" USING btree ("session_id","sequence");--> statement-breakpoint
CREATE INDEX "messages_created_at_idx" ON "messages" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "session_summaries_session_id_idx" ON "session_summaries" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "session_summaries_student_id_idx" ON "session_summaries" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "session_summaries_class_id_idx" ON "session_summaries" USING btree ("class_id");--> statement-breakpoint
CREATE INDEX "session_summaries_generated_at_idx" ON "session_summaries" USING btree ("generated_at");--> statement-breakpoint
CREATE INDEX "tutor_sessions_class_id_idx" ON "tutor_sessions" USING btree ("class_id");--> statement-breakpoint
CREATE INDEX "tutor_sessions_student_id_idx" ON "tutor_sessions" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "tutor_sessions_tutor_config_id_idx" ON "tutor_sessions" USING btree ("tutor_config_id");--> statement-breakpoint
CREATE INDEX "tutor_sessions_status_idx" ON "tutor_sessions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "tutor_sessions_started_at_idx" ON "tutor_sessions" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "tutor_sessions_class_student_idx" ON "tutor_sessions" USING btree ("class_id","student_id");--> statement-breakpoint
CREATE INDEX "intervention_actions_intervention_id_idx" ON "intervention_actions" USING btree ("intervention_id");--> statement-breakpoint
CREATE INDEX "intervention_actions_performed_by_idx" ON "intervention_actions" USING btree ("performed_by");--> statement-breakpoint
CREATE INDEX "interventions_session_id_idx" ON "interventions" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "interventions_student_id_idx" ON "interventions" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "interventions_class_id_idx" ON "interventions" USING btree ("class_id");--> statement-breakpoint
CREATE INDEX "interventions_teacher_id_idx" ON "interventions" USING btree ("teacher_id");--> statement-breakpoint
CREATE INDEX "interventions_type_idx" ON "interventions" USING btree ("type");--> statement-breakpoint
CREATE INDEX "interventions_severity_idx" ON "interventions" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "interventions_status_idx" ON "interventions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "interventions_message_id_idx" ON "interventions" USING btree ("message_id");--> statement-breakpoint
CREATE INDEX "interventions_created_at_idx" ON "interventions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "interventions_student_status_idx" ON "interventions" USING btree ("student_id","status");--> statement-breakpoint
CREATE INDEX "ags_line_items_deployment_id_idx" ON "ags_line_items" USING btree ("deployment_id");--> statement-breakpoint
CREATE INDEX "ags_line_items_context_id_idx" ON "ags_line_items" USING btree ("context_id");--> statement-breakpoint
CREATE INDEX "ags_line_items_resource_link_id_idx" ON "ags_line_items" USING btree ("resource_link_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ags_line_items_lti_url_idx" ON "ags_line_items" USING btree ("lti_line_item_url");--> statement-breakpoint
CREATE INDEX "ags_scores_line_item_id_idx" ON "ags_scores" USING btree ("line_item_id");--> statement-breakpoint
CREATE INDEX "ags_scores_user_id_idx" ON "ags_scores" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ags_scores_session_id_idx" ON "ags_scores" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "ags_scores_status_idx" ON "ags_scores" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "ags_scores_unique_idx" ON "ags_scores" USING btree ("line_item_id","user_id");--> statement-breakpoint
CREATE INDEX "lti_deployments_platform_id_idx" ON "lti_deployments" USING btree ("platform_id");--> statement-breakpoint
CREATE INDEX "lti_deployments_school_id_idx" ON "lti_deployments" USING btree ("school_id");--> statement-breakpoint
CREATE UNIQUE INDEX "lti_deployments_deployment_id_idx" ON "lti_deployments" USING btree ("deployment_id");--> statement-breakpoint
CREATE INDEX "lti_deployments_status_idx" ON "lti_deployments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "lti_platforms_district_id_idx" ON "lti_platforms" USING btree ("district_id");--> statement-breakpoint
CREATE UNIQUE INDEX "lti_platforms_issuer_idx" ON "lti_platforms" USING btree ("issuer");--> statement-breakpoint
CREATE UNIQUE INDEX "lti_platforms_client_id_idx" ON "lti_platforms" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "lti_platforms_status_idx" ON "lti_platforms" USING btree ("status");--> statement-breakpoint
CREATE INDEX "nrps_cache_deployment_id_idx" ON "nrps_cache" USING btree ("deployment_id");--> statement-breakpoint
CREATE INDEX "nrps_cache_context_id_idx" ON "nrps_cache" USING btree ("context_id");--> statement-breakpoint
CREATE INDEX "nrps_cache_user_id_idx" ON "nrps_cache" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "nrps_cache_membership_id_idx" ON "nrps_cache" USING btree ("membership_id");--> statement-breakpoint
CREATE UNIQUE INDEX "nrps_cache_deployment_context_user_idx" ON "nrps_cache" USING btree ("deployment_id","context_id","user_id");--> statement-breakpoint
CREATE INDEX "export_jobs_artifact_id_idx" ON "export_jobs" USING btree ("artifact_id");--> statement-breakpoint
CREATE INDEX "export_jobs_requested_by_idx" ON "export_jobs" USING btree ("requested_by");--> statement-breakpoint
CREATE INDEX "export_jobs_status_idx" ON "export_jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "export_jobs_format_idx" ON "export_jobs" USING btree ("format");--> statement-breakpoint
CREATE INDEX "export_jobs_created_at_idx" ON "export_jobs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "generated_artifacts_session_id_idx" ON "generated_artifacts" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "generated_artifacts_student_id_idx" ON "generated_artifacts" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "generated_artifacts_class_id_idx" ON "generated_artifacts" USING btree ("class_id");--> statement-breakpoint
CREATE INDEX "generated_artifacts_teacher_id_idx" ON "generated_artifacts" USING btree ("teacher_id");--> statement-breakpoint
CREATE INDEX "generated_artifacts_type_idx" ON "generated_artifacts" USING btree ("type");--> statement-breakpoint
CREATE INDEX "generated_artifacts_status_idx" ON "generated_artifacts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "generated_artifacts_template_idx" ON "generated_artifacts" USING btree ("is_template");--> statement-breakpoint
CREATE INDEX "generated_artifacts_parent_idx" ON "generated_artifacts" USING btree ("parent_artifact_id");--> statement-breakpoint
CREATE INDEX "generated_artifacts_created_at_idx" ON "generated_artifacts" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "oauth_tokens_user_id_idx" ON "oauth_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "oauth_tokens_provider_idx" ON "oauth_tokens" USING btree ("provider");--> statement-breakpoint
CREATE UNIQUE INDEX "oauth_tokens_provider_user_idx" ON "oauth_tokens" USING btree ("provider","provider_user_id");--> statement-breakpoint
CREATE INDEX "oauth_tokens_active_idx" ON "oauth_tokens" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "oauth_tokens_expires_at_idx" ON "oauth_tokens" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "audit_logs_district_id_idx" ON "audit_logs" USING btree ("district_id");--> statement-breakpoint
CREATE INDEX "audit_logs_school_id_idx" ON "audit_logs" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "audit_logs_action_idx" ON "audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "audit_logs_resource_type_idx" ON "audit_logs" USING btree ("resource_type");--> statement-breakpoint
CREATE INDEX "audit_logs_resource_idx" ON "audit_logs" USING btree ("resource_type","resource_id");--> statement-breakpoint
CREATE INDEX "audit_logs_severity_idx" ON "audit_logs" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "audit_logs_request_id_idx" ON "audit_logs" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "audit_logs_session_id_idx" ON "audit_logs" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "audit_logs_partitioned_created_at_idx" ON "audit_logs_partitioned" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "consent_records_district_id_idx" ON "consent_records" USING btree ("district_id");--> statement-breakpoint
CREATE INDEX "consent_records_school_id_idx" ON "consent_records" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "consent_records_user_id_idx" ON "consent_records" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "consent_records_student_id_idx" ON "consent_records" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "consent_records_type_idx" ON "consent_records" USING btree ("type");--> statement-breakpoint
CREATE INDEX "consent_records_status_idx" ON "consent_records" USING btree ("status");--> statement-breakpoint
CREATE INDEX "consent_records_version_idx" ON "consent_records" USING btree ("version");--> statement-breakpoint
CREATE UNIQUE INDEX "consent_records_user_type_version_idx" ON "consent_records" USING btree ("user_id","type","version");--> statement-breakpoint
CREATE INDEX "consent_records_expires_at_idx" ON "consent_records" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "data_deletion_requests_district_id_idx" ON "data_deletion_requests" USING btree ("district_id");--> statement-breakpoint
CREATE INDEX "data_deletion_requests_school_id_idx" ON "data_deletion_requests" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "data_deletion_requests_user_id_idx" ON "data_deletion_requests" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "data_deletion_requests_student_id_idx" ON "data_deletion_requests" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "data_deletion_requests_status_idx" ON "data_deletion_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "data_deletion_requests_requested_by_idx" ON "data_deletion_requests" USING btree ("requested_by");--> statement-breakpoint
CREATE INDEX "data_deletion_requests_verification_token_idx" ON "data_deletion_requests" USING btree ("verification_token");--> statement-breakpoint
CREATE INDEX "data_deletion_requests_scheduled_at_idx" ON "data_deletion_requests" USING btree ("scheduled_at");--> statement-breakpoint
CREATE INDEX "retention_jobs_policy_id_idx" ON "retention_jobs" USING btree ("policy_id");--> statement-breakpoint
CREATE INDEX "retention_jobs_status_idx" ON "retention_jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "retention_jobs_next_run_at_idx" ON "retention_jobs" USING btree ("next_run_at");--> statement-breakpoint
CREATE INDEX "retention_policies_district_id_idx" ON "retention_policies" USING btree ("district_id");--> statement-breakpoint
CREATE INDEX "retention_policies_school_id_idx" ON "retention_policies" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "retention_policies_category_idx" ON "retention_policies" USING btree ("category");--> statement-breakpoint
CREATE INDEX "retention_policies_active_idx" ON "retention_policies" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "retention_policies_effective_idx" ON "retention_policies" USING btree ("effective_from","effective_until");--> statement-breakpoint
CREATE INDEX "retention_policies_priority_idx" ON "retention_policies" USING btree ("priority");--> statement-breakpoint
CREATE UNIQUE INDEX "retention_policies_unique_idx" ON "retention_policies" USING btree ("district_id","school_id","category");--> statement-breakpoint
CREATE INDEX "idx_artifact_embeddings_class" ON "artifact_embeddings" USING btree ("class_id");--> statement-breakpoint
CREATE INDEX "idx_artifact_embeddings_teacher" ON "artifact_embeddings" USING btree ("teacher_id");--> statement-breakpoint
CREATE INDEX "idx_artifact_embeddings_type" ON "artifact_embeddings" USING btree ("content_type");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_artifact_content_type" ON "artifact_embeddings" USING btree ("artifact_id","content_type");--> statement-breakpoint
CREATE INDEX "idx_embedding_jobs_queue" ON "embedding_jobs" USING btree ("status","priority","scheduled_at");--> statement-breakpoint
CREATE INDEX "idx_embedding_jobs_message" ON "embedding_jobs" USING btree ("message_id");--> statement-breakpoint
CREATE INDEX "idx_embedding_jobs_artifact" ON "embedding_jobs" USING btree ("artifact_id");--> statement-breakpoint
CREATE INDEX "idx_embedding_jobs_knowledge" ON "embedding_jobs" USING btree ("knowledge_id");--> statement-breakpoint
CREATE INDEX "idx_embedding_jobs_student_learning" ON "embedding_jobs" USING btree ("student_learning_id");--> statement-breakpoint
CREATE INDEX "idx_knowledge_embeddings_collection" ON "knowledge_embeddings" USING btree ("collection_name");--> statement-breakpoint
CREATE INDEX "idx_knowledge_embeddings_subject_grade" ON "knowledge_embeddings" USING btree ("subject","grade_level");--> statement-breakpoint
CREATE INDEX "idx_knowledge_embeddings_standard" ON "knowledge_embeddings" USING btree ("curriculum_standard");--> statement-breakpoint
CREATE INDEX "idx_knowledge_embeddings_tags" ON "knowledge_embeddings" USING btree ("tags");--> statement-breakpoint
CREATE INDEX "idx_knowledge_embeddings_source" ON "knowledge_embeddings" USING btree ("source_type","source_id");--> statement-breakpoint
CREATE INDEX "idx_knowledge_embeddings_hybrid" ON "knowledge_embeddings" USING btree ("collection_name","subject","grade_level","language");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_knowledge_chunk" ON "knowledge_embeddings" USING btree ("collection_name","source_id","chunk_index");--> statement-breakpoint
CREATE INDEX "idx_message_embeddings_session" ON "message_embeddings" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "idx_message_embeddings_student" ON "message_embeddings" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "idx_message_embeddings_class" ON "message_embeddings" USING btree ("class_id");--> statement-breakpoint
CREATE INDEX "idx_message_embeddings_model" ON "message_embeddings" USING btree ("model_provider","model_name");--> statement-breakpoint
CREATE INDEX "idx_message_embeddings_created" ON "message_embeddings" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_message_chunk" ON "message_embeddings" USING btree ("message_id","chunk_index");--> statement-breakpoint
CREATE INDEX "idx_student_learning_embeddings_student" ON "student_learning_embeddings" USING btree ("student_id","embedding_type");--> statement-breakpoint
CREATE INDEX "idx_student_learning_embeddings_class" ON "student_learning_embeddings" USING btree ("class_id","embedding_type");--> statement-breakpoint
CREATE INDEX "idx_student_learning_embeddings_type" ON "student_learning_embeddings" USING btree ("embedding_type");--> statement-breakpoint
CREATE INDEX "idx_student_learning_embeddings_topic" ON "student_learning_embeddings" USING btree ("topic");