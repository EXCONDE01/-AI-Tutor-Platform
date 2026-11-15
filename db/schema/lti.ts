import { pgTable, uuid, text, timestamp, boolean, pgEnum, index, uniqueIndex, integer, jsonb } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { districts, schools } from './tenants';
import { users } from './users';

export const ltiPlatformStatusEnum = pgEnum('lti_platform_status', ['active', 'inactive', 'pending', 'error']);
export const ltiDeploymentStatusEnum = pgEnum('lti_deployment_status', ['active', 'inactive', 'pending']);
export const nrpsRoleEnum = pgEnum('nrps_role', [
  'instructor',
  'learner',
  'administrator',
  'content_developer',
  'teaching_assistant',
  'mentor',
  'observer'
]);
export const agsLineItemTypeEnum = pgEnum('ags_line_item_type', ['score', 'grade', 'participation', 'completion']);
export const agsScoreStatusEnum = pgEnum('ags_score_status', ['pending', 'submitted', 'accepted', 'rejected', 'error']);

export const ltiPlatforms = pgTable('lti_platforms', {
  id: uuid('id').defaultRandom().primaryKey(),
  districtId: uuid('district_id').references(() => districts.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  issuer: text('issuer').notNull(), // Platform issuer URL
  clientId: text('client_id').notNull(),
  deploymentId: text('deployment_id'),
  authLoginUrl: text('auth_login_url').notNull(),
  authTokenUrl: text('auth_token_url').notNull(),
  authAudience: text('auth_audience'),
  jwksUrl: text('jwks_url').notNull(),
  publicKey: text('public_key'), // Cached public key for JWT verification
  privateKey: text('private_key'), // Encrypted private key for signing
  keyRotationUrl: text('key_rotation_url'),
  scopes: text('scopes').array().default(sql`'{}'::text[]`).notNull(),
  supportsNRPS: boolean('supports_nrps').default(false).notNull(),
  supportsAGS: boolean('supports_ags').default(false).notNull(),
  supportsDeepLinking: boolean('supports_deep_linking').default(false).notNull(),
  supportsAssignmentSelection: boolean('supports_assignment_selection').default(false).notNull(),
  supportsResourceLinkMessage: boolean('supports_resource_link_message').default(false).notNull(),
  status: ltiPlatformStatusEnum('status').default('pending').notNull(),
  configuration: jsonb('configuration').default({}).notNull(), // Platform-specific config
  lastValidatedAt: timestamp('last_validated_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  districtIdx: index('lti_platforms_district_id_idx').on(table.districtId),
  issuerIdx: uniqueIndex('lti_platforms_issuer_idx').on(table.issuer),
  clientIdIdx: uniqueIndex('lti_platforms_client_id_idx').on(table.clientId),
  statusIdx: index('lti_platforms_status_idx').on(table.status),
}));

export const ltiDeployments = pgTable('lti_deployments', {
  id: uuid('id').defaultRandom().primaryKey(),
  platformId: uuid('platform_id').notNull().references(() => ltiPlatforms.id, { onDelete: 'cascade' }),
  schoolId: uuid('school_id').references(() => schools.id, { onDelete: 'cascade' }),
  deploymentId: text('deployment_id').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  targetLinkUri: text('target_link_uri').notNull(),
  customParameters: jsonb('custom_parameters').default({}).notNull(),
  status: ltiDeploymentStatusEnum('status').default('pending').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  platformIdx: index('lti_deployments_platform_id_idx').on(table.platformId),
  schoolIdx: index('lti_deployments_school_id_idx').on(table.schoolId),
  deploymentIdIdx: uniqueIndex('lti_deployments_deployment_id_idx').on(table.deploymentId),
  statusIdx: index('lti_deployments_status_idx').on(table.status),
}));

export const nrpsCache = pgTable('nrps_cache', {
  id: uuid('id').defaultRandom().primaryKey(),
  deploymentId: uuid('deployment_id').notNull().references(() => ltiDeployments.id, { onDelete: 'cascade' }),
  contextId: text('context_id').notNull(), // LTI context ID
  userId: text('user_id').notNull(), // LTI user ID (sub claim)
  roles: nrpsRoleEnum('roles').array().default(sql`'{}'::nrps_role[]`).notNull(),
  lisPersonSourcedId: text('lis_person_sourced_id'),
  lisPersonNameGiven: text('lis_person_name_given'),
  lisPersonNameFamily: text('lis_person_name_family'),
  lisPersonNameFull: text('lis_person_name_full'),
  lisPersonEmail: text('lis_person_email'),
  userImage: text('user_image'),
  status: text('status').default('active').notNull(), // active, inactive, deleted
  membershipId: text('membership_id'), // LTI membership ID
  rawData: jsonb('raw_data').default({}).notNull(), // Full NRPS response
  lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  deploymentIdx: index('nrps_cache_deployment_id_idx').on(table.deploymentId),
  contextIdx: index('nrps_cache_context_id_idx').on(table.contextId),
  userIdIdx: index('nrps_cache_user_id_idx').on(table.userId),
  membershipIdx: uniqueIndex('nrps_cache_membership_id_idx').on(table.membershipId),
  deploymentContextUserIdx: uniqueIndex('nrps_cache_deployment_context_user_idx').on(table.deploymentId, table.contextId, table.userId),
}));

export const agsLineItems = pgTable('ags_line_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  deploymentId: uuid('deployment_id').notNull().references(() => ltiDeployments.id, { onDelete: 'cascade' }),
  contextId: text('context_id').notNull(),
  resourceLinkId: text('resource_link_id'),
  label: text('label').notNull(),
  scoreMaximum: integer('score_maximum').default(100).notNull(),
  scoreMinimum: integer('score_minimum').default(0).notNull(),
  type: agsLineItemTypeEnum('type').default('score').notNull(),
  resourceId: text('resource_id'),
  tag: text('tag'),
  startDateTime: timestamp('start_date_time', { withTimezone: true }),
  endDateTime: timestamp('end_date_time', { withTimezone: true }),
  ltiLineItemUrl: text('lti_line_item_url'), // URL returned by platform
  isActive: boolean('is_active').default(true).notNull(),
  metadata: jsonb('metadata').default({}).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  deploymentIdx: index('ags_line_items_deployment_id_idx').on(table.deploymentId),
  contextIdx: index('ags_line_items_context_id_idx').on(table.contextId),
  resourceLinkIdx: index('ags_line_items_resource_link_id_idx').on(table.resourceLinkId),
  ltiUrlIdx: uniqueIndex('ags_line_items_lti_url_idx').on(table.ltiLineItemUrl),
}));

export const agsScores = pgTable('ags_scores', {
  id: uuid('id').defaultRandom().primaryKey(),
  lineItemId: uuid('line_item_id').notNull().references(() => agsLineItems.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  sessionId: uuid('session_id').references(() => tutorSessions.id, { onDelete: 'set null' }),
  scoreGiven: integer('score_given').notNull(),
  scoreMaximum: integer('score_maximum').notNull(),
  comment: text('comment'),
  activityProgress: text('activity_progress').default('Completed').notNull(), // Initialized, Started, Completed
  gradingProgress: text('grading_progress').default('FullyGraded').notNull(), // Pending, Failed, FullyGraded
  status: agsScoreStatusEnum('status').default('pending').notNull(),
  ltiScoreUrl: text('lti_score_url'),
  timestamp: timestamp('timestamp', { withTimezone: true }).defaultNow().notNull(),
  submittedAt: timestamp('submitted_at', { withTimezone: true }),
  metadata: jsonb('metadata').default({}).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  lineItemIdx: index('ags_scores_line_item_id_idx').on(table.lineItemId),
  userIdx: index('ags_scores_user_id_idx').on(table.userId),
  sessionIdx: index('ags_scores_session_id_idx').on(table.sessionId),
  statusIdx: index('ags_scores_status_idx').on(table.status),
  uniqueScore: uniqueIndex('ags_scores_unique_idx').on(table.lineItemId, table.userId),
}));

// Need to import tutorSessions
import { tutorSessions } from './sessions';

export type LTIPlatform = typeof ltiPlatforms.$inferSelect;
export type NewLTIPlatform = typeof ltiPlatforms.$inferInsert;
export type LTIDeployment = typeof ltiDeployments.$inferSelect;
export type NewLTIDeployment = typeof ltiDeployments.$inferInsert;
export type NRPSCache = typeof nrpsCache.$inferSelect;
export type NewNRPSCache = typeof nrpsCache.$inferInsert;
export type AGSLineItem = typeof agsLineItems.$inferSelect;
export type NewAGSLineItem = typeof agsLineItems.$inferInsert;
export type AGSScore = typeof agsScores.$inferSelect;
export type NewAGSScore = typeof agsScores.$inferInsert;