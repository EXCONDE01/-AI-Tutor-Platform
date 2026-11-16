/**
 * Neon Auth Client Configuration
 * Client-side auth utilities for Next.js App Router
 */

'use client';

import { createAuthClient } from '@neon/auth/next';

// Create client-side auth instance
export const authClient = createAuthClient();

/**
 * Get session client-side
 */
export function useSession() {
  return authClient.useSession();
}

/**
 * Get user client-side
 */
export function useAuthUser() {
  const { data: session } = authClient.useSession();
  return { data: session?.user };
}

/**
 * Client-side sign out
 */
export function signOut() {
  return authClient.signOut();
}

/**
 * Client-side sign in with email/password
 */
export async function signInWithEmail(email: string, password: string) {
  return await authClient.signIn.email({ email, password });
}

/**
 * Client-side sign in with OAuth provider
 */
export async function signInWithOAuth(provider: 'google' | 'github' | 'microsoft', callbackUrl?: string) {
  return await authClient.signIn.social({ 
    provider: provider as any,
    callbackURL: callbackUrl || '/',
    requestSignUp: false
  });
}

/**
 * Client-side sign up with OAuth provider
 * Uses the same social sign-in endpoint but with requestSignUp: true
 */
export async function signUpWithOAuth(provider: 'google' | 'github' | 'microsoft', callbackUrl?: string) {
  return await authClient.signIn.social({ 
    provider: provider as any,
    callbackURL: callbackUrl || '/',
    requestSignUp: true
  });
}

/**
 * Client-side sign up with email/password
 */
export async function signUpWithEmail(email: string, password: string, name?: string) {
  return await authClient.signUp.email({ email, password, name: name ?? '' });
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(email: string) {
  return await authClient.requestPasswordReset({ email });
}

/**
 * Verify email with token
 */
export async function verifyEmailToken(token: string) {
  return await authClient.verifyEmail({ query: { token, callbackURL: '/' } });
}

/**
 * Reset password with token
 */
export async function resetPasswordWithToken(token: string, password: string) {
  return await authClient.resetPassword({ newPassword: password, token });
}

/**
 * Change password (authenticated)
 */
export async function changePasswordClient(currentPassword: string, newPassword: string) {
  return await authClient.changePassword({ currentPassword, newPassword });
}

/**
 * Update user profile
 */
export async function updateProfileClient(data: { name?: string; image?: string }) {
  return await authClient.updateUser(data);
}

/**
 * Delete account
 */
export async function deleteAccountClient(password: string) {
  return await authClient.deleteUser({ password });
}

/**
 * Unlink OAuth account
 */
export async function unlinkOAuthAccount(accountId: string) {
  return await authClient.unlinkAccount({ accountId });
}