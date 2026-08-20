import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Kronos — Your calm daily command center" },
      {
        name: "description",
        content:
          "Plan your day in one place: tasks, routine time blocks, a combined calendar and a focus timer that saves every session.",
      },
      { property: "og:title", content: "Kronos — Your calm daily command center" },
      {
        property: "og:description",
        content: "Tasks, routines, calendar and a focus timer, without the project-management clutter.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  const navigate = useNavigate();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      if (data.session) navigate({ to: "/today", replace: true });
      else setChecked(true);
    });
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  if (!checked) {
    return <div className="min-h-screen bg-background" aria-hidden />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="flex items-center justify-between border-b border-border px-6 py-4">
        <span className="text-lg font-semibold uppercase tracking-tight">Kronos</span>
        <Link
          to="/auth"
          className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
        >
          Sign in
        </Link>
      </nav>

      <main className="mx-auto max-w-3xl px-6 py-24 enter">
        <div className="flex items-center gap-3 label-mono text-accent">
          <span>(01)</span>
          <span className="h-px w-8 bg-accent/30" />
          <span>Personal planning</span>
        </div>
        <h1 className="mt-4 text-balance text-4xl font-semibold tracking-tighter md:text-6xl">
          Know what your day asks of you.
        </h1>
        <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground">
          Kronos keeps tasks, routine time blocks, your calendar and a focus timer in one quiet place — so
          you can open it and immediately see what to do next.
        </p>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            to="/auth"
            className="rounded-lg bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90"
          >
            Create your account
          </Link>
        </div>

        <dl className="mt-20 grid gap-8 border-t border-border pt-10 sm:grid-cols-3">
          <div>
            <dt className="label-mono text-muted-foreground">Tasks</dt>
            <dd className="mt-2 text-sm text-muted-foreground">
              Priority, status, category and due dates — filtered down to what matters today.
            </dd>
          </div>
          <div>
            <dt className="label-mono text-muted-foreground">Routine</dt>
            <dd className="mt-2 text-sm text-muted-foreground">
              Time blocks for study, exercise, work or rest, shown alongside your tasks.
            </dd>
          </div>
          <div>
            <dt className="label-mono text-muted-foreground">Timer</dt>
            <dd className="mt-2 text-sm text-muted-foreground">
              Start focusing in one tap. Every session is saved against the task.
            </dd>
          </div>
        </dl>
      </main>
    </div>
  );
}
