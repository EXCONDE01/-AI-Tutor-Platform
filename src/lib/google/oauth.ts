/**
 * Google OAuth2 client for Drive/Docs/Forms/Slides integration
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

const GOOGLE_AUTH_BASE = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo';

export class GoogleOAuthClient {
  private clientId: string | null = null;
  private clientSecret: string | null = null;
  private redirectUri: string | null = null;

  private ensureConfig() {
    if (!this.clientId) {
      this.clientId = process.env.GOOGLE_CLIENT_ID ?? null;
      this.clientSecret = process.env.GOOGLE_CLIENT_SECRET ?? null;
      this.redirectUri = process.env.GOOGLE_REDIRECT_URI ?? null;

      if (!this.clientId) throw new Error('GOOGLE_CLIENT_ID is not configured');
      if (!this.clientSecret) throw new Error('GOOGLE_CLIENT_SECRET is not configured');
      if (!this.redirectUri) throw new Error('GOOGLE_REDIRECT_URI is not configured');
    }
  }

  /**
   * Generate the Google OAuth authorization URL
   */
  getAuthorizationUrl(state: string, scopes: string[]): string {
    this.ensureConfig();
    const params = new URLSearchParams({
      client_id: this.clientId!,
      redirect_uri: this.redirectUri!,
      response_type: 'code',
      scope: scopes.join(' '),
      state,
      access_type: 'offline', // ensures refresh token is returned
      prompt: 'consent', // forces consent screen to get refresh token
    });

    return `${GOOGLE_AUTH_BASE}?${params.toString()}`;
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

    const res = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
    });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(`Google OAuth token exchange failed: ${res.status} - ${error}`);
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

    const res = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
    });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(`Google OAuth token refresh failed: ${res.status} - ${error}`);
    }

    return (await res.json()) as TokenResponse;
  }

  /**
   * Get user info from Google using access token
   */
  async getUserInfo(accessToken: string): Promise<UserInfo> {
    const res = await fetch(GOOGLE_USERINFO_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      throw new Error(`Google userinfo failed: ${res.status}`);
    }

    return (await res.json()) as UserInfo;
  }
}

export const googleOAuth = new GoogleOAuthClient();