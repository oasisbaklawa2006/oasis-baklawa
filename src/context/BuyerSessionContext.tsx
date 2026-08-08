import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { storeApplicationStatus } from "@/lib/application-status-storage";
import {
  resolveBuyerSession,
  type BuyerEligibilityState,
  type BuyerSessionSnapshot,
} from "@/lib/api/buyer";

interface BuyerSessionContextValue {
  snapshot: BuyerSessionSnapshot | null;
  loading: boolean;
  refresh: () => Promise<BuyerSessionSnapshot>;
  isApprovedBuyer: boolean;
  state: BuyerEligibilityState;
}

const BuyerSessionContext = createContext<BuyerSessionContextValue | null>(null);

export function BuyerSessionProvider({ children }: { children: React.ReactNode }) {
  const [snapshot, setSnapshot] = useState<BuyerSessionSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const next = await resolveBuyerSession();
    if (next.state === "approved_buyer") {
      await storeApplicationStatus("approved_buyer");
    }
    setSnapshot(next);
    setLoading(false);
    return next;
  }, []);

  useEffect(() => {
    refresh();
    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      refresh();
    });
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [refresh]);

  const value = useMemo(
    () => ({
      snapshot,
      loading,
      refresh,
      isApprovedBuyer: snapshot?.state === "approved_buyer",
      state: snapshot?.state ?? "unauthenticated",
    }),
    [snapshot, loading, refresh]
  );

  return <BuyerSessionContext.Provider value={value}>{children}</BuyerSessionContext.Provider>;
}

export function useBuyerSession(): BuyerSessionContextValue {
  const context = useContext(BuyerSessionContext);
  if (!context) {
    throw new Error("useBuyerSession must be used within BuyerSessionProvider");
  }
  return context;
}
