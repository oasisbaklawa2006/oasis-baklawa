import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import NetInfo, { type NetInfoState } from "@react-native-community/netinfo";

export type NetworkStatus = "online" | "offline" | "unknown";

interface NetworkContextValue {
  status: NetworkStatus;
  isOnline: boolean;
  isOffline: boolean;
  refresh: () => Promise<void>;
}

const NetworkContext = createContext<NetworkContextValue | null>(null);

function resolveStatus(state: NetInfoState): NetworkStatus {
  if (state.isConnected === false) return "offline";
  if (state.isInternetReachable === false) return "offline";
  if (state.isConnected === true) {
    const reachable = state.isInternetReachable == null || state.isInternetReachable === true;
    if (reachable) return "online";
  }
  return "unknown";
}

export function NetworkProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<NetworkStatus>("unknown");

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setStatus(resolveStatus(state));
    });
    void NetInfo.fetch().then((state) => setStatus(resolveStatus(state)));
    return unsubscribe;
  }, []);

  const refresh = async () => {
    const state = await NetInfo.fetch();
    setStatus(resolveStatus(state));
  };

  const value = useMemo(
    () => ({
      status,
      isOnline: status === "online",
      isOffline: status === "offline",
      refresh,
    }),
    [status]
  );

  return <NetworkContext.Provider value={value}>{children}</NetworkContext.Provider>;
}

export function useNetwork(): NetworkContextValue {
  const context = useContext(NetworkContext);
  if (!context) {
    throw new Error("useNetwork must be used within NetworkProvider");
  }
  return context;
}

/** For tests and non-React callers */
export function isNetworkOnlineStatus(status: NetworkStatus): boolean {
  return status === "online";
}
