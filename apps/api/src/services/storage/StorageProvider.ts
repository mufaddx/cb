export interface PutObjectInput {
  key: string;
  body: Buffer;
  contentType: string;
}

/** Every private file (agreements, submissions, KYC docs, evidence...)
 * flows through this interface (spec §62). Objects are private by
 * default; callers get a signed, expiring URL — never a permanent
 * public path. */
export interface StorageProvider {
  putObject(input: PutObjectInput): Promise<{ key: string }>;
  getSignedDownloadUrl(key: string, expiresInSeconds?: number): Promise<string>;
  deleteObject(key: string): Promise<void>;
}

export const MAX_UPLOAD_BYTES = 100 * 1024 * 1024; // 100MB

export const ALLOWED_MIME_PREFIXES = ["image/", "video/", "application/pdf"];

export function assertAllowedUpload(contentType: string, sizeBytes: number): void {
  if (sizeBytes > MAX_UPLOAD_BYTES) {
    throw new Error(`File exceeds maximum allowed size of ${MAX_UPLOAD_BYTES} bytes`);
  }
  if (!ALLOWED_MIME_PREFIXES.some((prefix) => contentType.startsWith(prefix))) {
    throw new Error(`Content type "${contentType}" is not allowed`);
  }
}
