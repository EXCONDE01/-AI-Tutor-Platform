/**
 * LTI Validation Schemas
 * Zod schemas for LTI platform and deployment validation
 */

import { z } from 'zod';

export const createPlatformSchema = z.object({
  districtId: z.string().uuid(),
  name: z.string().min(1).max(255),
  issuer: z.string().url(),
  clientId: z.string().min(1).max(255),
  authLoginUrl: z.string().url(),
  authTokenUrl: z.string().url(),
  jwksUrl: z.string().url(),
  deploymentId: z.string().max(255).optional(),
  scopes: z.array(z.string()).default([]),
  publicKey: z.string().optional(),
  privateKey: z.string().optional(),
  supportsNRPS: z.boolean().default(true),
  supportsAGS: z.boolean().default(true),
  supportsDeepLinking: z.boolean().default(false),
  supportsAssignmentSelection: z.boolean().default(false),
  supportsResourceLinkMessage: z.boolean().default(true),
  keyRotationUrl: z.string().url().optional(),
});

export const updatePlatformSchema = createPlatformSchema.partial().extend({
  status: z.enum(['active', 'inactive', 'pending', 'error']).optional(),
});

export const createDeploymentSchema = z.object({
  platformId: z.string().uuid(),
  deploymentId: z.string().min(1).max(255),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  targetLinkUri: z.string().url(),
  customParameters: z.record(z.string(), z.string()).default({}),
  contextId: z.string().optional(),
});

export const updateDeploymentSchema = createDeploymentSchema.partial().extend({
  status: z.enum(['active', 'inactive', 'pending']).optional(),
});

export const rotateKeysSchema = z.object({
  keyRotationUrl: z.string().url().optional(),
});

export const uuidSchema = z.string().uuid();