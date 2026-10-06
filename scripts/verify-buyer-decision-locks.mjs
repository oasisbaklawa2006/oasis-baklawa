import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const violations = [];
const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const deps = {
  ...(packageJson.dependencies ?? {}),
  ...(packageJson.devDependencies ?? {}),
};

const forbiddenDependencies = [
  "react-native-razorpay",
  "expo-apple-authentication",
  "@react-native-google-signin/google-signin",
  "expo-auth-session",
];

for (const name of forbiddenDependencies) {
  if (Object.prototype.hasOwnProperty.call(deps, name)) {
    violations.push(`forbidden dependency present: ${name}`);
  }
}

const forbiddenSourcePatterns = [
  [/react-native-razorpay/i, "provider-branded native payment SDK"],
  [/\bRazorpay\b/i, "provider-branded payment code"],
  [/signInWithOAuth\s*\(/, "social OAuth login"],
  [/AppleAuthentication/, "Apple Authentication implementation"],
  [/GoogleSignin/, "Google Sign-In implementation"],
  [/Continue with Google/i, "Google login UI"],
  [/Continue with Apple/i, "Apple login UI"],
  [/EXPO_PUBLIC_[A-Z0-9_]*(?:RAZORPAY|GOOGLE|APPLE)[A-Z0-9_]*/, "provider/social public runtime flag"],
];

function walk(path) {
  if (!existsSync(path)) return;
  for (const entry of readdirSync(path)) {
    const absolute = join(path, entry);
    if (statSync(absolute).isDirectory()) walk(absolute);
    else if (/\.(ts|tsx|js|mjs|json)$/.test(entry)) inspect(absolute);
  }
}

function inspect(path) {
  const source = readFileSync(path, "utf8");
  for (const [pattern, label] of forbiddenSourcePatterns) {
    if (pattern.test(source)) {
      violations.push(`${relative(".", path)} contains ${label}`);
    }
  }
}

walk("src");
for (const config of ["app.json", "app.config.js", "app.config.ts", "eas.json"]) {
  if (existsSync(config)) inspect(config);
}

const login = readFileSync("src/screens/LoginScreen.tsx", "utf8");
if (!/setChannel\("mobile"\)/.test(login) || !/setChannel\("email"\)/.test(login)) {
  violations.push("LoginScreen must expose only the governed mobile/email OTP channel choices");
}

const runtime = readFileSync("src/lib/payment-provider-runtime.ts", "utf8");
if (!runtime.includes('payment-provider-create-session')) {
  violations.push("Buyer payment runtime must call the generic payment-provider-create-session endpoint");
}
if (!runtime.includes("payment_success_requires_server_verification")) {
  violations.push("Buyer payment runtime must require server-verification evidence");
}
if (!runtime.includes('url.protocol === "https:"')) {
  violations.push("Buyer payment runtime must accept only HTTPS hosted checkout URLs");
}

const contract = readFileSync("src/types/payment-gateway-contract.ts", "utf8");
if (!/DEFAULT_PAYMENT_PROVIDER_CODE\s*=\s*"generic"/.test(contract)) {
  violations.push('DEFAULT_PAYMENT_PROVIDER_CODE must remain "generic"');
}

const flow = readFileSync("src/lib/payment-gateway-flow.ts", "utf8");
if (!flow.includes("fetchPaymentGatewayPayableStatus") || !flow.includes("isTerminalPaymentStatus")) {
  violations.push("Buyer payment success must remain bound to canonical Core status");
}

if (violations.length) {
  console.error(
    "Buyer decision-lock verification failed:\n" +
      violations.map((value) => `- ${value}`).join("\n")
  );
  process.exit(1);
}

console.log(
  "Buyer decision locks verified: phone/email OTP only; provider-neutral hosted checkout; server-verified payment success."
);
