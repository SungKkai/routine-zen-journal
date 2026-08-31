import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/lib/data";
import { QuickAdd } from "@/components/quick-add";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const NAV = [
  { to: "/today", label: "Today" },
  { to: "/tasks", label: "Tasks" },
  { to: "/calendar", label: "Calendar" },
  { to: "/habits", label: "Habits" },
  { to: "/journal", label: "Journal" },
  { to: "/insights", label: "Insights" },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();

  const initials = (profile?.display_name ?? "You")
    .split(" ")
    .map((part) => part.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-background/80 px-4 py-3 backdrop-blur-md sm:px-6 sm:py-4">
        <div className="flex items-center gap-4 sm:gap-8">
          <Link to="/today" className="text-base font-semibold uppercase tracking-tight sm:text-lg">
            Kronos
          </Link>
          <div className="flex items-center gap-4 text-sm font-medium text-muted-foreground sm:gap-6">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="transition-colors hover:text-foreground"
                activeProps={{ className: "text-foreground" }}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger className="grid size-8 place-items-center rounded-full border border-border bg-muted font-mono text-[10px] text-muted-foreground transition-colors hover:text-foreground">
            {initials || "YOU"}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel className="truncate">{profile?.display_name ?? "Your account"}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/settings">Settings</Link>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => void signOut()}>Sign out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </nav>

      <main className="mx-auto max-w-screen-xl px-4 pb-28 pt-8 sm:px-6 sm:pb-24 sm:pt-12">{children}</main>

      <QuickAdd />
    </div>
  );
}
