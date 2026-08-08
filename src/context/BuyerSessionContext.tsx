import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { clearStoredApplicationStatus, storeApplicationStatus } from "@/lib/application-status-storage";
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
  isAuthenticated: boolean;
  state: BuyerEligibilityState;
  userId: string | null;
}

const BuyerSessionContext = createContext<BuyerSessionContextValue | null>(null);

export function BuyerSessionProvider({ children }: { children: React.ReactNode }) {
  const [snapshot, setSnapshot] = useState<BuyerSessionSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const lastUserIdRef = useRef<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const next = await resolveBuyerSession();
      if (next.userId) {
        lastUserIdRef.current = next.userId;
      }
      setSnapshot(next);

      if (next.state === "approved_buyer" && next.userId) {
        await storeApplicationStatus(next.userId, "approved_buyer");
      }

      return next;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === "SIGNED_OUT" && lastUserIdRef.current) {
        await clearStoredApplicationStatus(lastUserIdRef.current);
        lastUserIdRef.current = null;
      }
      await refresh();
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
      isAuthenticated: snapshot?.state !== "unauthenticated" && snapshot?.userId != null,
      state: snapshot?.state ?? "unauthenticated",
      userId: snapshot?.userId ?? null,
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
