import { useCallback, useEffect, useState } from 'react';
import { BuyerAccess } from './components/BuyerAccess';
import { OrderStatusList } from './components/OrderStatusList';
import { ProductGrid } from './components/ProductGrid';
import { SupportCenter } from './components/SupportCenter';
import type {
  CustomerCatalogueItem,
  CustomerOrderItem,
  CustomerOrderStatus,
  CustomerSupportTicket,
  PublishedProduct,
} from './contracts/customerGateway';
import { useCustomerSession } from './hooks/useCustomerSession';
import {
  getCustomerCatalogue,
  getCustomerOrderItems,
  getCustomerOrderStatuses,
  getCustomerSupportTickets,
  getPublishedProducts,
} from './services/customerGateway';

export default function App() {
  const { session, user, loading: sessionLoading } = useCustomerSession();
  const [catalogue, setCatalogue] = useState<Array<CustomerCatalogueItem | PublishedProduct>>([]);
  const [orders, setOrders] = useState<CustomerOrderStatus[]>([]);
  const [orderItems, setOrderItems] = useState<CustomerOrderItem[]>([]);
  const [tickets, setTickets] = useState<CustomerSupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshTickets = useCallback(async () => {
    setTickets(await getCustomerSupportTickets());
  }, []);

  useEffect(() => {
    if (sessionLoading) return;

    let active = true;
    setLoading(true);
    setError(null);

    const request = session
      ? Promise.all([
          getCustomerCatalogue(),
          getCustomerOrderStatuses(),
          getCustomerOrderItems(),
          getCustomerSupportTickets(),
        ])
      : Promise.all([
          getPublishedProducts(),
          Promise.resolve([] as CustomerOrderStatus[]),
          Promise.resolve([] as CustomerOrderItem[]),
          Promise.resolve([] as CustomerSupportTicket[]),
        ]);

    request
      .then(([nextCatalogue, nextOrders, nextOrderItems, nextTickets]) => {
        if (!active) return;
        setCatalogue(nextCatalogue);
        setOrders(nextOrders);
        setOrderItems(nextOrderItems);
        setTickets(nextTickets);
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setError(reason instanceof Error ? reason.message : 'Unable to load customer data');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [session, sessionLoading]);

  return (
    <main className="app-shell">
      <header className="hero">
        <span className="eyebrow">Oasis Baklawa · India</span>
        <h1>Arabic sweets, shaped for memorable occasions.</h1>
        <p>
          Explore the governed published collection. Approved trade buyers can sign in for protected pricing, company-specific order progress and secure support.
        </p>
      </header>

      <BuyerAccess user={user} />

      {loading ? <p className="status-message" aria-live="polite">Loading the Oasis collection…</p> : null}
      {error ? <p className="status-message" role="alert">{error}</p> : null}
      {!loading && !error ? <ProductGrid products={catalogue} /> : null}
      {!loading && !error && session ? <OrderStatusList orders={orders} items={orderItems} /> : null}
      {!loading && !error && session ? (
        <SupportCenter orders={orders} tickets={tickets} onTicketSubmitted={refreshTickets} />
      ) : null}
    </main>
  );
}
