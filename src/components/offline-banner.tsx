import { CloudOff } from "lucide-react";
import { useOnline } from "@/lib/offline";

/** Quiet strip that appears when the connection drops. */
export function OfflineBanner() {
  const online = useOnline();
  if (online) return null;

  return (
    <div className="sticky top-0 z-50 flex items-center justify-center gap-2 bg-muted px-4 py-1.5 text-xs text-muted-foreground">
      <CloudOff className="size-3.5" />
      Offline — showing your last saved data. Changes will need a connection.
    </div>
  );
}
