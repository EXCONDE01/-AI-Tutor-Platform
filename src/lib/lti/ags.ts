/**
 * LTI 1.3 AGS Client (Assignment & Grade Service)
 * Handles line items and score posting to LTI platform
 */

import { SignJWT, importPKCS8, JWTPayload } from 'jose';
import { LTIPlatformConfig, AGSEndpoint, AGSLineItem, AGSLineItemCreateRequest, AGSScore, AGSScoreCreateRequest, AGSScoreResult, AGSLineItemContainer } from './types';
import { getPlatformById, getDeploymentById } from './platform';
import { db } from '@/lib/db';
import { agsLineItems, agsScores, ltiDeployments } from '@/db/schema/lti';
import { eq, and } from 'drizzle-orm';

const AGS_SCOPES = [
  'https://purl.imsglobal.org/spec/lti-ags/scope/lineitem',
  'https://purl.imsglobal.org/spec/lti-ags/scope/lineitem.readonly',
  'https://purl.imsglobal.org/spec/lti-ags/scope/score',
  'https://purl.imsglobal.org/spec/lti-ags/scope/result.readonly',
];

export { AGS_SCOPES };

interface TokenResponse {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
  scope: string;
}

// Token cache per platform
const tokenCache = new Map<string, { token: TokenResponse; expiresAt: number }>();

/**
 * Get OAuth 2.0 access token for AGS/NRPS using client credentials flow
 */
export async function getAccessToken(
  platform: LTIPlatformConfig,
  scopes: string[]
): Promise<TokenResponse> {
  const cacheKey = `${platform.issuer}:${scopes.sort().join(',')}`;
  const cached = tokenCache.get(cacheKey);
  
  if (cached && Date.now() < cached.expiresAt - 60000) { // 1 min buffer
    return cached.token;
  }

  // Prepare JWT assertion for client credentials
  const now = Math.floor(Date.now() / 1000);
  const privateKey = platform.privateKey;
  
  if (!privateKey) {
    throw new Error('Platform private key not configured for token request');
  }

  // Import private key
  const key = await importPKCS8(privateKey, 'RS256');
  
  // Create client assertion JWT
  const clientAssertion = await new SignJWT({
    iss: platform.clientId,
    sub: platform.clientId,
    aud: platform.authTokenUrl,
    jti: crypto.randomUUID(),
  })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuedAt(now)
    .setExpirationTime(now + 300) // 5 minutes
    .sign(key);

  // Request access token
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
    client_assertion: clientAssertion,
    scope: scopes.join(' '),
  });

  const response = await fetch(platform.authTokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Token request failed: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const tokenData = await response.json() as TokenResponse;
  
  // Cache the token
  tokenCache.set(cacheKey, {
    token: tokenData,
    expiresAt: Date.now() + (tokenData.expires_in * 1000),
  });

  return tokenData;
}

/**
 * AGS Client class for line items and scores
 */
export class AGSClient {
  private platform: LTIPlatformConfig;
  private deploymentId: string;
  private endpoint: AGSEndpoint | null = null;

  constructor(platform: LTIPlatformConfig, deploymentId: string) {
    this.platform = platform;
    this.deploymentId = deploymentId;
  }

  /**
   * Set the AGS endpoint (typically from LTI launch)
   */
  setEndpoint(endpoint: AGSEndpoint): void {
    this.endpoint = endpoint;
  }

  /**
   * Get or fetch access token for AGS
   */
  async getAccessToken(): Promise<string> {
    const tokenData = await getAccessToken(this.platform, AGS_SCOPES);
    return tokenData.access_token;
  }

  /**
   * Create a new line item
   */
  async createLineItem(
    lineItem: AGSLineItemCreateRequest
  ): Promise<AGSLineItem> {
    if (!this.endpoint) {
      throw new Error('AGS endpoint not configured');
    }

    const token = await this.getAccessToken();
    
    const response = await fetch(this.endpoint.lineitems_url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/vnd.ims.lis.v2.lineitem+json',
        'Accept': 'application/vnd.ims.lis.v2.lineitem+json',
      },
      body: JSON.stringify(lineItem),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Create line item failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const created = await response.json() as AGSLineItem;
    
    // Cache to local DB
    await this.cacheLineItem(created);
    
    return created;
  }

  /**
   * Get a line item by ID
   */
  async getLineItem(lineItemUrl: string): Promise<AGSLineItem> {
    if (!this.endpoint) {
      throw new Error('AGS endpoint not configured');
    }

    const token = await this.getAccessToken();
    
    const response = await fetch(lineItemUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.ims.lis.v2.lineitem+json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Get line item failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return response.json() as Promise<AGSLineItem>;
  }

  /**
   * Get all line items for a context
   */
  async getAllLineItems(
    contextId: string,
    limit = 100
  ): Promise<AGSLineItem[]> {
    if (!this.endpoint) {
      throw new Error('AGS endpoint not configured');
    }

    const token = await this.getAccessToken();
    
    const url = new URL(this.endpoint.lineitems_url);
    url.searchParams.set('context_id', contextId);
    url.searchParams.set('limit', limit.toString());

    const allItems: AGSLineItem[] = [];
    let nextUrl: string | null = url.toString();

    while (nextUrl) {
      const response = await fetch(nextUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.ims.lis.v2.lineitemcontainer+json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Get line items failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const container = await response.json() as AGSLineItemContainer;
      allItems.push(...container.lineitems);
      
      // Check for pagination
      const linkHeader = response.headers.get('Link');
      nextUrl = parseNextLink(linkHeader);
    }

    return allItems;
  }

  /**
   * Update a line item
   */
  async updateLineItem(
    lineItemUrl: string,
    updates: Partial<AGSLineItemCreateRequest>
  ): Promise<AGSLineItem> {
    if (!this.endpoint) {
      throw new Error('AGS endpoint not configured');
    }

    const token = await this.getAccessToken();
    
    // First get current line item
    const current = await this.getLineItem(lineItemUrl);
    
    // Merge updates
    const updated = { ...current, ...updates };
    
    const response = await fetch(lineItemUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/vnd.ims.lis.v2.lineitem+json',
        'Accept': 'application/vnd.ims.lis.v2.lineitem+json',
      },
      body: JSON.stringify(updated),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Update line item failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const result = await response.json() as AGSLineItem;
    
    // Update cache
    await this.cacheLineItem(result);
    
    return result;
  }

  /**
   * Delete a line item
   */
  async deleteLineItem(lineItemUrl: string): Promise<void> {
    if (!this.endpoint) {
      throw new Error('AGS endpoint not configured');
    }

    const token = await this.getAccessToken();
    
    const response = await fetch(lineItemUrl, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok && response.status !== 404) {
      const errorText = await response.text();
      throw new Error(`Delete line item failed: ${response.status} ${response.statusText} - ${errorText}`);
    }
  }

  /**
   * Post a score for a user
   */
  async postScore(
    lineItemUrl: string,
    score: AGSScoreCreateRequest
  ): Promise<AGSScoreResult> {
    if (!this.endpoint) {
      throw new Error('AGS endpoint not configured');
    }

    const token = await this.getAccessToken();
    
    // Build score URL
    const scoreUrl = `${lineItemUrl}/scores`;
    
    const scoreBody = {
      userId: score.userId,
      scoreGiven: score.scoreGiven,
      scoreMaximum: score.scoreMaximum,
      activityProgress: score.activityProgress || 'Completed',
      gradingProgress: score.gradingProgress || 'FullyGraded',
      timestamp: score.timestamp || new Date().toISOString(),
      ...(score.comment && { comment: score.comment }),
    };

    const response = await fetch(scoreUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/vnd.ims.lis.v1.score+json',
        'Accept': 'application/vnd.ims.lis.v1.score+json',
      },
      body: JSON.stringify(scoreBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Post score failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const result = await response.json() as AGSScoreResult;
    
    // Cache to local DB
    await this.cacheScore(lineItemUrl, score, result);
    
    return result;
  }

  /**
   * Get scores for a line item
   */
  async getScores(lineItemUrl: string, userId?: string): Promise<AGSScoreResult[]> {
    if (!this.endpoint) {
      throw new Error('AGS endpoint not configured');
    }

    const token = await this.getAccessToken();
    
    const url = new URL(`${lineItemUrl}/scores`);
    if (userId) {
      url.searchParams.set('user_id', userId);
    }

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.ims.lis.v2.scorecontainer+json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Get scores failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const container = await response.json() as { scores: AGSScoreResult[] };
    return container.scores;
  }

  /**
   * Get a specific score
   */
  async getScore(scoreUrl: string): Promise<AGSScoreResult> {
    if (!this.endpoint) {
      throw new Error('AGS endpoint not configured');
    }

    const token = await this.getAccessToken();
    
    const response = await fetch(scoreUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.ims.lis.v1.score+json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Get score failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return response.json() as Promise<AGSScoreResult>;
  }

  /**
   * Cache line item to local DB
   */
  private async cacheLineItem(lineItem: AGSLineItem): Promise<void> {
    try {
      const deployment = await getDeploymentById(this.deploymentId);
      if (!deployment) return;

      const lineItemType = (lineItem.type || 'score') as 'score' | 'grade' | 'participation' | 'completion';

      await db.insert(agsLineItems).values({
        deploymentId: deployment.id,
        contextId: '', // Would need to extract from endpoint or launch
        label: lineItem.label,
        scoreMaximum: lineItem.scoreMaximum,
        scoreMinimum: lineItem.scoreMinimum || 0,
        type: lineItemType,
        resourceId: lineItem.resourceId,
        tag: lineItem.tag,
        resourceLinkId: lineItem.resourceLinkId,
        startDateTime: lineItem.startDateTime ? new Date(lineItem.startDateTime) : null,
        endDateTime: lineItem.endDateTime ? new Date(lineItem.endDateTime) : null,
        ltiLineItemUrl: lineItem.id,
        isActive: true,
        metadata: lineItem as unknown as Record<string, unknown>,
      }).onConflictDoUpdate({
        target: agsLineItems.ltiLineItemUrl,
        set: {
          label: lineItem.label,
          scoreMaximum: lineItem.scoreMaximum,
          scoreMinimum: lineItem.scoreMinimum || 0,
          type: lineItemType,
          resourceId: lineItem.resourceId,
          tag: lineItem.tag,
          resourceLinkId: lineItem.resourceLinkId,
          startDateTime: lineItem.startDateTime ? new Date(lineItem.startDateTime) : null,
          endDateTime: lineItem.endDateTime ? new Date(lineItem.endDateTime) : null,
          isActive: true,
          metadata: lineItem as unknown as Record<string, unknown>,
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      console.error('Failed to cache line item:', error);
    }
  }

  /**
   * Cache score to local DB
   */
  private async cacheScore(
    lineItemUrl: string,
    score: AGSScoreCreateRequest,
    result: AGSScoreResult
  ): Promise<void> {
    try {
      // Find line item in local DB
      const lineItem = await db
        .select()
        .from(agsLineItems)
        .where(eq(agsLineItems.ltiLineItemUrl, lineItemUrl))
        .limit(1);

      if (lineItem.length === 0) return;

      await db.insert(agsScores).values({
        lineItemId: lineItem[0].id,
        userId: score.userId, // This would need to be mapped to local user ID
        sessionId: null, // Optional
        scoreGiven: score.scoreGiven,
        scoreMaximum: score.scoreMaximum,
        comment: score.comment,
        activityProgress: score.activityProgress || 'Completed',
        gradingProgress: score.gradingProgress || 'FullyGraded',
        status: 'submitted',
        ltiScoreUrl: result.id,
        timestamp: new Date(score.timestamp || new Date().toISOString()),
        submittedAt: new Date(),
        metadata: { ...score, result } as Record<string, unknown>,
      }).onConflictDoUpdate({
        target: [agsScores.lineItemId, agsScores.userId],
        set: {
          scoreGiven: score.scoreGiven,
          scoreMaximum: score.scoreMaximum,
          comment: score.comment,
          activityProgress: score.activityProgress || 'Completed',
          gradingProgress: score.gradingProgress || 'FullyGraded',
          status: 'submitted',
          ltiScoreUrl: result.id,
          timestamp: new Date(score.timestamp || new Date().toISOString()),
          submittedAt: new Date(),
          metadata: { ...score, result } as Record<string, unknown>,
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      console.error('Failed to cache score:', error);
    }
  }
}

/**
 * Factory function to create AGS client
 */
export async function createAGSClient(
  platformId: string,
  deploymentId: string
): Promise<AGSClient | null> {
  const platform = await getPlatformById(platformId);
  if (!platform) return null;

  return new AGSClient(platform, deploymentId);
}

/**
 * Parse Link header for pagination
 */
function parseNextLink(linkHeader: string | null): string | null {
  if (!linkHeader) return null;
  
  const links = linkHeader.split(',');
  for (const link of links) {
    const [urlPart, relPart] = link.split(';');
    if (relPart?.includes('rel="next"')) {
      return urlPart.trim().slice(1, -1); // Remove < >
    }
  }
  return null;
}

/**
 * Clear token cache (useful for testing or key rotation)
 */
export function clearTokenCache(): void {
  tokenCache.clear();
}