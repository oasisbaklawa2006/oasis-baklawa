import type {
  CustomerOrderItem,
  CustomerProductFavourite,
  PublishedProduct,
} from "@/types/database.types";

const EXPLICIT_SEASONAL_TERMS = [
  "seasonal",
  "festive",
  "festival",
  "diwali",
  "eid",
  "rakhi",
  "christmas",
  "new year",
  "holi",
] as const;

function normalized(value: string): string {
  return value.trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
}

function containsExplicitTerm(value: string): boolean {
  const haystack = normalized(value);
  return EXPLICIT_SEASONAL_TERMS.some((term) => {
    const needle = normalized(term);
    return haystack === needle || haystack.startsWith(`${needle} `) || haystack.endsWith(` ${needle}`) || haystack.includes(` ${needle} `);
  });
}

/**
 * Classifies a product as seasonal only when an authoritative taxonomy field
 * explicitly says so. Product names/descriptions are deliberately excluded so
 * the Buyer app does not invent merchandising intent from marketing copy.
 */
export function isExplicitSeasonalProduct(product: PublishedProduct): boolean {
  const taxonomy = [product.category, product.subcategory, ...(product.dietary_tags ?? [])].filter(
    (value): value is string => Boolean(value)
  );
  return taxonomy.some(containsExplicitTerm);
}

/** Returns current published products explicitly classified as seasonal. */
export function seasonalProducts(products: PublishedProduct[]): PublishedProduct[] {
  return products
    .filter(isExplicitSeasonalProduct)
    .slice()
    .sort((a, b) => a.product_name.localeCompare(b.product_name));
}

interface RecommendationSignals {
  products: PublishedProduct[];
  favourites: CustomerProductFavourite[];
  orderItems: CustomerOrderItem[];
}

/**
 * Produces a buyer-specific list using only explicit customer signals:
 * favourites first, then products the buyer has actually ordered. There is no
 * popularity or similarity fallback because Core does not expose those facts.
 */
export function recommendedProducts({
  products,
  favourites,
  orderItems,
}: RecommendationSignals): PublishedProduct[] {
  const favouriteIds = new Set(favourites.map((row) => row.product_id));
  const orderSignal = new Map<string, { lines: number; quantity: number }>();

  for (const item of orderItems) {
    const current = orderSignal.get(item.product_id) ?? { lines: 0, quantity: 0 };
    current.lines += 1;
    current.quantity += Number.isFinite(item.quantity) ? item.quantity : 0;
    orderSignal.set(item.product_id, current);
  }

  return products
    .filter((product) => favouriteIds.has(product.product_id) || orderSignal.has(product.product_id))
    .slice()
    .sort((a, b) => {
      const favouriteDelta = Number(favouriteIds.has(b.product_id)) - Number(favouriteIds.has(a.product_id));
      if (favouriteDelta !== 0) return favouriteDelta;

      const bSignal = orderSignal.get(b.product_id) ?? { lines: 0, quantity: 0 };
      const aSignal = orderSignal.get(a.product_id) ?? { lines: 0, quantity: 0 };
      if (bSignal.lines !== aSignal.lines) return bSignal.lines - aSignal.lines;
      if (bSignal.quantity !== aSignal.quantity) return bSignal.quantity - aSignal.quantity;
      return a.product_name.localeCompare(b.product_name);
    });
}

/** Sorts published catalogue rows by their authoritative creation timestamp. */
export function recentlyAddedProducts(products: PublishedProduct[], limit = 6): PublishedProduct[] {
  return products
    .slice()
    .sort((a, b) => {
      const bTime = Date.parse(b.created_at);
      const aTime = Date.parse(a.created_at);
      const safeB = Number.isFinite(bTime) ? bTime : 0;
      const safeA = Number.isFinite(aTime) ? aTime : 0;
      if (safeB !== safeA) return safeB - safeA;
      return a.product_name.localeCompare(b.product_name);
    })
    .slice(0, limit);
}
