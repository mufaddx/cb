import crypto from "crypto";
import { env } from "../config/env";

/**
 * AES-256-GCM helpers for at-rest encryption of sensitive tokens
 * (Instagram access tokens, KYC document numbers — spec §90/§92:
 * never store secrets in plaintext). The key is derived from
 * SESSION_SECRET via scrypt so no separate secret needs provisioning
 * for this foundation build; production should provision a dedicated,
 * KMS-backed ENCRYPTION_KEY instead and swap the `deriveKey()` body.
 */
function deriveKey(): Buffer {
  return crypto.scryptSync(env.SESSION_SECRET, "antigravity-encryption-salt", 32);
}

export function encryptSecret(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", deriveKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  // iv:authTag:ciphertext, all base64 — self-contained for decryption.
  return [iv.toString("base64"), authTag.toString("base64"), encrypted.toString("base64")].join(":");
}

export function decryptSecret(payload: string): string {
  const [ivB64, authTagB64, dataB64] = payload.split(":");
  if (!ivB64 || !authTagB64 || !dataB64) {
    throw new Error("Malformed encrypted payload");
  }
  const decipher = crypto.createDecipheriv("aes-256-gcm", deriveKey(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(authTagB64, "base64"));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(dataB64, "base64")), decipher.final()]);
  return decrypted.toString("utf8");
}
