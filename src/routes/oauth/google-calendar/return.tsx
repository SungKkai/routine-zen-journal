import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
export const Route = createFileRoute('/oauth/google-calendar/return')({
  head: () => ({ meta: [{ title: 'Connect Google Calendar — Kronos' }, { name: 'description', content: 'Complete your Google Calendar connection.' }, { property: 'og:title', content: 'Connect Google Calendar — Kronos' }, { property: 'og:description', content: 'Complete your Google Calendar connection.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' }] }),
  component: ReturnPage,
});
function ReturnPage() {
  const [message, setMessage] = useState('Finishing connection…');
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const success = params.get('success') === 'true' && !!code;
    window.opener?.postMessage({ type: success ? 'calendar-connected' : 'calendar-failed', code }, window.location.origin);
    if (!success) setMessage('Connection was not completed. You can close this window and try again.');
    else window.close();
  }, []);
  return <main className="grid min-h-screen place-items-center bg-background text-foreground"><p>{message}</p></main>;
}
