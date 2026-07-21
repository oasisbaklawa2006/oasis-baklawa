import type {
  CustomerOrderItem,
  CustomerOrderStatus,
} from '../contracts/customerGateway';

interface OrderStatusListProps {
  orders: CustomerOrderStatus[];
  items: CustomerOrderItem[];
}

function formatDate(value: string | null): string {
  if (!value) return 'Not confirmed';
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date(value));
}

function formatQuantity(item: CustomerOrderItem): string {
  const unit = item.pack_size ? ` · ${item.pack_size}` : '';
  const weight = item.weight_kg == null ? '' : ` · ${item.weight_kg} kg`;
  return `${item.quantity}${unit}${weight}`;
}

export function OrderStatusList({ orders, items }: OrderStatusListProps) {
  const itemsByOrder = new Map<string, CustomerOrderItem[]>();

  for (const item of items) {
    const orderItems = itemsByOrder.get(item.order_id) ?? [];
    orderItems.push(item);
    itemsByOrder.set(item.order_id, orderItems);
  }

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
          {orders.map((order) => {
            const orderItems = itemsByOrder.get(order.order_id) ?? [];

            return (
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

                <details className="order-details">
                  <summary>{orderItems.length} order item{orderItems.length === 1 ? '' : 's'}</summary>
                  {orderItems.length === 0 ? (
                    <p>Item details are not available for this order.</p>
                  ) : (
                    <ul>
                      {orderItems.map((item) => (
                        <li key={item.item_id}>
                          <div>
                            <strong>{item.product_name}</strong>
                            <span>{item.sku ?? 'SKU unavailable'}</span>
                          </div>
                          <div>
                            <span>{formatQuantity(item)}</span>
                            {item.packed_quantity == null ? null : (
                              <span>Packed: {item.packed_quantity}</span>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </details>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
