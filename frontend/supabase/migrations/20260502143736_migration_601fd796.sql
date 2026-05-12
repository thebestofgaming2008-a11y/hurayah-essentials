-- ===== PHASE 2H: FINISH POLICY DEDUPE — reviews, support_messages, exchange_rates =====

-- REVIEWS
DROP POLICY IF EXISTS "Users can insert own reviews" ON public.reviews;
DROP POLICY IF EXISTS reviews_admin_all ON public.reviews;
DROP POLICY IF EXISTS reviews_public_read ON public.reviews;
DROP POLICY IF EXISTS reviews_user_create ON public.reviews;
DROP POLICY IF EXISTS reviews_user_update ON public.reviews;
DROP POLICY IF EXISTS reviews_user_delete ON public.reviews;

CREATE POLICY "reviews_public_read" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "reviews_user_insert" ON public.reviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "reviews_user_update" ON public.reviews FOR UPDATE
  USING (auth.uid() = user_id);
CREATE POLICY "reviews_user_delete" ON public.reviews FOR DELETE
  USING (auth.uid() = user_id);
CREATE POLICY "reviews_admin_all" ON public.reviews FOR ALL
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin','super_admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin','super_admin')));

-- SUPPORT_MESSAGES — anyone (incl anon) can submit, owner reads own, admin manages
DROP POLICY IF EXISTS "Admin can delete support messages" ON public.support_messages;
DROP POLICY IF EXISTS "Admin can read support messages" ON public.support_messages;
DROP POLICY IF EXISTS "Admin can update support messages" ON public.support_messages;
DROP POLICY IF EXISTS "Anyone can insert support messages" ON public.support_messages;
DROP POLICY IF EXISTS "Users can read own support messages" ON public.support_messages;
DROP POLICY IF EXISTS support_admin_all ON public.support_messages;
DROP POLICY IF EXISTS support_insert ON public.support_messages;
DROP POLICY IF EXISTS support_user_read ON public.support_messages;

CREATE POLICY "support_anyone_insert" ON public.support_messages FOR INSERT
  WITH CHECK (true);
CREATE POLICY "support_user_read_own" ON public.support_messages FOR SELECT
  USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);
CREATE POLICY "support_admin_all" ON public.support_messages FOR ALL
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin','super_admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin','super_admin')));

-- EXCHANGE_RATES — public read, admin write
DROP POLICY IF EXISTS "Admin can insert exchange rates" ON public.exchange_rates;
DROP POLICY IF EXISTS "Admin can update exchange rates" ON public.exchange_rates;
DROP POLICY IF EXISTS "Anyone can read exchange rates" ON public.exchange_rates;
DROP POLICY IF EXISTS rates_read ON public.exchange_rates;
DROP POLICY IF EXISTS rates_write ON public.exchange_rates;

CREATE POLICY "rates_public_read" ON public.exchange_rates FOR SELECT
  USING (true);
CREATE POLICY "rates_admin_write" ON public.exchange_rates FOR ALL
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin','super_admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin','super_admin')));