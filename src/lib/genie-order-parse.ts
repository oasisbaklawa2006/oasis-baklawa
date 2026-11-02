import { supabase } from "@/lib/supabase";
import { GENIE_PARSE_ENABLED } from "@/lib/genie-parse-availability";
import { normalizeGenieLine } from "@/lib/genie-line-normalize";

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

/** Governed Oasis Genie edge intake — never invents lines locally when the edge function fails. */
export async function invokeGenieOrderParse(request: GenieParseRequest): Promise<GenieParseLine[]> {
  if (!GENIE_PARSE_ENABLED) {
    // Enforcement chokepoint, not just a UI-level gate: this is the one
    // function every Genie parse mode funnels through before reaching
    // supabase.functions.invoke("ai-order-parse", ...). The Edge Function
    // is ACTIVE and JWT-protected in production (verified 2026-10-10), but
    // backend deployment does not enable the Buyer feature flag.
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
  const normalized = lines.map(normalizeGenieLine);
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
