import { env } from "../../config/env";
import type { StorageProvider } from "./StorageProvider";
import { LocalStorageProvider } from "./LocalStorageProvider";
import { R2StorageProvider } from "./R2StorageProvider";

export * from "./StorageProvider";
export { LocalStorageProvider } from "./LocalStorageProvider";

let instance: StorageProvider | null = null;

export function getStorageProvider(): StorageProvider {
  if (instance) return instance;

  if (env.STORAGE_PROVIDER === "r2") {
    instance = new R2StorageProvider();
  } else {
    if (env.NODE_ENV === "production") {
      throw new Error(
        "STORAGE_PROVIDER=local is not allowed in production. Configure Cloudflare R2 before deploying."
      );
    }
    instance = new LocalStorageProvider();
  }
  return instance;
}
