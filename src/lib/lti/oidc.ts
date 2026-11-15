/**
 * LTI 1.3 OIDC Launch Initiation & Callback
 * Handles the OAuth 2.0 / OIDC flow for LTI 1.3 launches
 */

import { randomBytes, createHash } from 'crypto';
import { cookies } from 'next/headers';
import { LTIPlatformConfig, OIDCLaunchRequest, OIDCStateData, LTILaunchParams, OIDCLaunchResponse } from './types';
import { getPlatformByIssuer, getDeploymentById } from './platform';

const OIDC_STATE_COOKIE = 'lti_oidc_state';
const OIDC_STATE_TTL = 10 * 60 * 1000; // 10 minutes

export { OIDC_STATE_COOKIE, OIDC_STATE_TTL };

/**
 * Generate a secure random string for state/nonce
 */
function generateSecureRandom(length: number = 32): string {
  return randomBytes(length).toString('base64url');
}

/**
 * Generate PKCE code verifier and challenge
 */
function generatePKCE(): { codeVerifier: string; codeChallenge: string } {
  const codeVerifier = generateSecureRandom(43); // 43-128 chars
  const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url');
  return { codeVerifier, codeChallenge };
}

/**
 * Store OIDC state in secure httpOnly cookie
 */
export async function setOIDCState(state: string, data: OIDCStateData): Promise<void> {
  const cookieStore = await cookies();
  const value = JSON.stringify({ state, ...data });
  cookieStore.set(OIDC_STATE_COOKIE, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: OIDC_STATE_TTL / 1000,
    path: '/',
  });
}

/**
 * Retrieve and clear OIDC state from cookie
 */
export async function getAndClearOIDCState(state: string): Promise<OIDCStateData | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(OIDC_STATE_COOKIE);
  
  if (!cookie?.value) {
    return null;
  }
  
  try {
    const data = JSON.parse(cookie.value) as OIDCStateData & { state: string };
    
    // Verify state matches
    if (data.state !== state) {
      return null;
    }
    
    // Check timestamp (10 min expiry)
    if (Date.now() - data.timestamp > OIDC_STATE_TTL) {
      return null;
    }
    
    // Clear the cookie
    cookieStore.delete(OIDC_STATE_COOKIE);
    
    return data;
  } catch {
    return null;
  }
}

/**
 * Build the OIDC authorization URL for LTI launch initiation
 * This is called when the platform initiates a launch (3rd party initiated)
 */
export async function buildOIDCLaunchUrl(
  platform: LTIPlatformConfig,
  deploymentId: string,
  targetLinkUri: string,
  loginHint?: string
): Promise<{ url: string; state: string; nonce: string }> {
  const state = generateSecureRandom();
  const nonce = generateSecureRandom();
  const { codeVerifier, codeChallenge } = generatePKCE();
  
  // Store state for callback validation
  await setOIDCState(state, {
    nonce,
    targetLinkUri,
    deploymentId,
    redirectUrl: targetLinkUri,
    timestamp: Date.now(),
    codeVerifier,
  });
  
  const params = new URLSearchParams({
    scope: 'openid ' + platform.scopes.join(' '),
    response_type: 'id_token',
    response_mode: 'form_post',
    client_id: platform.clientId,
    redirect_uri: new URL('/api/lti/launch', process.env.NEXT_PUBLIC_APP_URL).toString(),
    state,
    nonce,
    prompt: 'none',
    login_hint: loginHint || '',
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });
  
  // Add LTI-specific parameters
  if (deploymentId) {
    params.set('lti_message_hint', deploymentId);
  }
  
  const url = `${platform.authLoginUrl}?${params.toString()}`;
  
  return { url, state, nonce };
}

/**
 * Parse and validate the OIDC callback (form_post response)
 * This handles the platform redirect back to our callback endpoint
 */
export async function handleOIDCCallback(
  formData: FormData
): Promise<{ launchParams: LTILaunchParams; targetLinkUri: string } | { error: string }> {
  const idToken = formData.get('id_token') as string;
  const state = formData.get('state') as string;
  
  if (!idToken || !state) {
    return { error: 'Missing id_token or state parameter' };
  }
  
  // Retrieve stored state
  const storedState = await getAndClearOIDCState(state);
  if (!storedState) {
    return { error: 'Invalid or expired OIDC state' };
  }
  
  // TODO: Verify the JWT signature using platform's JWKS
  // This will be done in the launch route after fetching platform config
  
  // For now, decode the payload (verification happens in jwt.ts)
  const payload = parseJWTPayload(idToken);
  
  if (!payload) {
    return { error: 'Invalid JWT payload' };
  }
  
  // Verify nonce matches
  if (payload.nonce !== storedState.nonce) {
    return { error: 'Nonce mismatch' };
  }
  
  // Verify target_link_uri matches
  if (storedState.targetLinkUri && payload['https://purl.imsglobal.org/spec/lti/claim/target_link_uri'] !== storedState.targetLinkUri) {
    return { error: 'Target link URI mismatch' };
  }
  
  // Get platform config for verification
  const issuer = payload.iss as string;
  const platform = await getPlatformByIssuer(issuer);
  if (!platform) {
    return { error: 'Unknown platform issuer' };
  }
  
  // Verify deployment matches if provided
  if (storedState.deploymentId) {
    const deployment = await getDeploymentById(storedState.deploymentId);
    if (!deployment || deployment.platformId !== platform.id) {
      return { error: 'Deployment mismatch' };
    }
  }
  
  return {
    launchParams: payload as unknown as LTILaunchParams,
    targetLinkUri: storedState.targetLinkUri || payload['https://purl.imsglobal.org/spec/lti/claim/target_link_uri'] as string,
  };
}

/**
 * Parse JWT payload without verification (verification done separately)
 */
function parseJWTPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const payload = parts[1];
    const decoded = Buffer.from(payload, 'base64url').toString('utf-8');
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

/**
 * Initiate LTI launch from tool side (tool-initiated launch)
 * Used when user clicks "Launch" from within the tool
 */
export async function initiateToolLaunch(
  platform: LTIPlatformConfig,
  deploymentId: string,
  targetLinkUri: string,
  resourceLinkId?: string,
  loginHint?: string
): Promise<{ url: string; formHtml: string }> {
  const { url, state, nonce } = await buildOIDCLaunchUrl(platform, deploymentId, targetLinkUri, loginHint);
  
  // Build auto-submitting form for form_post response_mode
  const params = new URLSearchParams(url.split('?')[1]);
  const formFields = Array.from(params.entries())
    .map(([key, value]) => `<input type="hidden" name="${key}" value="${escapeHtml(value)}">`)
    .join('\n');
  
  const formHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Launching LTI Tool...</title>
    </head>
    <body onload="document.getElementById('lti-launch-form').submit()">
      <form id="lti-launch-form" method="POST" action="${escapeHtml(platform.authLoginUrl)}">
        ${formFields}
      </form>
      <noscript>
        <p>JavaScript is required to launch this tool. Please enable JavaScript and try again.</p>
        <button type="submit" form="lti-launch-form">Launch Tool</button>
      </noscript>
    </body>
    </html>
  `;
  
  return { url, formHtml };
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, '&#039;');
}