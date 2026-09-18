import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { supabase } from "@/lib/supabase";
import {
  resolveBuyerSession,
  type BuyerEligibilityState,
  type BuyerSessionSnapshot,
} from "@/lib/api/buyer";
import { shouldRefreshOnAppState, shouldRefreshOnAuthEvent } from "@/lib/buyer-session-refresh-triggers";

interface BuyerSessionContextValue {
  snapshot: BuyerSessionSnapshot | null;
  loading: boolean;
  refresh: (options?: { force?: boolean }) => Promise<BuyerSessionSnapshot>;
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
  const requestIdRef = useRef(0);
  const inFlightRefreshRef = useRef<Promise<BuyerSessionSnapshot> | null>(null);

  // Coalesces concurrent triggers (an auth event and an AppState foreground
  // transition can fire within the same tick -- e.g. the app is resumed
  // right as a background token refresh completes) into a single shared
  // request rather than firing one resolveBuyerSession() call per trigger.
  // The requestId staleness guard below still protects correctness even
  // without this (a stale response is simply discarded), but this avoids
  // redundant parallel RPC round-trips -- a real "refresh storm" risk once
  // a second trigger source (AppState) was added alongside the existing
  // auth-event listener.
  const refresh = useCallback(async (options?: { force?: boolean }) => {
    if (inFlightRefreshRef.current && !options?.force) {
      return inFlightRefreshRef.current;
    }
    const requestId = ++requestIdRef.current;
    setLoading(true);
    const promise = (async () => {
      try {
        const next = await resolveBuyerSession();
        if (requestId === requestIdRef.current) {
          if (next.userId) {
            lastUserIdRef.current = next.userId;
          }
          setSnapshot(next);
        }
        return next;
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
          inFlightRefreshRef.current = null;
        }
      }
    })();
    inFlightRefreshRef.current = promise;
    return promise;
  }, []);

  useEffect(() => {
    refresh();
    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (!shouldRefreshOnAuthEvent(event)) {
        return;
      }
      if (event === "SIGNED_OUT") {
        lastUserIdRef.current = null;
        // Fail closed immediately while the forced post-transition refresh
        // reconciles authoritative session state. The request-id bump inside
        // refresh({ force: true }) prevents any older in-flight request from
        // restoring the previous buyer snapshot after sign-out.
        setSnapshot({
          state: "unauthenticated",
          companyId: null,
          company: null,
          message: null,
          userId: null,
        });
      }
      // Keep Supabase's auth notification callback synchronous/non-blocking.
      // Auth transitions must bypass AppState/request coalescing because an
      // older refresh may have captured the previous identity.
      void refresh({ force: true });
    });

    // Business-data changes (staff freezing a company, de-approving a
    // buyer) never fire onAuthStateChange -- the JWT itself stays valid,
    // access-token refresh happens silently, and shouldRefreshOnAuthEvent
    // deliberately skips TOKEN_REFRESHED. Without this, a buyer whose
    // access is revoked mid-session would keep seeing stale
    // "approved_buyer" UI (Dashboard, pricing, Account) indefinitely --
    // server-side RPC authority still correctly rejects any actual
    // mutation attempt (see customer_buyer_eligible_company_id()
    // re-evaluating live on every call), so nothing illegitimate can
    // actually succeed, but the buyer would hit confusing per-action
    // errors instead of a clean "your access has changed" state.
    // Re-checking on foreground return is the standard, low-risk way to
    // catch this -- it also covers "app reopened after a long inactive
    // period" and "background/foreground" directly. resolveBuyerSession()
    // itself fails closed (backend_failure / no_membership) when offline,
    // so a foreground-while-offline trigger degrades safely rather than
    // hanging or silently keeping stale approved state.
    const appStateListener = AppState.addEventListener("change", (nextState: AppStateStatus) => {
      if (shouldRefreshOnAppState(nextState)) {
        void refresh();
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
      appStateListener.remove();
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
