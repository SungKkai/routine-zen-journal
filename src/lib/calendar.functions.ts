import { createServerFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { authorizeCalendar, calendarRequest, disconnectCalendar, exchangeCalendar } from '@/integrations/lovable/appUserConnector.server';
import { getCalendarKey, saveCalendarKey } from './calendar-connection.server';

export const calendarStatus = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => ({ connected: !!(await getCalendarKey(context.userId)) }));
export const startCalendarConnect = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const request = getRequest();
  const url = new URL(request.url);
  const forwarded = url.hostname === 'localhost' ? request.headers.get('x-forwarded-host') : null;
  const returnUrl = new URL('/oauth/google-calendar/return', forwarded ? `https://${forwarded}` : url.origin).toString();
  return { url: await authorizeCalendar(context.userId, returnUrl, (await getCalendarKey(context.userId)) ?? undefined) };
});
export const completeCalendarConnect = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).inputValidator((data: { code: string }) => {
  if (!data.code || data.code.length > 2048) throw new Error('Invalid connection code');
  return data;
}).handler(async ({ context, data }) => {
  const result = await exchangeCalendar(data.code);
  if (result.connector_id !== 'google_calendar') throw new Error('Unexpected calendar connection');
  await saveCalendarKey(context.userId, result.api_key);
  return { connected: true };
});
export const disconnectGoogleCalendar = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const key = await getCalendarKey(context.userId);
  if (!key) return { connected: false };
  await disconnectCalendar(key);
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const { error } = await supabaseAdmin.from('app_user_connections').delete().eq('user_id', context.userId).eq('connector_id', 'google_calendar');
  if (error) throw error;
  return { connected: false };
});

type GEvent = { id: string; summary?: string; description?: string; status?: string; updated?: string; start?: { date?: string; dateTime?: string }; end?: { date?: string; dateTime?: string } };
function eventDate(event: GEvent) {
  const start = event.start?.dateTime ?? event.start?.date;
  if (!start) return null;
  return { due_date: start.slice(0, 10), due_time: event.start?.dateTime ? start.slice(11, 16) : null };
}
function taskEvent(task: { title: string; description: string | null; due_date: string | null; due_time: string | null }) {
  const date = task.due_date ?? new Date().toISOString().slice(0, 10);
  if (!task.due_time) {
    const next = new Date(`${date}T12:00:00Z`); next.setUTCDate(next.getUTCDate() + 1);
    return { summary: task.title, description: task.description ?? '', start: { date }, end: { date: next.toISOString().slice(0, 10) } };
  }
  const start = new Date(`${date}T${task.due_time}:00`);
  const end = new Date(start.getTime() + 30 * 60000);
  return { summary: task.title, description: task.description ?? '', start: { dateTime: start.toISOString() }, end: { dateTime: end.toISOString() } };
}
export const syncGoogleCalendar = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const key = await getCalendarKey(context.userId);
  if (!key) throw new Error('Connect Google Calendar first.');
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const from = new Date(); from.setMonth(from.getMonth() - 3);
  const to = new Date(); to.setMonth(to.getMonth() + 12);
  const query = new URLSearchParams({ timeMin: from.toISOString(), timeMax: to.toISOString(), singleEvents: 'true', maxResults: '250' });
  const remote = await calendarRequest(key, `/calendars/primary/events?${query}`) as { items?: GEvent[]; nextPageToken?: string };
  const { data: tasks, error: taskError } = await context.supabase.from('tasks').select('*').gte('due_date', from.toISOString().slice(0, 10)).lte('due_date', to.toISOString().slice(0, 10));
  if (taskError) throw taskError;
  const { data: links, error: linkError } = await supabaseAdmin.from('calendar_links').select('*').eq('user_id', context.userId);
  if (linkError) throw linkError;
  const taskById = new Map((tasks ?? []).map((t) => [t.id, t]));
  const linkByEvent = new Map((links ?? []).map((l) => [l.google_event_id, l]));
  const linkByLocal = new Map((links ?? []).map((l) => [l.local_id, l] as const));
  let imported = 0, exported = 0, updated = 0;
  for (const event of remote.items ?? []) {
    if (event.status === 'cancelled' || !eventDate(event)) continue;
    const link = linkByEvent.get(event.id);
    if (!link) {
      const { data: added, error } = await context.supabase.from('tasks').insert({ user_id: context.userId, title: event.summary || 'Untitled event', description: event.description ?? null, ...eventDate(event) }).select('id').single();
      if (error) throw error;
      const { error: saveError } = await supabaseAdmin.from('calendar_links').insert({ user_id: context.userId, local_id: added.id, local_kind: 'task', google_event_id: event.id, google_updated_at: event.updated ?? null });
      if (saveError) throw saveError;
      imported++;
    } else if (link.local_kind === 'task' && taskById.has(link.local_id) && event.updated && (!link.google_updated_at || new Date(event.updated) > new Date(link.google_updated_at))) {
      const local = taskById.get(link.local_id);
      if (local && new Date(local.updated_at) <= new Date(event.updated)) {
        const { error } = await context.supabase.from('tasks').update({ title: event.summary || 'Untitled event', description: event.description ?? null, ...eventDate(event) }).eq('id', link.local_id);
        if (error) throw error;
        updated++;
      }
      const { error } = await supabaseAdmin.from('calendar_links').update({ google_updated_at: event.updated }).eq('user_id', context.userId).eq('google_event_id', event.id);
      if (error) throw error;
    }
  }
  for (const task of tasks ?? []) {
    if (!task.due_date || task.status === 'done') continue;
    const link = linkByLocal.get(task.id);
    const body = JSON.stringify(taskEvent(task));
    if (!link) {
      const event = await calendarRequest(key, '/calendars/primary/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body }) as GEvent;
      const { error } = await supabaseAdmin.from('calendar_links').insert({ user_id: context.userId, local_id: task.id, local_kind: 'task', google_event_id: event.id, google_updated_at: event.updated ?? null });
      if (error) throw error;
      exported++;
    } else if (link.google_updated_at && new Date(task.updated_at) > new Date(link.google_updated_at)) {
      const event = await calendarRequest(key, `/calendars/primary/events/${encodeURIComponent(link.google_event_id)}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body }) as GEvent;
      const { error } = await supabaseAdmin.from('calendar_links').update({ google_updated_at: event.updated ?? null }).eq('user_id', context.userId).eq('local_id', task.id);
      if (error) throw error;
      updated++;
    }
  }
  return { imported, exported, updated, moreAvailable: !!remote.nextPageToken };
});
