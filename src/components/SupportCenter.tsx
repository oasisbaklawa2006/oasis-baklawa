import { FormEvent, useMemo, useState } from 'react';
import type { CustomerOrderStatus, CustomerSupportTicket } from '../contracts/customerGateway';
import { submitCustomerSupportTicket } from '../services/customerGateway';

interface SupportCenterProps {
  orders: CustomerOrderStatus[];
  tickets: CustomerSupportTicket[];
  onTicketSubmitted: () => Promise<void>;
}

const issueTypes = [
  ['damaged_goods', 'Damaged goods'],
  ['wrong_items', 'Wrong items received'],
  ['missing_items', 'Missing items'],
  ['quality_issue', 'Quality issue'],
  ['billing_dispute', 'Billing dispute'],
  ['other', 'Other'],
] as const;

function formatDate(value: string | null): string {
  if (!value) return 'Not available';
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date(value));
}

export function SupportCenter({ orders, tickets, onTicketSubmitted }: SupportCenterProps) {
  const [orderId, setOrderId] = useState(orders[0]?.order_id ?? '');
  const [issueType, setIssueType] = useState('missing_items');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const visibleOrders = useMemo(
    () => orders.filter((order) => order.customer_stage !== 'closed'),
    [orders],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    if (!orderId || description.trim().length < 10) {
      setMessage('Select an order and describe the issue in at least 10 characters.');
      return;
    }

    setSubmitting(true);
    try {
      await submitCustomerSupportTicket({ orderId, issueType, description: description.trim() });
      setDescription('');
      setMessage('Support ticket submitted successfully.');
      await onTicketSubmitted();
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : 'Unable to submit support ticket.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section aria-labelledby="support-heading">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Customer care</span>
          <h2 id="support-heading">Support tickets</h2>
        </div>
        <span>{tickets.length} tickets</span>
      </div>

      <div className="support-layout">
        <form className="support-form" onSubmit={handleSubmit}>
          <h3>Raise an order issue</h3>
          <label>
            Order
            <select value={orderId} onChange={(event) => setOrderId(event.target.value)}>
              <option value="">Select an order</option>
              {visibleOrders.map((order) => (
                <option key={order.order_id} value={order.order_id}>{order.order_number}</option>
              ))}
            </select>
          </label>
          <label>
            Issue type
            <select value={issueType} onChange={(event) => setIssueType(event.target.value)}>
              {issueTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label>
            Description
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={5}
              maxLength={2000}
              placeholder="Describe what happened and what assistance you need."
            />
          </label>
          <button type="submit" disabled={submitting || visibleOrders.length === 0}>
            {submitting ? 'Submitting…' : 'Submit ticket'}
          </button>
          {message ? <p role="status">{message}</p> : null}
        </form>

        <div className="ticket-list">
          {tickets.length === 0 ? (
            <div className="empty-state">No support tickets are available for this company.</div>
          ) : tickets.map((ticket) => (
            <article className="ticket-card" key={ticket.ticket_id}>
              <div>
                <span className="eyebrow">{ticket.order_number ?? 'Historical order'}</span>
                <h3>{ticket.issue_type.replaceAll('_', ' ')}</h3>
                <p>{ticket.description}</p>
              </div>
              <dl>
                <div><dt>Status</dt><dd>{ticket.customer_status.replaceAll('_', ' ')}</dd></div>
                <div><dt>Raised</dt><dd>{formatDate(ticket.created_at)}</dd></div>
                <div><dt>Resolution due</dt><dd>{formatDate(ticket.resolution_due)}</dd></div>
              </dl>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
