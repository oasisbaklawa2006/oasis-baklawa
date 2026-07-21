import { useEffect, useState } from 'react';
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
  const { session, loading: sessionLoading } = useCustomerSession();
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
    <main>
      <h1>Oasis Baklawa</h1>
      <p>{session ? 'Approved buyer session' : 'Public catalogue session'}</p>
      <p>Published products: {catalogue.length}</p>
      <p>Customer orders: {orders.length}</p>
      {error ? <p role="alert">{error}</p> : null}
    </main>
  );
}
