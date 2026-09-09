import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import type { PutObjectInput, StorageProvider } from "./StorageProvider";

/**
 * Dev-only adapter: writes to ./storage/local and issues HMAC-signed,
 * expiring URLs served by a dedicated route (see modules/documents) —
 * mirroring R2 signed-URL semantics so swapping providers later
 * requires no change to calling code.
 */
export class LocalStorageProvider implements StorageProvider {
  private root = path.resolve(process.cwd(), "storage", "local");
  private secret = process.env.SESSION_SECRET ?? "dev-only-insecure-secret";

  async putObject({ key, body }: PutObjectInput): Promise<{ key: string }> {
    const filePath = path.join(this.root, key);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, body);
    return { key };
  }

  async getSignedDownloadUrl(key: string, expiresInSeconds = 900): Promise<string> {
    const expires = Date.now() + expiresInSeconds * 1000;
    const signature = this.sign(key, expires);
    return `/api/documents/local-download?key=${encodeURIComponent(key)}&expires=${expires}&sig=${signature}`;
  }

  async deleteObject(key: string): Promise<void> {
    const filePath = path.join(this.root, key);
    await fs.rm(filePath, { force: true });
  }

  verifySignature(key: string, expires: number, signature: string): boolean {
    if (Date.now() > expires) return false;
    const expected = this.sign(key, expires);
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  }

  resolvePath(key: string): string {
    return path.join(this.root, key);
  }

  private sign(key: string, expires: number): string {
    return crypto.createHmac("sha256", this.secret).update(`${key}:${expires}`).digest("hex");
  }
}
