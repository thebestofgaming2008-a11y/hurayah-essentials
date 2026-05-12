-- ===== PHASE 2F: PERFORMANCE INDEXES (idempotent) =====
CREATE INDEX IF NOT EXISTS idx_products_active_category ON public.products (is_active, category);
CREATE INDEX IF NOT EXISTS idx_products_active_featured ON public.products (is_active, is_featured) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_products_active_bestseller ON public.products (is_active, is_bestseller) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_products_active_new ON public.products (is_active, is_new_arrival) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_products_slug ON public.products (slug);
CREATE INDEX IF NOT EXISTS idx_orders_user_created ON public.orders (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items (order_id);
CREATE INDEX IF NOT EXISTS idx_addresses_user ON public.addresses (user_id, is_default DESC);
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON public.user_roles (user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles (email);