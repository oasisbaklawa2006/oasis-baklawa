import { readFileSync } from "node:fs";

function fail(message) {
  console.error(`SECURE_RANDOM_CERT_FAIL: ${message}`);
  process.exit(1);
}

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
if (packageJson.dependencies?.["expo-crypto"] !== "~13.0.2") {
  fail("expo-crypto must be pinned to the Expo SDK 51 compatible ~13.0.2 range");
}

const installed = JSON.parse(readFileSync("node_modules/expo-crypto/package.json", "utf8"));
if (installed.version !== "13.0.2") {
  fail(`expected installed expo-crypto 13.0.2, got ${installed.version ?? "missing"}`);
}

const genericSource = readFileSync("src/lib/secure-random.ts", "utf8");
const nativeSource = readFileSync("src/lib/secure-random.native.ts", "utf8");
const idempotencySource = readFileSync("src/lib/idempotency.ts", "utf8");

if (/Math\.random\s*\(/.test(genericSource) || /Math\.random\s*\(/.test(nativeSource)) {
  fail("secure random provider must never use Math.random()");
}
if (!nativeSource.includes('from "expo-crypto"') || !nativeSource.includes("Crypto.randomUUID()")) {
  fail("React Native secure UUID provider must bind to expo-crypto randomUUID()");
}
if (!idempotencySource.includes('from "@/lib/secure-random"')) {
  fail("idempotency authority must route through the platform secure UUID provider");
}

const lock = JSON.parse(readFileSync("package-lock.json", "utf8"));
const lockEntry = lock.packages?.["node_modules/expo-crypto"];
if (!lockEntry || lockEntry.version !== "13.0.2") {
  fail("npm install did not resolve expo-crypto 13.0.2 into package-lock");
}

// Emitted deliberately so the exact npm-resolved lock metadata can be
// reconciled into the committed lockfile during governed review.
console.log("SECURE_RANDOM_LOCK_ENTRY=" + JSON.stringify(lockEntry));
console.log("SECURE_RANDOM_CERT_PASS expo-crypto=13.0.2 native=ExpoCrypto.randomUUID");
