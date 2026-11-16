/**
 * Microsoft OAuth token management service
 * Drizzle-backed token storage with AES-GCM encryption at rest
 * Includes auto-refresh on expiry
 */

import { eq, and } from 'drizzle-orm';
import { db } from '@/lib/db';
import { oauthTokens, type OAuthToken } from '@/db/schema/artifacts';
import { encrypt, decrypt } from '@/lib/crypto/encryption';
import { microsoftOAuth, type TokenResponse } from '@/lib/microsoft/oauth';

export class MicrosoftTokenStore {
  constructor(private dbInstance = db) {}

  /**
   * Save tokens after OAuth flow, encrypted at rest
   */
  async saveTokens(
    userId: string,
    tokens: TokenResponse,
    providerUserId: string
  ): Promise<OAuthToken> {
    const encryptedAccess = await encrypt(tokens.access_token);
    const encryptedRefresh = tokens.refresh_token ? await encrypt(tokens.refresh_token) : null;
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    const [existing] = await this.dbInstance
      .select()
      .from(oauthTokens)
      .where(
        and(
          eq(oauthTokens.userId, userId),
          eq(oauthTokens.provider, 'microsoft'),
          eq(oauthTokens.providerUserId, providerUserId)
        )
      );

    if (existing) {
      const [updated] = await this.dbInstance
        .update(oauthTokens)
        .set({
          accessToken: encryptedAccess,
          refreshToken: encryptedRefresh,
          idToken: tokens.id_token ?? null,
          tokenType: tokens.token_type,
          scope: tokens.scope ?? null,
          expiresAt,
          refreshExpiresAt: tokens.refresh_token ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null,
          isActive: true,
          updatedAt: new Date(),
        })
        .where(eq(oauthTokens.id, existing.id))
        .returning();
      return updated;
    }

    const [created] = await this.dbInstance
      .insert(oauthTokens)
      .values({
        userId,
        provider: 'microsoft',
        providerUserId,
        accessToken: encryptedAccess,
        refreshToken: encryptedRefresh,
        idToken: tokens.id_token ?? null,
        tokenType: tokens.token_type,
        scope: tokens.scope ?? null,
        expiresAt,
        refreshExpiresAt: tokens.refresh_token ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null,
        isActive: true,
      })
      .returning();

    return created;
  }

  /**
   * Get a valid access token, auto-refreshing if needed
   */
  async getValidAccessToken(userId: string): Promise<string | null> {
    const [tokenRecord] = await this.dbInstance
      .select()
      .from(oauthTokens)
      .where(
        and(
          eq(oauthTokens.userId, userId),
          eq(oauthTokens.provider, 'microsoft'),
          eq(oauthTokens.isActive, true)
        )
      )
      .limit(1);

    if (!tokenRecord) return null;

    // Check if expired (with 5 min buffer)
    if (
      tokenRecord.expiresAt &&
      tokenRecord.expiresAt < new Date(Date.now() + 5 * 60 * 1000)
    ) {
      if (!tokenRecord.refreshToken) return null;

      try {
        const decryptedRefresh = await decrypt(tokenRecord.refreshToken);
        const newTokens = await microsoftOAuth.refreshAccessToken(decryptedRefresh);
        await this.saveTokens(userId, newTokens, tokenRecord.providerUserId);
        return newTokens.access_token;
      } catch (error) {
        console.error('[MicrosoftTokenStore] Token refresh failed:', error);
        return null;
      }
    }

    return await decrypt(tokenRecord.accessToken);
  }

  /**
   * Revoke and delete tokens
   */
  async revokeTokens(userId: string): Promise<void> {
    await this.dbInstance
      .update(oauthTokens)
      .set({ isActive: false, updatedAt: new Date() })
      .where(
        and(
          eq(oauthTokens.userId, userId),
          eq(oauthTokens.provider, 'microsoft')
        )
      );
  }

  /**
   * Check if user has connected Microsoft account
   */
  async hasConnectedMicrosoft(userId: string): Promise<boolean> {
    const [record] = await this.dbInstance
      .select({ id: oauthTokens.id })
      .from(oauthTokens)
      .where(
        and(
          eq(oauthTokens.userId, userId),
          eq(oauthTokens.provider, 'microsoft'),
          eq(oauthTokens.isActive, true)
        )
      )
      .limit(1);

    return !!record;
  }
}

export const microsoftTokenStore = new MicrosoftTokenStore();