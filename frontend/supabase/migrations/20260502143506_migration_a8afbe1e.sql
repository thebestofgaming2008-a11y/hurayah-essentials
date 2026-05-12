-- ===== PHASE 2D: PRODUCTS + CATEGORIES POLICY CONSOLIDATION =====
-- products: public read active, admin all (also admin can see inactive)
DROP POLICY IF EXISTS "Admin can delete products" ON public.products;
DROP POLICY IF EXISTS "Admin can insert products" ON public.products;
DROP POLICY IF EXISTS "Admin can update products" ON public.products;
DROP POLICY IF EXISTS products_admin ON public.products;
DROP POLICY IF EXISTS products_public_read_active ON public.products;
DROP POLICY IF EXISTS products_admin_all ON public.products;

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "products_public_read_active"
  ON public.products FOR SELECT
  USING (is_active = true);

CREATE POLICY "products_admin_all"
  ON public.products FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- categories: public read active, admin all
DROP POLICY IF EXISTS "Admin can delete categories" ON public.categories;
DROP POLICY IF EXISTS "Admin can insert categories" ON public.categories;
DROP POLICY IF EXISTS "Admin can update categories" ON public.categories;
DROP POLICY IF EXISTS categories_admin ON public.categories;
DROP POLICY IF EXISTS categories_public_read_active ON public.categories;
DROP POLICY IF EXISTS categories_admin_all ON public.categories;

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "categories_public_read_active"
  ON public.categories FOR SELECT
  USING (is_active = true);

CREATE POLICY "categories_admin_all"
  ON public.categories FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));