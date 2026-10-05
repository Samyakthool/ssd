import argon2 from 'argon2';

/**
 * OWASP Recommended Argon2id parameters
 * Type: Argon2id (hybrid resistant to side-channel & GPU attacks)
 * Memory: 64 MB (65536 KB)
 * Iterations: 3
 * Parallelism: 4
 */
export async function hashPassword(plainPassword: string): Promise<string> {
  return argon2.hash(plainPassword, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });
}

export async function verifyPassword(passwordHash: string, plainPassword: string): Promise<boolean> {
  try {
    return await argon2.verify(passwordHash, plainPassword);
  } catch {
    return false;
  }
}
