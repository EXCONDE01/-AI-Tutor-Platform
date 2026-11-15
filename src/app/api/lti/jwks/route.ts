/**
 * LTI 1.3 Public JWKS Endpoint
 * Exposes the tool's public keys for platforms to verify our signatures
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAllPlatforms } from '@/lib/lti/platform';
import { JWK } from '@/lib/lti/types';

// In-memory cache for the combined JWKS
let jwksCache: { jwks: { keys: JWK[] }; timestamp: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * GET /api/lti/jwks - Return combined JWKS for all active platforms
 */
export async function GET(request: NextRequest) {
  try {
    // Check cache
    if (jwksCache && Date.now() - jwksCache.timestamp < CACHE_TTL) {
      return NextResponse.json(jwksCache.jwks, {
        headers: {
          'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
          'Content-Type': 'application/json',
        },
      });
    }

    // Fetch all active platforms
    const platforms = await getAllPlatforms();
    const activePlatforms = platforms.filter(p => p.status === 'active' && p.publicKey);

    const allKeys: JWK[] = [];

    for (const platform of activePlatforms) {
      if (platform.publicKey) {
        try {
          // Parse the public key to extract JWK components
          const jwk = await publicKeyToJWK(platform.publicKey, platform.id);
          if (jwk) {
            allKeys.push(jwk);
          }
        } catch (error) {
          console.warn(`Failed to parse public key for platform ${platform.id}:`, error);
        }
      }
    }

    const jwks = { keys: allKeys };

    // Update cache
    jwksCache = { jwks, timestamp: Date.now() };

    return NextResponse.json(jwks, {
      headers: {
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('JWKS endpoint error:', error);
    return NextResponse.json(
      { error: 'Failed to generate JWKS' },
      { status: 500 }
    );
  }
}

/**
 * Convert PEM public key to JWK
 */
async function publicKeyToJWK(pem: string, kid: string): Promise<JWK | null> {
  try {
    // Import the public key using Web Crypto API
    const publicKey = await importSPKI(pem);

    // Export as JWK
    const jwk = await crypto.subtle.exportKey('jwk', publicKey);

    // Add required fields
    const alg = jwk.alg || 'RS256';
    return {
      kty: jwk.kty as 'RSA' | 'EC',
      use: 'sig',
      kid,
      alg: alg === 'RS256' || alg === 'ES256' ? alg : 'RS256',
      n: jwk.n,
      e: jwk.e,
      crv: jwk.crv,
      x: jwk.x,
      y: jwk.y,
    };
  } catch (error) {
    console.error('Failed to convert public key to JWK:', error);
    return null;
  }
}

/**
 * Import SPKI (Subject Public Key Info) format public key
 */
async function importSPKI(pem: string): Promise<CryptoKey> {
  // Remove PEM headers/footers and whitespace
  const base64 = pem
    .replace(/-----BEGIN PUBLIC KEY-----/, '')
    .replace(/-----END PUBLIC KEY-----/, '')
    .replace(/\s/g, '');

  const binary = atob(base64);
  const buffer = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    buffer[i] = binary.charCodeAt(i);
  }

  return crypto.subtle.importKey(
    'spki',
    buffer,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    },
    true,
    ['verify']
  );
}

/**
 * Force refresh the JWKS cache (called after key rotation)
 */
export async function refreshJWKSCache() {
  jwksCache = null;
}