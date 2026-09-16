import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { flushSyncQueue, readQueue } from "@/lib/sync-queue";

/** Replays edits made offline as soon as the connection returns. */
export function SyncProvider() {
  const queryClient = useQueryClient();
  const busy = useRef(false);

  useEffect(() => {
    async function flush() {
      if (busy.current || readQueue().length === 0) return;
      busy.current = true;
      try {
        const { synced, failed } = await flushSyncQueue(queryClient);
        if (synced > 0) {
          toast.success(
            `Synced ${synced} offline ${synced === 1 ? "change" : "changes"}.`,
          );
        }
        if (failed > 0) toast.error("Some offline changes couldn't sync yet. We'll retry.");
      } finally {
        busy.current = false;
      }
    }

    void flush();
    window.addEventListener("online", flush);
    const id = window.setInterval(flush, 30_000);
    return () => {
      window.removeEventListener("online", flush);
      window.clearInterval(id);
    };
  }, [queryClient]);

  return null;
}
