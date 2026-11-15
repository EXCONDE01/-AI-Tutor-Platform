/**
 * LTI 1.3 NRPS Client (Names & Role Provisioning Service)
 * Fetches and caches context memberships from LTI platform
 */

import { getAccessToken } from './ags'; // Reuse the same token logic
import { LTIPlatformConfig, NRPSMember, NRPSContextMembershipsParams, NRPSContextMembershipsResponse, NRPSEndpoint, NRPSRole } from './types';
import { getPlatformById, getDeploymentById } from './platform';
import { db } from '@/lib/db';
import { nrpsCache, ltiDeployments } from '@/db/schema/lti';
import { eq, and } from 'drizzle-orm';

const NRPS_SCOPE = 'https://purl.imsglobal.org/spec/lti-nrps/scope/contextmembership.readonly';

export { NRPS_SCOPE };

/**
 * NRPS Client class for fetching context memberships
 */
export class NRPSClient {
  private platform: LTIPlatformConfig;
  private deploymentId: string;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(platform: LTIPlatformConfig, deploymentId: string) {
    this.platform = platform;
    this.deploymentId = deploymentId;
  }

  /**
   * Get or refresh access token
   */
  async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiry - 60000) { // 1 min buffer
      return this.accessToken;
    }

    const tokenData = await getAccessToken(this.platform, [NRPS_SCOPE]);
    this.accessToken = tokenData.access_token;
    this.tokenExpiry = Date.now() + (tokenData.expires_in * 1000);
    
    return this.accessToken;
  }

  /**
   * Get the NRPS endpoint for this deployment
   */
  async getEndpoint(): Promise<NRPSEndpoint | null> {
    const deployment = await getDeploymentById(this.deploymentId);
    if (!deployment) return null;

    // The endpoint should be cached from the launch
    // For now, we'll need to fetch it from the platform or use cached data
    // This is typically provided in the LTI launch
    return null; // Will be provided by caller
  }

  /**
   * Fetch all context memberships with pagination
   */
  async getAllMemberships(
    contextId: string,
    endpoint: NRPSEndpoint,
    params: NRPSContextMembershipsParams = {}
  ): Promise<NRPSMember[]> {
    const allMembers: NRPSMember[] = [];
    let cursor: string | undefined = params.cursor;
    
    do {
      const response = await this.fetchMembershipsPage(contextId, endpoint, {
        ...params,
        cursor,
        limit: params.limit || 100,
      });
      
      allMembers.push(...response.members);
      cursor = response.next_cursor;
    } while (cursor);

    return allMembers;
  }

  /**
   * Fetch a single page of memberships
   */
  async fetchMembershipsPage(
    contextId: string,
    endpoint: NRPSEndpoint,
    params: NRPSContextMembershipsParams
  ): Promise<NRPSContextMembershipsResponse> {
    const token = await this.getAccessToken();
    
    const queryParams = new URLSearchParams();
    if (params.limit) queryParams.set('limit', params.limit.toString());
    if (params.cursor) queryParams.set('cursor', params.cursor);
    if (params.role) queryParams.set('role', params.role);
    if (params.status) queryParams.set('status', params.status);

    const url = `${endpoint.context_memberships_url}?${queryParams.toString()}`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.ims.lti-nrps.v2.membershipcontainer+json',
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`NRPS request failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return response.json() as Promise<NRPSContextMembershipsResponse>;
  }

  /**
   * Sync memberships to local cache
   */
  async syncToCache(
    contextId: string,
    endpoint: NRPSEndpoint,
    deploymentDbId: string
  ): Promise<{ synced: number; errors: number }> {
    const members = await this.getAllMemberships(contextId, endpoint);
    let synced = 0;
    let errors = 0;

    for (const member of members) {
      try {
        await this.upsertMemberCache(deploymentDbId, contextId, member);
        synced++;
      } catch (error) {
        console.error('Failed to cache NRPS member:', error);
        errors++;
      }
    }

    return { synced, errors };
  }

  /**
   * Upsert member to local cache
   */
  private async upsertMemberCache(
    deploymentDbId: string,
    contextId: string,
    member: NRPSMember
  ): Promise<void> {
    const membershipId = member.id;
    
    // Check if exists
    const existing = await db
      .select({ id: nrpsCache.id })
      .from(nrpsCache)
      .where(
        and(
          eq(nrpsCache.deploymentId, deploymentDbId),
          eq(nrpsCache.contextId, contextId),
          eq(nrpsCache.userId, member.user_id)
        )
      )
      .limit(1);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours

    if (existing.length > 0) {
      // Update
      await db
        .update(nrpsCache)
        .set({
          roles: member.roles as ('instructor' | 'learner' | 'administrator' | 'content_developer' | 'teaching_assistant' | 'mentor' | 'observer')[],
          lisPersonSourcedId: member.lis_person_sourced_id,
          lisPersonNameGiven: member.lis_person_name_given,
          lisPersonNameFamily: member.lis_person_name_family,
          lisPersonNameFull: member.lis_person_name_full,
          lisPersonEmail: member.lis_person_email,
          userImage: member.user_image,
          status: member.status,
          membershipId,
          rawData: member as unknown as Record<string, unknown>,
          lastSyncedAt: now,
          expiresAt,
          updatedAt: now,
        })
        .where(eq(nrpsCache.id, existing[0].id));
    } else {
      // Insert
      await db.insert(nrpsCache).values({
        deploymentId: deploymentDbId,
        contextId,
        userId: member.user_id,
        roles: member.roles as ('instructor' | 'learner' | 'administrator' | 'content_developer' | 'teaching_assistant' | 'mentor' | 'observer')[],
        lisPersonSourcedId: member.lis_person_sourced_id,
        lisPersonNameGiven: member.lis_person_name_given,
        lisPersonNameFamily: member.lis_person_name_family,
        lisPersonNameFull: member.lis_person_name_full,
        lisPersonEmail: member.lis_person_email,
        userImage: member.user_image,
        status: member.status,
        membershipId,
        rawData: member as unknown as Record<string, unknown>,
        lastSyncedAt: now,
        expiresAt,
      });
    }
  }

  /**
   * Get cached memberships for a context
   */
  static async getCachedMemberships(
    deploymentDbId: string,
    contextId: string,
    includeExpired = false
  ): Promise<NRPSMember[]> {
    const conditions = [
      eq(nrpsCache.deploymentId, deploymentDbId),
      eq(nrpsCache.contextId, contextId),
    ];

    if (!includeExpired) {
      conditions.push(
        eq(nrpsCache.status, 'active')
      );
    }

    const results = await db
      .select()
      .from(nrpsCache)
      .where(and(...conditions))
      .orderBy(nrpsCache.lastSyncedAt);

    return results.map(row => ({
      id: row.membershipId || '',
      user_id: row.userId,
      roles: row.roles as NRPSRole[],
      status: row.status as 'active' | 'inactive' | 'deleted',
      lis_person_sourced_id: row.lisPersonSourcedId || undefined,
      lis_person_name_given: row.lisPersonNameGiven || undefined,
      lis_person_name_family: row.lisPersonNameFamily || undefined,
      lis_person_name_full: row.lisPersonNameFull || undefined,
      lis_person_email: row.lisPersonEmail || undefined,
      user_image: row.userImage || undefined,
    }));
  }

  /**
   * Find user by LTI user_id in cache
   */
  static async findUserInContext(
    deploymentDbId: string,
    contextId: string,
    ltiUserId: string
  ): Promise<NRPSMember | null> {
    const result = await db
      .select()
      .from(nrpsCache)
      .where(
        and(
          eq(nrpsCache.deploymentId, deploymentDbId),
          eq(nrpsCache.contextId, contextId),
          eq(nrpsCache.userId, ltiUserId)
        )
      )
      .limit(1);

    if (result.length === 0) return null;

    const row = result[0];
    return {
      id: row.membershipId || '',
      user_id: row.userId,
      roles: row.roles,
      status: row.status as 'active' | 'inactive' | 'deleted',
      lis_person_sourced_id: row.lisPersonSourcedId || undefined,
      lis_person_name_given: row.lisPersonNameGiven || undefined,
      lis_person_name_family: row.lisPersonNameFamily || undefined,
      lis_person_name_full: row.lisPersonNameFull || undefined,
      lis_person_email: row.lisPersonEmail || undefined,
      user_image: row.userImage || undefined,
      rawData: row.rawData as Record<string, unknown>,
    };
  }
}

/**
 * Factory function to create NRPS client
 */
export async function createNRPSClient(
  platformId: string,
  deploymentId: string
): Promise<NRPSClient | null> {
  const platform = await getPlatformById(platformId);
  if (!platform) return null;

  return new NRPSClient(platform, deploymentId);
}

/**
 * Sync all contexts for a deployment
 */
export async function syncAllContexts(
  deploymentId: string
): Promise<{ totalSynced: number; totalErrors: number; contexts: number }> {
  const deployment = await getDeploymentById(deploymentId);
  if (!deployment) {
    throw new Error('Deployment not found');
  }

  const platform = await getPlatformById(deployment.platformId);
  if (!platform) {
    throw new Error('Platform not found');
  }

  // Get all cached contexts for this deployment
  const contexts = await db
    .selectDistinct({ contextId: nrpsCache.contextId })
    .from(nrpsCache)
    .where(eq(nrpsCache.deploymentId, deploymentId));

  let totalSynced = 0;
  let totalErrors = 0;

  for (const { contextId } of contexts) {
    // We need the endpoint from the launch - this would need to be stored
    // For now, skip contexts without known endpoints
    console.log(`Would sync context ${contextId} for deployment ${deploymentId}`);
  }

  return { totalSynced, totalErrors, contexts: contexts.length };
}