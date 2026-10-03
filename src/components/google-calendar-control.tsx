import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { CalendarSync } from 'lucide-react';
import { toast } from 'sonner';
import { calendarStatus, completeCalendarConnect, disconnectGoogleCalendar, startCalendarConnect, syncGoogleCalendar } from '@/lib/calendar.functions';
import { Button } from '@/components/ui/button';
export function GoogleCalendarControl() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['google-calendar-status'], queryFn: () => calendarStatus() });
  const [busy, setBusy] = useState(false);
  const [lastSync, setLastSync] = useState('');
  async function connect() {
    const popup = window.open('', 'google-calendar-connect', 'width=600,height=720');
    if (!popup) { toast.error('Allow popups to connect your calendar.'); return; }
    setBusy(true);
    try {
      const { url } = await startCalendarConnect();
      const code = new Promise<string>((resolve, reject) => {
        const timeout = window.setTimeout(() => { cleanup(); reject(new Error('Connection timed out.')); }, 120000);
        const poll = window.setInterval(() => { if (popup.closed) { cleanup(); reject(new Error('Connection window closed.')); } }, 500);
        function cleanup() { window.clearTimeout(timeout); window.clearInterval(poll); window.removeEventListener('message', receive); }
        function receive(event: MessageEvent) {
          if (event.origin !== window.location.origin || event.source !== popup || !['calendar-connected', 'calendar-failed'].includes(event.data?.type)) return;
          cleanup();
          if (event.data.type === 'calendar-connected' && typeof event.data.code === 'string') resolve(event.data.code);
          else reject(new Error('Connection was not completed.'));
        }
        window.addEventListener('message', receive);
      });
      popup.location.href = url;
      await completeCalendarConnect({ data: { code: await code } });
      await qc.invalidateQueries({ queryKey: ['google-calendar-status'] });
      toast.success('Google Calendar connected.');
    } catch (e) { popup.close(); toast.error(e instanceof Error ? e.message : 'Could not connect.'); }
    finally { setBusy(false); }
  }
  async function sync() {
    setBusy(true);
    try {
      const result = await syncGoogleCalendar();
      setLastSync(`${result.imported} imported · ${result.exported} exported · ${result.updated} updated${result.moreAvailable ? ' · more events available' : ''}`);
      await Promise.all(['tasks', 'routine_entries'].map((key) => qc.invalidateQueries({ queryKey: [key] })));
      toast.success('Calendar synced.');
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Could not sync calendar.'); }
    finally { setBusy(false); }
  }
  async function disconnect() {
    setBusy(true);
    try { await disconnectGoogleCalendar(); await qc.invalidateQueries({ queryKey: ['google-calendar-status'] }); setLastSync(''); toast.success('Google Calendar disconnected.'); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Could not disconnect.'); }
    finally { setBusy(false); }
  }
  return <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
    {data?.connected ? <><Button size="sm" variant="outline" disabled={busy} onClick={() => void sync()}><CalendarSync className="mr-2 size-4" />Sync Google</Button><Button size="sm" variant="ghost" disabled={busy} onClick={() => void disconnect()}>Disconnect</Button></> : <Button size="sm" variant="outline" disabled={busy} onClick={() => void connect()}><CalendarSync className="mr-2 size-4" />Connect Google Calendar</Button>}
    {lastSync && <span role="status">{lastSync}</span>}
  </div>;
}
