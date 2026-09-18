import * as Crypto from "expo-crypto";

/**
 * React Native secure UUID provider.
 *
 * Expo SDK 51 resolves expo-crypto 13.0.2 as the native cryptographic source,
 * avoiding any dependency on browser-style globalThis.crypto availability.
 */
export function createSecureUuid(): string {
  return Crypto.randomUUID();
}
