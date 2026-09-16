import { useEffect, useState } from "react";
import type { QueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type SyncTable = "tasks" | "routine_entries";
export type SyncOp = "insert" | "update" | "delete";

export type QueuedMutation = {
  /** Queue entry id. */
  id: string;
  table: SyncTable;
  op: SyncOp;
  /** Row id the op targets (may be a local- id for rows created offline). */
  rowId: string;
  payload: Record<string, unknown>;
  queuedAt: string;
};

const KEY = "kronos.sync-queue";
const EVENT = "kronos:sync-queue";

export function isOffline() {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

export function localId() {
  return `local-${crypto.randomUUID()}`;
}

export function isLocalId(id: string) {
  return id.startsWith("local-");
}

export function readQueue(): QueuedMutation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as QueuedMutation[]) : [];
  } catch {
    return [];
  }
}

function writeQueue(queue: QueuedMutation[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(queue));
  } catch {
    /* storage unavailable */
  }
  window.dispatchEvent(new CustomEvent(EVENT));
}

/**
 * Records an edit made while offline. Edits to rows that were themselves
 * created offline are folded into the pending insert so replay stays valid.
 */
export function queueMutation(input: {
  table: SyncTable;
  op: SyncOp;
  rowId: string;
  payload?: Record<string, unknown>;
}) {
  const queue = readQueue();
  const payload = input.payload ?? {};
  const pendingInsert = queue.find(
    (q) => q.op === "insert" && q.table === input.table && q.rowId === input.rowId,
  );

  if (pendingInsert && input.op === "update") {
    pendingInsert.payload = { ...pendingInsert.payload, ...payload };
    writeQueue(queue);
    return;
  }
  if (pendingInsert && input.op === "delete") {
    writeQueue(
      queue.filter((q) => !(q.table === input.table && q.rowId === input.rowId)),
    );
    return;
  }
  if (input.op === "delete") {
    // Drop superseded updates for a row that is going away.
    const kept = queue.filter(
      (q) => !(q.op === "update" && q.table === input.table && q.rowId === input.rowId),
    );
    kept.push({
      id: crypto.randomUUID(),
      table: input.table,
      op: "delete",
      rowId: input.rowId,
      payload,
      queuedAt: new Date().toISOString(),
    });
    writeQueue(kept);
    return;
  }

  queue.push({
    id: crypto.randomUUID(),
    table: input.table,
    op: input.op,
    rowId: input.rowId,
    payload,
    queuedAt: new Date().toISOString(),
  });
  writeQueue(queue);
}

let flushing = false;

/** Replays queued edits in order. Stops on the first failure and keeps the rest. */
export async function flushSyncQueue(queryClient: QueryClient) {
  if (flushing || isOffline()) return { synced: 0, failed: 0 };
  const queue = readQueue();
  if (queue.length === 0) return { synced: 0, failed: 0 };

  flushing = true;
  let synced = 0;
  let failed = 0;
  /** Maps offline local ids to the ids the database assigned. */
  const idMap = new Map<string, string>();
  const remaining: QueuedMutation[] = [];

  try {
    for (const item of queue) {
      if (failed > 0 || isOffline()) {
        remaining.push(item);
        continue;
      }
      const rowId = idMap.get(item.rowId) ?? item.rowId;
      try {
        if (item.op === "insert") {
          const { id: _ignored, ...values } = item.payload as { id?: string };
          const { data, error } = await supabase
            .from(item.table)
            .insert(values as never)
            .select("id")
            .single();
          if (error) throw new Error(error.message);
          if (data?.id) idMap.set(item.rowId, data.id);
        } else if (item.op === "update") {
          if (isLocalId(rowId)) continue;
          const { error } = await supabase
            .from(item.table)
            .update(item.payload as never)
            .eq("id", rowId);
          if (error) throw new Error(error.message);
        } else {
          if (isLocalId(rowId)) continue;
          const { error } = await supabase.from(item.table).delete().eq("id", rowId);
          if (error) throw new Error(error.message);
        }
        synced += 1;
      } catch {
        failed += 1;
        remaining.push(item);
      }
    }
  } finally {
    flushing = false;
    writeQueue(remaining);
    if (synced > 0) {
      await queryClient.invalidateQueries({ queryKey: ["tasks"] });
      await queryClient.invalidateQueries({ queryKey: ["routine_entries"] });
    }
  }

  return { synced, failed };
}

/** Live count of edits still waiting to reach the server. */
export function usePendingSyncCount() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const update = () => setCount(readQueue().length);
    update();
    window.addEventListener(EVENT, update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener(EVENT, update);
      window.removeEventListener("storage", update);
    };
  }, []);
  return count;
}
