import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const roots = ['app', 'src'];
const forbiddenTables = ['products','orders','order_items','profiles','companies','support_tickets','tickets'];
const allowedRpcs = new Set([
  'published_products_v1',
  'buyer_product_prices_v1',
  'customer_order_status_v1',
  'customer_order_items_v1',
  'customer_support_tickets_v1',
  'submit_customer_support_ticket_v1',
]);
const violations = [];

function walk(path) {
  for (const entry of readdirSync(path)) {
    const absolute = join(path, entry);
    if (statSync(absolute).isDirectory()) walk(absolute);
    else if (/\.(ts|tsx|js|mjs)$/.test(entry)) inspect(absolute);
  }
}

function inspect(path) {
  const source = readFileSync(path, 'utf8');
  for (const table of forbiddenTables) {
    const direct = new RegExp(`\\.from\\(\\s*['\"]${table}['\"]\\s*\\)`, 'g');
    if (direct.test(source)) violations.push(`${relative('.', path)} directly accesses ${table}`);
  }
  for (const match of source.matchAll(/\.rpc\(\s*['"]([^'"]+)['"]/g)) {
    if (!allowedRpcs.has(match[1])) violations.push(`${relative('.', path)} calls unapproved RPC ${match[1]}`);
  }
  if (/service[_-]?role/i.test(source) && !path.endsWith('verify-contract-boundary.mjs')) {
    violations.push(`${relative('.', path)} contains service-role material`);
  }
}

for (const root of roots) walk(root);
if (violations.length) {
  console.error('Customer boundary verification failed:\n' + violations.map((v) => `- ${v}`).join('\n'));
  process.exit(1);
}
console.log('Customer boundary verified: governed RPCs only.');
