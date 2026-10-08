import { createFileRoute } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { Check, Copy, Lock, Share2, Sparkles, Trophy } from 'lucide-react';
import { toast } from 'sonner';
import { useLoginDays, useProfile, useTasks, useTimerSessions, useUpdateProfile } from '@/lib/data';
import { streakFor, useHabitLogs, useHabits } from '@/lib/wellbeing';
import { AVATARS, BACKGROUNDS, avatarFor, type RewardStats } from '@/lib/rewards';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

export const Route = createFileRoute('/_authenticated/rewards')({
  head: () => ({ meta: [
    { title: 'Rewards — Kronos' }, { name: 'description', content: 'Earn achievements and customize your Kronos profile.' },
    { property: 'og:title', content: 'Rewards — Kronos' }, { property: 'og:description', content: 'Earn achievements and customize your Kronos profile.' },
    { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' }, { name: 'robots', content: 'noindex' },
  ] }), component: RewardsPage,
});
const ACHIEVEMENTS = [
  { name: 'First steps', detail: 'Complete 1 task', field: 'tasks', goal: 1 },
  { name: 'Momentum', detail: 'Complete 10 tasks', field: 'tasks', goal: 10 },
  { name: 'Quest master', detail: 'Complete 50 tasks', field: 'tasks', goal: 50 },
  { name: 'Deep work', detail: 'Focus for 5 hours', field: 'focusHours', goal: 5 },
  { name: 'Timekeeper', detail: 'Focus for 25 hours', field: 'focusHours', goal: 25 },
  { name: 'On a roll', detail: 'Reach a 7-day habit streak', field: 'streak', goal: 7 },
  { name: 'Regular', detail: 'Visit on 30 different days', field: 'loginDays', goal: 30 },
  { name: 'Party builder', detail: 'Share Kronos with a friend', field: 'referrals', goal: 1 },
] as const;
function RewardsPage() {
  const { data: profile } = useProfile();
  const { data: tasks = [] } = useTasks();
  const { data: sessions = [] } = useTimerSessions();
  const { data: habits = [] } = useHabits();
  const { data: logs = [] } = useHabitLogs();
  const { data: loginDays = [] } = useLoginDays();
  const update = useUpdateProfile();
  const [referrals, setReferrals] = useState(() => typeof window === 'undefined' ? 0 : Number(localStorage.getItem('kronos.referrals') ?? 0));
  const stats: RewardStats = useMemo(() => ({
    tasks: tasks.filter((t) => t.status === 'done').length,
    focusHours: Math.round(sessions.reduce((sum, s) => sum + s.duration_seconds, 0) / 360) / 10,
    streak: Math.max(0, ...habits.map((h) => streakFor(logs, h.id))),
    loginDays: loginDays.length,
    referrals,
  }), [tasks, sessions, habits, logs, loginDays, referrals]);
  const unlocked = ACHIEVEMENTS.filter((a) => stats[a.field] >= a.goal).length;
  async function select(patch: { avatar_key?: string; background_key?: string }) {
    try { await update.mutateAsync(patch); toast.success('Profile equipped.'); } catch (e) { toast.error(e instanceof Error ? e.message : 'Could not equip that.'); }
  }
  async function refer() {
    const url = window.location.origin;
    try {
      if (navigator.share) await navigator.share({ title: 'Kronos', text: 'Plan your days and build better routines with Kronos.', url });
      else { await navigator.clipboard.writeText(url); toast.success('Invite link copied.'); }
      const next = referrals + 1; localStorage.setItem('kronos.referrals', String(next)); setReferrals(next);
    } catch { /* sharing cancelled */ }
  }
  return <div className="enter space-y-10">
    <header className="grid gap-6 border-b border-border pb-8 md:grid-cols-[1fr_auto] md:items-end"><div><p className="label-mono text-accent">Guild hall</p><h1 className="mt-2 text-3xl font-semibold">Achievements & rewards</h1><p className="mt-2 max-w-xl text-sm text-muted-foreground">Your completed work unlocks avatars and backgrounds. Rewards never affect your productivity data.</p></div><div className="flex items-center gap-3"><div className="grid size-16 place-items-center rounded-md border border-border bg-card text-4xl" aria-label={avatarFor(profile?.avatar_key).name}>{avatarFor(profile?.avatar_key).glyph}</div><div><strong>{profile?.display_name ?? 'Wanderer'}</strong><p className="text-xs text-muted-foreground">{unlocked}/{ACHIEVEMENTS.length} badges</p></div></div></header>
    <section><div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-semibold">Achievements</h2><Button variant="outline" size="sm" onClick={() => void refer()}><Share2 className="mr-2 size-4" />Refer a friend</Button></div><div className="grid gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">{ACHIEVEMENTS.map((a) => { const value = stats[a.field]; const done = value >= a.goal; return <article key={a.name} className="bg-card p-4"><div className="flex items-start justify-between"><Trophy className={`size-5 ${done ? 'text-accent' : 'text-muted-foreground'}`} />{done ? <Check className="size-4 text-success" /> : <Lock className="size-4 text-muted-foreground" />}</div><h3 className="mt-4 text-sm font-semibold">{a.name}</h3><p className="mt-1 min-h-8 text-xs text-muted-foreground">{a.detail}</p><Progress value={Math.min(100, (value / a.goal) * 100)} className="mt-3 h-1.5" /><p className="mt-2 font-mono text-[10px] text-muted-foreground">{Math.min(value, a.goal)}/{a.goal}</p></article>; })}</div></section>
    <section><h2 className="text-lg font-semibold">Avatar roster</h2><p className="mt-1 text-sm text-muted-foreground">Equip a companion you have earned.</p><div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">{AVATARS.map((avatar) => { const canUse = avatar.unlock(stats); const active = profile?.avatar_key === avatar.key; return <Button key={avatar.key} variant={active ? 'secondary' : 'outline'} disabled={!canUse || update.isPending} onClick={() => void select({ avatar_key: avatar.key })} className="h-auto min-h-32 flex-col gap-2 p-3"><span className="text-4xl">{canUse ? avatar.glyph : '🔒'}</span><span>{avatar.name}</span><span className="whitespace-normal text-center text-[10px] font-normal text-muted-foreground">{active ? 'Equipped' : avatar.requirement}</span></Button>; })}</div></section>
    <section><h2 className="text-lg font-semibold">World backdrop</h2><p className="mt-1 text-sm text-muted-foreground">Change the atmosphere across your signed-in pages.</p><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{BACKGROUNDS.map((bg) => { const canUse = bg.unlock(stats); const active = profile?.background_key === bg.key; return <Button key={bg.key} variant={active ? 'secondary' : 'outline'} disabled={!canUse || update.isPending} onClick={() => void select({ background_key: bg.key })} className="h-28 flex-col items-start justify-end overflow-hidden p-3 text-left"><span className={`absolute inset-0 opacity-40 theme-preview-${bg.key}`} /><span className="relative flex items-center gap-2"><Sparkles className="size-4" />{bg.name}</span><span className="relative text-[10px] font-normal text-muted-foreground">{active ? 'Equipped' : bg.requirement}</span></Button>; })}</div></section>
  </div>;
}
