CREATE TABLE public.ai_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  assistant_name text not null default 'Counsel',
  tone text not null default 'grounded',
  directness smallint not null default 4,
  reply_length text not null default 'short',
  custom_instructions text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_settings TO authenticated;
GRANT ALL ON public.ai_settings TO service_role;
ALTER TABLE public.ai_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own ai settings" ON public.ai_settings FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER ai_settings_updated_at BEFORE UPDATE ON public.ai_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();