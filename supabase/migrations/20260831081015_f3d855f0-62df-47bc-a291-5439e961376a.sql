
CREATE TABLE public.journal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  entry_date date NOT NULL DEFAULT (now()::date),
  mood smallint,
  energy smallint,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.journal_entries TO authenticated;
GRANT ALL ON public.journal_entries TO service_role;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own journal entries" ON public.journal_entries FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER journal_entries_updated_at BEFORE UPDATE ON public.journal_entries FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX journal_entries_user_date_idx ON public.journal_entries (user_id, entry_date DESC);

CREATE TABLE public.journal_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  entry_id uuid NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user','assistant')),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.journal_messages TO authenticated;
GRANT ALL ON public.journal_messages TO service_role;
ALTER TABLE public.journal_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own journal messages" ON public.journal_messages FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX journal_messages_entry_idx ON public.journal_messages (entry_id, created_at);

CREATE TABLE public.habits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#8b8b8b',
  cadence public.recurrence NOT NULL DEFAULT 'daily',
  archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.habits TO authenticated;
GRANT ALL ON public.habits TO service_role;
ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own habits" ON public.habits FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER habits_updated_at BEFORE UPDATE ON public.habits FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.habit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  habit_id uuid NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
  log_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (habit_id, log_date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.habit_logs TO authenticated;
GRANT ALL ON public.habit_logs TO service_role;
ALTER TABLE public.habit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own habit logs" ON public.habit_logs FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX habit_logs_user_date_idx ON public.habit_logs (user_id, log_date DESC);

CREATE TABLE public.reflections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  week_start date NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, week_start)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reflections TO authenticated;
GRANT ALL ON public.reflections TO service_role;
ALTER TABLE public.reflections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own reflections" ON public.reflections FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
