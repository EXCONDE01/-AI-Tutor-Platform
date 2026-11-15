/**
 * AES-GCM encryption for OAuth tokens at rest
 * Uses ENCRYPTION_KEY from env (32-byte base64)
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // GCM recommended
const TAG_LENGTH = 16;

let derivedKey: Buffer | null = null;

function getKey(): Buffer {
  if (derivedKey) return derivedKey;
  
  const encryptionKey = process.env.ENCRYPTION_KEY;
  if (!encryptionKey) {
    throw new Error('ENCRYPTION_KEY environment variable is not set');
  }
  
  const keyBuffer = Buffer.from(encryptionKey, 'base64');
  if (keyBuffer.length !== 32) {
    throw new Error('ENCRYPTION_KEY must be 32 bytes (base64 encoded)');
  }
  
  derivedKey = keyBuffer;
  return derivedKey;
}

/**
 * Encrypt plaintext using AES-256-GCM
 * Returns base64 encoded string: iv:ciphertext:authTag
 */
export async function encrypt(plaintext: string): Promise<string> {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  
  const authTag = cipher.getAuthTag();
  
  // Format: iv:ciphertext:authTag (all base64)
  return Buffer.concat([iv, ciphertext, authTag]).toString('base64');
}

/**
 * Decrypt ciphertext using AES-256-GCM
 * Expects base64 encoded string: iv:ciphertext:authTag
 */
export async function decrypt(encrypted: string): Promise<string> {
  const key = getKey();
  const data = Buffer.from(encrypted, 'base64');
  
  if (data.length < IV_LENGTH + TAG_LENGTH) {
    throw new Error('Invalid encrypted data: too short');
  }
  
  const iv = data.subarray(0, IV_LENGTH);
  const authTag = data.subarray(data.length - TAG_LENGTH);
  const ciphertext = data.subarray(IV_LENGTH, data.length - TAG_LENGTH);
  
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  const plaintext = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);
  
  return plaintext.toString('utf8');
}

/**
 * Check if encryption is properly configured
 */
export function isEncryptionConfigured(): boolean {
  try {
    getKey();
    return true;
  } catch {
    return false;
  }
}