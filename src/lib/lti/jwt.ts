/**
 * LTI 1.3 JWT Verification with JWKS Caching
 * Handles JWT signature verification, key rotation, and caching
 */

import { createRemoteJWKSet, jwtVerify, JWTPayload, JWTVerifyResult } from 'jose';
import { LTIPlatformConfig, JWKS, JWK, LTILaunchParams, JWTPayload as LTIJWTPayload } from './types';
import { getPlatformByIssuer } from './platform';

// ============================================================================
// JWKS Cache (using Map with manual TTL)
// ============================================================================

interface CacheEntry {
  jwks: JWKS;
  fetchedAt: number;
}

// Cache JWKS per platform issuer (5 min TTL, max 50 entries)
const jwksCache = new Map<string, CacheEntry>();
const MAX_CACHE_SIZE = 50;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function cleanCache() {
  const now = Date.now();
  for (const [key, entry] of jwksCache.entries()) {
    if (now - entry.fetchedAt > CACHE_TTL) {
      jwksCache.delete(key);
    }
  }
  
  // If still over max size, remove oldest entries
  if (jwksCache.size > MAX_CACHE_SIZE) {
    const entries = Array.from(jwksCache.entries());
    entries.sort((a, b) => a[1].fetchedAt - b[1].fetchedAt);
    const toRemove = entries.slice(0, jwksCache.size - MAX_CACHE_SIZE);
    for (const [key] of toRemove) {
      jwksCache.delete(key);
    }
  }
}

/**
 * Fetch JWKS from platform with caching
 */
export async function fetchJWKS(platform: LTIPlatformConfig): Promise<JWKS> {
  const cacheKey = platform.issuer;
  const cached = jwksCache.get(cacheKey);
  
  // Clean expired entries periodically
  if (jwksCache.size > 0 && Math.random() < 0.1) {
    cleanCache();
  }
  
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
    return cached.jwks;
  }
  
  try {
    const response = await fetch(platform.jwksUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'AI-Tutor-Platform/1.0',
      },
      // 10 second timeout
      signal: AbortSignal.timeout(10000),
    });
    
    if (!response.ok) {
      throw new Error(`JWKS fetch failed: ${response.status} ${response.statusText}`);
    }
    
    const jwks = await response.json() as JWKS;
    
    // Validate JWKS structure
    if (!jwks.keys || !Array.isArray(jwks.keys) || jwks.keys.length === 0) {
      throw new Error('Invalid JWKS: no keys found');
    }
    
    // Cache the result
    jwksCache.set(cacheKey, { jwks, fetchedAt: Date.now() });
    
    return jwks;
  } catch (error) {
    // Return cached version if fetch fails (stale-while-revalidate)
    if (cached) {
      console.warn(`JWKS fetch failed for ${platform.issuer}, using cached version:`, error);
      return cached.jwks;
    }
    throw error;
  }
}

/**
 * Get JWKS as a remote JWK Set for jose library
 */
export function getRemoteJWKS(platform: LTIPlatformConfig) {
  return createRemoteJWKSet(new URL(platform.jwksUrl), {
    cacheMaxAge: 5 * 60, // 5 minutes
    cooldownDuration: 60, // 1 minute cooldown on error
    timeoutDuration: 10, // 10 second timeout
  });
}

/**
 * Verify LTI launch JWT
 */
export async function verifyLTILaunchJWT(
  token: string,
  platform: LTIPlatformConfig,
  expectedClientId: string
): Promise<{ payload: LTILaunchParams; protectedHeader: JWTVerifyResult['protectedHeader'] }> {
  try {
    // Use jose's remote JWKS with caching
    const remoteJWKS = getRemoteJWKS(platform);
    
    const { payload, protectedHeader } = await jwtVerify(token, remoteJWKS, {
      issuer: platform.issuer,
      audience: expectedClientId,
      clockTolerance: 30, // 30 seconds clock skew tolerance
      maxTokenAge: '15m', // Token must be less than 15 minutes old
    });
    
    // Additional LTI-specific validations
    validateLTIClaims(payload as unknown as LTILaunchParams);
    
    return {
      payload: payload as unknown as LTILaunchParams,
      protectedHeader,
    };
  } catch (error) {
    // If remote JWKS fails, try with cached JWKS
    console.warn('Remote JWKS verification failed, trying cached JWKS:', error);
    return verifyWithCachedJWKS(token, platform, expectedClientId);
  }
}

/**
 * Fallback verification using cached JWKS
 */
async function verifyWithCachedJWKS(
  token: string,
  platform: LTIPlatformConfig,
  expectedClientId: string
): Promise<{ payload: LTILaunchParams; protectedHeader: JWTVerifyResult['protectedHeader'] }> {
  const jwks = await fetchJWKS(platform);
  
  // Find the matching key by kid
  const protectedHeader = JSON.parse(Buffer.from(token.split('.')[0], 'base64url').toString());
  const kid = protectedHeader.kid;
  
  if (!kid) {
    throw new Error('JWT missing kid header');
  }
  
  const jwk = jwks.keys.find(k => k.kid === kid);
  if (!jwk) {
    throw new Error(`No matching key found for kid: ${kid}`);
  }
  
  // Import the key
  const key = await importJWK(jwk);
  
  const { payload, protectedHeader: header } = await jwtVerify(token, key, {
    issuer: platform.issuer,
    audience: expectedClientId,
    clockTolerance: 30,
    maxTokenAge: '15m',
  });
  
  validateLTIClaims(payload as unknown as LTILaunchParams);
  
  return {
    payload: payload as unknown as LTILaunchParams,
    protectedHeader: header,
  };
}

/**
 * Import JWK for jose
 */
async function importJWK(jwk: JWK) {
  const { importJWK } = await import('jose');
  return importJWK(jwk, jwk.alg);
}

/**
 * Validate LTI-specific claims in the JWT
 */
function validateLTIClaims(payload: LTILaunchParams): void {
  // Check required LTI claims
  const requiredClaims = [
    'https://purl.imsglobal.org/spec/lti/claim/message_type',
    'https://purl.imsglobal.org/spec/lti/claim/version',
    'https://purl.imsglobal.org/spec/lti/claim/deployment_id',
    'https://purl.imsglobal.org/spec/lti/claim/target_link_uri',
    'https://purl.imsglobal.org/spec/lti/claim/roles',
    'https://purl.imsglobal.org/spec/lti/claim/context',
    'https://purl.imsglobal.org/spec/lti/claim/resource_link',
  ];
  
  for (const claim of requiredClaims) {
    if (!(claim in payload)) {
      throw new Error(`Missing required LTI claim: ${claim}`);
    }
  }
  
  // Validate version
  if (payload['https://purl.imsglobal.org/spec/lti/claim/version'] !== '1.3.0') {
    throw new Error('Unsupported LTI version');
  }
  
  // Validate message type
  const messageType = payload['https://purl.imsglobal.org/spec/lti/claim/message_type'];
  if (!['LtiResourceLinkRequest', 'LtiDeepLinkingRequest'].includes(messageType)) {
    throw new Error(`Unsupported LTI message type: ${messageType}`);
  }
  
  // Validate context
  const context = payload['https://purl.imsglobal.org/spec/lti/claim/context'];
  if (!context.id) {
    throw new Error('Context missing required id');
  }
  
  // Validate resource link
  const resourceLink = payload['https://purl.imsglobal.org/spec/lti/claim/resource_link'];
  if (!resourceLink.id) {
    throw new Error('Resource link missing required id');
  }
  
  // Validate roles array
  const roles = payload['https://purl.imsglobal.org/spec/lti/claim/roles'];
  if (!Array.isArray(roles) || roles.length === 0) {
    throw new Error('Roles claim must be a non-empty array');
  }
}

/**
 * Verify a generic JWT (for AGS/NRPS service calls)
 */
export async function verifyServiceJWT(
  token: string,
  platform: LTIPlatformConfig,
  expectedAudience: string
): Promise<LTIJWTPayload> {
  const remoteJWKS = getRemoteJWKS(platform);
  
  const { payload } = await jwtVerify(token, remoteJWKS, {
    issuer: platform.issuer,
    audience: expectedAudience,
    clockTolerance: 30,
  });
  
  return payload as LTIJWTPayload;
}

/**
 * Force refresh JWKS cache for a platform (called on key rotation)
 */
export function refreshJWKSCache(issuer: string): void {
  jwksCache.delete(issuer);
}

/**
 * Get cached JWKS without fetching
 */
export function getCachedJWKS(issuer: string): JWKS | null {
  const cached = jwksCache.get(issuer);
  return cached?.jwks ?? null;
}

/**
 * Clear all JWKS cache
 */
export function clearJWKSCache(): void {
  jwksCache.clear();
}