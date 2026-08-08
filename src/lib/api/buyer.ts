import { supabase } from "@/lib/supabase";
import { readStoredApplicationStatus } from "@/lib/application-status-storage";
import { parseRpcError } from "@/lib/rpc-errors";
import type {
  CustomerCompany,
  CustomerTeamMember,
  SubmitB2bTradeApplicationArgs,
  SubmitB2bTradeApplicationResult,
} from "@/types/database.types";

export type BuyerEligibilityState =
  | "unauthenticated"
  | "no_application"
  | "application_pending"
  | "rejected_ineligible"
  | "approved_buyer"
  | "backend_failure";

export interface BuyerSessionSnapshot {
  state: BuyerEligibilityState;
  companyId: string | null;
  company: CustomerCompany | null;
  message: string | null;
}

export async function fetchBuyerEligibleCompanyId(): Promise<string | null> {
  const { data, error } = await supabase.rpc("customer_buyer_eligible_company_id");
  if (error) throw error;
  return (data as string | null) ?? null;
}

export async function fetchCustomerCompany(): Promise<CustomerCompany | null> {
  const { data, error } = await supabase.rpc("customer_company_v1");
  if (error) throw error;
  const rows = data as CustomerCompany[] | null;
  return rows?.[0] ?? null;
}

export async function fetchCustomerTeam(): Promise<CustomerTeamMember[]> {
  const { data, error } = await supabase.rpc("customer_team_v1");
  if (error) throw error;
  return (data as CustomerTeamMember[] | null) ?? [];
}

export async function submitB2bTradeApplication(
  args: SubmitB2bTradeApplicationArgs
): Promise<SubmitB2bTradeApplicationResult> {
  const { data, error } = await supabase.rpc("submit_b2b_trade_application_v1", args);
  if (error) throw error;
  const rows = data as SubmitB2bTradeApplicationResult[] | null;
  const result = rows?.[0];
  if (!result) throw new Error("APPLICATION_FAILED: trade application did not return a result");
  return result;
}

export async function resolveBuyerSession(): Promise<BuyerSessionSnapshot> {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) {
    return {
      state: "backend_failure",
      companyId: null,
      company: null,
      message: parseRpcError(sessionError).message,
    };
  }

  if (!sessionData.session) {
    return { state: "unauthenticated", companyId: null, company: null, message: null };
  }

  try {
    const companyId = await fetchBuyerEligibleCompanyId();
    if (companyId) {
      const company = await fetchCustomerCompany();
      if (company?.is_frozen) {
        return {
          state: "rejected_ineligible",
          companyId,
          company,
          message: "Your company account is frozen. Contact Oasis Baklawa support.",
        };
      }
      return { state: "approved_buyer", companyId, company, message: null };
    }

    const { error: draftProbeError } = await supabase.rpc("get_customer_order_draft_v1");
    if (draftProbeError) {
      const parsed = parseRpcError(draftProbeError);
      if (parsed.code === "BUYER_NOT_ELIGIBLE") {
        return await inferNonEligibleState();
      }
      if (parsed.code === "AUTH_REQUIRED") {
        return { state: "unauthenticated", companyId: null, company: null, message: parsed.message };
      }
    }

    return inferNonEligibleState();
  } catch (error) {
    return {
      state: "backend_failure",
      companyId: null,
      company: null,
      message: parseRpcError(error instanceof Error ? error : null).message,
    };
  }
}

async function inferNonEligibleState(): Promise<BuyerSessionSnapshot> {
  const stored = await readStoredApplicationStatus();
  if (stored === "application_pending") {
    return {
      state: "application_pending",
      companyId: null,
      company: null,
      message: "Your trade application is being reviewed.",
    };
  }
  if (stored === "rejected_ineligible") {
    return {
      state: "rejected_ineligible",
      companyId: null,
      company: null,
      message: "Your trade application was not approved. Contact Oasis Baklawa support.",
    };
  }

  return {
    state: "no_application",
    companyId: null,
    company: null,
    message: "Submit a B2B trade application to access buyer pricing and ordering.",
  };
}
