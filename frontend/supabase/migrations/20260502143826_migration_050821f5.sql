-- ===== PHASE 2I (RETRY): make every drop idempotent =====

-- ADDRESSES
DROP POLICY IF EXISTS "Users can delete own addresses" ON public.addresses;
DROP POLICY IF EXISTS "Users can insert own addresses" ON public.addresses;
DROP POLICY IF EXISTS "Users can read own addresses" ON public.addresses;
DROP POLICY IF EXISTS "Users can update own addresses" ON public.addresses;
DROP POLICY IF EXISTS addresses_own ON public.addresses;
DROP POLICY IF EXISTS addresses_user_all ON public.addresses;
DROP POLICY IF EXISTS addresses_admin_read ON public.addresses;

CREATE POLICY "addresses_user_all" ON public.addresses FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "addresses_admin_read" ON public.addresses FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin','super_admin')));

-- NOTIFICATIONS
DROP POLICY IF EXISTS "Users can read own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
DROP POLICY IF EXISTS notifications_own ON public.notifications;
DROP POLICY IF EXISTS notifications_user_all ON public.notifications;
DROP POLICY IF EXISTS notifications_user_read ON public.notifications;
DROP POLICY IF EXISTS notifications_user_update ON public.notifications;
DROP POLICY IF EXISTS notifications_admin_all ON public.notifications;

CREATE POLICY "notifications_user_read" ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "notifications_user_update" ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);
CREATE POLICY "notifications_admin_all" ON public.notifications FOR ALL
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin','super_admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin','super_admin')));

-- BANNERS
DROP POLICY IF EXISTS "Admin can manage banners" ON public.banners;
DROP POLICY IF EXISTS "Anyone can read active banners" ON public.banners;
DROP POLICY IF EXISTS banners_admin ON public.banners;
DROP POLICY IF EXISTS banners_public_read ON public.banners;
DROP POLICY IF EXISTS banners_read ON public.banners;
DROP POLICY IF EXISTS banners_public_read_active ON public.banners;
DROP POLICY IF EXISTS banners_admin_all ON public.banners;

CREATE POLICY "banners_public_read_active" ON public.banners FOR SELECT
  USING (is_active = true);
CREATE POLICY "banners_admin_all" ON public.banners FOR ALL
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin','super_admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin','super_admin')));

-- ORDERS
DROP POLICY IF EXISTS "Admin can read all orders" ON public.orders;
DROP POLICY IF EXISTS "Admin can update orders" ON public.orders;
DROP POLICY IF EXISTS "Anyone can insert orders" ON public.orders;
DROP POLICY IF EXISTS "Users can read own orders" ON public.orders;
DROP POLICY IF EXISTS orders_admin_all ON public.orders;
DROP POLICY IF EXISTS orders_create ON public.orders;
DROP POLICY IF EXISTS orders_user_read ON public.orders;
DROP POLICY IF EXISTS orders_anyone_insert ON public.orders;
DROP POLICY IF EXISTS orders_user_read_own ON public.orders;

CREATE POLICY "orders_anyone_insert" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "orders_user_read_own" ON public.orders FOR SELECT
  USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);
CREATE POLICY "orders_admin_all" ON public.orders FOR ALL
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin','super_admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin','super_admin')));

-- ORDER_ITEMS
DROP POLICY IF EXISTS "Admin can manage order items" ON public.order_items;
DROP POLICY IF EXISTS "Anyone can insert order items" ON public.order_items;
DROP POLICY IF EXISTS "Users can read own order items" ON public.order_items;
DROP POLICY IF EXISTS order_items_admin_all ON public.order_items;
DROP POLICY IF EXISTS order_items_create ON public.order_items;
DROP POLICY IF EXISTS order_items_user_read ON public.order_items;
DROP POLICY IF EXISTS order_items_anyone_insert ON public.order_items;

CREATE POLICY "order_items_anyone_insert" ON public.order_items FOR INSERT WITH CHECK (true);
CREATE POLICY "order_items_user_read" ON public.order_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_items.order_id AND o.user_id = auth.uid()));
CREATE POLICY "order_items_admin_all" ON public.order_items FOR ALL
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin','super_admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin','super_admin')));