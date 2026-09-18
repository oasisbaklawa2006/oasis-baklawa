import { createSecureUuid } from "@/lib/secure-random";

export function createIdempotencyKey(): string {
  return createSecureUuid();
}
