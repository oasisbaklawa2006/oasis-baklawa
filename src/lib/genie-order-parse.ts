import { supabase } from "@/lib/supabase";
import { GENIE_PARSE_ENABLED } from "@/lib/genie-parse-availability";

export type GenieParseMode = "text" | "audio" | "image" | "document";

export interface GenieParseRequest {
  mode: GenieParseMode;
  text?: string;
  mimeType?: string;
  fileName?: string;
  contentBase64?: string;
  locale?: string;
}

export interface GenieParseLine {
  productName: string;
  quantity: number;
  uom: string;
}

function normalizeLine(value: unknown): GenieParseLine | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const productName = typeof row.productName === "string" ? row.productName : typeof row.product_name === "string" ? row.product_name : null;
  const quantity = typeof row.quantity === "number" ? row.quantity : Number(row.quantity);
  const uom = typeof row.uom === "string" ? row.uom : "units";
  if (!productName?.trim() || !Number.isFinite(quantity) || quantity <= 0) return null;
  return { productName: productName.trim(), quantity, uom };
}

/** Governed Oasis Genie edge intake — never invents lines locally when the edge function fails. */
export async function invokeGenieOrderParse(request: GenieParseRequest): Promise<GenieParseLine[]> {
  if (!GENIE_PARSE_ENABLED) {
    // Enforcement chokepoint, not just a UI-level gate: this is the one
    // function every Genie parse mode funnels through before reaching
    // supabase.functions.invoke("ai-order-parse", ...) -- a production edge
    // function slug confirmed not to exist (see genie-parse-availability.ts).
    // Any future call site, not only AiOrderScreen, is protected by this
    // check, not just by the screen disabling its own button.
    throw new Error(
      "Oasis Genie order parsing is not yet available on this build. Add items from the catalogue instead."
    );
  }
  const { data, error } = await supabase.functions.invoke("ai-order-parse", {
    body: {
      mode: request.mode,
      text: request.text ?? "",
      mime_type: request.mimeType ?? null,
      file_name: request.fileName ?? null,
      content_base64: request.contentBase64 ?? null,
      locale: request.locale ?? "en-IN",
    },
  });

  if (error) {
    throw new Error(error.message || "Could not parse order with Oasis Genie.");
  }

  const lines = Array.isArray(data?.lines) ? data.lines : [];
  const normalized = lines.map(normalizeLine);
  const valid = normalized.filter((line: GenieParseLine | null): line is GenieParseLine => Boolean(line));
  const invalidCount = normalized.length - valid.length;
  if (invalidCount > 0) {
    throw new Error(
      `${invalidCount} order line(s) could not be parsed. Refine the request or choose products manually.`
    );
  }
  if (valid.length === 0) {
    throw new Error("No governed order lines were returned. Refine the request or choose products manually.");
  }
  return valid;
}
