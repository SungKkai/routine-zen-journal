import { useEffect, useState } from "react";
import type { QueryClient } from "@tanstack/react-query";

/** Registers the offline service worker. Safe to call from an effect only. */
export function registerServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  if (window.location.hostname === "localhost") return;
  void navigator.serviceWorker.register("/sw.js").catch(() => {
    /* offline support is best-effort */
  });
}

/** Keeps the last day of loaded data in local storage so the app opens offline. */
export async function persistCache(queryClient: QueryClient) {
  if (typeof window === "undefined") return;
  try {
    const [{ persistQueryClient }, { createSyncStoragePersister }] = await Promise.all([
      import("@tanstack/react-query-persist-client"),
      import("@tanstack/query-sync-storage-persister"),
    ]);
    persistQueryClient({
      queryClient,
      persister: createSyncStoragePersister({
        storage: window.localStorage,
        key: "kronos-cache",
      }),
      maxAge: 1000 * 60 * 60 * 24,
      buster: "v1",
    });
  } catch {
    /* storage unavailable — run without the offline cache */
  }
}

/** True when the browser reports a connection. Always true during SSR. */
export function useOnline() {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  return online;
}
