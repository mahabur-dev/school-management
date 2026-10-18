import { createHash, randomBytes, randomInt } from 'crypto';

/** Long random string for refresh tokens and reset grants. */
export function generateOpaqueToken(): string {
  return randomBytes(48).toString('base64url');
}

/** Six-digit one-time code, zero padded. */
export function generateNumericCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, '0');
}

/** Tokens are stored hashed; a database leak must not reveal usable tokens. */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
