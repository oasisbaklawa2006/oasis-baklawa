// Manually derived from oasis-supabase-core governed RPC contracts on production
// (project tcxvcatsqqertcnycuop). Regenerate with:
//   npx supabase gen types typescript --project-id tcxvcatsqqertcnycuop
// once CLI auth is available.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.4";
  };
  public: {
    Tables: Record<
      string,
      {
        Row: Record<string, unknown>;
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      }
    >;
    Views: Record<
      string,
      {
        Row: Record<string, unknown>;
        Relationships: [];
      }
    >;
    Enums: Record<string, string>;
    CompositeTypes: Record<string, unknown>;
    Functions: {
      published_products_v1: {
        Args: Record<string, never>;
        Returns: PublishedProduct[];
      };
      buyer_product_prices_v1: {
        Args: Record<string, never>;
        Returns: BuyerProductPrice[];
      };
      customer_order_status_v1: {
        Args: Record<string, never>;
        Returns: CustomerOrderStatus[];
      };
      customer_order_items_v1: {
        Args: Record<string, never>;
        Returns: CustomerOrderItem[];
      };
      customer_support_tickets_v1: {
        Args: Record<string, never>;
        Returns: CustomerSupportTicket[];
      };
      customer_buyer_eligible_company_id: {
        Args: Record<string, never>;
        Returns: string | null;
      };
      customer_company_v1: {
        Args: Record<string, never>;
        Returns: CustomerCompany[];
      };
      customer_team_v1: {
        Args: Record<string, never>;
        Returns: CustomerTeamMember[];
      };
      get_customer_order_draft_v1: {
        Args: Record<string, never>;
        Returns: CustomerOrderDraftRow[];
      };
      add_customer_order_draft_line_v1: {
        Args: { p_product_id: string; p_quantity: number };
        Returns: DraftMutationResult[];
      };
      update_customer_order_draft_line_v1: {
        Args: { p_line_id: string; p_quantity: number };
        Returns: DraftMutationResult[];
      };
      remove_customer_order_draft_line_v1: {
        Args: { p_line_id: string };
        Returns: DraftReadinessResult[];
      };
      clear_customer_order_draft_v1: {
        Args: Record<string, never>;
        Returns: DraftReadinessResult[];
      };
      submit_customer_order_v1: {
        Args: { p_idempotency_key: string; p_requested_dispatch_date?: string | null };
        Returns: SubmitCustomerOrderResult[];
      };
      calculate_customer_advance_v1: {
        Args: { p_sales_order_value: number };
        Returns: number;
      };
      submit_b2b_trade_application_v1: {
        Args: SubmitB2bTradeApplicationArgs;
        Returns: SubmitB2bTradeApplicationResult[];
      };
      submit_customer_support_ticket_v1: {
        Args: {
          p_order_id: string;
          p_issue_type: string;
          p_description: string;
          p_product_sku?: string | null;
          p_quantity_affected?: number | null;
        };
        Returns: string;
      };
      customer_sales_order_commercial_facts_v1: {
        Args: Record<string, never>;
        Returns: CustomerCommercialFacts[];
      };
      customer_order_finance_facts_v1: {
        Args: { p_order_id: string };
        Returns: Json;
      };
      customer_proforma_invoice_facts_v1: {
        Args: Record<string, never>;
        Returns: CustomerProformaInvoiceFacts[];
      };
      customer_documents_v1: {
        Args: Record<string, never>;
        Returns: CustomerDocument[];
      };
      customer_statement_v1: {
        Args: Record<string, never>;
        Returns: Json;
      };
      customer_product_favourites_v1: {
        Args: Record<string, never>;
        Returns: CustomerProductFavourite[];
      };
      set_customer_product_favourite_v1: {
        Args: { p_product_id: string; p_is_favourite: boolean };
        Returns: CustomerProductFavouriteMutation[];
      };
      customer_general_queries_v1: {
        Args: Record<string, never>;
        Returns: CustomerGeneralQuery[];
      };
      submit_customer_general_query_v1: {
        Args: {
          p_idempotency_key: string;
          p_subject: string;
          p_message: string;
          p_category?: string;
        };
        Returns: SubmitCustomerGeneralQueryResult[];
      };
    };
  };
};

export interface PublishedProduct {
  product_id: string;
  sku: string;
  product_name: string;
  short_description: string | null;
  long_description: string | null;
  category: string | null;
  subcategory: string | null;
  hero_image_url: string | null;
  pack_size: string | null;
  storage_type: string | null;
  shelf_life: string | null;
  shelf_life_days: number | null;
  dietary_tags: string[] | null;
  allergen_warnings: string | null;
  primary_uom: string | null;
  created_at: string;
}

export interface BuyerProductPrice {
  product_id: string;
  selling_price: number;
  currency: string;
  uom: string;
  gst_rate: number;
  tax_inclusive: boolean;
  applied_discount_percent: number | null;
  minimum_order_quantity: number | null;
  minimum_order_uom: string | null;
  order_increment: number | null;
  order_increment_uom: string | null;
  valid_from: string | null;
  valid_until: string | null;
}

export interface CustomerOrderStatus {
  order_id: string;
  order_number: string;
  customer_stage: string;
  payment_stage: string;
  order_value: number;
  total_weight_kg: number | null;
  requested_dispatch_date: string | null;
  promised_dispatch_date: string | null;
  tracking_number: string | null;
  courier_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface CustomerOrderItem {
  order_id: string;
  item_id: string;
  product_id: string;
  sku: string;
  product_name: string;
  quantity: number;
  pack_size: string | null;
  weight_kg: number | null;
  packed_quantity: number | null;
}

export interface CustomerSupportTicket {
  ticket_id: string;
  order_id: string;
  order_number: string;
  issue_type: string;
  description: string;
  customer_status: string;
  product_sku: string | null;
  quantity_affected: number | null;
  created_at: string;
  updated_at: string;
  first_response_due: string | null;
  resolution_due: string | null;
  resolved_at: string | null;
  customer_rating: number | null;
}

export interface CustomerCompany {
  company_id: string;
  business_name: string;
  gst_number: string | null;
  status: string;
  price_tier: string | null;
  payment_terms: string | null;
  registered_address: string | null;
  phone: string | null;
  is_frozen: boolean;
}

export interface CustomerTeamMember {
  profile_id: string;
  full_name: string | null;
  email: string | null;
  mobile_number: string | null;
  role: string;
  status: string;
}

export interface CustomerOrderDraftRow {
  draft_id: string;
  company_id: string;
  status: string;
  readiness_status: string;
  readiness_issues: DraftReadinessIssue[] | null;
  line_id: string | null;
  product_id: string | null;
  quantity: number | null;
  unit_price_snapshot: number | null;
  currency_snapshot: string | null;
  uom_snapshot: string | null;
  sku_snapshot: string | null;
  product_name_snapshot: string | null;
}

export interface DraftReadinessIssue {
  code: string;
  product_id?: string;
  quantity?: number;
}

export interface DraftMutationResult {
  draft_id: string;
  line_id: string;
  readiness_status: string;
  readiness_issues: DraftReadinessIssue[] | null;
}

export interface DraftReadinessResult {
  draft_id: string;
  readiness_status: string;
  readiness_issues: DraftReadinessIssue[] | null;
}

export interface SubmitCustomerOrderResult {
  order_id: string;
  order_number: string;
  sales_order_value: number;
  advance_required: number;
  draft_id: string;
  is_duplicate_submission: boolean;
}

export interface SubmitB2bTradeApplicationArgs {
  p_business_name: string;
  p_trade_name?: string | null;
  p_business_type?: string | null;
  p_gst_number?: string | null;
  p_expected_volume?: string | null;
  p_contact_name?: string | null;
  p_contact_person?: string | null;
  p_contact_email?: string | null;
  p_contact_phone?: string | null;
  p_mobile_number?: string | null;
  p_registered_address?: string | null;
  p_city?: string | null;
  p_state?: string | null;
  p_pincode?: string | null;
  p_gst_certificate_path?: string | null;
  p_business_proof_path?: string | null;
  p_current_brands?: string | null;
  p_preferred_dispatch?: string | null;
  p_preferred_dispatch_other_name?: string | null;
  p_trade_declaration?: boolean;
  p_data_consent?: boolean;
}

export interface SubmitB2bTradeApplicationResult {
  application_id: string;
  application_status: string;
  company_id: string;
  is_duplicate_submission: boolean;
}

export interface CustomerOrderDraftLine {
  line_id: string;
  product_id: string;
  quantity: number;
  unit_price_snapshot: number;
  currency_snapshot: string;
  uom_snapshot: string | null;
  sku_snapshot: string | null;
  product_name_snapshot: string | null;
  line_total: number;
}

export interface CustomerOrderDraft {
  draft_id: string;
  company_id: string;
  status: string;
  readiness_status: string;
  readiness_issues: DraftReadinessIssue[];
  lines: CustomerOrderDraftLine[];
  order_total: number;
  is_checkout_ready: boolean;
}

export interface SubmitSupportTicketInput {
  orderId: string;
  issueType: string;
  description: string;
  productSku?: string | null;
  quantityAffected?: number | null;
}

export interface CustomerCommercialFacts {
  order_id: string;
  order_number: string;
  commercial_version_id: string | null;
  commercial_version_number: number | null;
  frozen_sales_order_value: number | null;
  requested_dispatch_date: string | null;
  promised_dispatch_date: string | null;
  commercial_status: string | null;
  finance_status: string | null;
  created_at: string;
  updated_at: string;
}

export interface CustomerFinanceFacts {
  order_id: string;
  order_number: string;
  commercial_version_id: string | null;
  commercial_version_number: number | null;
  commercial_value: number | null;
  required_advance: number | null;
  pi_id: string | null;
  pi_number: string | null;
  pi_status: string | null;
  verified_payment_amount: number | null;
  wallet_applied_amount: number | null;
  approved_credit_amount: number | null;
  covered_amount: number | null;
  advance_covered: boolean | null;
  finance_status: string | null;
  facts_as_of: string | null;
  customer_safe_projection: boolean;
}

export interface CustomerProformaInvoiceFacts {
  pi_id: string;
  customer_visible_pi_number: string | null;
  order_id: string;
  order_number: string;
  commercial_version_id: string | null;
  commercial_version_number: number | null;
  status: string | null;
  issued_at: string | null;
  frozen_customer_total: number | null;
  created_at: string;
}

export interface CustomerDocument {
  document_type: string;
  document_id: string;
  document_number: string | null;
  order_id: string;
  order_number: string;
  commercial_version_id: string | null;
  status: string | null;
  issued_at: string | null;
  customer_total: number | null;
  availability_state: string | null;
}

export interface CustomerStatementEntry {
  order_id: string | null;
  invoice_date: string | null;
  invoice_number: string | null;
  invoice_gross_total: number | null;
  verified_payment_total: number | null;
  wallet_applied_total: number | null;
  approved_credit_total: number | null;
  credit_note_total: number | null;
  debit_note_total: number | null;
  refund_total: number | null;
  pre_dispatch_net_due: number | null;
  complaint_window_status: string | null;
  complaint_deadline: string | null;
  commercially_closed: boolean | null;
}

export interface CustomerStatement {
  company_id: string;
  wallet_balance: number | null;
  entries: CustomerStatementEntry[];
  facts_as_of: string | null;
  statement_facts_only: boolean;
}

export interface CustomerProductFavourite {
  product_id: string;
  created_at: string;
}

export interface CustomerProductFavouriteMutation {
  product_id: string;
  is_favourite: boolean;
}

export interface CustomerGeneralQuery {
  query_id: string;
  category: string;
  subject: string;
  message: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface SubmitCustomerGeneralQueryInput {
  idempotencyKey: string;
  subject: string;
  message: string;
  category: string;
}

export interface SubmitCustomerGeneralQueryResult {
  query_id: string;
  status: string;
  is_duplicate_submission: boolean;
}
