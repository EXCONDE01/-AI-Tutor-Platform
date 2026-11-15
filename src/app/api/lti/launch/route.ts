/**
 * LTI 1.3 Launch API Route
 * Handles OIDC initiation and callback for LTI 1.3 launches
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAuditLog } from '@/lib/compliance/audit';
import {
  verifyLTILaunchJWT,
} from '@/lib/lti/jwt';
import { getPlatformByIssuer } from '@/lib/lti/platform';
import {
  getDeploymentById,
  getDeploymentByPlatformAndDeploymentId,
  getPlatformById,
} from '@/lib/lti/platform';
import {
  handleOIDCCallback,
  initiateToolLaunch,
  getAndClearOIDCState,
  OIDC_STATE_COOKIE,
} from '@/lib/lti/oidc';
import { LTILaunchParams } from '@/lib/lti/types';
import { createAGSClient, createNRPSClient } from '@/lib/lti';

function auditContext(request: NextRequest) {
  const forwarded = request.headers.get('x-forwarded-for');
  return {
    ipAddress: forwarded ? forwarded.split(',')[0].trim() : request.headers.get('x-real-ip') ?? undefined,
    userAgent: request.headers.get('user-agent') ?? undefined,
    requestId: request.headers.get('x-request-id') ?? undefined,
  };
}

// Shape-only check: the goal is to keep non-UUID strings out of the uuid column
// (which would raise a Postgres cast error), not to enforce RFC version bits.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ============================================================================
// GET /api/lti/launch - OIDC Initiation (Tool-Initiated Launch)
// ============================================================================

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const deploymentId = searchParams.get('deployment_id');
  const targetLinkUri = searchParams.get('target_link_uri') || new URL('/', request.url).toString();
  const loginHint = searchParams.get('login_hint');
  const isDeepLink = searchParams.get('deep_link') === 'true';
  const ctx = auditContext(request);

  if (!deploymentId) {
    await createAuditLog({
      action: 'lti_launch_failed',
      resourceType: 'lti_launch',
      districtId: undefined,
      severity: 'error',
      description: 'LTI launch initiation failed: missing deployment_id parameter',
      metadata: { error: 'Missing deployment_id parameter', deploymentId: deploymentId ?? null },
      ...ctx,
    });
    return NextResponse.json(
      { error: 'Missing deployment_id parameter' },
      { status: 400 }
    );
  }

  if (!UUID_RE.test(deploymentId)) {
    await createAuditLog({
      action: 'lti_launch_failed',
      resourceType: 'lti_launch',
      districtId: undefined,
      severity: 'error',
      description: 'LTI launch initiation failed: invalid deployment_id format',
      metadata: { error: 'Invalid deployment_id format', deploymentId },
      ...ctx,
    });
    return NextResponse.json(
      { error: 'Invalid deployment_id parameter' },
      { status: 400 }
    );
  }

  try {
    // Get deployment and platform
    const deployment = await getDeploymentById(deploymentId);
    if (!deployment) {
      await createAuditLog({
        action: 'lti_launch_failed',
        resourceType: 'lti_launch',
        districtId: undefined,
        severity: 'error',
        description: 'LTI launch initiation failed: deployment not found',
        metadata: { error: 'Deployment not found', deploymentId },
        ...ctx,
      });
      return NextResponse.json(
        { error: 'Deployment not found' },
        { status: 404 }
      );
    }

    const platform = await getPlatformById(deployment.platformId);
    if (!platform) {
      await createAuditLog({
        action: 'lti_launch_failed',
        resourceType: 'lti_launch',
        districtId: undefined,
        severity: 'error',
        description: 'LTI launch initiation failed: platform not found',
        metadata: { error: 'Platform not found', deploymentId, platformId: deployment.platformId },
        ...ctx,
      });
      return NextResponse.json(
        { error: 'Platform not found' },
        { status: 404 }
      );
    }

    // Check platform status
    if (platform.status !== 'active') {
      await createAuditLog({
        action: 'lti_launch_failed',
        resourceType: 'lti_launch',
        districtId: platform.districtId,
        severity: 'error',
        description: 'LTI launch initiation failed: platform is not active',
        metadata: { error: 'Platform is not active', deploymentId, platformId: platform.id },
        ...ctx,
      });
      return NextResponse.json(
        { error: 'Platform is not active' },
        { status: 400 }
      );
    }

    // Build OIDC launch URL
    const { formHtml } = await initiateToolLaunch(
      platform,
      deployment.deploymentId,
      targetLinkUri,
      undefined, // resourceLinkId
      loginHint || undefined
    );

    // Audit log successful initiation
    await createAuditLog({
      action: 'lti_launch_initiated',
      resourceType: 'lti_launch',
      resourceId: deployment.id,
      districtId: platform.districtId,
      severity: 'info',
      description: 'LTI launch initiated successfully',
      metadata: {
        deploymentId: deployment.id,
        platformId: platform.id,
        targetLinkUri,
        isDeepLink,
      },
      ...ctx,
    });

    // Return auto-submitting form
    return new NextResponse(formHtml, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error) {
    console.error('LTI launch initiation error:', error);
    await createAuditLog({
      action: 'lti_launch_failed',
      resourceType: 'lti_launch',
      districtId: undefined,
      severity: 'error',
      description: 'LTI launch initiation failed with error',
      metadata: {
        deploymentId,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      ...ctx,
    });

    return NextResponse.json(
      { error: 'Failed to initiate LTI launch' },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST /api/lti/launch - OIDC Callback (Platform-Initiated Launch)
// ============================================================================

export async function POST(request: NextRequest) {
  const ctx = auditContext(request);

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    await createAuditLog({
      action: 'lti_launch_failed',
      resourceType: 'lti_launch',
      districtId: undefined,
      severity: 'error',
      description: 'LTI launch callback failed: malformed request body',
      metadata: { error: 'Malformed request body' },
      ...ctx,
    });
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  }

  const idToken = formData.get('id_token') as string;
  const state = formData.get('state') as string;
  try {

    if (!idToken || !state) {
      await createAuditLog({
        action: 'lti_launch_failed',
        resourceType: 'lti_launch',
        districtId: undefined,
        severity: 'error',
        description: 'LTI launch callback failed: missing id_token or state parameter',
        metadata: { error: 'Missing id_token or state parameter' },
        ...ctx,
      });
      return NextResponse.json(
        { error: 'Missing id_token or state parameter' },
        { status: 400 }
      );
    }

    // Handle OIDC callback - validates state and nonce
    const callbackResult = await handleOIDCCallback(formData);

    if ('error' in callbackResult) {
      await createAuditLog({
        action: 'lti_launch_failed',
        resourceType: 'lti_launch',
        districtId: undefined,
        severity: 'error',
        description: 'LTI launch callback failed: OIDC callback error',
        metadata: { error: callbackResult.error },
        ...ctx,
      });

      return NextResponse.json(
        { error: callbackResult.error },
        { status: 400 }
      );
    }

    const { launchParams, targetLinkUri } = callbackResult;

    // Verify JWT signature using platform's JWKS
    const platform = await getPlatformByIssuer(launchParams.iss);
    if (!platform) {
      await createAuditLog({
        action: 'lti_launch_failed',
        resourceType: 'lti_launch',
        districtId: undefined,
        severity: 'error',
        description: 'LTI launch callback failed: unknown platform issuer',
        metadata: { error: 'Unknown platform issuer', issuer: launchParams.iss },
        ...ctx,
      });

      return NextResponse.json(
        { error: 'Platform not configured' },
        { status: 400 }
      );
    }

    // Verify the JWT
    let verifiedParams: LTILaunchParams;
    try {
      const result = await verifyLTILaunchJWT(idToken, platform, platform.clientId);
      verifiedParams = result.payload;
    } catch (error) {
      await createAuditLog({
        action: 'lti_launch_failed',
        resourceType: 'lti_launch',
        districtId: platform.districtId,
        severity: 'error',
        description: 'LTI launch callback failed: JWT verification failed',
        metadata: {
          error: error instanceof Error ? error.message : 'JWT verification failed',
          issuer: launchParams.iss,
        },
        ...ctx,
      });

      return NextResponse.json(
        { error: 'Invalid LTI launch token' },
        { status: 401 }
      );
    }

    // Get deployment for this launch
    const deploymentIdClaim = verifiedParams['https://purl.imsglobal.org/spec/lti/claim/deployment_id'];
    const deployment = await getDeploymentByPlatformAndDeploymentId(platform.id, deploymentIdClaim);
    
    if (!deployment) {
      await createAuditLog({
        action: 'lti_launch_failed',
        resourceType: 'lti_launch',
        districtId: platform.districtId,
        severity: 'error',
        description: 'LTI launch callback failed: deployment not found',
        metadata: { error: 'Deployment not found', deploymentId: deploymentIdClaim, platformId: platform.id },
        ...ctx,
      });

      return NextResponse.json(
        { error: 'Deployment not configured' },
        { status: 400 }
      );
    }

    // Check deployment status
    if (deployment.status !== 'active') {
      await createAuditLog({
        action: 'lti_launch_failed',
        resourceType: 'lti_launch',
        districtId: platform.districtId,
        severity: 'error',
        description: 'LTI launch callback failed: deployment is not active',
        metadata: { error: 'Deployment is not active', deploymentId: deployment.id, platformId: platform.id },
        ...ctx,
      });
      return NextResponse.json(
        { error: 'Deployment is not active' },
        { status: 400 }
      );
    }

    // Extract context and user info (guarded - optional claims)
    const context = verifiedParams['https://purl.imsglobal.org/spec/lti/claim/context'];
    const resourceLink = verifiedParams['https://purl.imsglobal.org/spec/lti/claim/resource_link'];
    const roles = verifiedParams['https://purl.imsglobal.org/spec/lti/claim/roles'];
    const custom = verifiedParams['https://purl.imsglobal.org/spec/lti/claim/custom'] || {};

    // Check for NRPS endpoint
    const nrpsEndpoint = verifiedParams['https://purl.imsglobal.org/spec/lti-nrps/claim/namesroleservice'];
    // Check for AGS endpoint
    const agsEndpoint = verifiedParams['https://purl.imsglobal.org/spec/lti-ags/claim/endpoint'];

    // Guard optional claims
    const contextId = context?.id ?? null;
    const contextTitle = context?.title ?? null;
    const contextLabel = context?.label ?? null;
    const resourceLinkId = resourceLink?.id ?? null;
    const resourceLinkTitle = resourceLink?.title ?? null;

    // Create session cookie with launch data
    const sessionData = {
      ltiLaunch: {
        userId: verifiedParams.sub,
        platformId: platform.id,
        deploymentId: deployment.id,
        contextId,
        contextTitle,
        contextLabel,
        resourceLinkId,
        resourceLinkTitle,
        roles,
        custom,
        nrpsEndpoint: nrpsEndpoint ? {
          contextMembershipsUrl: nrpsEndpoint.context_memberships_url,
          serviceVersions: nrpsEndpoint.service_versions,
        } : null,
        agsEndpoint: agsEndpoint ? {
          lineItemsUrl: agsEndpoint.lineitems_url,
          scopes: agsEndpoint.scope,
          serviceVersions: agsEndpoint.service_versions,
        } : null,
        timestamp: Date.now(),
      },
    };

    // Set session cookie
    const cookieStore = await cookies();
    cookieStore.set('lti_session', JSON.stringify(sessionData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 8, // 8 hours
      path: '/',
    });

    // Also set individual cookies for quick access
    cookieStore.set('lti_user_id', verifiedParams.sub, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 8,
      path: '/',
    });

    cookieStore.set('lti_context_id', contextId ?? '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 8,
      path: '/',
    });

    cookieStore.set('lti_deployment_id', deployment.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 8,
      path: '/',
    });

    // Initialize AGS/NRPS clients if endpoints available
    if (agsEndpoint) {
      const agsClient = await createAGSClient(platform.id, deployment.id);
      if (agsClient) {
        agsClient.setEndpoint({
          scope: agsEndpoint.scope,
          lineitems_url: agsEndpoint.lineitems_url,
          service_versions: agsEndpoint.service_versions,
        });
      }
    }

    if (nrpsEndpoint) {
      const nrpsClient = await createNRPSClient(platform.id, deployment.id);
      // Client will fetch memberships on demand
    }

    // Audit log successful launch
    await createAuditLog({
      action: 'lti_launch_succeeded',
      resourceType: 'lti_launch',
      resourceId: deployment.id,
      districtId: platform.districtId,
      severity: 'info',
      description: 'LTI launch succeeded',
      metadata: {
        platformId: platform.id,
        deploymentId: deployment.id,
        contextId,
        contextTitle,
        ltiSubject: verifiedParams.sub,
        roles,
        messageType: verifiedParams['https://purl.imsglobal.org/spec/lti/claim/message_type'],
        hasNrps: !!nrpsEndpoint,
        hasAgs: !!agsEndpoint,
      },
      ...ctx,
    });

    // Determine target URL based on message type
    const messageType = verifiedParams['https://purl.imsglobal.org/spec/lti/claim/message_type'];
    let redirectUrl = targetLinkUri;

    if (messageType === 'LtiDeepLinkingRequest') {
      // Deep linking launch - redirect to content selection
      redirectUrl = new URL('/teacher/content/select', request.url).toString();
    } else {
      // Resource link launch - redirect to the tool
      redirectUrl = targetLinkUri;
    }

    // Add launch params to redirect URL for client-side access
    const redirect = new URL(redirectUrl);
    redirect.searchParams.set('lti_launch', 'true');

    return NextResponse.redirect(redirect);

  } catch (error) {
    console.error('LTI launch callback error:', error);
    await createAuditLog({
      action: 'lti_launch_failed',
      resourceType: 'lti_launch',
      districtId: undefined,
      severity: 'error',
      description: 'LTI launch callback failed with error',
      metadata: {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      ...ctx,
    });

    return NextResponse.json(
      { error: 'LTI launch failed' },
      { status: 500 }
    );
  }
}