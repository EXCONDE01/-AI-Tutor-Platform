/**
 * LTI 1.3 Core Library - Main Export Barrel
 * Exports all LTI 1.3 types, OIDC, JWT, NRPS, AGS, and Platform modules
 */

// Types
export * from './types';

// OIDC Launch
export {
  buildOIDCLaunchUrl,
  handleOIDCCallback,
  initiateToolLaunch,
  setOIDCState,
  getAndClearOIDCState,
} from './oidc';

// OIDC Constants
export const OIDC_STATE_COOKIE = 'lti_oidc_state';
export const OIDC_STATE_TTL = 10 * 60 * 1000; // 10 minutes

// JWT Verification
export {
  fetchJWKS,
  getRemoteJWKS,
  verifyLTILaunchJWT,
  verifyServiceJWT,
  refreshJWKSCache,
  getCachedJWKS,
  clearJWKSCache,
} from './jwt';

// NRPS (Names & Role Provisioning Service)
export {
  NRPSClient,
  createNRPSClient,
  syncAllContexts,
} from './nrps';

export const NRPS_SCOPE = 'https://purl.imsglobal.org/spec/lti-nrps/scope/contextmembership.readonly';

// AGS (Assignment & Grade Service)
export {
  AGSClient,
  createAGSClient,
  getAccessToken,
  clearTokenCache,
} from './ags';

export const AGS_SCOPES = [
  'https://purl.imsglobal.org/spec/lti-ags/scope/lineitem',
  'https://purl.imsglobal.org/spec/lti-ags/scope/lineitem.readonly',
  'https://purl.imsglobal.org/spec/lti-ags/scope/score',
  'https://purl.imsglobal.org/spec/lti-ags/scope/result.readonly',
];

// Platform & Deployment CRUD
export {
  createPlatform,
  getPlatformById,
  getPlatformByIssuer,
  getPlatformByClientId,
  getPlatformsByDistrict,
  getAllPlatforms,
  updatePlatform,
  updatePlatformStatus,
  deletePlatform,
  rotatePlatformKeys,
  createDeployment,
  getDeploymentById,
  getDeploymentByPlatformAndDeploymentId,
  getDeploymentsByPlatform,
  getAllDeployments,
  updateDeployment,
  deleteDeployment,
  getPlatformWithDeployments,
} from './platform';

// Re-export types from submodules for convenience
export type {
  LTIPlatformConfig,
  LTIDeploymentConfig,
  OIDCLaunchRequest,
  OIDCLaunchResponse,
  OIDCStateData,
  LTILaunchParams,
  LTIContext,
  LTIResourceLink,
  LTILaunchPresentation,
  NRPSEndpoint,
  AGSEndpoint,
  DeepLinkingSettings,
  JWK,
  JWKS,
  JWTPayload,
  NRPSMember,
  NRPSMembershipContainer,
  NRPSContextMembershipsParams,
  NRPSContextMembershipsResponse,
  AGSLineItem,
  AGSLineItemCreateRequest,
  AGSLineItemContainer,
  AGSScore,
  AGSScoreCreateRequest,
  AGSScoreResult,
  DeepLinkingItem,
  DeepLinkingResponse,
  LTIEventType,
  LTIEventMetadata,
} from './types';

export type {
  CreatePlatformInput,
  UpdatePlatformInput,
  PlatformWithDeployment,
  CreateDeploymentInput,
  UpdateDeploymentInput,
} from './platform';