/**
 * LTI Advantage Assignment and Grade Service (AGS) Client
 * Handles line item creation, score publishing, and grade passback
 */

import { db } from '@/lib/db';
import { ltiPlatforms, ltiDeployments, agsLineItems, agsScores, nrpsCache, tutorSessions } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import * as jose from 'jose';

interface AGSTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

interface LineItemRequest {
  scoreMaximum: number;
  label: string;
  resourceId?: string;
  tag?: string;
  startDateTime?: string;
  endDateTime?: string;
  type?: 'score' | 'grade' | 'participation' | 'completion';
}

interface LineItemResponse {
  id: string;
  scoreMaximum: number;
  label: string;
  resourceId?: string;
  tag?: string;
  startDateTime?: string;
  endDateTime?: string;
  type: string;
  resourceLinkId?: string;
}

interface ScoreRequest {
  scoreGiven: number;
  scoreMaximum: number;
  comment?: string;
  activityProgress: 'Initialized' | 'Started' | 'Completed';
  gradingProgress: 'Pending' | 'Failed' | 'FullyGraded';
  timestamp: string;
  userId: string; // LTI user ID (sub claim)
}

interface ScoreResponse {
  id: string;
  scoreGiven: number;
  scoreMaximum: number;
  scoreDateTime: string;
  userId: string;
}

export class AGSClient {
  private deploymentId: string;
  private platform: any;
  private deployment: any;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(deploymentId: string) {
    this.deploymentId = deploymentId;
  }

  async initialize() {
    const [deployment] = await db
      .select()
      .from(ltiDeployments)
      .where(eq(ltiDeployments.id, this.deploymentId))
      .limit(1);

    if (!deployment) throw new Error('Deployment not found');

    const [platform] = await db
      .select()
      .from(ltiPlatforms)
      .where(eq(ltiPlatforms.id, deployment.platformId))
      .limit(1);

    if (!platform) throw new Error('Platform not found');

    this.deployment = deployment;
    this.platform = platform;
  }

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    // Create JWT for client credentials grant
    const now = Math.floor(Date.now() / 1000);
    const clientId = this.platform.clientId;
    
    const privateKey = this.platform.privateKey;
    if (!privateKey) throw new Error('Platform private key not configured');

    // Import private key for signing
    const key = await jose.importPKCS8(privateKey, 'RS256');
    
    const jwt = await new jose.SignJWT({
      iss: clientId,
      sub: clientId,
      aud: this.platform.authTokenUrl,
      iat: now,
      exp: now + 300, // 5 minutes
      jti: crypto.randomUUID(),
    })
      .setProtectedHeader({ alg: 'RS256', kid: this.platform.configuration?.keyId })
      .sign(key);

    // Exchange JWT for access token
    const params = new URLSearchParams({
      grant_type: 'client_credentials',
      client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
      client_assertion: jwt,
      scope: 'https://purl.imsglobal.org/spec/lti-ags/scope/lineitem https://purl.imsglobal.org/spec/lti-ags/scope/score https://purl.imsglobal.org/spec/lti-ags/scope/result.readonly',
    });

    const res = await fetch(this.platform.authTokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
    });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(`AGS token request failed: ${res.status} - ${error}`);
    }

    const tokenData: AGSTokenResponse = await res.json();
    this.accessToken = tokenData.access_token;
    this.tokenExpiry = Date.now() + (tokenData.expires_in - 60) * 1000; // 1 min buffer

    return this.accessToken;
  }

  private async request<T>(url: string, options: RequestInit = {}): Promise<T> {
    const token = await this.getAccessToken();
    
    const res = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/vnd.ims.lti.v2+json',
        ...options.headers,
      },
    });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(`AGS request failed: ${res.status} - ${error}`);
    }

    if (res.status === 204) return {} as T;
    return res.json() as T;
  }

  /**
   * Create a line item in the LMS gradebook
   */
  async createLineItem(contextId: string, lineItem: LineItemRequest): Promise<LineItemResponse> {
    const url = this.deployment.targetLinkUri.replace(/\/namesroles\/.*$/, '/lineitems');
    // Or use the platform's lineitems endpoint from configuration
    const lineItemsUrl = this.platform.configuration?.lineItemsUrl || 
      `${new URL(this.deployment.targetLinkUri).origin}/lti/lineitems/${contextId}`;

    const body: any = {
      scoreMaximum: lineItem.scoreMaximum,
      label: lineItem.label,
    };

    if (lineItem.resourceId) body.resourceId = lineItem.resourceId;
    if (lineItem.tag) body.tag = lineItem.tag;
    if (lineItem.startDateTime) body.startDateTime = lineItem.startDateTime;
    if (lineItem.endDateTime) body.endDateTime = lineItem.endDateTime;
    if (lineItem.type) body.type = lineItem.type;

    const result = await this.request<LineItemResponse>(lineItemsUrl, {
      method: 'POST',
      body: JSON.stringify(body),
    });

    // Store in local DB
    await db.insert(agsLineItems).values({
      deploymentId: this.deploymentId,
      contextId,
      label: lineItem.label,
      scoreMaximum: lineItem.scoreMaximum,
      scoreMinimum: 0,
      type: lineItem.type || 'score',
      resourceId: lineItem.resourceId,
      tag: lineItem.tag,
      startDateTime: lineItem.startDateTime ? new Date(lineItem.startDateTime) : null,
      endDateTime: lineItem.endDateTime ? new Date(lineItem.endDateTime) : null,
      ltiLineItemUrl: result.id,
      isActive: true,
    });

    return result;
  }

  /**
   * Get line items for a context
   */
  async getLineItems(contextId: string): Promise<LineItemResponse[]> {
    const lineItemsUrl = this.platform.configuration?.lineItemsUrl || 
      `${new URL(this.deployment.targetLinkUri).origin}/lti/lineitems/${contextId}`;

    return this.request<LineItemResponse[]>(lineItemsUrl);
  }

  /**
   * Publish a score for a user
   */
  async publishScore(
    lineItemId: string,
    ltiUserId: string,
    score: ScoreRequest
  ): Promise<ScoreResponse> {
    const scoresUrl = `${this.deployment.targetLinkUri.replace(/\/namesroles\/.*$/, '/scores')}/${lineItemId}/scores`;
    // Or use the platform's scores endpoint
    const actualScoresUrl = this.platform.configuration?.scoresUrl || scoresUrl;

    const result = await this.request<ScoreResponse>(actualScoresUrl, {
      method: 'POST',
      body: JSON.stringify(score),
    });

    // Store in local DB
    const [lineItem] = await db
      .select()
      .from(agsLineItems)
      .where(eq(agsLineItems.ltiLineItemUrl, lineItemId))
      .limit(1);

    if (lineItem) {
      await db.insert(agsScores).values({
        lineItemId: lineItem.id,
        userId: ltiUserId, // This should be the app user ID, not LTI user ID
        scoreGiven: score.scoreGiven,
        scoreMaximum: score.scoreMaximum,
        comment: score.comment,
        activityProgress: score.activityProgress,
        gradingProgress: score.gradingProgress,
        status: 'submitted',
        ltiScoreUrl: result.id,
        timestamp: new Date(score.timestamp),
        submittedAt: new Date(),
      });
    }

    return result;
  }

  /**
   * Get scores for a line item
   */
  async getScores(lineItemId: string, ltiUserId?: string): Promise<ScoreResponse[]> {
    let scoresUrl = `${this.deployment.targetLinkUri.replace(/\/namesroles\/.*$/, '/scores')}/${lineItemId}/scores`;
    if (ltiUserId) {
      scoresUrl += `?user_id=${encodeURIComponent(ltiUserId)}`;
    }
    return this.request<ScoreResponse[]>(scoresUrl);
  }
}

/**
 * Helper to create AGS client from deployment
 */
export async function createAGSClient(deploymentId: string): Promise<AGSClient> {
  const client = new AGSClient(deploymentId);
  await client.initialize();
  return client;
}

/**
 * Create line item from a tutor session artifact/assessment
 */
export async function createLineItemFromSession(
  deploymentId: string,
  contextId: string,
  sessionId: string,
  label: string,
  scoreMaximum: number = 100,
  type: 'score' | 'grade' | 'participation' | 'completion' = 'score'
) {
  const client = await createAGSClient(deploymentId);
  const lineItem = await client.createLineItem(contextId, {
    label,
    scoreMaximum,
    type,
    resourceId: sessionId,
    tag: `session-${sessionId}`,
  });
  return lineItem;
}

/**
 * Publish score for a completed session
 */
export async function publishSessionScore(
  deploymentId: string,
  lineItemUrl: string,
  ltiUserId: string,
  scoreGiven: number,
  scoreMaximum: number,
  comment?: string
) {
  const client = await createAGSClient(deploymentId);
  return client.publishScore(lineItemUrl, ltiUserId, {
    scoreGiven,
    scoreMaximum,
    comment,
    activityProgress: 'Completed',
    gradingProgress: 'FullyGraded',
    timestamp: new Date().toISOString(),
    userId: ltiUserId,
  });
}