-- ===== PHASE 2B: USER_ROLES SECURITY HARDENING =====
-- Privilege escalation risk: users may currently be able to insert/update their own role.
-- Lock writes to admins only; users keep self-read for client-side gating.

DO $$
DECLARE pol record;
BEGIN
  FOR pol IN SELECT polname FROM pg_policy WHERE polrelid = 'public.user_roles'::regclass LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.user_roles', pol.polname);
  END LOOP;
END $$;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_roles_self_read"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "user_roles_admin_read_all"
  ON public.user_roles FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE POLICY "user_roles_admin_write"
  ON public.user_roles FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));