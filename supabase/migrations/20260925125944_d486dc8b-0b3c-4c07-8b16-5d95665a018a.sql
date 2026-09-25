DROP POLICY IF EXISTS "product images read" ON storage.objects;
CREATE POLICY "product images read" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'product-images'
  AND (owner_id = (select auth.uid()::text) OR public.has_role(auth.uid(), 'admin'))
);