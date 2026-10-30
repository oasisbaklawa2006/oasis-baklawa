import type { CatalogueProduct } from "@/lib/api/catalogue";
import { resolveCommercialRules, validateOrderQuantity } from "@/lib/buyer-commercial-validation";

export interface GenieParsedLine {
  lineId: string;
  rawName: string;
  quantity: number;
  uom: string;
}

export interface GenieResolvedLine {
  lineId: string;
  rawName: string;
  quantity: number;
  uom: string;
  product: CatalogueProduct;
  normalizedQuantity: number;
}

export interface GenieAmbiguousLine {
  lineId: string;
  rawName: string;
  quantity: number;
  uom: string;
  candidates: CatalogueProduct[];
}

export interface GenieUnresolvedLine {
  lineId: string;
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
  const skuTokens = tokenize(product.sku);
  const skuExact =
    skuTokens.length > 0 && skuTokens.every((token) => queryTokens.includes(token)) ? 0.35 : 0;
  return coverage + skuExact;
}

const GENERIC_UOMS = new Set(["", "unit", "units", "item", "items", "qty", "nos", "no"]);

const normaliseUom = (uom: string | null | undefined) => (uom ?? "").trim().toLowerCase();

export type GenieQuantityOutcome =
  | { ok: true; quantity: number }
  | { ok: false; reason: string };

/**
 * AI-parsed quantities are customer *requests*, never commercial facts. They are accepted only when
 * they already satisfy governed MOQ/increment rules in the product's own unit. A quantity is never
 * silently raised or rounded; instead the line is returned with an exact, courteous correction and the
 * customer edits it explicitly.
 */
export function checkGenieLineQuantity(
  product: CatalogueProduct,
  line: Pick<GenieParsedLine, "quantity" | "uom">
): GenieQuantityOutcome {
  if (!Number.isFinite(line.quantity) || line.quantity <= 0) {
    return { ok: false, reason: "Enter a quantity greater than zero." };
  }
  const commercial = resolveCommercialRules(product.price);
  if (!commercial.orderable || !commercial.rules) {
    return { ok: false, reason: commercial.message ?? "Buyer pricing is unavailable for this product." };
  }
  const requestedUom = normaliseUom(line.uom);
  const productUom = normaliseUom(commercial.rules.uom);
  if (!GENERIC_UOMS.has(requestedUom) && requestedUom !== productUom) {
    return {
      ok: false,
      reason: `You asked for ${line.quantity} ${line.uom}, but this product is ordered in ${commercial.rules.uom}. Please enter the quantity in ${commercial.rules.uom}.`,
    };
  }
  const check = validateOrderQuantity(product.price ?? null, line.quantity);
  if (!check.orderable) {
    return { ok: false, reason: check.message ?? "Quantity does not satisfy MOQ/increment rules for this product." };
  }
  return { ok: true, quantity: line.quantity };
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
    const outcome = checkGenieLineQuantity(product, line);
    if (!outcome.ok) {
      unresolved.push({ ...line, reason: outcome.reason });
      continue;
    }

    resolved.push({
      ...line,
      product,
      normalizedQuantity: outcome.quantity,
    });
  }

  return { resolved, ambiguous, unresolved };
}

export function applyGenieCandidateSelection(
  line: GenieAmbiguousLine,
  product: CatalogueProduct
): GenieResolvedLine | GenieUnresolvedLine {
  const outcome = checkGenieLineQuantity(product, line);
  if (!outcome.ok) {
    return {
      lineId: line.lineId,
      rawName: line.rawName,
      quantity: line.quantity,
      uom: line.uom,
      reason: outcome.reason,
    };
  }
  const normalizedQuantity = outcome.quantity;
  return {
    lineId: line.lineId,
    rawName: line.rawName,
    quantity: line.quantity,
    uom: line.uom,
    product,
    normalizedQuantity,
  };
}
