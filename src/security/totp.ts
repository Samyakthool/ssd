import { generateSecret, generateURI, verifySync } from 'otplib';

export function generateTotpSecret(): string {
  return generateSecret();
}

export function generateTotpKeyUri(email: string, secret: string): string {
  return generateURI({
    issuer: 'Samata Sainik Dal Central Command',
    label: email,
    secret,
  });
}

export function verifyTotpToken(token: string, secret: string): boolean {
  try {
    const result = verifySync({ token, secret });
    return result.valid;
  } catch {
    return false;
  }
}
