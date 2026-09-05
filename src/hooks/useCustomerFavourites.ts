import { useCallback, useEffect, useState } from "react";
import { useBuyerSession } from "@/context/BuyerSessionContext";
import { parseRpcError } from "@/lib/rpc-errors";
import { customerGateway } from "@/services/customerGateway";

export function useCustomerFavourites() {
  const { isApprovedBuyer } = useBuyerSession();
  const [favourites, setFavourites] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!isApprovedBuyer) {
      setFavourites([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const rows = await customerGateway.favourites();
      setFavourites(rows.map((row) => row.product_id));
    } catch (e) {
      setError(parseRpcError(e).message);
    } finally {
      setLoading(false);
    }
  }, [isApprovedBuyer]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleFavourite = useCallback(
    async (productId: string, nextValue: boolean) => {
      if (!isApprovedBuyer) return;
      const previous = favourites;
      const optimistic = nextValue
        ? Array.from(new Set([...previous, productId]))
        : previous.filter((id) => id !== productId);
      setFavourites(optimistic);
      try {
        const result = await customerGateway.setFavourite(productId, nextValue);
        const row = result?.[0];
        if (!row || row.product_id !== productId || row.is_favourite !== nextValue) {
          throw new Error("Favourite update was not acknowledged.");
        }
        try {
          const serverRows = await customerGateway.favourites();
          setFavourites(serverRows.map((favourite) => favourite.product_id));
        } catch {
          // Keep acknowledged optimistic state when follow-up read is unavailable.
        }
      } catch (e) {
        setFavourites(previous);
        throw e;
      }
    },
    [favourites, isApprovedBuyer]
  );

  return {
    favourites,
    loading,
    error,
    reload: load,
    toggleFavourite,
    isFavourite: (productId: string) => favourites.includes(productId),
  };
}
