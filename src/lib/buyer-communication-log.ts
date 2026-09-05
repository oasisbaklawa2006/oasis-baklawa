import type { CustomerGeneralQuery, CustomerSupportTicket } from "@/types/database.types";

export type BuyerCommunicationLogKind = "order_ticket" | "general_enquiry";

export type BuyerCommunicationLogEntry = {
  id: string;
  kind: BuyerCommunicationLogKind;
  createdAt: string;
  ticket?: CustomerSupportTicket;
  query?: CustomerGeneralQuery;
};

function entryTimestamp(value: string | null | undefined): number {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Merges governed order tickets and general enquiries into one newest-first communication log. */
export function buildBuyerCommunicationLog(
  tickets: CustomerSupportTicket[],
  generalQueries: CustomerGeneralQuery[]
): BuyerCommunicationLogEntry[] {
  const ticketEntries = tickets.map((ticket) => ({
    id: `ticket:${ticket.ticket_id}`,
    kind: "order_ticket" as const,
    createdAt: ticket.created_at,
    ticket,
  }));
  const queryEntries = generalQueries.map((query) => ({
    id: `query:${query.query_id}`,
    kind: "general_enquiry" as const,
    createdAt: query.created_at,
    query,
  }));
  return [...ticketEntries, ...queryEntries].sort(
    (left, right) => entryTimestamp(right.createdAt) - entryTimestamp(left.createdAt)
  );
}
