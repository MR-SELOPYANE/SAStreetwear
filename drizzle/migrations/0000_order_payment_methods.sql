ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'cash_collection',
  ADD COLUMN IF NOT EXISTS fulfillment text NOT NULL DEFAULT 'collection',
  ADD COLUMN IF NOT EXISTS delivery_address text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS payment_reference text;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_payment_method_check CHECK (payment_method IN ('paystack','cash_delivery','cash_collection')),
  ADD CONSTRAINT orders_fulfillment_check CHECK (fulfillment IN ('delivery','collection')),
  ADD CONSTRAINT orders_payment_status_check CHECK (payment_status IN ('unpaid','paid'));

-- Shoppers and vendors can never mark an order paid or change the amount themselves;
-- only the server (after confirming with the payment provider) can.
CREATE OR REPLACE FUNCTION public.guard_order_payment()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.payment_status := 'unpaid';
    NEW.payment_reference := NULL;
    IF NEW.payment_method = 'cash_delivery' THEN
      NEW.fulfillment := 'delivery';
    ELSIF NEW.payment_method = 'cash_collection' THEN
      NEW.fulfillment := 'collection';
    END IF;
    IF NEW.fulfillment = 'delivery' AND length(trim(NEW.delivery_address)) < 5 THEN
      RAISE EXCEPTION 'A delivery address is required for delivery orders';
    END IF;
    IF NEW.fulfillment = 'collection' THEN
      NEW.delivery_address := '';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.payment_status IS DISTINCT FROM OLD.payment_status
     OR NEW.payment_reference IS DISTINCT FROM OLD.payment_reference
     OR NEW.payment_method IS DISTINCT FROM OLD.payment_method
     OR NEW.fulfillment IS DISTINCT FROM OLD.fulfillment
     OR NEW.delivery_address IS DISTINCT FROM OLD.delivery_address
     OR NEW.total IS DISTINCT FROM OLD.total THEN
    RAISE EXCEPTION 'Payment details cannot be changed';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_guard_payment ON public.orders;
CREATE TRIGGER orders_guard_payment
BEFORE INSERT OR UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.guard_order_payment();

REVOKE EXECUTE ON FUNCTION public.guard_order_payment() FROM PUBLIC, anon, authenticated;