CREATE TABLE public.goal_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  goal_id uuid NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(12), 'hex'),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX goal_shares_goal_id_key ON public.goal_shares (goal_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.goal_shares TO authenticated;
GRANT ALL ON public.goal_shares TO service_role;

ALTER TABLE public.goal_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own goal shares" ON public.goal_shares
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);