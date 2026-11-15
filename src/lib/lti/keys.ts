/**
 * LTI Key Generation
 * Generates RSA key pairs for LTI platform authentication
 */

import { generateKeyPairSync } from 'node:crypto';

export function generateLtiKeyPair(): { publicKey: string; privateKey: string } {
  const { publicKey, privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
  return { publicKey, privateKey };
}