/**
 * AI Tutor Platform - Database Schema Exports
 * 
 * Main entry point for all database schema definitions.
 * Exports all tables, types, enums, and relations.
 */

// ============================================================================
// SCHEMA TABLES
// ============================================================================

export * from './tenants';
export * from './users';
export * from './classes';
export * from './sessions';
export * from './interventions';
export * from './lti';
export * from './artifacts';
export * from './audit';
export * from './compliance';
export * from './push';
export * from './vector';

// ============================================================================
// RLS, INDEXES
// ============================================================================

export * from '../rls';
export * from '../indexes';

// ============================================================================
// DRIZZLE RELATIONS
// ============================================================================

import { relations } from 'drizzle-orm';

// Tenants
import { districts, schools } from './tenants';

// Users
import { 
  users, 
  teachers, 
  students, 
  parents, 
  studentParents 
} from './users';

// Push
import { pushSubscriptions } from './push';

// Classes
import { 
  classes, 
  classStudents, 
  tutorConfigs 
} from './classes';

// Sessions
import { 
  tutorSessions, 
  messages, 
  sessionSummaries 
} from './sessions';

// Interventions
import { 
  interventions, 
  interventionActions 
} from './interventions';

// LTI
import { 
  ltiPlatforms, 
  ltiDeployments, 
  nrpsCache, 
  agsLineItems, 
  agsScores 
} from './lti';

// Artifacts
import { 
  generatedArtifacts, 
  exportJobs, 
  oauthTokens 
} from './artifacts';

// Audit
import { auditLogs } from './audit';

// Compliance
import { 
  consentRecords, 
  dataDeletionRequests, 
  retentionPolicies, 
  retentionJobs 
} from './compliance';

// Vector - import all vector tables for relations
import { 
  messageEmbeddings,
  artifactEmbeddings,
  knowledgeEmbeddings,
  studentLearningEmbeddings,
  embeddingJobs 
} from './vector';

// ============================================================================
// RELATIONS
// ============================================================================

// District relations
export const districtsRelations = relations(districts, ({ many }) => ({
  schools: many(schools),
  ltiPlatforms: many(ltiPlatforms),
  consentRecords: many(consentRecords),
  dataDeletionRequests: many(dataDeletionRequests),
  retentionPolicies: many(retentionPolicies),
}));

export const schoolsRelations = relations(schools, ({ one, many }) => ({
  district: one(districts, { fields: [schools.districtId], references: [districts.id] }),
  users: many(users),
  classes: many(classes),
  ltiDeployments: many(ltiDeployments),
  consentRecords: many(consentRecords),
  dataDeletionRequests: many(dataDeletionRequests),
  retentionPolicies: many(retentionPolicies),
}));

// User relations
export const usersRelations = relations(users, ({ one, many }) => ({
  school: one(schools, { fields: [users.schoolId], references: [schools.id] }),
  teacher: one(teachers, { fields: [users.id], references: [teachers.userId] }),
  student: one(students, { fields: [users.id], references: [students.userId] }),
  parent: one(parents, { fields: [users.id], references: [parents.userId] }),
  oauthTokens: many(oauthTokens),
  consentRecords: many(consentRecords),
  dataDeletionRequests: many(dataDeletionRequests, { relationName: 'userDeletionRequests' }),
  requestedDeletions: many(dataDeletionRequests, { relationName: 'requestedDeletions' }),
  verifiedDeletions: many(dataDeletionRequests, { relationName: 'verifiedDeletions' }),
  auditLogs: many(auditLogs),
  createdRetentionPolicies: many(retentionPolicies),
  approvedRetentionPolicies: many(retentionPolicies),
  pushSubscriptions: many(pushSubscriptions),
}));

export const teachersRelations = relations(teachers, ({ one, many }) => ({
  user: one(users, { fields: [teachers.userId], references: [users.id] }),
  classes: many(classes),
  tutorConfigs: many(tutorConfigs),
  tutorSessions: many(tutorSessions, { relationName: 'teacherSessions' }),
  interventions: many(interventions),
  interventionActions: many(interventionActions),
  generatedArtifacts: many(generatedArtifacts),
  exportJobs: many(exportJobs),
  agsScores: many(agsScores),
}));

export const studentsRelations = relations(students, ({ one, many }) => ({
  user: one(users, { fields: [students.userId], references: [users.id] }),
  classStudents: many(classStudents),
  tutorSessions: many(tutorSessions),
  interventions: many(interventions),
  sessionSummaries: many(sessionSummaries),
  generatedArtifacts: many(generatedArtifacts),
  studentParents: many(studentParents),
  consentRecords: many(consentRecords),
  dataDeletionRequests: many(dataDeletionRequests),
  agsScores: many(agsScores),
  studentLearningEmbeddings: many(studentLearningEmbeddings), // From vector.ts
}));

export const parentsRelations = relations(parents, ({ one, many }) => ({
  user: one(users, { fields: [parents.userId], references: [users.id] }),
  studentParents: many(studentParents),
}));

export const studentParentsRelations = relations(studentParents, ({ one }) => ({
  student: one(students, { fields: [studentParents.studentId], references: [students.id] }),
  parent: one(parents, { fields: [studentParents.parentId], references: [parents.id] }),
}));

// Class relations
export const classesRelations = relations(classes, ({ one, many }) => ({
  school: one(schools, { fields: [classes.schoolId], references: [schools.id] }),
  teacher: one(teachers, { fields: [classes.teacherId], references: [teachers.id] }),
  classStudents: many(classStudents),
  tutorConfig: one(tutorConfigs, { fields: [classes.id], references: [tutorConfigs.classId] }),
  tutorSessions: many(tutorSessions),
  generatedArtifacts: many(generatedArtifacts),
  interventions: many(interventions),
  artifactEmbeddings: many(artifactEmbeddings),
}));

export const classStudentsRelations = relations(classStudents, ({ one }) => ({
  class: one(classes, { fields: [classStudents.classId], references: [classes.id] }),
  student: one(students, { fields: [classStudents.studentId], references: [students.id] }),
}));

export const tutorConfigsRelations = relations(tutorConfigs, ({ one, many }) => ({
  class: one(classes, { fields: [tutorConfigs.classId], references: [classes.id] }),
  createdByTeacher: one(teachers, { fields: [tutorConfigs.createdBy], references: [teachers.id] }),
  tutorSessions: many(tutorSessions),
}));

// Session relations
export const tutorSessionsRelations = relations(tutorSessions, ({ one, many }) => ({
  class: one(classes, { fields: [tutorSessions.classId], references: [classes.id] }),
  student: one(students, { fields: [tutorSessions.studentId], references: [students.id] }),
  tutorConfig: one(tutorConfigs, { fields: [tutorSessions.tutorConfigId], references: [tutorConfigs.id] }),
  messages: many(messages),
  summary: one(sessionSummaries, { fields: [tutorSessions.id], references: [sessionSummaries.sessionId] }),
  interventions: many(interventions),
  generatedArtifacts: many(generatedArtifacts),
  agsScores: many(agsScores),
  messageEmbeddings: many(messageEmbeddings),
  studentLearningEmbeddings: many(studentLearningEmbeddings),
}));

export const messagesRelations = relations(messages, ({ one, many }) => ({
  session: one(tutorSessions, { fields: [messages.sessionId], references: [tutorSessions.id] }),
  interventions: many(interventions),
  messageEmbeddings: many(messageEmbeddings),
}));

export const sessionSummariesRelations = relations(sessionSummaries, ({ one }) => ({
  session: one(tutorSessions, { fields: [sessionSummaries.sessionId], references: [tutorSessions.id] }),
  student: one(students, { fields: [sessionSummaries.studentId], references: [students.id] }),
  class: one(classes, { fields: [sessionSummaries.classId], references: [classes.id] }),
}));

// Intervention relations
export const interventionsRelations = relations(interventions, ({ one, many }) => ({
  session: one(tutorSessions, { fields: [interventions.sessionId], references: [tutorSessions.id] }),
  student: one(students, { fields: [interventions.studentId], references: [students.id] }),
  class: one(classes, { fields: [interventions.classId], references: [classes.id] }),
  teacher: one(teachers, { fields: [interventions.teacherId], references: [teachers.id] }),
  message: one(messages, { fields: [interventions.messageId], references: [messages.id] }),
  resolvedByTeacher: one(teachers, { fields: [interventions.resolvedBy], references: [teachers.id] }),
  actions: many(interventionActions),
}));

export const interventionActionsRelations = relations(interventionActions, ({ one }) => ({
  intervention: one(interventions, { fields: [interventionActions.interventionId], references: [interventions.id] }),
  performedByTeacher: one(teachers, { fields: [interventionActions.performedBy], references: [teachers.id] }),
}));

// LTI relations
export const ltiPlatformsRelations = relations(ltiPlatforms, ({ one, many }) => ({
  district: one(districts, { fields: [ltiPlatforms.districtId], references: [districts.id] }),
  deployments: many(ltiDeployments),
}));

export const ltiDeploymentsRelations = relations(ltiDeployments, ({ one, many }) => ({
  platform: one(ltiPlatforms, { fields: [ltiDeployments.platformId], references: [ltiPlatforms.id] }),
  school: one(schools, { fields: [ltiDeployments.schoolId], references: [schools.id] }),
  nrpsCache: many(nrpsCache),
  agsLineItems: many(agsLineItems),
}));

export const nrpsCacheRelations = relations(nrpsCache, ({ one }) => ({
  deployment: one(ltiDeployments, { fields: [nrpsCache.deploymentId], references: [ltiDeployments.id] }),
}));

export const agsLineItemsRelations = relations(agsLineItems, ({ one, many }) => ({
  deployment: one(ltiDeployments, { fields: [agsLineItems.deploymentId], references: [ltiDeployments.id] }),
  scores: many(agsScores),
}));

export const agsScoresRelations = relations(agsScores, ({ one }) => ({
  lineItem: one(agsLineItems, { fields: [agsScores.lineItemId], references: [agsLineItems.id] }),
  user: one(users, { fields: [agsScores.userId], references: [users.id] }),
  session: one(tutorSessions, { fields: [agsScores.sessionId], references: [tutorSessions.id] }),
}));

// Artifact relations
export const generatedArtifactsRelations = relations(generatedArtifacts, ({ one, many }) => ({
  session: one(tutorSessions, { fields: [generatedArtifacts.sessionId], references: [tutorSessions.id] }),
  student: one(students, { fields: [generatedArtifacts.studentId], references: [students.id] }),
  class: one(classes, { fields: [generatedArtifacts.classId], references: [classes.id] }),
  teacher: one(teachers, { fields: [generatedArtifacts.teacherId], references: [teachers.id] }),
  parentArtifact: one(generatedArtifacts, { fields: [generatedArtifacts.parentArtifactId], references: [generatedArtifacts.id], relationName: 'artifactVersions' }),
  childArtifacts: many(generatedArtifacts, { relationName: 'artifactVersions' }),
  reviewedByTeacher: one(teachers, { fields: [generatedArtifacts.reviewedBy], references: [teachers.id] }),
  exportJobs: many(exportJobs),
}));

export const exportJobsRelations = relations(exportJobs, ({ one }) => ({
  artifact: one(generatedArtifacts, { fields: [exportJobs.artifactId], references: [generatedArtifacts.id] }),
  requestedByTeacher: one(teachers, { fields: [exportJobs.requestedBy], references: [teachers.id] }),
}));

export const oauthTokensRelations = relations(oauthTokens, ({ one }) => ({
  user: one(users, { fields: [oauthTokens.userId], references: [users.id] }),
}));

// Audit relations
export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  district: one(districts, { fields: [auditLogs.districtId], references: [districts.id] }),
  school: one(schools, { fields: [auditLogs.schoolId], references: [schools.id] }),
  user: one(users, { fields: [auditLogs.userId], references: [users.id] }),
  impersonator: one(users, { fields: [auditLogs.impersonatorId], references: [users.id] }),
}));

// Compliance relations
export const consentRecordsRelations = relations(consentRecords, ({ one }) => ({
  district: one(districts, { fields: [consentRecords.districtId], references: [districts.id] }),
  school: one(schools, { fields: [consentRecords.schoolId], references: [schools.id] }),
  user: one(users, { fields: [consentRecords.userId], references: [users.id] }),
  student: one(students, { fields: [consentRecords.studentId], references: [students.id] }),
  witness: one(users, { fields: [consentRecords.witnessId], references: [users.id] }),
}));

export const dataDeletionRequestsRelations = relations(dataDeletionRequests, ({ one }) => ({
  district: one(districts, { fields: [dataDeletionRequests.districtId], references: [districts.id] }),
  school: one(schools, { fields: [dataDeletionRequests.schoolId], references: [schools.id] }),
  user: one(users, { fields: [dataDeletionRequests.userId], references: [users.id] }),
  student: one(students, { fields: [dataDeletionRequests.studentId], references: [students.id] }),
  requestedByUser: one(users, { fields: [dataDeletionRequests.requestedBy], references: [users.id], relationName: 'requestedDeletions' }),
  verifiedByUser: one(users, { fields: [dataDeletionRequests.verifiedBy], references: [users.id], relationName: 'verifiedDeletions' }),
}));

export const retentionPoliciesRelations = relations(retentionPolicies, ({ one, many }) => ({
  district: one(districts, { fields: [retentionPolicies.districtId], references: [districts.id] }),
  school: one(schools, { fields: [retentionPolicies.schoolId], references: [schools.id] }),
  createdByUser: one(users, { fields: [retentionPolicies.createdBy], references: [users.id] }),
  approvedByUser: one(users, { fields: [retentionPolicies.approvedBy], references: [users.id] }),
  jobs: many(retentionJobs),
}));

export const retentionJobsRelations = relations(retentionJobs, ({ one }) => ({
  policy: one(retentionPolicies, { fields: [retentionJobs.policyId], references: [retentionPolicies.id] }),
}));

// Push relations
export const pushSubscriptionsRelations = relations(pushSubscriptions, ({ one }) => ({
  user: one(users, { fields: [pushSubscriptions.userId], references: [users.id] }),
}));

// ============================================================================
// ALL RELATIONS OBJECT
// ============================================================================

export const allRelations = {
  districts: districtsRelations,
  schools: schoolsRelations,
  users: usersRelations,
  teachers: teachersRelations,
  students: studentsRelations,
  parents: parentsRelations,
  studentParents: studentParentsRelations,
  classes: classesRelations,
  classStudents: classStudentsRelations,
  tutorConfigs: tutorConfigsRelations,
  tutorSessions: tutorSessionsRelations,
  messages: messagesRelations,
  sessionSummaries: sessionSummariesRelations,
  interventions: interventionsRelations,
  interventionActions: interventionActionsRelations,
  ltiPlatforms: ltiPlatformsRelations,
  ltiDeployments: ltiDeploymentsRelations,
  nrpsCache: nrpsCacheRelations,
  agsLineItems: agsLineItemsRelations,
  agsScores: agsScoresRelations,
  generatedArtifacts: generatedArtifactsRelations,
  exportJobs: exportJobsRelations,
  oauthTokens: oauthTokensRelations,
  auditLogs: auditLogsRelations,
  consentRecords: consentRecordsRelations,
  dataDeletionRequests: dataDeletionRequestsRelations,
  retentionPolicies: retentionPoliciesRelations,
  retentionJobs: retentionJobsRelations,
  pushSubscriptions: pushSubscriptionsRelations,
};

// ============================================================================
// SCHEMA VALIDATION HELPERS
// ============================================================================

export const schemaTables = {
  // Tenants
  districts,
  schools,
  
  // Users
  users,
  teachers,
  students,
  parents,
  studentParents,
  
  // Classes
  classes,
  classStudents,
  tutorConfigs,
  
  // Sessions
  tutorSessions,
  messages,
  sessionSummaries,
  
  // Interventions
  interventions,
  interventionActions,
  
  // LTI
  ltiPlatforms,
  ltiDeployments,
  nrpsCache,
  agsLineItems,
  agsScores,
  
  // Artifacts
  generatedArtifacts,
  exportJobs,
  oauthTokens,
  
  // Audit
  auditLogs,
  
  // Compliance
  consentRecords,
  dataDeletionRequests,
  retentionPolicies,
  retentionJobs,
  
  // Push
  pushSubscriptions,

  // Vector
  messageEmbeddings,
  artifactEmbeddings,
  knowledgeEmbeddings,
  studentLearningEmbeddings,
  embeddingJobs,
} as const;

export type SchemaTableName = keyof typeof schemaTables;

// ============================================================================
// EXPORTS FOR DRIZZLE-KIT
// ============================================================================

// This object is used by drizzle-kit for migration generation
export const schema = {
  ...schemaTables,
};