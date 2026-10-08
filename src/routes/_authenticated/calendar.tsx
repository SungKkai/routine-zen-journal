import { createFileRoute } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useCategories, useRoutineEntries, useTasks, type Category, type Task, type RoutineEntry } from '@/lib/data';
import { addDays, formatTime, startOfWeek, toDateKey } from '@/lib/format';
import { RoutineDialog } from '@/components/routine-dialog';
import { TaskDialog } from '@/components/task-dialog';
import { CategoryDialog } from '@/components/category-dialog';
import { GoogleCalendarControl } from '@/components/google-calendar-control';
import { Button } from '@/components/ui/button';

export const Route = createFileRoute('/_authenticated/calendar')({
  head: () => ({ meta: [
    { title: 'Calendar — Kronos' }, { name: 'description', content: 'Plan your tasks and routines in a month or week calendar.' },
    { property: 'og:title', content: 'Calendar — Kronos' }, { property: 'og:description', content: 'Plan your tasks and routines in a month or week calendar.' },
    { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' }, { name: 'robots', content: 'noindex' },
  ] }), component: CalendarPage,
});
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HOURS = Array.from({ length: 16 }, (_, i) => i + 7);
type Item = { id: string; title: string; time: string | null; type: 'task' | 'routine'; task?: Task; routine?: RoutineEntry; color: string };
function CalendarPage() {
  const [view, setView] = useState<'month' | 'week'>('month');
  const [anchor, setAnchor] = useState(() => new Date());
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editingRoutine, setEditingRoutine] = useState<RoutineEntry | null>(null);
  const [routineFor, setRoutineFor] = useState<string | null>(null);
  const [newCategory, setNewCategory] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const { data: tasks = [] } = useTasks();
  const { data: routines = [] } = useRoutineEntries();
  const { data: categories = [] } = useCategories();
  const colors = useMemo(() => new Map(categories.map((c) => [c.id, c.color])), [categories]);
  const start = startOfWeek(view === 'week' ? anchor : new Date(anchor.getFullYear(), anchor.getMonth(), 1));
  const days = Array.from({ length: view === 'week' ? 7 : 42 }, (_, i) => addDays(start, i));
  const today = toDateKey(new Date());
  const items = (key: string) => [
    ...tasks.filter((t) => t.due_date === key).map((t): Item => ({ id: t.id, title: t.title, time: t.due_time, type: 'task', task: t, color: colors.get(t.category_id ?? '') ?? (t.priority === 'high' ? 'var(--color-destructive)' : t.priority === 'medium' ? 'var(--color-accent)' : 'var(--color-success)') })),
    ...routines.filter((r) => r.entry_date === key).map((r): Item => ({ id: r.id, title: r.title, time: r.entry_time, type: 'routine', routine: r, color: 'var(--color-success)' })),
  ].sort((a, b) => (a.time ?? '').localeCompare(b.time ?? ''));
  const openItem = (item: Item) => { if (item.task) setEditingTask(item.task); if (item.routine) setEditingRoutine(item.routine); };
  const changePeriod = (step: number) => setAnchor((d) => view === 'week' ? addDays(d, step * 7) : new Date(d.getFullYear(), d.getMonth() + step, 1));
  const heading = view === 'month' ? anchor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) : `${start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${addDays(start, 6).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
  const itemButton = (item: Item) => <Button key={`${item.type}-${item.id}`} variant="ghost" size="sm" title={`${item.title}${item.time ? ` · ${formatTime(item.time)}` : ''}`} onClick={() => openItem(item)} className={`flex h-7 w-full min-w-0 justify-start gap-1.5 px-1.5 text-left text-xs font-normal hover:bg-muted ${item.task?.status === 'done' ? 'opacity-50 line-through' : ''}`}>
    <span className="size-2 shrink-0 rounded-sm" style={{ backgroundColor: item.color }} /><span className="truncate">{item.time ? `${formatTime(item.time)} ` : ''}{item.title}</span>
  </Button>;
  return <div className="enter space-y-5">
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div><p className="label-mono text-accent">Calendar</p><h1 className="mt-1 text-3xl font-semibold">{heading}</h1></div>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={() => setAnchor(new Date())}>Today</Button>
        <Button size="icon" variant="ghost" aria-label="Previous period" onClick={() => changePeriod(-1)}><ChevronLeft className="size-4" /></Button>
        <Button size="icon" variant="ghost" aria-label="Next period" onClick={() => changePeriod(1)}><ChevronRight className="size-4" /></Button>
        <div className="flex rounded-md border border-border p-0.5">{(['month', 'week'] as const).map((v) => <Button key={v} size="sm" variant={view === v ? 'secondary' : 'ghost'} onClick={() => setView(v)} className="h-7 capitalize">{v}</Button>)}</div>
      </div>
    </header>
    <div className="flex flex-wrap items-center justify-between gap-3 border-y border-border py-3">
      <div className="flex flex-wrap items-center gap-2"><span className="label-mono text-muted-foreground">Categories</span>{categories.map((c) => <Button key={c.id} variant="outline" size="sm" onClick={() => setEditingCategory(c)} className="h-7 gap-1.5 rounded-md px-2 text-xs"><span className="size-2 rounded-full" style={{ backgroundColor: c.color }} />{c.name}</Button>)}<Button size="icon" variant="outline" className="size-7" aria-label="Add category" onClick={() => setNewCategory(true)}><Plus className="size-3.5" /></Button></div>
      <GoogleCalendarControl />
    </div>
    <div className="overflow-x-auto border border-border bg-card">
      {view === 'month' ? <div className="min-w-[700px]"><div className="grid grid-cols-7 border-b border-border bg-muted/50">{WEEKDAYS.map((d) => <div key={d} className="px-2 py-2 text-center text-xs font-medium text-muted-foreground">{d}</div>)}</div><div className="grid grid-cols-7">{days.map((day, index) => { const key = toDateKey(day); const list = items(key); return <div key={key} className={`group min-h-32 min-w-0 border-b border-r border-border p-1.5 ${day.getMonth() !== anchor.getMonth() ? 'bg-muted/30' : ''}`}>
        <div className="flex items-center justify-between"><span className={`grid size-6 place-items-center rounded-full text-xs ${key === today ? 'bg-accent text-accent-foreground' : 'text-muted-foreground'}`}>{day.getDate()}</span><Button variant="ghost" size="icon" className="size-6 opacity-0 group-hover:opacity-100 focus:opacity-100" aria-label={`Add routine on ${key}`} onClick={() => setRoutineFor(key)}><Plus className="size-3" /></Button></div><div className="space-y-0.5">{list.slice(0, 3).map(itemButton)}{list.length > 3 && <span className="block px-1.5 text-xs text-muted-foreground">+{list.length - 3} more</span>}</div>
      </div>; })}</div></div> : <div className="min-w-[800px]"><div className="grid grid-cols-[64px_repeat(7,minmax(0,1fr))] border-b border-border"><div />{days.map((d) => <div key={toDateKey(d)} className="border-l border-border p-2 text-center text-xs"><span className="text-muted-foreground">{WEEKDAYS[(d.getDay() + 6) % 7]}</span><span className={`mx-auto mt-1 grid size-7 place-items-center rounded-full ${toDateKey(d) === today ? 'bg-accent text-accent-foreground' : ''}`}>{d.getDate()}</span></div>)}</div>
        <div className="grid grid-cols-[64px_repeat(7,minmax(0,1fr))]"><div className="px-2 py-2 text-xs text-muted-foreground">All day</div>{days.map((d) => <div key={toDateKey(d)} className="min-h-12 border-l border-border p-1">{items(toDateKey(d)).filter((i) => !i.time).map(itemButton)}</div>)}</div>
        <div className="relative grid grid-cols-[64px_repeat(7,minmax(0,1fr))] border-t border-border"><div>{HOURS.map((h) => <div key={h} className="h-16 border-b border-border pr-2 pt-1 text-right text-[11px] text-muted-foreground">{h % 12 || 12} {h < 12 ? 'AM' : 'PM'}</div>)}</div>{days.map((d) => <div key={toDateKey(d)} className="relative border-l border-border">{HOURS.map((h) => <div key={h} className="h-16 border-b border-border/60" />)}{items(toDateKey(d)).filter((i) => i.time).map((item) => { const parts = (item.time ?? '00:00').split(':').map(Number); const hour = parts[0] ?? 0; const minute = parts[1] ?? 0; const top = ((hour - 7) + minute / 60) * 64; return hour >= 7 && hour < 23 ? <div key={`${item.type}-${item.id}`} className="absolute inset-x-1 z-10 overflow-hidden rounded-sm border-l-2 bg-muted shadow-sm" style={{ top, height: 36, borderColor: item.color }}>{itemButton(item)}</div> : null; })}<Button variant="ghost" size="icon" className="absolute bottom-1 right-1 size-6" aria-label={`Add routine on ${toDateKey(d)}`} onClick={() => setRoutineFor(toDateKey(d))}><Plus className="size-3" /></Button></div>)}</div>
      </div>}
    </div>
    <RoutineDialog open={routineFor !== null} onOpenChange={(open) => !open && setRoutineFor(null)} defaultDate={routineFor} />
    <RoutineDialog open={editingRoutine !== null} onOpenChange={(open) => !open && setEditingRoutine(null)} entry={editingRoutine} />
    <TaskDialog open={editingTask !== null} onOpenChange={(open) => !open && setEditingTask(null)} task={editingTask} />
    <CategoryDialog open={newCategory} onOpenChange={setNewCategory} />
    <CategoryDialog open={editingCategory !== null} onOpenChange={(open) => !open && setEditingCategory(null)} category={editingCategory} />
  </div>;
}
