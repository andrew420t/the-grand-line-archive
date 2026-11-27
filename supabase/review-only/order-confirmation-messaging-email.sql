-- REVIEWED ORDER FLOW MIGRATION
-- Additive compatibility migration for both the current Testing schema and
-- the older Production schema. Existing order and item records are retained.
-- Does not configure Resend secrets or send an email by itself.

BEGIN;

-- Keep the legacy total/card_id/price_at_purchase columns for older records,
-- while adding the product-oriented fields used by the current storefront.
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS total_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stock_reserved boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS customer_name text,
  ADD COLUMN IF NOT EXISTS customer_email text,
  ADD COLUMN IF NOT EXISTS pickup_method text NOT NULL DEFAULT 'local_pickup',
  ADD COLUMN IF NOT EXISTS admin_email_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS admin_email_error text,
  ADD COLUMN IF NOT EXISTS admin_email_sent_at timestamptz;

UPDATE public.orders
SET total_amount = total
WHERE total_amount = 0
  AND total IS NOT NULL
  AND total <> 0;

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS product_id uuid,
  ADD COLUMN IF NOT EXISTS unit_price numeric;

UPDATE public.order_items
SET unit_price = price_at_purchase
WHERE unit_price IS NULL
  AND price_at_purchase IS NOT NULL;

DO $order_product_fk$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.order_items'::regclass
      AND conname = 'order_items_product_id_fkey'
  ) THEN
    ALTER TABLE public.order_items
      ADD CONSTRAINT order_items_product_id_fkey
      FOREIGN KEY (product_id) REFERENCES public.products(id)
      ON DELETE SET NULL;
  END IF;
END
$order_product_fk$;

CREATE INDEX IF NOT EXISTS orders_user_id_created_at_idx
  ON public.orders (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS order_items_order_id_idx
  ON public.order_items (order_id);
CREATE INDEX IF NOT EXISTS order_messages_order_id_created_at_idx
  ON public.order_messages (order_id, created_at);

CREATE TABLE IF NOT EXISTS public.order_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  sender_role text NOT NULL CHECK (sender_role IN ('customer', 'admin')),
  message text NOT NULL CHECK (char_length(btrim(message)) BETWEEN 1 AND 3000),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.order_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Order participants can read their conversation" ON public.order_messages;
CREATE POLICY "Order participants can read their conversation"
ON public.order_messages
FOR SELECT
TO authenticated
USING (
  sender_id = (SELECT auth.uid())
  OR public.is_admin()
  OR EXISTS (
    SELECT 1 FROM public.orders AS o
    WHERE o.id = order_messages.order_id
      AND o.user_id = (SELECT auth.uid())
  )
);

-- Direct INSERT is deliberately not granted. Messages are written through a
-- SECURITY DEFINER RPC that derives the sender role from the verified profile.
REVOKE ALL ON public.order_messages FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.order_messages TO authenticated;

CREATE OR REPLACE FUNCTION public.send_order_message(
  p_order_id uuid,
  p_message text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_order_user_id uuid;
  v_order_status text;
  v_sender_role text;
  v_message text := btrim(coalesce(p_message, ''));
  v_message_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Sign in to message about this order.';
  END IF;
  IF char_length(v_message) < 1 OR char_length(v_message) > 3000 THEN
    RAISE EXCEPTION 'Messages must contain between 1 and 3000 characters.';
  END IF;

  SELECT o.user_id, o.status
  INTO v_order_user_id, v_order_status
  FROM public.orders AS o
  WHERE o.id = p_order_id
  FOR KEY SHARE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found.';
  END IF;

  IF public.is_admin() THEN
    v_sender_role := 'admin';
  ELSIF v_order_user_id = v_user_id THEN
    v_sender_role := 'customer';
  ELSE
    RAISE EXCEPTION 'You are not permitted to message about this order.';
  END IF;

  IF lower(coalesce(v_order_status, 'pending')) IN ('completed', 'cancelled') THEN
    RAISE EXCEPTION 'This order conversation is closed.';
  END IF;

  INSERT INTO public.order_messages (order_id, sender_id, sender_role, message)
  VALUES (p_order_id, v_user_id, v_sender_role, v_message)
  RETURNING id INTO v_message_id;

  RETURN v_message_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.send_order_message(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.send_order_message(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.send_order_message(uuid, text) TO authenticated;

-- A single transaction creates the order, line items and stock reservation.
-- Both total/total_amount and price_at_purchase/unit_price are written to
-- preserve compatibility with the legacy tables.
CREATE OR REPLACE FUNCTION public.create_order_atomic(p_items jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_item record;
  v_product record;
  v_total numeric := 0;
  v_order_id uuid;
  v_updated_count integer;
  v_customer_email text;
  v_customer_name text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication is required to place an order.';
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array'
     OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Order must contain at least one item.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_to_recordset(p_items) AS input(product_id uuid, quantity integer, expected_unit_price numeric)
    WHERE product_id IS NULL OR quantity IS NULL OR quantity < 1
       OR expected_unit_price IS NULL OR expected_unit_price < 0
  ) THEN
    RAISE EXCEPTION 'Every order item must have a product ID and positive whole quantity.';
  END IF;

  SELECT u.email,
         coalesce(
           nullif(btrim(p.display_name), ''),
           nullif(btrim(u.raw_user_meta_data ->> 'full_name'), ''),
           nullif(btrim(u.raw_user_meta_data ->> 'name'), ''),
           'Archive customer'
         )
  INTO v_customer_email, v_customer_name
  FROM auth.users AS u
  LEFT JOIN public.profiles AS p ON p.id = u.id
  WHERE u.id = v_user_id;

  IF NOT FOUND OR v_customer_email IS NULL THEN
    RAISE EXCEPTION 'Your account email could not be verified. Sign in again and retry.';
  END IF;

  -- Lock distinct products in a deterministic order to prevent overselling.
  FOR v_item IN
    SELECT product_id,
           SUM(quantity)::integer AS quantity,
           MIN(expected_unit_price) AS expected_unit_price,
           MAX(expected_unit_price) AS max_expected_unit_price
    FROM jsonb_to_recordset(p_items) AS input(product_id uuid, quantity integer, expected_unit_price numeric)
    GROUP BY product_id
    ORDER BY product_id
  LOOP
    SELECT p.id, p.name, p.price, p.stock_quantity, p.status
    INTO v_product
    FROM public.products AS p
    WHERE p.id = v_item.product_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'A product in this basket no longer exists.';
    END IF;
    IF lower(coalesce(v_product.status, '')) <> 'active' THEN
      RAISE EXCEPTION 'Product % is no longer available.', v_product.name;
    END IF;
    IF v_product.price IS NULL OR v_product.price < 0 THEN
      RAISE EXCEPTION 'Product % has an invalid price.', v_product.name;
    END IF;
    IF v_item.expected_unit_price IS DISTINCT FROM v_item.max_expected_unit_price THEN
      RAISE EXCEPTION 'Basket has conflicting prices for product %.', v_product.name;
    END IF;
    IF v_product.price IS DISTINCT FROM v_item.expected_unit_price THEN
      RAISE EXCEPTION 'Price changed for product %. Review the basket and retry.', v_product.name;
    END IF;
    IF v_product.stock_quantity IS NULL OR v_product.stock_quantity < v_item.quantity THEN
      RAISE EXCEPTION 'Insufficient stock for product %.', v_product.name;
    END IF;

    v_total := v_total + (v_product.price * v_item.quantity);
  END LOOP;

  INSERT INTO public.orders (
    user_id, status, total, total_amount, stock_reserved,
    customer_name, customer_email, pickup_method, admin_email_status
  )
  VALUES (
    v_user_id, 'pending', round(v_total, 2), round(v_total, 2), true,
    v_customer_name, v_customer_email, 'local_pickup', 'pending'
  )
  RETURNING id INTO v_order_id;

  FOR v_item IN
    SELECT product_id, SUM(quantity)::integer AS quantity
    FROM jsonb_to_recordset(p_items) AS input(product_id uuid, quantity integer)
    GROUP BY product_id
    ORDER BY product_id
  LOOP
    UPDATE public.products
    SET stock_quantity = stock_quantity - v_item.quantity,
        updated_at = now()
    WHERE id = v_item.product_id
      AND stock_quantity >= v_item.quantity;

    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    IF v_updated_count <> 1 THEN
      RAISE EXCEPTION 'Stock reservation failed for product %. Retry checkout.', v_item.product_id;
    END IF;

    SELECT p.price INTO v_product
    FROM public.products AS p
    WHERE p.id = v_item.product_id;

    INSERT INTO public.order_items (
      order_id, product_id, quantity, unit_price, price_at_purchase
    )
    VALUES (
      v_order_id, v_item.product_id, v_item.quantity, v_product.price, v_product.price
    );
  END LOOP;

  RETURN v_order_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.create_order_atomic(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_order_atomic(jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_order_atomic(jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.update_order_status_atomic(
  p_order_id uuid,
  p_new_status text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_current_status text;
  v_stock_reserved boolean;
  v_item record;
  v_next_status text := lower(trim(coalesce(p_new_status, '')));
BEGIN
  IF auth.uid() IS NULL OR NOT coalesce(public.is_admin(), false) THEN
    RAISE EXCEPTION 'Administrator permission is required to update order status.';
  END IF;

  IF v_next_status NOT IN ('pending', 'processing', 'shipped', 'completed', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid order status.';
  END IF;

  SELECT o.status, o.stock_reserved
  INTO v_current_status, v_stock_reserved
  FROM public.orders AS o
  WHERE o.id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order was not found.';
  END IF;

  IF lower(coalesce(v_current_status, 'pending')) = v_next_status THEN
    RETURN p_order_id;
  END IF;

  IF NOT (
    (lower(coalesce(v_current_status, 'pending')) = 'pending' AND v_next_status IN ('processing', 'cancelled')) OR
    (lower(coalesce(v_current_status, 'pending')) = 'processing' AND v_next_status IN ('shipped', 'cancelled')) OR
    (lower(coalesce(v_current_status, 'pending')) = 'shipped' AND v_next_status = 'completed')
  ) THEN
    RAISE EXCEPTION 'Invalid order status transition from % to %.', v_current_status, v_next_status;
  END IF;

  IF v_next_status = 'cancelled' THEN
    IF coalesce(v_stock_reserved, false) THEN
      FOR v_item IN
        SELECT oi.product_id, sum(oi.quantity)::integer AS quantity
        FROM public.order_items AS oi
        WHERE oi.order_id = p_order_id
          AND oi.product_id IS NOT NULL
        GROUP BY oi.product_id
        ORDER BY oi.product_id
      LOOP
        UPDATE public.products
        SET stock_quantity = stock_quantity + v_item.quantity,
            updated_at = now()
        WHERE id = v_item.product_id;
        IF NOT FOUND THEN
          RAISE EXCEPTION 'Could not restore stock for product %. Cancellation rolled back.', v_item.product_id;
        END IF;
      END LOOP;
    END IF;

    UPDATE public.orders
    SET status = 'cancelled', stock_reserved = false
    WHERE id = p_order_id;
    RETURN p_order_id;
  END IF;

  UPDATE public.orders
  SET status = v_next_status
  WHERE id = p_order_id;
  RETURN p_order_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.update_order_status_atomic(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_order_status_atomic(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.update_order_status_atomic(uuid, text) TO authenticated;

-- The customer/admin conversation is accessed only through RLS SELECT and
-- the sender-validated send_order_message RPC. Existing legacy messages table
-- remains untouched.
-- Public/anon can never read order conversations.

-- The app uses the Data API for SELECT. Supabase's October 2026 Data API
-- exposure change requires an explicit GRANT for new public-schema tables.
GRANT SELECT ON public.orders, public.order_items TO authenticated;
GRANT SELECT ON public.order_messages TO authenticated;

-- Checkout and status changes must go through the atomic SECURITY DEFINER RPCs.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.orders FROM PUBLIC, anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.order_items FROM PUBLIC, anon, authenticated;

DO $revoke_order_column_writes$
DECLARE
  v_table text;
  v_column text;
BEGIN
  FOR v_table, v_column IN
    SELECT c.relname, a.attname
    FROM pg_class AS c
    JOIN pg_namespace AS n ON n.oid = c.relnamespace
    JOIN pg_attribute AS a ON a.attrelid = c.oid
    WHERE n.nspname = 'public'
      AND c.relname IN ('orders', 'order_items')
      AND c.relkind IN ('r', 'p')
      AND a.attnum > 0
      AND NOT a.attisdropped
    ORDER BY c.relname, a.attnum
  LOOP
    EXECUTE format('REVOKE INSERT (%I) ON TABLE public.%I FROM PUBLIC, anon, authenticated', v_column, v_table);
    EXECUTE format('REVOKE UPDATE (%I) ON TABLE public.%I FROM PUBLIC, anon, authenticated', v_column, v_table);
  END LOOP;
END
$revoke_order_column_writes$;

COMMIT;
