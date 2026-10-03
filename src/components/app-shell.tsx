import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import {
  CalendarDays,
  ChevronDown,
  ClipboardCheck,
  LineChart,
  ListChecks,
  NotebookPen,
  Repeat,
  Search,
  Sun,
  Target,
  Trophy,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/lib/data";
import { QuickAdd } from "@/components/quick-add";
import { CommandPalette } from "@/components/command-palette";
import { RemindersProvider } from "@/components/reminders-provider";
import { TimerBar } from "@/components/timer-bar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const NAV = [
  { to: "/today", label: "Today", icon: Sun },
  { to: "/tasks", label: "Tasks", icon: ListChecks },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/goals", label: "Goals", icon: Target },
  { to: "/habits", label: "Habits", icon: Repeat },
  { to: "/journal", label: "Journal", icon: NotebookPen },
  { to: "/insights", label: "Insights", icon: LineChart },
  { to: "/review", label: "Review", icon: ClipboardCheck },
  { to: "/rewards", label: "Rewards", icon: Trophy },
] as const;

const PRIMARY_PATHS = ["/today", "/tasks", "/calendar", "/goals", "/journal"];

const MOBILE_NAV = NAV.filter((item) => PRIMARY_PATHS.includes(item.to));
const PRIMARY_NAV = MOBILE_NAV;
const SECONDARY_NAV = NAV.filter((item) => !PRIMARY_PATHS.includes(item.to));

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const isToday = useRouterState({ select: (s) => s.location.pathname === "/today" });
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

  function openPalette() {
    window.dispatchEvent(
      new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true }),
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-border bg-background/80 px-4 py-3 backdrop-blur-md sm:px-6 sm:py-4">
        <div className="flex min-w-0 items-center gap-4 lg:gap-8">
          <Link to="/today" className="text-base font-semibold uppercase tracking-tight sm:text-lg">
            Kronos
          </Link>
          <div className="hidden items-center gap-5 text-sm font-medium text-muted-foreground lg:flex">
            {PRIMARY_NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="transition-colors hover:text-foreground"
                activeProps={{ className: "text-foreground" }}
              >
                {item.label}
              </Link>
            ))}
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-1 transition-colors hover:text-foreground">
                More
                <ChevronDown className="size-3.5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-44">
                {SECONDARY_NAV.map((item) => (
                  <DropdownMenuItem key={item.to} asChild>
                    <Link to={item.to}>{item.label}</Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openPalette}
            aria-label="Search"
            className="flex items-center gap-2 rounded-lg border border-border bg-card px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <Search className="size-4" />
            <span className="hidden sm:inline">Search</span>
            <kbd className="label-mono hidden rounded border border-border px-1 py-0.5 text-[10px] md:inline">
              ⌘K
            </kbd>
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger className="grid size-8 shrink-0 place-items-center rounded-full border border-border bg-muted font-mono text-[10px] text-muted-foreground transition-colors hover:text-foreground">
              {initials || "YOU"}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel className="truncate">
                {profile?.display_name ?? "Your account"}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="lg:hidden">
                {NAV.filter((item) => !MOBILE_NAV.some((m) => m.to === item.to)).map((item) => (
                  <DropdownMenuItem key={item.to} asChild>
                    <Link to={item.to}>{item.label}</Link>
                  </DropdownMenuItem>
                ))}
              </div>
              <DropdownMenuItem asChild>
                <Link to="/settings">Settings</Link>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void signOut()}>Sign out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </nav>

      <main className="mx-auto max-w-screen-xl px-4 pb-36 pt-8 sm:px-6 sm:pt-12 lg:pb-24">
        {children}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 flex items-stretch justify-around border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden">
        {MOBILE_NAV.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="flex flex-1 flex-col items-center gap-1 py-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground transition-colors"
            activeProps={{ className: "text-foreground" }}
          >
            <item.icon className="size-5" />
            {item.label}
          </Link>
        ))}
      </nav>

       {!isToday && <TimerBar />}
      <QuickAdd />
      <CommandPalette />
      <RemindersProvider />
    </div>
  );
}
