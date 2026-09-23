CREATE TYPE public.app_role AS ENUM ('admin','seller','customer');
CREATE TABLE public.user_roles (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, role app_role NOT NULL, UNIQUE(user_id, role));
GRANT SELECT ON public.user_roles TO authenticated; GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role=_role) $$;
CREATE POLICY "own roles read" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE TABLE public.profiles (id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE, display_name text, phone text, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated; GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles read" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "profiles upd" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());
CREATE POLICY "profiles ins" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles(id, display_name) VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email,'@',1)));
  INSERT INTO public.user_roles(user_id, role) VALUES (NEW.id, 'customer');
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role='admin') THEN
    INSERT INTO public.user_roles(user_id, role) VALUES (NEW.id, 'admin');
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.sellers (id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE, shop_name text NOT NULL, location text NOT NULL DEFAULT '', phone text NOT NULL DEFAULT '', bio text NOT NULL DEFAULT '', status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')), created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.sellers TO anon; GRANT SELECT, INSERT, UPDATE ON public.sellers TO authenticated; GRANT ALL ON public.sellers TO service_role;
ALTER TABLE public.sellers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "approved sellers public" ON public.sellers FOR SELECT TO anon, authenticated USING (status='approved' OR id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "apply as seller" ON public.sellers FOR INSERT TO authenticated WITH CHECK (id = auth.uid() AND status='pending');
CREATE POLICY "seller edits own" ON public.sellers FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid() AND status = (SELECT s.status FROM public.sellers s WHERE s.id = auth.uid()));
CREATE POLICY "admin manages sellers" ON public.sellers FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.sync_seller_role() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status='approved' THEN INSERT INTO public.user_roles(user_id, role) VALUES (NEW.id,'seller') ON CONFLICT DO NOTHING;
  ELSE DELETE FROM public.user_roles WHERE user_id=NEW.id AND role='seller'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER sellers_role_sync AFTER INSERT OR UPDATE OF status ON public.sellers FOR EACH ROW EXECUTE FUNCTION public.sync_seller_role();

CREATE TABLE public.products (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), seller_id uuid NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE, title text NOT NULL, description text NOT NULL DEFAULT '', price numeric(10,2) NOT NULL CHECK (price >= 0), category text NOT NULL DEFAULT 'Clothing', sizes text NOT NULL DEFAULT '', image_url text, stock int NOT NULL DEFAULT 1, active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.products TO anon; GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated; GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public products" ON public.products FOR SELECT TO anon, authenticated USING ((active AND EXISTS (SELECT 1 FROM public.sellers s WHERE s.id=seller_id AND s.status='approved')) OR seller_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "seller insert" ON public.products FOR INSERT TO authenticated WITH CHECK (seller_id = auth.uid() AND public.has_role(auth.uid(),'seller'));
CREATE POLICY "seller update" ON public.products FOR UPDATE TO authenticated USING (seller_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "seller delete" ON public.products FOR DELETE TO authenticated USING (seller_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE TABLE public.orders (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), customer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, seller_id uuid NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE, customer_name text NOT NULL DEFAULT '', customer_phone text NOT NULL DEFAULT '', status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','ready','collected','cancelled')), total numeric(10,2) NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT, INSERT, UPDATE ON public.orders TO authenticated; GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "orders read" ON public.orders FOR SELECT TO authenticated USING (customer_id = auth.uid() OR seller_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "orders create" ON public.orders FOR INSERT TO authenticated WITH CHECK (customer_id = auth.uid() AND status='pending');
CREATE POLICY "orders update" ON public.orders FOR UPDATE TO authenticated USING (seller_id = auth.uid() OR customer_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE TABLE public.order_items (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE, product_id uuid REFERENCES public.products(id) ON DELETE SET NULL, title text NOT NULL, price numeric(10,2) NOT NULL, quantity int NOT NULL DEFAULT 1, size text NOT NULL DEFAULT '');
GRANT SELECT, INSERT ON public.order_items TO authenticated; GRANT ALL ON public.order_items TO service_role;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "items read" ON public.order_items FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id=order_id AND (o.customer_id=auth.uid() OR o.seller_id=auth.uid() OR public.has_role(auth.uid(),'admin'))));
CREATE POLICY "items create" ON public.order_items FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.orders o WHERE o.id=order_id AND o.customer_id=auth.uid()));

CREATE POLICY "product images read" ON storage.objects FOR SELECT USING (bucket_id='product-images');
CREATE POLICY "product images upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id='product-images' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "product images delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id='product-images' AND (storage.foldername(name))[1] = auth.uid()::text);