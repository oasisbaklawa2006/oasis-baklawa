import { readdir, readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';

const sourceRoot = new URL('../src/', import.meta.url);
const allowedRpcNames = new Set([
  'published_products_v1',
  'buyer_product_prices_v1',
  'customer_order_status_v1',
]);
const forbiddenTables = [
  'products',
  'product_pricing_rules',
  'orders',
  'profiles',
  'companies',
  'order_payments',
  'dispatches',
];

async function collectFiles(directoryUrl) {
  const entries = await readdir(directoryUrl, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const childUrl = new URL(`${entry.name}${entry.isDirectory() ? '/' : ''}`, directoryUrl);
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(childUrl)));
    } else if (['.ts', '.tsx', '.js', '.jsx'].includes(extname(entry.name))) {
      files.push(childUrl);
    }
  }

  return files;
}

const violations = [];

for (const fileUrl of await collectFiles(sourceRoot)) {
  const source = await readFile(fileUrl, 'utf8');
  const relativePath = fileUrl.pathname.split('/src/').at(-1);

  for (const table of forbiddenTables) {
    const directTablePattern = new RegExp(`\\.from\\(\\s*['\"]${table}['\"]\\s*\\)`, 'g');
    if (directTablePattern.test(source)) {
      violations.push(`${relativePath}: direct raw-table query to ${table}`);
    }
  }

  for (const match of source.matchAll(/\.rpc\(\s*['"]([^'"]+)['"]/g)) {
    if (!allowedRpcNames.has(match[1])) {
      violations.push(`${relativePath}: unapproved RPC ${match[1]}`);
    }
  }
}

if (violations.length > 0) {
  console.error('Customer data-boundary verification failed:');
  for (const violation of violations) console.error(`- ${violation}`);
  process.exit(1);
}

console.log('Customer data-boundary verification passed.');
