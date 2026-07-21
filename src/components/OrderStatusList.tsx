import type { CustomerOrderStatus } from '../contracts/customerGateway';

interface OrderStatusListProps {
  orders: CustomerOrderStatus[];
}

function formatDate(value: string | null): string {
  if (!value) return 'Not confirmed';
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date(value));
}

export function OrderStatusList({ orders }: OrderStatusListProps) {
  return (
    <section aria-labelledby="orders-heading">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Buyer workspace</span>
          <h2 id="orders-heading">Your orders</h2>
        </div>
        <span>{orders.length} orders</span>
      </div>

      {orders.length === 0 ? (
        <div className="empty-state">No customer-visible orders are available for this account.</div>
      ) : (
        <div className="order-list">
          {orders.map((order) => (
            <article className="order-card" key={order.order_id}>
              <div>
                <span className="eyebrow">{order.order_number}</span>
                <h3>{order.customer_stage.replaceAll('_', ' ')}</h3>
                <p>Payment: {order.payment_stage.replaceAll('_', ' ')}</p>
              </div>
              <dl>
                <div>
                  <dt>Order value</dt>
                  <dd>{order.order_value == null ? 'Not available' : `₹${order.order_value.toLocaleString('en-IN')}`}</dd>
                </div>
                <div>
                  <dt>Promised dispatch</dt>
                  <dd>{formatDate(order.promised_dispatch_date)}</dd>
                </div>
                <div>
                  <dt>Tracking</dt>
                  <dd>{order.tracking_number ?? 'Available after dispatch'}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
