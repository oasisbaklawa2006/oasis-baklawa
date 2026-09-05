import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useBuyerSession } from "@/context/BuyerSessionContext";
import { parseRpcError } from "@/lib/rpc-errors";
import { customerGateway } from "@/services/customerGateway";

interface CustomerFavouritesContextValue {
  favourites: string[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  toggleFavourite: (productId: string, nextValue: boolean) => Promise<void>;
  isFavourite: (productId: string) => boolean;
}

const CustomerFavouritesContext = createContext<CustomerFavouritesContextValue | null>(null);

export function CustomerFavouritesProvider({ children }: { children: React.ReactNode }) {
  const { isApprovedBuyer } = useBuyerSession();
  const [favourites, setFavourites] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadRequestIdRef = useRef(0);
  const mutationEpochRef = useRef(0);
  const authEpochRef = useRef(0);
  const toggleChainRef = useRef(Promise.resolve());

  const invalidateInFlightWork = useCallback(() => {
    authEpochRef.current += 1;
    loadRequestIdRef.current += 1;
    mutationEpochRef.current += 1;
    setFavourites([]);
    setLoading(false);
    setError(null);
  }, []);

  const load = useCallback(async () => {
    if (!isApprovedBuyer) {
      invalidateInFlightWork();
      return;
    }
    const requestId = ++loadRequestIdRef.current;
    const authEpochAtStart = authEpochRef.current;
    const mutationEpochAtStart = mutationEpochRef.current;
    setLoading(true);
    setError(null);
    try {
      const rows = await customerGateway.favourites();
      if (requestId !== loadRequestIdRef.current) return;
      if (authEpochAtStart !== authEpochRef.current) return;
      if (mutationEpochAtStart !== mutationEpochRef.current) return;
      setFavourites(rows.map((row) => row.product_id));
    } catch (e) {
      if (requestId !== loadRequestIdRef.current) return;
      if (authEpochAtStart !== authEpochRef.current) return;
      setError(parseRpcError(e).message);
    } finally {
      if (requestId === loadRequestIdRef.current && authEpochAtStart === authEpochRef.current) {
        setLoading(false);
      }
    }
  }, [invalidateInFlightWork, isApprovedBuyer]);

  useEffect(() => {
    authEpochRef.current += 1;
    loadRequestIdRef.current += 1;
    mutationEpochRef.current += 1;
    if (!isApprovedBuyer) {
      setFavourites([]);
      setLoading(false);
      setError(null);
      return;
    }
    void load();
  }, [isApprovedBuyer, load]);

  const toggleFavourite = useCallback(
    (productId: string, nextValue: boolean) => {
      if (!isApprovedBuyer) return Promise.resolve();

      const run = async () => {
        if (!isApprovedBuyer) return;
        const authEpochAtStart = authEpochRef.current;
        mutationEpochRef.current += 1;
        loadRequestIdRef.current += 1;
        const mutationEpochAtStart = mutationEpochRef.current;
        const previous = favourites;
        const optimistic = nextValue
          ? Array.from(new Set([...previous, productId]))
          : previous.filter((id) => id !== productId);
        setFavourites(optimistic);
        try {
          const result = await customerGateway.setFavourite(productId, nextValue);
          if (authEpochAtStart !== authEpochRef.current) return;
          if (mutationEpochAtStart !== mutationEpochRef.current) return;
          const row = result?.[0];
          if (!row || row.product_id !== productId || row.is_favourite !== nextValue) {
            throw new Error("Favourite update was not acknowledged.");
          }
          mutationEpochRef.current += 1;
          try {
            const serverRows = await customerGateway.favourites();
            if (authEpochAtStart !== authEpochRef.current) return;
            if (mutationEpochAtStart !== mutationEpochRef.current) return;
            setFavourites(serverRows.map((favourite) => favourite.product_id));
          } catch {
            // Keep acknowledged optimistic state when follow-up read is unavailable.
          }
        } catch (e) {
          if (authEpochAtStart !== authEpochRef.current) return;
          if (mutationEpochAtStart !== mutationEpochRef.current) return;
          setFavourites(previous);
          throw e;
        }
      };

      const next = toggleChainRef.current.then(run);
      toggleChainRef.current = next.catch(() => undefined);
      return next;
    },
    [favourites, isApprovedBuyer]
  );

  const value = useMemo(
    () => ({
      favourites,
      loading,
      error,
      reload: load,
      toggleFavourite,
      isFavourite: (productId: string) => favourites.includes(productId),
    }),
    [error, favourites, load, loading, toggleFavourite]
  );

  return <CustomerFavouritesContext.Provider value={value}>{children}</CustomerFavouritesContext.Provider>;
}

export function useCustomerFavourites() {
  const context = useContext(CustomerFavouritesContext);
  if (!context) {
    throw new Error("useCustomerFavourites must be used within CustomerFavouritesProvider");
  }
  return context;
}
