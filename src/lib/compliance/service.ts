/**
 * Compliance Service - Core business logic for FERPA, COPPA, GDPR
 */

import { getDb } from '@/lib/db';
import {
  consentRecords,
  dataDeletionRequests,
  retentionPolicies,
  retentionJobs,
  users,
  students,
  districts,
  schools,
} from '@/db/schema';
import { eq, and, gte, lte, lt, desc, or, sql, count } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import {
  CoppaConsentRequest,
  CoppaConsentRecord,
  CoppaConsentType,
  FerpaDirectoryInfoOptOut,
  FerpaDirectoryField,
  GdprDataSubjectRequest,
  GdprDataExport,
  RetentionPolicyConfig,
  RetentionJobResult,
  ConsentPolicyVersion,
  ConsentType,
  UserConsentStatus,
  ConsentStatusItem,
  ComplianceAuditEvent,
  AgeVerificationResult,
  PolicyDocument,
} from './types';
import { createAuditLog } from './audit';
import { executeRetentionJob } from './retention-engine';

// ============================================================================
// COPPA - Children's Online Privacy Protection Act
// ============================================================================

/**
 * Check if a student requires parental consent (under 13)
 */
export async function checkCoppaRequirement(studentId: string): Promise<{
  requiresConsent: boolean;
  age: number;
  dateOfBirth: Date;
}> {
  const database = getDb();
  const [student] = await database
    .select({ dateOfBirth: students.dateOfBirth })
    .from(students)
    .where(eq(students.id, studentId))
    .limit(1);

  if (!student?.dateOfBirth) {
    // No DOB - assume consent required for safety
    return { requiresConsent: true, age: 0, dateOfBirth: new Date() };
  }

  const dob = new Date(student.dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }

  return {
    requiresConsent: age < 13,
    age,
    dateOfBirth: dob,
  };
}

/**
 * Request parental consent for COPPA-covered activities
 */
export async function requestParentalConsent(
  request: CoppaConsentRequest,
  requestedBy: string
): Promise<CoppaConsentRecord[]> {
  const database = getDb();
  const results: CoppaConsentRecord[] = [];

  // Get current policy versions
  const policies = await getConsentPolicyVersions();

  for (const consentType of request.consentTypes) {
    const policy = policies.find(p => p.type === consentType);
    if (!policy) {
      throw new Error(`Policy not found for consent type: ${consentType}`);
    }

    // Create pending consent record
    const [record] = await database
      .insert(consentRecords)
      .values({
        studentId: request.studentId,
        userId: request.parentId,
        type: consentType as any,
        status: 'pending',
        version: policy.version,
        policyUrl: policy.policyUrl,
        consentText: policy.consentText,
        ipAddress: request.ipAddress,
        userAgent: request.userAgent,
        metadata: {
          method: request.method,
          requestedBy,
          requestedAt: new Date().toISOString(),
        },
      })
      .returning();

    results.push(record as any);

    // Audit log
    await createAuditLog({
      action: 'parental_consent_requested',
      resourceType: 'consent_record',
      resourceId: record.id,
      userId: request.parentId,
      studentId: request.studentId,
      severity: 'info',
      description: `Parental consent requested for ${consentType}`,
      metadata: { consentType, method: request.method },
    });
  }

  return results;
}

/**
 * Process parental consent response (grant/deny)
 */
export async function processParentalConsent(
  consentRecordId: string,
  parentId: string,
  granted: boolean,
  ipAddress?: string,
  userAgent?: string
): Promise<CoppaConsentRecord> {
  const database = getDb();

  const [record] = await database
    .select()
    .from(consentRecords)
    .where(eq(consentRecords.id, consentRecordId))
    .limit(1);

  if (!record) {
    throw new Error('Consent record not found');
  }

  if (record.userId !== parentId) {
    throw new Error('Unauthorized: not the consenting parent');
  }

  if (record.status !== 'pending') {
    throw new Error(`Consent already ${record.status}`);
  }

  const newStatus = granted ? 'granted' : 'denied';
  const now = new Date();

  const [updated] = await database
    .update(consentRecords)
    .set({
      status: newStatus as any,
      grantedAt: granted ? now : null,
      withdrawnAt: !granted ? now : null,
      ipAddress: ipAddress || record.ipAddress,
      userAgent: userAgent || record.userAgent,
      updatedAt: now,
      metadata: {
        ...(record.metadata as Record<string, any>),
        processedAt: now.toISOString(),
        processedBy: parentId,
      },
    })
    .where(eq(consentRecords.id, consentRecordId))
    .returning();

  await createAuditLog({
    action: granted ? 'parental_consent_received' : 'parental_consent_denied',
    resourceType: 'consent_record',
    resourceId: consentRecordId,
    userId: parentId,
    studentId: record.studentId || undefined,
    severity: 'info',
    description: `Parental consent ${granted ? 'granted' : 'denied'} for ${record.type}`,
    oldValues: { status: record.status },
    newValues: { status: newStatus },
    ipAddress,
    userAgent,
    metadata: { consentType: record.type },
  });

  return updated as any;
}

/**
 * Withdraw previously granted consent
 */
export async function withdrawConsent(
  consentRecordId: string,
  userId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<CoppaConsentRecord> {
  const database = getDb();

  const [record] = await database
    .select()
    .from(consentRecords)
    .where(eq(consentRecords.id, consentRecordId))
    .limit(1);

  if (!record) {
    throw new Error('Consent record not found');
  }

  if (record.userId !== userId) {
    throw new Error('Unauthorized');
  }

  if (record.status !== 'granted') {
    throw new Error(`Cannot withdraw consent with status: ${record.status}`);
  }

  const now = new Date();
  const [updated] = await database
    .update(consentRecords)
    .set({
      status: 'withdrawn',
      withdrawnAt: now,
      ipAddress: ipAddress || record.ipAddress,
      userAgent: userAgent || record.userAgent,
      updatedAt: now,
      metadata: {
        ...(record.metadata as Record<string, any>),
        withdrawnAt: now.toISOString(),
        withdrawnBy: userId,
      },
    })
    .where(eq(consentRecords.id, consentRecordId))
    .returning();

  await createAuditLog({
    action: 'consent_withdrawn',
    resourceType: 'consent_record',
    resourceId: consentRecordId,
    userId,
    studentId: record.studentId || undefined,
    severity: 'warning',
    description: `Consent withdrawn for ${record.type}`,
    oldValues: { status: record.status },
    newValues: { status: 'withdrawn' },
    ipAddress,
    userAgent,
    metadata: { consentType: record.type },
  });

  return updated as any;
}

/**
 * Get all consent records for a student
 */
export async function getStudentConsents(studentId: string): Promise<CoppaConsentRecord[]> {
  const database = getDb();
  const records = await database
    .select()
    .from(consentRecords)
    .where(eq(consentRecords.studentId, studentId));
  return records as any;
}

// ============================================================================
// FERPA - Family Educational Rights and Privacy Act
// ============================================================================

/**
 * Submit directory information opt-out request
 */
export async function submitFerpaOptOut(
  optOut: Omit<FerpaDirectoryInfoOptOut, 'status'>,
  requestedBy: string
): Promise<FerpaDirectoryInfoOptOut> {
  const database = getDb();

  const [record] = await database
    .insert(consentRecords)
    .values({
      studentId: optOut.studentId,
      userId: requestedBy,
      type: 'ferpa_consent' as any,
      status: 'pending',
      version: '1.0',
      consentText: `Directory information opt-out: ${optOut.fields.join(', ')}`,
      metadata: {
        ferpaOptOut: true,
        fields: optOut.fields,
        reason: optOut.reason,
        effectiveFrom: optOut.effectiveFrom.toISOString(),
        effectiveUntil: optOut.effectiveUntil?.toISOString(),
      },
    })
    .returning();

  await createAuditLog({
    action: 'ferpa_optout_requested',
    resourceType: 'consent_record',
    resourceId: record.id,
    userId: requestedBy,
    studentId: optOut.studentId,
    severity: 'info',
    description: `FERPA directory information opt-out requested: ${optOut.fields.join(', ')}`,
    metadata: { fields: optOut.fields, reason: optOut.reason },
  });

  return {
    studentId: optOut.studentId,
    requestedBy: optOut.requestedBy,
    fields: optOut.fields,
    status: 'pending' as any,
    reason: optOut.reason,
    effectiveFrom: optOut.effectiveFrom,
    effectiveUntil: optOut.effectiveUntil,
    metadata: optOut.metadata,
  };
}

/**
 * Process FERPA opt-out request (approve/deny)
 */
export async function processFerpaOptOut(
  optOutId: string,
  adminId: string,
  approved: boolean,
  reason?: string
): Promise<FerpaDirectoryInfoOptOut> {
  const database = getDb();

  const [record] = await database
    .select()
    .from(consentRecords)
    .where(eq(consentRecords.id, optOutId))
    .limit(1);

  if (!record) {
    throw new Error('Opt-out request not found');
  }

  const newStatus = approved ? 'granted' : 'denied';
  const now = new Date();

  await database
    .update(consentRecords)
    .set({
      status: newStatus as any,
      grantedAt: approved ? now : null,
      withdrawnAt: !approved ? now : null,
      updatedAt: now,
      metadata: {
        ...(record.metadata as Record<string, any>),
        processedAt: now.toISOString(),
        processedBy: adminId,
        adminReason: reason,
      },
    })
    .where(eq(consentRecords.id, optOutId));

  const metadata = (record.metadata as Record<string, any>) || {};
  await createAuditLog({
    action: approved ? 'ferpa_optout_approved' : 'ferpa_optout_denied',
    resourceType: 'consent_record',
    resourceId: optOutId,
    userId: adminId,
    studentId: record.studentId || undefined,
    severity: 'info',
    description: `FERPA opt-out ${approved ? 'approved' : 'denied'}`,
    metadata: { fields: (metadata.fields as string[]) || [], reason: reason || '' },
  });
  return {
    studentId: record.studentId!,
    requestedBy: record.userId,
    fields: (metadata.fields as FerpaDirectoryField[]) || [],
    status: newStatus as any,
    reason: metadata.reason,
    effectiveFrom: metadata.effectiveFrom ? new Date(metadata.effectiveFrom) : new Date(),
    effectiveUntil: metadata.effectiveUntil ? new Date(metadata.effectiveUntil) : undefined,
    metadata,
  };
}

/**
 * Check if directory information can be disclosed
 */
export async function checkFerpaDirectoryDisclosure(
  studentId: string,
  field: FerpaDirectoryField
): Promise<boolean> {
  const database = getDb();

  // Check for active opt-out
  const optOuts = await database
    .select()
    .from(consentRecords)
    .where(
      and(
        eq(consentRecords.studentId, studentId),
        eq(consentRecords.type, 'ferpa_consent' as any),
        eq(consentRecords.status, 'granted' as any)
      )
    );

  for (const optOut of optOuts) {
    const metadata = optOut.metadata as Record<string, any> || {};
    const fields = metadata.fields as FerpaDirectoryField[] || [];
    if (fields.includes(field)) {
      // Check if opt-out is currently effective
      const effectiveFrom = metadata.effectiveFrom ? new Date(metadata.effectiveFrom) : null;
      const effectiveUntil = metadata.effectiveUntil ? new Date(metadata.effectiveUntil) : null;
      const now = new Date();

      if (effectiveFrom && now < effectiveFrom) continue;
      if (effectiveUntil && now > effectiveUntil) continue;

      return false; // Opt-out is active for this field
    }
  }

  return true; // No active opt-out for this field
}

// ============================================================================
// GDPR - General Data Protection Regulation
// ============================================================================

/**
 * Submit GDPR data subject request
 */
export async function submitGdprRequest(
  request: Omit<GdprDataSubjectRequest, 'status'>,
  userId: string
): Promise<GdprDataSubjectRequest> {
  const database = getDb();

  // Calculate deadline (30 days for most requests)
  const deadline = new Date();
  deadline.setDate(deadline.getDate() + 30);

  const [record] = await database
    .insert(dataDeletionRequests)
    .values({
      userId: request.userId,
      requestedBy: userId,
      status: 'requested',
      reason: `GDPR ${request.requestType} request`,
      legalBasis: `GDPR Article ${getGdprArticle(request.requestType)}`,
      scope: request.details,
      verificationToken: randomUUID(),
      verificationExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      metadata: {
        gdprRequest: true,
        requestType: request.requestType,
        deadline: deadline.toISOString(),
        ...request.metadata,
      },
    })
    .returning();

  await createAuditLog({
    action: `gdpr_${request.requestType}_requested` as any,
    resourceType: 'data_deletion_request',
    resourceId: record.id,
    userId,
    severity: 'info',
    description: `GDPR ${request.requestType} request submitted`,
    metadata: { requestType: request.requestType, deadline: deadline.toISOString() },
  });

  return {
    id: record.id,
    userId: request.userId,
    requestType: request.requestType,
    status: 'pending' as any,
    details: request.details,
    deadline,
    metadata: request.metadata,
  };
}

/**
 * Process GDPR request
 */
export async function processGdprRequest(
  requestId: string,
  adminId: string,
  action: 'approve' | 'reject' | 'complete',
  response?: string
): Promise<GdprDataSubjectRequest> {
  const database = getDb();

  const [record] = await database
    .select()
    .from(dataDeletionRequests)
    .where(eq(dataDeletionRequests.id, requestId))
    .limit(1);

  if (!record) {
    throw new Error('GDPR request not found');
  }

  const metadata = record.metadata as Record<string, any> || {};
  const requestType = metadata.requestType as string;
  const now = new Date();

  let newStatus: string;
  let auditAction: string;

  switch (action) {
    case 'approve':
      newStatus = 'verified';
      auditAction = `gdpr_${requestType}_requested`; // Already logged as requested
      break;
    case 'reject':
      newStatus = 'rejected';
      auditAction = `gdpr_${requestType}_requested`;
      break;
    case 'complete':
      newStatus = 'completed';
      auditAction = `gdpr_${requestType}_fulfilled`;
      break;
    default:
      throw new Error('Invalid action');
  }

  await database
    .update(dataDeletionRequests)
    .set({
      status: newStatus as any,
      verifiedAt: action === 'approve' ? now : record.verifiedAt,
      verifiedBy: action === 'approve' ? adminId : record.verifiedBy,
      completedAt: action === 'complete' ? now : record.completedAt,
      errorMessage: action === 'reject' ? response : null,
      updatedAt: now,
      metadata: {
        ...(record.metadata as Record<string, any>),
        processedAt: now.toISOString(),
        processedBy: adminId,
        adminResponse: response,
      },
    })
    .where(eq(dataDeletionRequests.id, requestId));

  await createAuditLog({
    action: auditAction as any,
    resourceType: 'data_deletion_request',
    resourceId: requestId,
    userId: adminId,
    severity: 'info',
    description: `GDPR ${requestType} request ${action}`,
    metadata: { requestType, response: response || '' },
  });

  return {
    id: record.id,
    userId: record.userId,
    requestType: requestType as any,
    status: newStatus as any,
    details: record.scope as Record<string, any>,
    response,
    metadata: record.metadata as Record<string, any>,
  };
}

/**
 * Generate GDPR data export
 */
export async function generateGdprExport(
  userId: string,
  format: 'json' | 'csv' | 'pdf',
  includeTables: string[],
  dateRange?: { from: Date; to: Date }
): Promise<GdprDataExport> {
  const database = getDb();

  const [exportRecord] = await database
    .insert(dataDeletionRequests)
    .values({
      userId,
      requestedBy: userId,
      status: 'requested',
      reason: 'GDPR data portability export',
      legalBasis: 'GDPR Article 20',
      scope: { format, includeTables, dateRange: dateRange ? { from: dateRange.from.toISOString(), to: dateRange.to.toISOString() } : null },
      metadata: {
        gdprExport: true,
        format,
        includeTables,
        status: 'generating',
      },
    })
    .returning();

  // In production, this would trigger an async job
  // For now, return the export record
  return {
    userId,
    format,
    includeTables,
    dateRange,
    status: 'generating',
    metadata: exportRecord.metadata as Record<string, any>,
  };
}

function getGdprArticle(requestType: string): number {
  const articles: Record<string, number> = {
    access: 15,
    rectification: 16,
    erasure: 17,
    restriction: 18,
    portability: 20,
    objection: 21,
    automated_decision: 22,
  };
  return articles[requestType] || 0;
}

// ============================================================================
// Data Retention
// ============================================================================

/**
 * Create a retention policy
 */
export async function createRetentionPolicy(
  config: RetentionPolicyConfig,
  createdBy: string,
  districtId?: string,
  schoolId?: string
) {
  const database = getDb();

  const [policy] = await database
    .insert(retentionPolicies)
    .values({
      districtId: districtId || null,
      schoolId: schoolId || null,
      category: config.category as any,
      description: config.description,
      retentionDays: config.retentionDays,
      archiveAfterDays: config.archiveAfterDays,
      deleteAfterDays: config.deleteAfterDays,
      legalBasis: config.legalBasis,
      appliesTo: config.appliesTo,
      exceptions: config.exceptions,
      isActive: true,
      priority: 0,
      createdBy,
      effectiveFrom: new Date(),
    })
    .returning();

  await createAuditLog({
    action: 'retention_policy_created',
    resourceType: 'retention_policy',
    resourceId: policy.id,
    userId: createdBy,
    districtId: districtId,
    schoolId: schoolId,
    severity: 'info',
    description: `Retention policy created for ${config.category}`,
    newValues: {
      category: config.category,
      retentionDays: config.retentionDays,
      deleteAfterDays: config.deleteAfterDays,
    },
    metadata: {},
  });

  return policy;
}

/**
 * Run retention job for a policy (delegates to retention-engine)
 */
export async function runRetentionJob(policyId: string, triggeredBy: string): Promise<RetentionJobResult> {
  return executeRetentionJob(policyId, triggeredBy);
}

/**
 * Run all active retention policies (for cron job)
 */
export async function runAllRetentionPolicies(
  triggeredBy: string,
  districtId?: string,
  schoolId?: string
): Promise<RetentionJobResult[]> {
  const { runAllRetentionPolicies: runAll } = await import('./retention-engine');
  return runAll(triggeredBy, districtId, schoolId);
}

/**
 * Create default retention policies for a district
 */
export async function createDefaultRetentionPolicies(
  districtId: string | null,
  schoolId: string | null,
  createdBy: string
): Promise<void> {
  const { createDefaultRetentionPolicies: createDefaults } = await import('./retention-engine');
  return createDefaults(districtId, schoolId, createdBy);
}

/**
 * Get retention policies for a scope
 */
export async function getRetentionPolicies(districtId?: string, schoolId?: string) {
  const database = getDb();

  const conditions = [];
  if (districtId) conditions.push(eq(retentionPolicies.districtId, districtId));
  if (schoolId) conditions.push(eq(retentionPolicies.schoolId, schoolId));

  return database
    .select()
    .from(retentionPolicies)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(retentionPolicies.createdAt));
}

// ============================================================================
// Consent Management
// ============================================================================

/**
 * Get current policy versions
 */
export async function getConsentPolicyVersions(): Promise<ConsentPolicyVersion[]> {
  // In production, this would come from a policy_versions table
  // For now, return hardcoded defaults
  return [
    {
      type: 'terms_of_service',
      version: '1.0',
      effectiveDate: new Date('2024-01-01'),
      policyUrl: '/policies/terms',
      consentText: 'I agree to the Terms of Service',
      required: true,
      requiresParentalConsent: false,
    },
    {
      type: 'privacy_policy',
      version: '1.0',
      effectiveDate: new Date('2024-01-01'),
      policyUrl: '/policies/privacy',
      consentText: 'I agree to the Privacy Policy',
      required: true,
      requiresParentalConsent: false,
    },
    {
      type: 'data_processing',
      version: '1.0',
      effectiveDate: new Date('2024-01-01'),
      policyUrl: '/policies/data-processing',
      consentText: 'I consent to the processing of my personal data',
      required: true,
      requiresParentalConsent: true,
      ageThreshold: 13,
    },
    {
      type: 'ai_interaction',
      version: '1.0',
      effectiveDate: new Date('2024-01-01'),
      policyUrl: '/policies/ai',
      consentText: 'I consent to AI-powered tutoring interactions',
      required: true,
      requiresParentalConsent: true,
      ageThreshold: 13,
    },
    {
      type: 'analytics',
      version: '1.0',
      effectiveDate: new Date('2024-01-01'),
      policyUrl: '/policies/analytics',
      consentText: 'I consent to analytics and usage tracking',
      required: false,
      requiresParentalConsent: true,
      ageThreshold: 13,
    },
    {
      type: 'parental_consent',
      version: '1.0',
      effectiveDate: new Date('2024-01-01'),
      policyUrl: '/policies/coppa',
      consentText: 'I provide parental consent for my child\'s use of this service',
      required: true,
      requiresParentalConsent: true,
      ageThreshold: 13,
    },
  ];
}

/**
 * Get user's consent status
 */
export async function getUserConsentStatus(userId: string): Promise<UserConsentStatus> {
  const database = getDb();

  const records = await database
    .select()
    .from(consentRecords)
    .where(eq(consentRecords.userId, userId));

  const policies = await getConsentPolicyVersions();
  const consents: ConsentStatusItem[] = [];
  const missingRequired: ConsentType[] = [];

  for (const policy of policies) {
    const record = records.find(r => r.type === policy.type && r.version === policy.version);
    
    if (record) {
      consents.push({
        type: policy.type,
        status: record.status as any,
        version: record.version,
        grantedAt: record.grantedAt || undefined,
        withdrawnAt: record.withdrawnAt || undefined,
        expiresAt: record.expiresAt || undefined,
      });

      if (policy.required && record.status !== 'granted') {
        missingRequired.push(policy.type);
      }
    } else {
      consents.push({
        type: policy.type,
        status: 'pending',
        version: policy.version,
      });

      if (policy.required) {
        missingRequired.push(policy.type);
      }
    }
  }

  return {
    userId,
    consents,
    needsUpdate: missingRequired.length > 0,
    missingRequired,
  };
}

/**
 * Grant consent for a user
 */
export async function grantConsent(
  userId: string,
  consentType: ConsentType,
  version: string,
  ipAddress?: string,
  userAgent?: string
) {
  const database = getDb();
  const now = new Date();

  // Check if record exists
  const [existing] = await database
    .select()
    .from(consentRecords)
    .where(
      and(
        eq(consentRecords.userId, userId),
        eq(consentRecords.type, consentType as any),
        eq(consentRecords.version, version)
      )
    )
    .limit(1);

  if (existing) {
    await database
      .update(consentRecords)
      .set({
        status: 'granted',
        grantedAt: now,
        withdrawnAt: null,
        ipAddress,
        userAgent,
        updatedAt: now,
      })
      .where(eq(consentRecords.id, existing.id));
  } else {
    await database
      .insert(consentRecords)
      .values({
        userId,
        type: consentType as any,
        status: 'granted',
        version,
        grantedAt: now,
        ipAddress,
        userAgent,
      });
  }

  await createAuditLog({
    action: 'consent_granted',
    resourceType: 'consent_record',
    userId,
    severity: 'info',
    description: `Consent granted for ${consentType} v${version}`,
    metadata: { consentType, version },
  });
}

// ============================================================================
// Age Verification
// ============================================================================

/**
 * Verify user's age
 */
export async function verifyAge(
  userId: string,
  dateOfBirth: Date,
  method: AgeVerificationResult['method'] = 'self_reported'
): Promise<AgeVerificationResult> {
  const today = new Date();
  let age = today.getFullYear() - dateOfBirth.getFullYear();
  const monthDiff = today.getMonth() - dateOfBirth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
    age--;
  }

  const result: AgeVerificationResult = {
    userId,
    dateOfBirth,
    age,
    isMinor: age < 18,
    isChild: age < 13,
    requiresParentalConsent: age < 13,
    verifiedAt: new Date(),
    method,
    metadata: {},
  };

  // Update user profile with age verification
  const database = getDb();
  await database
    .update(users)
    .set({
      metadata: sql`jsonb_set(${users.metadata}, '{ageVerified}', '${JSON.stringify({ verifiedAt: result.verifiedAt.toISOString(), method, age, dateOfBirth: dateOfBirth.toISOString() })}')`,
    })
    .where(eq(users.id, userId));

  await createAuditLog({
    action: 'coppa_age_verified',
    resourceType: 'user',
    resourceId: userId,
    userId,
    severity: 'info',
    description: `Age verified: ${age} years old`,
    metadata: { age, isChild: result.isChild, method },
  });

  return result;
}

// ============================================================================
// Policy Documents
// ============================================================================

/**
 * Get policy document
 */
export async function getPolicyDocument(type: ConsentType, version: string): Promise<PolicyDocument | null> {
  // In production, fetch from policy_documents table
  // For now, return mock data
  const policies = await getConsentPolicyVersions();
  const policy = policies.find(p => p.type === type && p.version === version);
  
  if (!policy) return null;

  return {
    id: `${type}-${version}`,
    type,
    version,
    title: type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    content: `Full policy content for ${type} v${version}`,
    effectiveDate: policy.effectiveDate,
    isActive: true,
    language: 'en',
    metadata: {},
  };
}