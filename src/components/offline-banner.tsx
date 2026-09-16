import { CloudOff, RefreshCw } from "lucide-react";
import { useOnline } from "@/lib/offline";
import { usePendingSyncCount } from "@/lib/sync-queue";

/** Quiet strip that appears when the connection drops or edits are still queued. */
export function OfflineBanner() {
  const online = useOnline();
  const pending = usePendingSyncCount();

  if (online && pending === 0) return null;

  return (
    <div className="sticky top-0 z-50 flex items-center justify-center gap-2 bg-muted px-4 py-1.5 text-xs text-muted-foreground">
      {online ? <RefreshCw className="size-3.5 animate-spin" /> : <CloudOff className="size-3.5" />}
      {online
        ? `Syncing ${pending} saved ${pending === 1 ? "change" : "changes"}…`
        : pending > 0
          ? `Offline — ${pending} ${pending === 1 ? "change" : "changes"} saved here and will sync automatically.`
          : "Offline — your edits are saved here and will sync when you're back."}
    </div>
  );
}
