/**
 * LTI Platform & Deployment CRUD Helpers
 * Database operations for LTI platform and deployment management
 */

import { db } from '@/lib/db';
import {
  ltiPlatforms,
  ltiDeployments,
  ltiPlatformStatusEnum,
  ltiDeploymentStatusEnum,
} from '@/db/schema/lti';
import { eq, and, desc, asc, isNull } from 'drizzle-orm';
import { LTIPlatformConfig, LTIDeploymentConfig } from './types';

// ============================================================================
// Platform Operations
// ============================================================================

export interface CreatePlatformInput {
  districtId: string;
  name: string;
  issuer: string;
  clientId: string;
  authLoginUrl: string;
  authTokenUrl: string;
  jwksUrl: string;
  deploymentId?: string;
  scopes?: string[];
  publicKey?: string;
  privateKey?: string;
  supportsNRPS?: boolean;
  supportsAGS?: boolean;
  supportsDeepLinking?: boolean;
  supportsAssignmentSelection?: boolean;
  supportsResourceLinkMessage?: boolean;
  keyRotationUrl?: string;
}

export interface UpdatePlatformInput {
  name?: string;
  issuer?: string;
  clientId?: string;
  authLoginUrl?: string;
  authTokenUrl?: string;
  jwksUrl?: string;
  deploymentId?: string;
  scopes?: string[];
  publicKey?: string;
  privateKey?: string;
  supportsNRPS?: boolean;
  supportsAGS?: boolean;
  supportsDeepLinking?: boolean;
  supportsAssignmentSelection?: boolean;
  supportsResourceLinkMessage?: boolean;
  keyRotationUrl?: string;
  status?: 'active' | 'inactive' | 'pending' | 'error';
  lastError?: string;
}

export interface PlatformWithDeployment extends LTIPlatformConfig {
  deployments: LTIDeploymentConfig[];
}

function rowToPlatformConfig(row: typeof ltiPlatforms.$inferSelect): LTIPlatformConfig {
  return {
    id: row.id,
    issuer: row.issuer,
    clientId: row.clientId,
    authLoginUrl: row.authLoginUrl,
    authTokenUrl: row.authTokenUrl,
    authAudience: row.authAudience || undefined,
    jwksUrl: row.jwksUrl,
    deploymentId: row.deploymentId || undefined,
    scopes: row.scopes,
    supportsNRPS: row.supportsNRPS,
    supportsAGS: row.supportsAGS,
    supportsDeepLinking: row.supportsDeepLinking,
    supportsAssignmentSelection: row.supportsAssignmentSelection,
    supportsResourceLinkMessage: row.supportsResourceLinkMessage,
    publicKey: row.publicKey || undefined,
    privateKey: row.privateKey || undefined,
    keyRotationUrl: row.keyRotationUrl || undefined,
    status: row.status,
    districtId: row.districtId || undefined,
    name: row.name,
    updatedAt: row.updatedAt,
  };
}

function rowToDeploymentConfig(row: typeof ltiDeployments.$inferSelect): LTIDeploymentConfig {
  return {
    id: row.id,
    platformId: row.platformId,
    deploymentId: row.deploymentId,
    name: row.name,
    description: row.description || undefined,
    targetLinkUri: row.targetLinkUri,
    customParameters: row.customParameters as Record<string, string>,
    contextId: undefined, // Not in schema
    status: row.status,
    updatedAt: row.updatedAt,
  };
}

/**
 * Create a new LTI platform
 */
export async function createPlatform(input: CreatePlatformInput) {
  const now = new Date();
  const [platform] = await db
    .insert(ltiPlatforms)
    .values({
      districtId: input.districtId,
      name: input.name,
      issuer: input.issuer,
      clientId: input.clientId,
      authLoginUrl: input.authLoginUrl,
      authTokenUrl: input.authTokenUrl,
      authAudience: input.issuer, // Default to issuer
      jwksUrl: input.jwksUrl,
      deploymentId: input.deploymentId,
      scopes: input.scopes || [
        'https://purl.imsglobal.org/spec/lti-ags/scope/lineitem',
        'https://purl.imsglobal.org/spec/lti-ags/scope/score',
        'https://purl.imsglobal.org/spec/lti-nrps/scope/contextmembership.readonly',
        'openid',
      ],
      publicKey: input.publicKey,
      privateKey: input.privateKey,
      supportsNRPS: input.supportsNRPS ?? true,
      supportsAGS: input.supportsAGS ?? true,
      supportsDeepLinking: input.supportsDeepLinking ?? false,
      supportsAssignmentSelection: input.supportsAssignmentSelection ?? false,
      supportsResourceLinkMessage: input.supportsResourceLinkMessage ?? true,
      keyRotationUrl: input.keyRotationUrl,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return rowToPlatformConfig(platform);
}

/**
 * Get platform by ID
 */
export async function getPlatformById(id: string): Promise<LTIPlatformConfig | null> {
  const [platform] = await db
    .select()
    .from(ltiPlatforms)
    .where(eq(ltiPlatforms.id, id))
    .limit(1);

  return platform ? rowToPlatformConfig(platform) : null;
}

/**
 * Get platform by issuer URL
 */
export async function getPlatformByIssuer(issuer: string): Promise<LTIPlatformConfig | null> {
  const [platform] = await db
    .select()
    .from(ltiPlatforms)
    .where(eq(ltiPlatforms.issuer, issuer))
    .limit(1);

  return platform ? rowToPlatformConfig(platform) : null;
}

/**
 * Get platform by client ID
 */
export async function getPlatformByClientId(clientId: string): Promise<LTIPlatformConfig | null> {
  const [platform] = await db
    .select()
    .from(ltiPlatforms)
    .where(eq(ltiPlatforms.clientId, clientId))
    .limit(1);

  return platform ? rowToPlatformConfig(platform) : null;
}

/**
 * Get all platforms for a district
 */
export async function getPlatformsByDistrict(districtId: string): Promise<LTIPlatformConfig[]> {
  const platforms = await db
    .select()
    .from(ltiPlatforms)
    .where(eq(ltiPlatforms.districtId, districtId))
    .orderBy(desc(ltiPlatforms.createdAt));

  return platforms.map(rowToPlatformConfig);
}

/**
 * Get all platforms (for admin)
 */
export async function getAllPlatforms(): Promise<LTIPlatformConfig[]> {
  const platforms = await db
    .select()
    .from(ltiPlatforms)
    .orderBy(desc(ltiPlatforms.createdAt));

  return platforms.map(rowToPlatformConfig);
}

/**
 * Update a platform
 */
export async function updatePlatform(id: string, input: UpdatePlatformInput): Promise<LTIPlatformConfig | null> {
  const updateData: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (input.name !== undefined) updateData.name = input.name;
  if (input.issuer !== undefined) updateData.issuer = input.issuer;
  if (input.clientId !== undefined) updateData.clientId = input.clientId;
  if (input.authLoginUrl !== undefined) updateData.authLoginUrl = input.authLoginUrl;
  if (input.authTokenUrl !== undefined) updateData.authTokenUrl = input.authTokenUrl;
  if (input.jwksUrl !== undefined) updateData.jwksUrl = input.jwksUrl;
  if (input.deploymentId !== undefined) updateData.deploymentId = input.deploymentId;
  if (input.scopes !== undefined) updateData.scopes = input.scopes;
  if (input.publicKey !== undefined) updateData.publicKey = input.publicKey;
  if (input.privateKey !== undefined) updateData.privateKey = input.privateKey;
  if (input.supportsNRPS !== undefined) updateData.supportsNRPS = input.supportsNRPS;
  if (input.supportsAGS !== undefined) updateData.supportsAGS = input.supportsAGS;
  if (input.supportsDeepLinking !== undefined) updateData.supportsDeepLinking = input.supportsDeepLinking;
  if (input.supportsAssignmentSelection !== undefined) updateData.supportsAssignmentSelection = input.supportsAssignmentSelection;
  if (input.supportsResourceLinkMessage !== undefined) updateData.supportsResourceLinkMessage = input.supportsResourceLinkMessage;
  if (input.keyRotationUrl !== undefined) updateData.keyRotationUrl = input.keyRotationUrl;
  if (input.status !== undefined) updateData.status = input.status;

  const [platform] = await db
    .update(ltiPlatforms)
    .set(updateData)
    .where(eq(ltiPlatforms.id, id))
    .returning();

  return platform ? rowToPlatformConfig(platform) : null;
}

/**
 * Update platform status
 */
export async function updatePlatformStatus(
  id: string,
  status: 'active' | 'inactive' | 'pending' | 'error'
): Promise<void> {
  await db
    .update(ltiPlatforms)
    .set({
      status,
      updatedAt: new Date(),
    })
    .where(eq(ltiPlatforms.id, id));
}

/**
 * Delete a platform (cascades to deployments)
 */
export async function deletePlatform(id: string): Promise<void> {
  await db.delete(ltiPlatforms).where(eq(ltiPlatforms.id, id));
}

/**
 * Rotate platform keys
 */
export async function rotatePlatformKeys(
  id: string,
  publicKey: string,
  privateKey: string,
  keyRotationUrl?: string
): Promise<LTIPlatformConfig | null> {
  return updatePlatform(id, {
    publicKey,
    privateKey,
    keyRotationUrl,
    status: 'active',
  });
}

// ============================================================================
// Deployment Operations
// ============================================================================

export interface CreateDeploymentInput {
  platformId: string;
  deploymentId: string;
  name: string;
  description?: string;
  targetLinkUri: string;
  customParameters?: Record<string, string>;
  contextId?: string;
}

export interface UpdateDeploymentInput {
  name?: string;
  description?: string;
  targetLinkUri?: string;
  customParameters?: Record<string, string>;
  contextId?: string;
  status?: 'active' | 'inactive' | 'pending';
}

/**
 * Create a new LTI deployment
 */
export async function createDeployment(input: CreateDeploymentInput) {
  const now = new Date();
  const [deployment] = await db
    .insert(ltiDeployments)
    .values({
      platformId: input.platformId,
      deploymentId: input.deploymentId,
      name: input.name,
      description: input.description,
      targetLinkUri: input.targetLinkUri,
      customParameters: input.customParameters || {},
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return rowToDeploymentConfig(deployment);
}

/**
 * Get deployment by ID
 */
export async function getDeploymentById(id: string): Promise<LTIDeploymentConfig | null> {
  const [deployment] = await db
    .select()
    .from(ltiDeployments)
    .where(eq(ltiDeployments.id, id))
    .limit(1);

  return deployment ? rowToDeploymentConfig(deployment) : null;
}

/**
 * Get deployment by platform ID and deployment ID
 */
export async function getDeploymentByPlatformAndDeploymentId(
  platformId: string,
  deploymentId: string
): Promise<LTIDeploymentConfig | null> {
  const [deployment] = await db
    .select()
    .from(ltiDeployments)
    .where(
      and(
        eq(ltiDeployments.platformId, platformId),
        eq(ltiDeployments.deploymentId, deploymentId)
      )
    )
    .limit(1);

  return deployment ? rowToDeploymentConfig(deployment) : null;
}

/**
 * Get all deployments for a platform
 */
export async function getDeploymentsByPlatform(platformId: string): Promise<LTIDeploymentConfig[]> {
  const deployments = await db
    .select()
    .from(ltiDeployments)
    .where(eq(ltiDeployments.platformId, platformId))
    .orderBy(desc(ltiDeployments.createdAt));

  return deployments.map(rowToDeploymentConfig);
}

/**
 * Get all deployments (for admin)
 */
export async function getAllDeployments(): Promise<LTIDeploymentConfig[]> {
  const deployments = await db
    .select()
    .from(ltiDeployments)
    .orderBy(desc(ltiDeployments.createdAt));

  return deployments.map(rowToDeploymentConfig);
}

/**
 * Update a deployment
 */
export async function updateDeployment(id: string, input: UpdateDeploymentInput): Promise<LTIDeploymentConfig | null> {
  const updateData: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (input.name !== undefined) updateData.name = input.name;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.targetLinkUri !== undefined) updateData.targetLinkUri = input.targetLinkUri;
  if (input.customParameters !== undefined) updateData.customParameters = input.customParameters;
  if (input.status !== undefined) updateData.status = input.status;

  const [deployment] = await db
    .update(ltiDeployments)
    .set(updateData)
    .where(eq(ltiDeployments.id, id))
    .returning();

  return deployment ? rowToDeploymentConfig(deployment) : null;
}

/**
 * Delete a deployment
 */
export async function deleteDeployment(id: string): Promise<void> {
  await db.delete(ltiDeployments).where(eq(ltiDeployments.id, id));
}

/**
 * Get platform with deployments
 */
export async function getPlatformWithDeployments(platformId: string): Promise<PlatformWithDeployment | null> {
  const platform = await getPlatformById(platformId);
  if (!platform) return null;

  const deployments = await getDeploymentsByPlatform(platformId);

  return {
    ...platform,
    deployments,
  };
}