import { useEffect, useState } from 'react';
import { BuyerAccess } from './components/BuyerAccess';
import { OrderStatusList } from './components/OrderStatusList';
import { ProductGrid } from './components/ProductGrid';
import type {
  CustomerCatalogueItem,
  CustomerOrderStatus,
  PublishedProduct,
} from './contracts/customerGateway';
import { useCustomerSession } from './hooks/useCustomerSession';
import {
  getCustomerCatalogue,
  getCustomerOrderStatuses,
  getPublishedProducts,
} from './services/customerGateway';

export default function App() {
  const { session, user, loading: sessionLoading } = useCustomerSession();
  const [catalogue, setCatalogue] = useState<Array<CustomerCatalogueItem | PublishedProduct>>([]);
  const [orders, setOrders] = useState<CustomerOrderStatus[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (sessionLoading) return;

    let active = true;
    setError(null);

    const request = session
      ? Promise.all([getCustomerCatalogue(), getCustomerOrderStatuses()])
      : Promise.all([getPublishedProducts(), Promise.resolve([] as CustomerOrderStatus[])]);

    request
      .then(([nextCatalogue, nextOrders]) => {
        if (!active) return;
        setCatalogue(nextCatalogue);
        setOrders(nextOrders);
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setError(reason instanceof Error ? reason.message : 'Unable to load customer data');
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
          Explore the governed published collection. Approved trade buyers can sign in for protected pricing and company-specific order progress.
        </p>
      </header>

      <BuyerAccess user={user} />

      {error ? <p role="alert">{error}</p> : null}
      <ProductGrid products={catalogue} />
      {session ? <OrderStatusList orders={orders} /> : null}
    </main>
  );
}
