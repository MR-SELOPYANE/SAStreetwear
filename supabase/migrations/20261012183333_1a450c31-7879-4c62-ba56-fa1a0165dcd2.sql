ALTER TABLE public.sellers DROP CONSTRAINT IF EXISTS sellers_id_fkey;
ALTER TABLE public.sellers DISABLE TRIGGER sellers_role_sync;

INSERT INTO public.sellers (id, shop_name, location, phone, bio, status) VALUES
('11111111-1111-4111-8111-111111111111','Jozi Threads','Bree St Taxi Rank, Joburg CBD','0721234567','Hoodies, tees and cargos straight from the rank. Open Mon–Sat 7am–6pm.','approved'),
('22222222-2222-4222-8222-222222222222','Kasi Kicks','Vilakazi St, Orlando West, Soweto','0739876543','Clean sneakers and caps for the whole family.','approved'),
('33333333-3333-4333-8333-333333333333','Mother City Vintage','Greenmarket Square, Cape Town','0825551234','Vintage denim, prints and handmade beadwork.','approved')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.sellers ENABLE TRIGGER sellers_role_sync;

INSERT INTO public.products (seller_id, title, description, price, category, sizes, image_url, stock) VALUES
('11111111-1111-4111-8111-111111111111','Jozi Crown Oversized Hoodie','Heavy black fleece hoodie with Joburg skyline sleeve print.',380,'Tops','S, M, L, XL','/samples/hoodie.jpg',12),
('11111111-1111-4111-8111-111111111111','Better Days Graphic Tee','100% cotton white tee, bold black print.',150,'Tops','S, M, L, XL','/samples/tee.jpg',25),
('11111111-1111-4111-8111-111111111111','Black Utility Cargo Pants','Relaxed fit cargos with side pockets.',320,'Bottoms','28, 30, 32, 34, 36','/samples/cargo.jpg',10),
('11111111-1111-4111-8111-111111111111','Rank Runner Plain Tee Bundle (3)','Three plain white tees, everyday basics.',250,'Tops','M, L, XL','/samples/tee.jpg',8),
('11111111-1111-4111-8111-111111111111','Cargo Pants — Kids','Mini versions of our best-selling cargos.',200,'Kids','4-5, 6-7, 8-9, 10-11','/samples/cargo.jpg',6),
('11111111-1111-4111-8111-111111111111','Hoodie — Kids','Warm black hoodie for school mornings.',250,'Kids','4-5, 6-7, 8-9','/samples/hoodie.jpg',7),
('22222222-2222-4222-8222-222222222222','Cape Town Low White Sneakers','Clean all-white leather low tops.',550,'Shoes','5, 6, 7, 8, 9, 10, 11','/samples/sneakers.jpg',9),
('22222222-2222-4222-8222-222222222222','Stay Real Snapback','Black snapback with embroidered logo.',180,'Caps & Hats','One size','/samples/caps.jpg',15),
('22222222-2222-4222-8222-222222222222','Good Vibes Bucket Hat','Classic black cotton bucket hat.',160,'Caps & Hats','One size','/samples/caps.jpg',15),
('22222222-2222-4222-8222-222222222222','Kasi White Sneakers — Kids','Little ones get the clean look too.',350,'Kids','10, 11, 12, 13, 1, 2','/samples/sneakers.jpg',5),
('22222222-2222-4222-8222-222222222222','Soweto Cap & Hat Combo','Snapback plus bucket hat deal.',300,'Caps & Hats','One size','/samples/caps.jpg',6),
('33333333-3333-4333-8333-333333333333','Vintage Denim Trucker Jacket','Authentic washed denim jacket, one-of-a-kind.',350,'Jackets','M, L','/samples/denim.jpg',3),
('33333333-3333-4333-8333-333333333333','Shweshwe Print Midi Dress','Royal blue shweshwe dress with tie waist.',450,'Dresses','XS, S, M, L, XL','/samples/dress.jpg',8),
('33333333-3333-4333-8333-333333333333','Zulu Beaded Bracelet','Handmade beadwork bracelet, assorted colours.',50,'Accessories','One size','/samples/beads.jpg',40),
('33333333-3333-4333-8333-333333333333','Beaded Crossbody Phone Bag','Handmade beaded bag, fits most phones.',150,'Accessories','One size','/samples/beads.jpg',10),
('33333333-3333-4333-8333-333333333333','Shweshwe Dress — Girls','Matching mini shweshwe dress.',280,'Kids','4-5, 6-7, 8-9','/samples/dress.jpg',6);