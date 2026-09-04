import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const TABLES = [
  "profiles",
  "categories",
  "goals",
  "tasks",
  "routine_entries",
  "timer_sessions",
  "habits",
  "habit_logs",
  "journal_entries",
  "journal_messages",
  "reflections",
] as const;

type TableName = (typeof TABLES)[number];

function download(filename: string, contents: string, type: string) {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function toCsv(rows: Record<string, unknown>[]) {
  if (rows.length === 0) return "";
  const keys = Object.keys(rows[0]!);
  const escape = (value: unknown) => {
    const text = value === null || value === undefined ? "" : String(value);
    return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  };
  return [keys.join(","), ...rows.map((row) => keys.map((k) => escape(row[k])).join(","))].join(
    "\n",
  );
}

async function fetchAll() {
  const result: Record<string, Record<string, unknown>[]> = {};
  for (const table of TABLES) {
    const { data, error } = await supabase.from(table as TableName).select("*");
    if (error) throw new Error(`${table}: ${error.message}`);
    result[table] = (data ?? []) as Record<string, unknown>[];
  }
  return result;
}

export function DataExport() {
  const [busy, setBusy] = useState<"json" | "csv" | null>(null);
  const stamp = new Date().toISOString().slice(0, 10);

  async function exportJson() {
    setBusy("json");
    try {
      const data = await fetchAll();
      download(
        `kronos-backup-${stamp}.json`,
        JSON.stringify({ exported_at: new Date().toISOString(), data }, null, 2),
        "application/json",
      );
      toast.success("Backup downloaded.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Export failed.");
    } finally {
      setBusy(null);
    }
  }

  async function exportCsv() {
    setBusy("csv");
    try {
      const data = await fetchAll();
      const parts = Object.entries(data)
        .filter(([, rows]) => rows.length > 0)
        .map(([table, rows]) => `# ${table}\n${toCsv(rows)}`);
      download(`kronos-export-${stamp}.csv`, parts.join("\n\n"), "text/csv");
      toast.success("CSV downloaded.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Export failed.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="space-y-4 border-t border-border pt-8">
      <h2 className="label-mono text-muted-foreground">Data &amp; backup</h2>
      <p className="text-sm text-muted-foreground">
        Download everything you've written — tasks, routines, goals, habits, journal and focus
        sessions.
      </p>
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => void exportJson()} disabled={busy !== null}>
          {busy === "json" ? "Preparing…" : "Export JSON"}
        </Button>
        <Button variant="outline" onClick={() => void exportCsv()} disabled={busy !== null}>
          {busy === "csv" ? "Preparing…" : "Export CSV"}
        </Button>
      </div>
    </section>
  );
}
