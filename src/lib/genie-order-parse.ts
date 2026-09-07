import { supabase } from "@/lib/supabase";

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
  const normalized = lines
    .map(normalizeLine)
    .filter((line: GenieParseLine | null): line is GenieParseLine => Boolean(line));
  if (normalized.length === 0) {
    throw new Error("No governed order lines were returned. Refine the request or choose products manually.");
  }
  return normalized;
}
