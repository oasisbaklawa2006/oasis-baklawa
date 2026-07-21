import { useEffect, useState } from 'react';
import type {
  CustomerCatalogueItem,
  CustomerOrderStatus,
} from './contracts/customerGateway';
import {
  getCustomerCatalogue,
  getCustomerOrderStatuses,
} from './services/customerGateway';

export default function App() {
  const [catalogue, setCatalogue] = useState<CustomerCatalogueItem[]>([]);
  const [orders, setOrders] = useState<CustomerOrderStatus[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    Promise.all([getCustomerCatalogue(), getCustomerOrderStatuses()])
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
  }, []);

  return (
    <main>
      <h1>Oasis Baklawa</h1>
      <p>Published products: {catalogue.length}</p>
      <p>Customer orders: {orders.length}</p>
      {error ? <p role="alert">{error}</p> : null}
    </main>
  );
}
