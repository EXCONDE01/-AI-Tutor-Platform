/**
 * LTI 1.3 Core Types
 * Complete type definitions for LTI 1.3 Advantage (Launch, NRPS, AGS, Deep Linking)
 */

// ============================================================================
// LTI 1.3 Launch Claims
// ============================================================================

export interface LTILaunchParams {
  // Standard OIDC claims
  iss: string;           // Platform issuer URL
  aud: string;           // Client ID (audience)
  sub: string;           // User identifier (subject)
  azp?: string;          // Authorized party (typically same as aud)
  nonce: string;         // OIDC nonce for replay protection
  iat: number;           // Issued at timestamp
  exp: number;           // Expiration timestamp
  
  // LTI-specific claims (https://purl.imsglobal.org/spec/lti/claim/)
  'https://purl.imsglobal.org/spec/lti/claim/message_type': 'LtiResourceLinkRequest' | 'LtiDeepLinkingRequest';
  'https://purl.imsglobal.org/spec/lti/claim/version': '1.3.0';
  'https://purl.imsglobal.org/spec/lti/claim/deployment_id': string;
  'https://purl.imsglobal.org/spec/lti/claim/target_link_uri': string;
  'https://purl.imsglobal.org/spec/lti/claim/roles': string[];
  'https://purl.imsglobal.org/spec/lti/claim/context': LTIContext;
  'https://purl.imsglobal.org/spec/lti/claim/resource_link': LTIResourceLink;
  'https://purl.imsglobal.org/spec/lti/claim/launch_presentation': LTILaunchPresentation;
  'https://purl.imsglobal.org/spec/lti/claim/custom': Record<string, string>;
  
  // NRPS claim (optional)
  'https://purl.imsglobal.org/spec/lti-nrps/claim/namesroleservice'?: NRPSEndpoint;
  
  // AGS claim (optional)
  'https://purl.imsglobal.org/spec/lti-ags/claim/endpoint'?: AGSEndpoint;
  
  // Deep Linking claim (optional)
  'https://purl.imsglobal.org/spec/lti-dl/claim/deep_linking_settings'?: DeepLinkingSettings;
}

export interface LTIContext {
  id: string;
  label?: string;
  title?: string;
  type?: string[];
}

export interface LTIResourceLink {
  id: string;
  title?: string;
  description?: string;
  validation_context?: string;
  errors?: Record<string, string[]>;
}

export interface LTILaunchPresentation {
  document_target?: 'iframe' | 'window' | 'embed';
  height?: number;
  width?: number;
  return_url?: string;
  locale?: string;
}

export interface NRPSEndpoint {
  context_memberships_url: string;
  service_versions: string[];
}

export interface AGSEndpoint {
  scope: string[];
  lineitems_url: string;
  service_versions: string[];
}

export interface DeepLinkingSettings {
  deep_link_return_url: string;
  accept_types?: string[]; // e.g., ['ltiResourceLink', 'ltiResourceLink:application/vnd.ims.lti.v1.ltilink']
  accept_presentation_document_targets?: ('iframe' | 'window' | 'embed')[];
  accept_media_types?: string[];
  accept_multiple?: boolean;
  auto_create?: boolean;
  title?: string;
  text?: string;
  data?: string;
}

// ============================================================================
// Platform Configuration
// ============================================================================

export interface LTIPlatformConfig {
  id: string;
  issuer: string;
  clientId: string;
  authLoginUrl: string;
  authTokenUrl: string;
  authAudience?: string;
  jwksUrl: string;
  deploymentId?: string;
  scopes: string[];
  supportsNRPS: boolean;
  supportsAGS: boolean;
  supportsDeepLinking: boolean;
  supportsAssignmentSelection: boolean;
  supportsResourceLinkMessage: boolean;
  publicKey?: string;
  privateKey?: string;
  keyRotationUrl?: string;
  status?: 'active' | 'inactive' | 'pending' | 'error';
  districtId?: string;
  name?: string;
  updatedAt?: Date;
}

export interface LTIDeploymentConfig {
  id: string;
  platformId: string;
  deploymentId: string;
  name: string;
  description?: string;
  targetLinkUri: string;
  customParameters: Record<string, string>;
  contextId?: string;
  status?: 'active' | 'inactive' | 'pending';
  updatedAt?: Date;
}

// ============================================================================
// OIDC Launch Types
// ============================================================================

export interface OIDCLaunchRequest {
  iss: string;           // Platform issuer
  login_hint?: string;   // User hint
  target_link_uri?: string;
  lti_message_hint?: string; // Deep linking or resource link
  client_id: string;     // Tool client ID
  scope: string;         // Must include 'openid'
  response_type: 'id_token';
  response_mode: 'form_post';
  redirect_uri: string;  // Callback URL
  state: string;         // CSRF protection
  nonce: string;         // Replay protection
  prompt?: 'none' | 'login' | 'consent' | 'select_account';
}

export interface OIDCLaunchResponse {
  id_token: string;      // JWT with LTI claims
  state: string;         // Must match request state
}

export interface OIDCStateData {
  nonce: string;
  targetLinkUri?: string;
  deploymentId?: string;
  redirectUrl?: string;
  timestamp: number;
  codeVerifier?: string; // For PKCE
}

// ============================================================================
// JWT & JWKS Types
// ============================================================================

export interface JWK {
  kty: 'RSA' | 'EC';
  use: 'sig';
  kid: string;
  alg: 'RS256' | 'ES256';
  n?: string; // RSA modulus
  e?: string; // RSA exponent
  crv?: string; // EC curve
  x?: string; // EC x coordinate
  y?: string; // EC y coordinate
}

export interface JWKS {
  keys: JWK[];
}

export interface JWTPayload {
  iss: string;
  aud: string | string[];
  sub: string;
  iat: number;
  exp: number;
  nonce?: string;
  azp?: string;
  [key: string]: unknown;
}

// ============================================================================
// NRPS Types (Names & Role Provisioning Service)
// ============================================================================

export type NRPSRole = 'instructor' | 'learner' | 'administrator' | 'content_developer' | 'teaching_assistant' | 'mentor' | 'observer';

export interface NRPSMember {
  id: string;                    // Membership ID
  user_id: string;               // LTI user ID (sub claim)
  roles: NRPSRole[];             // LTI role URIs
  status: 'active' | 'inactive' | 'deleted';
  lis_person_sourced_id?: string;
  lis_person_name_given?: string;
  lis_person_name_family?: string;
  lis_person_name_full?: string;
  lis_person_email?: string;
  user_image?: string;
  message?: Array<{ language: string; text: string }>;
  rawData?: Record<string, unknown>;
}

export interface NRPSMembershipContainer {
  id: string;                    // Context ID
  context_id: string;
  label?: string;
  title?: string;
  members: NRPSMember[];
  members_url?: string;          // For pagination
}

export interface NRPSContextMembershipsParams {
  limit?: number;
  cursor?: string;
  role?: string;
  status?: 'active' | 'inactive' | 'deleted';
}

export interface NRPSContextMembershipsResponse {
  members: NRPSMember[];
  next_cursor?: string;
}

// ============================================================================
// AGS Types (Assignment & Grade Service)
// ============================================================================

export interface AGSLineItem {
  id: string;                    // Line item URL (fully qualified)
  scoreMaximum: number;
  scoreMinimum: number;
  label: string;
  resourceId?: string;
  tag?: string;
  resourceLinkId?: string;
  startDateTime?: string;        // ISO 8601
  endDateTime?: string;          // ISO 8601
  type?: 'score' | 'grade' | 'participation' | 'completion' | string;
  [key: string]: unknown;
}

export interface AGSLineItemCreateRequest {
  scoreMaximum: number;
  scoreMinimum?: number;
  label: string;
  resourceId?: string;
  tag?: string;
  resourceLinkId?: string;
  startDateTime?: string;
  endDateTime?: string;
  type?: 'score' | 'grade' | 'participation' | 'completion' | string;
}

export interface AGSLineItemContainer {
  lineitems: AGSLineItem[];
  next_cursor?: string;
}

export interface AGSScore {
  userId: string;                // LTI user ID (sub claim)
  scoreGiven: number;
  scoreMaximum: number;
  activityProgress: 'Initialized' | 'Started' | 'Completed';
  gradingProgress: 'Pending' | 'Failed' | 'FullyGraded';
  timestamp: string;             // ISO 8601
  comment?: string;
  [key: string]: unknown;
}

export interface AGSScoreCreateRequest {
  userId: string;
  scoreGiven: number;
  scoreMaximum: number;
  activityProgress?: 'Initialized' | 'Started' | 'Completed';
  gradingProgress?: 'Pending' | 'Failed' | 'FullyGraded';
  comment?: string;
  timestamp?: string;
  metadata?: Record<string, unknown>;
}

export interface AGSScoreResult {
  id: string;                    // Score URL
  userId: string;
  scoreGiven: number;
  scoreMaximum: number;
  activityProgress: string;
  gradingProgress: string;
  timestamp: string;
  comment?: string;
  ltiScoreUrl?: string;
}

// ============================================================================
// Deep Linking Types
// ============================================================================

export interface DeepLinkingItem {
  type: 'ltiResourceLink' | 'ltiResourceLink:application/vnd.ims.lti.v1.ltilink';
  title: string;
  text?: string;
  url?: string;
  custom?: Record<string, string>;
  icon?: {
    url: string;
    width?: number;
    height?: number;
  };
  thumbnail?: {
    url: string;
    width?: number;
    height?: number;
  };
  window?: {
    width?: number;
    height?: number;
    targetName?: string;
  };
  iframe?: {
    width?: number;
    height?: number;
  };
  embed?: {
    width?: number;
    height?: number;
  };
}

export interface DeepLinkingResponse {
  items: DeepLinkingItem[];
  message?: string;
  log?: string;
  error?: string;
  error_description?: string;
}

// ============================================================================
// Platform Event Types (for audit logging)
// ============================================================================

export type LTIEventType = 
  | 'lti_launch_initiated'
  | 'lti_launch_success'
  | 'lti_launch_failed'
  | 'lti_nrps_sync_started'
  | 'lti_nrps_sync_completed'
  | 'lti_nrps_sync_failed'
  | 'lti_ags_lineitem_created'
  | 'lti_ags_lineitem_updated'
  | 'lti_ags_score_posted'
  | 'lti_ags_score_failed'
  | 'lti_deep_linking_launched'
  | 'lti_deep_linking_response'
  | 'lti_platform_registered'
  | 'lti_platform_updated'
  | 'lti_platform_deleted'
  | 'lti_deployment_created'
  | 'lti_deployment_updated'
  | 'lti_deployment_deleted'
  | 'lti_key_rotated';

export interface LTIEventMetadata {
  platformId?: string;
  deploymentId?: string;
  contextId?: string;
  userId?: string;
  sessionId?: string;
  lineItemId?: string;
  scoreId?: string;
  error?: string;
  durationMs?: number;
  [key: string]: unknown;
}