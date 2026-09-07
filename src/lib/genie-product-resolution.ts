import type { CatalogueProduct } from "@/lib/api/catalogue";
import { defaultOrderQuantity, validateOrderQuantity } from "@/lib/buyer-commercial-validation";

export interface GenieParsedLine {
  rawName: string;
  quantity: number;
  uom: string;
}

export interface GenieResolvedLine {
  rawName: string;
  quantity: number;
  uom: string;
  product: CatalogueProduct;
  normalizedQuantity: number;
}

export interface GenieAmbiguousLine {
  rawName: string;
  quantity: number;
  uom: string;
  candidates: CatalogueProduct[];
}

export interface GenieUnresolvedLine {
  rawName: string;
  quantity: number;
  uom: string;
  reason: string;
}

export interface GenieResolutionResult {
  resolved: GenieResolvedLine[];
  ambiguous: GenieAmbiguousLine[];
  unresolved: GenieUnresolvedLine[];
}

const ALIAS_TOKENS: Record<string, string[]> = {
  kaju: ["kaju", "cashew"],
  badam: ["badam", "almond"],
  pista: ["pista", "pistachio"],
  baklawa: ["baklawa", "baklava"],
  katli: ["katli", "barfi", "burfi"],
};

function normalizeAliasText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function expandAliasTokens(tokens: string[]): string[] {
  const expanded = new Set<string>();
  for (const token of tokens) {
    expanded.add(token);
    const aliases = ALIAS_TOKENS[token];
    if (aliases) aliases.forEach((alias) => expanded.add(alias));
  }
  return [...expanded];
}

function tokenize(value: string): string[] {
  const normalized = normalizeAliasText(value);
  if (!normalized) return [];
  return expandAliasTokens(normalized.split(" ").filter(Boolean));
}

function scoreProductMatch(queryTokens: string[], product: CatalogueProduct): number {
  const haystack = normalizeAliasText(`${product.product_name} ${product.sku} ${product.category ?? ""} ${product.subcategory ?? ""}`);
  const hayTokens = new Set(tokenize(haystack));
  if (queryTokens.length === 0 || hayTokens.size === 0) return 0;

  let hits = 0;
  for (const token of queryTokens) {
    if (hayTokens.has(token)) hits += 1;
  }
  if (hits === 0) return 0;

  const coverage = hits / queryTokens.length;
  const skuExact = queryTokens.some((token) => normalizeAliasText(product.sku) === token) ? 0.35 : 0;
  return coverage + skuExact;
}

function normalizeLineQuantity(product: CatalogueProduct, quantity: number): number | null {
  if (!Number.isFinite(quantity) || quantity <= 0) return null;
  const moq = defaultOrderQuantity(product.price);
  if (moq === null) return null;
  const increment = product.price?.order_increment ?? moq;
  let stepped = Math.max(quantity, moq);
  if (increment > 0 && moq > 0) {
    const remainder = (stepped - moq) % increment;
    if (remainder !== 0) stepped += increment - remainder;
  }
  const check = validateOrderQuantity(product.price ?? null, stepped);
  return check.orderable ? stepped : null;
}

/** Fail-closed catalogue resolution for Genie parsed lines — never invents SKU/product ids. */
export function resolveGenieLines(
  lines: GenieParsedLine[],
  catalogue: CatalogueProduct[],
  options: { minScore?: number; maxCandidates?: number } = {}
): GenieResolutionResult {
  const minScore = options.minScore ?? 0.34;
  const maxCandidates = options.maxCandidates ?? 5;
  const orderableCatalogue = catalogue.filter((product) => Boolean(product.price));

  const resolved: GenieResolvedLine[] = [];
  const ambiguous: GenieAmbiguousLine[] = [];
  const unresolved: GenieUnresolvedLine[] = [];

  for (const line of lines) {
    const queryTokens = tokenize(line.rawName);
    if (queryTokens.length === 0) {
      unresolved.push({
        ...line,
        reason: "Could not read a product name. Edit the line or choose from catalogue.",
      });
      continue;
    }

    const ranked = orderableCatalogue
      .map((product) => ({ product, score: scoreProductMatch(queryTokens, product) }))
      .filter((entry) => entry.score >= minScore)
      .sort((a, b) => b.score - a.score);

    if (ranked.length === 0) {
      unresolved.push({
        ...line,
        reason: "No published catalogue match. Choose a product manually or refine the name.",
      });
      continue;
    }

    const topScore = ranked[0].score;
    const topMatches = ranked.filter((entry) => Math.abs(entry.score - topScore) < 0.05).map((entry) => entry.product);

    if (topMatches.length > 1) {
      ambiguous.push({
        ...line,
        candidates: ranked.slice(0, maxCandidates).map((entry) => entry.product),
      });
      continue;
    }

    const product = ranked[0].product;
    const normalizedQuantity = normalizeLineQuantity(product, line.quantity);
    if (normalizedQuantity === null) {
      unresolved.push({
        ...line,
        reason: "Quantity does not satisfy MOQ/carton rules for the matched product.",
      });
      continue;
    }

    resolved.push({
      ...line,
      product,
      normalizedQuantity,
    });
  }

  return { resolved, ambiguous, unresolved };
}

export function applyGenieCandidateSelection(
  line: GenieAmbiguousLine,
  product: CatalogueProduct
): GenieResolvedLine | GenieUnresolvedLine {
  const normalizedQuantity = normalizeLineQuantity(product, line.quantity);
  if (normalizedQuantity === null) {
    return {
      rawName: line.rawName,
      quantity: line.quantity,
      uom: line.uom,
      reason: "Quantity does not satisfy MOQ/carton rules for the selected product.",
    };
  }
  return {
    rawName: line.rawName,
    quantity: line.quantity,
    uom: line.uom,
    product,
    normalizedQuantity,
  };
}
