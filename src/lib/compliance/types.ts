/**
 * Compliance Types - FERPA, COPPA, GDPR
 * Centralized type definitions for compliance features
 */

// ============================================================================
// COPPA (Children's Online Privacy Protection Act)
// ============================================================================

export interface CoppaConsentRequest {
  studentId: string;
  parentId: string;
  consentTypes: CoppaConsentType[];
  method: 'email' | 'signed_form' | 'video_call' | 'credit_card' | 'government_id';
  ipAddress?: string;
  userAgent?: string;
}

export type CoppaConsentType = 
  | 'data_collection'
  | 'data_sharing'
  | 'ai_interaction'
  | 'analytics'
  | 'third_party_services'
  | 'marketing'
  | 'custom';

export interface CoppaConsentRecord {
  id: string;
  studentId: string;
  parentId: string;
  type: CoppaConsentType;
  status: 'granted' | 'denied' | 'withdrawn' | 'expired' | 'pending';
  version: string;
  policyUrl?: string;
  consentText?: string;
  method: string;
  ipAddress?: string;
  userAgent?: string;
  witnessId?: string;
  grantedAt?: Date;
  withdrawnAt?: Date;
  expiresAt?: Date;
  metadata: Record<string, any>;
}

// ============================================================================
// FERPA (Family Educational Rights and Privacy Act)
// ============================================================================

export interface FerpaDirectoryInfoOptOut {
  studentId: string;
  requestedBy: string; // parent or eligible student
  fields: FerpaDirectoryField[];
  status: 'pending' | 'approved' | 'denied';
  reason?: string;
  effectiveFrom: Date;
  effectiveUntil?: Date;
  metadata: Record<string, any>;
}

export type FerpaDirectoryField = 
  | 'name'
  | 'address'
  | 'phone'
  | 'email'
  | 'date_of_birth'
  | 'place_of_birth'
  | 'major'
  | 'enrollment_status'
  | 'dates_of_attendance'
  | 'grade_level'
  | 'participation_in_activities'
  | 'weight_height_athletes'
  | 'degrees_awards'
  | 'most_recent_school'
  | 'photo'
  | 'custom';

export interface FerpaRecordRequest {
  studentId: string;
  requestedBy: string; // parent or eligible student
  requestType: 'inspect' | 'amend' | 'disclosure_log';
  recordTypes: string[];
  status: 'pending' | 'fulfilled' | 'denied';
  response?: string;
  metadata: Record<string, any>;
}

// ============================================================================
// GDPR (General Data Protection Regulation)
// ============================================================================

export interface GdprDataSubjectRequest {
  id?: string;
  userId: string;
  requestType: GdprRequestType;
  status: 'pending' | 'in_progress' | 'completed' | 'rejected' | 'cancelled';
  details: Record<string, any>;
  response?: string;
  deadline?: Date;
  metadata: Record<string, any>;
}

export type GdprRequestType = 
  | 'access'           // Article 15 - Right of access
  | 'rectification'    // Article 16 - Right to rectification
  | 'erasure'          // Article 17 - Right to erasure (right to be forgotten)
  | 'restriction'      // Article 18 - Right to restriction of processing
  | 'portability'      // Article 20 - Right to data portability
  | 'objection'        // Article 21 - Right to object
  | 'automated_decision'; // Article 22 - Automated decision-making

export interface GdprDataExport {
  userId: string;
  format: 'json' | 'csv' | 'pdf';
  includeTables: string[];
  dateRange?: { from: Date; to: Date };
  status: 'pending' | 'generating' | 'ready' | 'failed';
  downloadUrl?: string;
  expiresAt?: Date;
  metadata: Record<string, any>;
}

// ============================================================================
// Data Retention
// ============================================================================

export interface RetentionPolicyConfig {
  category: RetentionCategory;
  description: string;
  retentionDays: number;
  archiveAfterDays?: number;
  deleteAfterDays: number;
  legalBasis?: string;
  appliesTo: {
    roles?: string[];
    dataTypes?: string[];
    conditions?: Record<string, any>;
  };
  exceptions: RetentionException[];
}

export type RetentionCategory = 
  | 'audit_logs'
  | 'tutor_sessions'
  | 'messages'
  | 'interventions'
  | 'generated_artifacts'
  | 'export_jobs'
  | 'nrps_cache'
  | 'ags_scores'
  | 'oauth_tokens'
  | 'consent_records'
  | 'user_profiles'
  | 'lti_data'
  | 'analytics'
  | 'backups'
  | 'push_subscriptions'
  | 'session_summaries'
  | 'custom';

export interface RetentionException {
  condition: string;
  extendedDays: number;
  reason: string;
}

export interface RetentionJobResult {
  policyId: string;
  recordsProcessed: number;
  recordsArchived: number;
  recordsDeleted: number;
  errors: Array<{ table: string; error: string }>;
  durationMs: number;
}

// ============================================================================
// Consent Management
// ============================================================================

export interface ConsentPolicyVersion {
  type: ConsentType;
  version: string;
  effectiveDate: Date;
  policyUrl: string;
  consentText: string;
  required: boolean;
  requiresParentalConsent: boolean; // For COPPA
  ageThreshold?: number; // Age below which parental consent required
}

export type ConsentType = 
  | 'terms_of_service'
  | 'privacy_policy'
  | 'data_processing'
  | 'ai_interaction'
  | 'data_sharing'
  | 'marketing'
  | 'analytics'
  | 'third_party_services'
  | 'parental_consent'
  | 'ferpa_consent'
  | 'coppa_consent'
  | 'gdpr_consent'
  | 'state_privacy_law'
  | 'custom';

export interface UserConsentStatus {
  userId: string;
  consents: ConsentStatusItem[];
  needsUpdate: boolean;
  missingRequired: ConsentType[];
}

export interface ConsentStatusItem {
  type: ConsentType;
  status: 'granted' | 'denied' | 'withdrawn' | 'expired' | 'pending';
  version: string;
  grantedAt?: Date;
  withdrawnAt?: Date;
  expiresAt?: Date;
}

// ============================================================================
// Audit Events
// ============================================================================

export interface ComplianceAuditEvent {
  action: ComplianceAuditAction;
  resourceType: string;
  resourceId?: string;
  userId?: string;
  studentId?: string;
  districtId?: string;
  schoolId?: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  description: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  sessionId?: string;
  metadata: Record<string, any>;
}

export type ComplianceAuditAction = 
  // Consent
  | 'consent_granted'
  | 'consent_denied'
  | 'consent_withdrawn'
  | 'consent_expired'
  | 'parental_consent_requested'
  | 'parental_consent_received'
  | 'parental_consent_denied'
  // Data Deletion
  | 'deletion_requested'
  | 'deletion_verified'
  | 'deletion_scheduled'
  | 'deletion_started'
  | 'deletion_completed'
  | 'deletion_failed'
  | 'deletion_cancelled'
  // Retention
  | 'retention_policy_created'
  | 'retention_policy_updated'
  | 'retention_policy_deactivated'
  | 'retention_job_started'
  | 'retention_job_completed'
  | 'retention_job_failed'
  // Content Filter
  | 'content_filter_pass'
  | 'content_filter_block'
  // FERPA
  | 'ferpa_optout_requested'
  | 'ferpa_optout_approved'
  | 'ferpa_optout_denied'
  | 'ferpa_record_requested'
  | 'ferpa_record_fulfilled'
  | 'ferpa_record_denied'
  | 'ferpa_disclosure_logged'
  // GDPR
  | 'gdpr_access_requested'
  | 'gdpr_access_fulfilled'
  | 'gdpr_rectification_requested'
  | 'gdpr_rectification_completed'
  | 'gdpr_erasure_requested'
  | 'gdpr_erasure_completed'
  | 'gdpr_portability_requested'
  | 'gdpr_portability_fulfilled'
  | 'gdpr_objection_logged'
  // COPPA
  | 'coppa_age_verified'
  | 'coppa_consent_expired_notification'
  | 'coppa_data_deletion_requested'
  // General
  | 'privacy_policy_updated'
  | 'terms_updated'
  | 'data_breach_detected'
  | 'data_breach_notified'
  // LTI Platform
  | 'lti_platform_created'
  | 'lti_platform_updated'
  | 'lti_platform_deleted'
  | 'lti_platform_keys_rotated'
  | 'lti_deployment_created'
  | 'lti_deployment_updated'
  | 'lti_deployment_deleted'
  // LTI Launch
  | 'lti_launch_initiated'
  | 'lti_launch_succeeded'
  | 'lti_launch_failed'
  // Google Classroom
  | 'google_classroom_connected'
  | 'google_classroom_sync_started';

// ============================================================================
// Age Verification
// ============================================================================

export interface AgeVerificationResult {
  userId: string;
  dateOfBirth: Date;
  age: number;
  isMinor: boolean; // Under 18
  isChild: boolean; // Under 13 (COPPA)
  requiresParentalConsent: boolean;
  verifiedAt: Date;
  method: 'self_reported' | 'parent_verified' | 'document_verified' | 'third_party';
  metadata: Record<string, any>;
}

// ============================================================================
// Policy Documents
// ============================================================================

export interface PolicyDocument {
  id: string;
  type: ConsentType;
  version: string;
  title: string;
  content: string;
  effectiveDate: Date;
  expiryDate?: Date;
  isActive: boolean;
  language: string; // Currently only 'en'
  metadata: Record<string, any>;
}