/**
 * Microsoft OAuth2 client for OneDrive/Word/PowerPoint/Forms integration
 * Handles OAuth flow: authorization URL, code exchange, token refresh
 */

export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope?: string;
  id_token?: string;
}

export interface UserInfo {
  id: string;
  email: string;
  name: string;
  picture?: string;
  verified_email?: boolean;
}

const MICROSOFT_AUTH_BASE = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize';
const MICROSOFT_TOKEN_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
const MICROSOFT_GRAPH_BASE = 'https://graph.microsoft.com/v1.0';

export class MicrosoftOAuthClient {
  private clientId: string | null = null;
  private clientSecret: string | null = null;
  private redirectUri: string | null = null;
  private tenantId: string | null = null;

  private ensureConfig() {
    if (!this.clientId) {
      this.clientId = process.env.MICROSOFT_CLIENT_ID ?? null;
      this.clientSecret = process.env.MICROSOFT_CLIENT_SECRET ?? null;
      this.redirectUri = process.env.MICROSOFT_REDIRECT_URI ?? null;
      this.tenantId = process.env.MICROSOFT_TENANT_ID ?? 'common';

      if (!this.clientId) throw new Error('MICROSOFT_CLIENT_ID is not configured');
      if (!this.clientSecret) throw new Error('MICROSOFT_CLIENT_SECRET is not configured');
      if (!this.redirectUri) throw new Error('MICROSOFT_REDIRECT_URI is not configured');
    }
  }

  /**
   * Generate the Microsoft OAuth authorization URL
   */
  getAuthorizationUrl(state: string, scopes: string[]): string {
    this.ensureConfig();
    const params = new URLSearchParams({
      client_id: this.clientId!,
      redirect_uri: this.redirectUri!,
      response_type: 'code',
      scope: scopes.join(' '),
      state,
      access_type: 'offline',
      prompt: 'consent',
    });

    return `${MICROSOFT_AUTH_BASE}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCode(code: string): Promise<TokenResponse> {
    const params = new URLSearchParams({
      client_id: this.clientId!,
      client_secret: this.clientSecret!,
      code,
      grant_type: 'authorization_code',
      redirect_uri: this.redirectUri!,
    });

    const res = await fetch(MICROSOFT_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
    });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(`Microsoft OAuth token exchange failed: ${res.status} - ${error}`);
    }

    return (await res.json()) as TokenResponse;
  }

  /**
   * Refresh an expired access token using the refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
    const params = new URLSearchParams({
      client_id: this.clientId!,
      client_secret: this.clientSecret!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    });

    const res = await fetch(MICROSOFT_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
    });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(`Microsoft OAuth token refresh failed: ${res.status} - ${error}`);
    }

    return (await res.json()) as TokenResponse;
  }

  /**
   * Get user info from Microsoft Graph using access token
   */
  async getUserInfo(accessToken: string): Promise<UserInfo> {
    const res = await fetch(`${MICROSOFT_GRAPH_BASE}/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      throw new Error(`Microsoft Graph userinfo failed: ${res.status}`);
    }

    const data = await res.json();
    return {
      id: data.id,
      email: data.mail || data.userPrincipalName,
      name: data.displayName,
      picture: undefined,
      verified_email: true,
    };
  }

  /**
   * Get access token for Microsoft Graph API calls
   */
  async getGraphToken(accessToken: string): Promise<string> {
    return accessToken;
  }
}

export const microsoftOAuth = new MicrosoftOAuthClient();