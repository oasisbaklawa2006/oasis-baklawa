import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const STACK_ROUTES = [
  "Splash",
  "Onboarding",
  "Welcome",
  "Login",
  "Register",
  "AccessPending",
  "AccessRejected",
  "MainTabs",
  "ProductDetail",
  "OrderDetail",
  "QuickOrder",
  "AiOrder",
  "Cart",
  "Checkout",
  "Documents",
];

const PROGRAMMATIC_ONLY = new Set([
  "Splash",
  "Onboarding",
  "Welcome",
  "AccessPending",
  "AccessRejected",
  "MainTabs",
  "Checkout",
]);

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) walk(path, files);
    else if (/\.(tsx|ts)$/.test(entry)) files.push(path);
  }
  return files;
}

const source = walk("src").map((file) => readFileSync(file, "utf8")).join("\n");
const referenced = new Set();

for (const route of STACK_ROUTES) {
  const patterns = [
    new RegExp(`navigate\\(\\s*["']${route}["']`),
    new RegExp(`replace\\(\\s*["']${route}["']`),
    new RegExp(`reset\\([^)]*name:\\s*["']${route}["']`),
    new RegExp(`name=["']${route}["']`),
  ];
  if (patterns.some((pattern) => pattern.test(source))) {
    referenced.add(route);
  }
}

const orphans = STACK_ROUTES.filter((route) => !referenced.has(route) && !PROGRAMMATIC_ONLY.has(route));

if (orphans.length) {
  console.error("Navigation audit: unreachable stack routes detected:");
  for (const route of orphans) {
    console.error(`  - ${route}`);
  }
  process.exit(1);
}

console.log("Navigation audit passed: all user-facing stack routes are reachable.");
