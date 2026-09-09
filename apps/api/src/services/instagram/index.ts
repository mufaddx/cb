import { env } from "../../config/env";
import type { InstagramProvider } from "./InstagramProvider";
import { MockInstagramProvider } from "./MockInstagramProvider";
import { MetaInstagramProvider } from "./MetaInstagramProvider";

export * from "./InstagramProvider";

let instance: InstagramProvider | null = null;

export function getInstagramProvider(): InstagramProvider {
  if (instance) return instance;

  if (env.INSTAGRAM_PROVIDER === "meta") {
    instance = new MetaInstagramProvider();
  } else {
    if (env.NODE_ENV === "production") {
      throw new Error(
        "INSTAGRAM_PROVIDER=mock is not allowed in production. Configure a Meta Developer App before deploying."
      );
    }
    instance = new MockInstagramProvider();
  }
  return instance;
}
