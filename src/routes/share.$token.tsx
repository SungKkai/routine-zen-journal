import { createFileRoute, Link } from "@tanstack/react-router";
import { getSharedGoal } from "@/lib/share.functions";

export const Route = createFileRoute("/share/$token")({
  loader: ({ params }) => getSharedGoal({ data: { token: params.token } }),
  head: () => ({
    meta: [
      { title: "Shared goal — Kronos" },
      { name: "description", content: "A read-only view of a goal and its tasks, shared from Kronos." },
      { property: "og:title", content: "Shared goal — Kronos" },
      {
        property: "og:description",
        content: "A read-only view of a goal and its tasks, shared from Kronos.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  errorComponent: () => (
    <Shell>
      <p className="text-sm text-muted-foreground">This link could not be opened.</p>
    </Shell>
  ),
  notFoundComponent: () => (
    <Shell>
      <p className="text-sm text-muted-foreground">This link is no longer active.</p>
    </Shell>
  ),
  component: SharedGoalPage,
});

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto min-h-screen w-full max-w-2xl px-5 py-16">
      <Link to="/" className="label-mono text-accent">
        Kronos
      </Link>
      <div className="mt-8">{children}</div>
    </main>
  );
}

function SharedGoalPage() {
  const goal = Route.useLoaderData();

  if (!goal) {
    return (
      <Shell>
        <h1 className="text-2xl font-semibold tracking-tight">Link not found</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          This share link has been revoked or never existed.
        </p>
      </Shell>
    );
  }

  const done = goal.tasks.filter((t) => t.status === "done").length;
  const pct = goal.tasks.length ? Math.round((done / goal.tasks.length) * 100) : 0;

  return (
    <Shell>
      <p className="label-mono" style={{ color: goal.color }}>
        Shared goal{goal.owner ? ` · ${goal.owner}` : ""}
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tighter">{goal.name}</h1>
      {goal.description && (
        <p className="mt-3 text-sm leading-relaxed break-words text-muted-foreground">
          {goal.description}
        </p>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
        <span className="label-mono">{goal.status}</span>
        {goal.target_date && <span className="label-mono">Target {goal.target_date}</span>}
        <span className="label-mono">
          {done}/{goal.tasks.length} done
        </span>
      </div>

      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: goal.color }} />
      </div>

      <ul className="mt-8 divide-y divide-border border-t border-border">
        {goal.tasks.length === 0 && (
          <li className="py-6 text-sm text-muted-foreground">No tasks linked to this goal yet.</li>
        )}
        {goal.tasks.map((task) => (
          <li key={task.id} className="flex items-baseline gap-3 py-3">
            <span
              className={`flex-1 text-sm ${task.status === "done" ? "text-muted-foreground line-through" : ""}`}
            >
              {task.title}
            </span>
            {task.due_date && <span className="label-mono text-muted-foreground">{task.due_date}</span>}
          </li>
        ))}
      </ul>

      <p className="mt-10 text-xs text-muted-foreground">
        Read-only. Nothing here can be edited from this page.
      </p>
    </Shell>
  );
}
