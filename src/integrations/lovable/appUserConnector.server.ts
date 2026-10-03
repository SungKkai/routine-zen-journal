const BASE = 'https://connector-gateway.lovable.dev';
const CONNECTOR = 'google_calendar';
const scopes = ['https://www.googleapis.com/auth/calendar.events'];
function auth() {
  const key = process.env['LOVABLE_API_KEY'];
  if (!key) throw new Error('Calendar connection is not configured.');
  return `Bearer ${key}`;
}
export async function authorizeCalendar(userId: string, returnUrl: string, connectionKey?: string) {
  const client = process.env['GOOGLE_CALENDAR_APP_USER_CONNECTOR_CLIENT_API_KEY'];
  if (!client) throw new Error('Calendar connection is not configured.');
  const res = await fetch(`${BASE}/api/v1/app-users/oauth2/authorize`, {
    method: 'POST', headers: { Authorization: auth(), 'X-Client-Api-Key': client, 'Content-Type': 'application/json', ...(connectionKey ? { 'X-Connection-Api-Key': connectionKey } : {}) },
    body: JSON.stringify({ connector_id: CONNECTOR, app_user_id: userId, return_url: returnUrl, credentials_configuration: { scopes } }),
  });
  if (!res.ok) throw new Error(`Calendar connection failed (${res.status}): ${await res.text()}`);
  const body = await res.json() as { authorization_url: string };
  return body.authorization_url;
}
export async function exchangeCalendar(code: string) {
  const res = await fetch(`${BASE}/api/v1/app-users/oauth2/exchange`, { method: 'POST', headers: { Authorization: auth(), 'Content-Type': 'application/json' }, body: JSON.stringify({ code }) });
  if (!res.ok) throw new Error(`Calendar connection failed (${res.status}): ${await res.text()}`);
  return res.json() as Promise<{ api_key: string; connector_id: string }>;
}
export async function calendarRequest(connectionKey: string, path: string, init?: RequestInit) {
  const headers = new Headers(init?.headers);
  headers.set('Authorization', auth());
  headers.set('X-Connection-Api-Key', connectionKey);
  headers.set('X-Lovable-Required-Scopes', scopes.join(' '));
  const res = await fetch(`${BASE}/${CONNECTOR}/calendar/v3${path}`, { ...init, headers });
  if (!res.ok) throw new Error(`Google Calendar failed (${res.status}): ${await res.text()}`);
  return res.json();
}
export async function disconnectCalendar(connectionKey: string) {
  const res = await fetch(`${BASE}/api/v1/app-users/connection`, { method: 'DELETE', headers: { Authorization: auth(), 'X-Connection-Api-Key': connectionKey, 'Content-Type': 'application/json' }, body: JSON.stringify({ connector_id: CONNECTOR }) });
  if (!res.ok) throw new Error(`Calendar disconnect failed (${res.status}): ${await res.text()}`);
}
