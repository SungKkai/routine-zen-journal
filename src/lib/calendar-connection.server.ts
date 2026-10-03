import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
function secret() {
  const raw = process.env['APP_USER_CONNECTION_KEY_SECRET'];
  if (!raw) throw new Error('Calendar connection encryption is not configured.');
  return Buffer.from(raw, 'base64');
}
function encrypt(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', secret(), iv);
  return Buffer.concat([iv, cipher.getAuthTag(), cipher.update(value, 'utf8'), cipher.final()]).toString('base64');
}
function decrypt(value: string) {
  const buf = Buffer.from(value, 'base64');
  const decipher = createDecipheriv('aes-256-gcm', secret(), buf.subarray(0, 12));
  decipher.setAuthTag(buf.subarray(12, 28));
  return Buffer.concat([decipher.update(buf.subarray(28)), decipher.final()]).toString('utf8');
}
export async function getCalendarKey(userId: string) {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const { data, error } = await supabaseAdmin.from('app_user_connections').select('connection_key_ciphertext').eq('user_id', userId).eq('connector_id', 'google_calendar').maybeSingle();
  if (error) throw error;
  return data ? decrypt(data.connection_key_ciphertext) : null;
}
export async function saveCalendarKey(userId: string, key: string) {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const { error } = await supabaseAdmin.from('app_user_connections').upsert({ user_id: userId, connector_id: 'google_calendar', connection_key_ciphertext: encrypt(key), updated_at: new Date().toISOString() }, { onConflict: 'user_id,connector_id' });
  if (error) throw error;
}
