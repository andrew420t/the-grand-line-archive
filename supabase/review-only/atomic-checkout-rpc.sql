-- REVIEW ONLY: atomic order creation and stock reservation proposal.
-- Not applied to any database.
-- Confirm the live table/column names, constraints, order lifecycle, triggers,
-- and RLS/grants before adapting or applying. The existing client checkout
-- currently inserts orders and order_items separately and does not atomically
-- decrement stock; this function addresses that race only when the client calls
-- it and it has been installed in the reviewed database.
--
-- Expected current columns based on application code:
-- public.products(id uuid, name, price numeric, stock_quantity integer, status text)
-- public.orders(user_id uuid, status text, total_amount numeric)
-- public.order_items(order_id uuid, product_id uuid, quantity integer, unit_price numeric)
--
-- API input: [{"product_id":"<uuid>","quantity":1,"expected_unit_price":2.50}, ...]
-- Duplicate product IDs are combined. Product rows are locked in UUID order to
-- prevent concurrent checkouts from selling the same stock and reduce deadlocks.
-- The whole function executes as one transaction; any exception rolls back the
-- order, items, and stock decrements together.

BEGIN;

CREATE OR REPLACE FUNCTION public.create_order_atomic(p_items jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_item record;
  v_product record;
  v_total numeric := 0;
  v_order_id uuid;
  v_updated_count integer;
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

  -- Lock all distinct product rows in deterministic order, then validate.
  FOR v_item IN
    SELECT product_id, SUM(quantity)::integer AS quantity,
           MIN(expected_unit_price) AS expected_unit_price,
           MAX(expected_unit_price) AS max_expected_unit_price
    FROM jsonb_to_recordset(p_items) AS input(product_id uuid, quantity integer, expected_unit_price numeric)
    GROUP BY product_id
    ORDER BY product_id
  LOOP
    SELECT id, name, price, stock_quantity, status
      INTO v_product
    FROM public.products
    WHERE id = v_item.product_id
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

  INSERT INTO public.orders (user_id, status, total_amount)
  VALUES (v_user_id, 'pending', round(v_total, 2))
  RETURNING id INTO v_order_id;

  FOR v_item IN
    SELECT product_id, SUM(quantity)::integer AS quantity
    FROM jsonb_to_recordset(p_items) AS input(product_id uuid, quantity integer)
    GROUP BY product_id
    ORDER BY product_id
  LOOP
    UPDATE public.products
    SET stock_quantity = stock_quantity - v_item.quantity
    WHERE id = v_item.product_id
      AND stock_quantity >= v_item.quantity;

    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    IF v_updated_count <> 1 THEN
      RAISE EXCEPTION 'Stock reservation failed for product %. Retry checkout.', v_item.product_id;
    END IF;

    SELECT price INTO v_product
    FROM public.products
    WHERE id = v_item.product_id;

    INSERT INTO public.order_items (order_id, product_id, quantity, unit_price)
    VALUES (v_order_id, v_item.product_id, v_item.quantity, v_product.price);
  END LOOP;

  RETURN v_order_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.create_order_atomic(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_order_atomic(jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_order_atomic(jsonb) TO authenticated;

-- IMPORTANT: Before applying, review whether order/order_items policies allow
-- customers to read their own order and whether direct inserts must be revoked
-- to prevent bypassing this atomic function. Also inspect triggers that may
-- adjust stock/order state, as double-decrementing would be harmful.
-- Apply this proposal only after reviewing all schema, trigger, policy and
-- lifecycle details in the target staging project.



-- Admin order-status RPC: cancellation restores stock exactly once.
-- A cancelled order is terminal; shipped/completed orders cannot be cancelled
-- through this routine because automatic restocking would be unsafe.
CREATE OR REPLACE FUNCTION public.update_order_status_atomic(p_order_id uuid, p_new_status text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $function$
DECLARE
  v_current_status text;
  v_item record;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin() THEN
    RAISE EXCEPTION 'Administrator permission is required to update order status.';
  END IF;

  IF lower(trim(coalesce(p_new_status, ''))) NOT IN ('pending', 'processing', 'shipped', 'completed', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid order status.';
  END IF;

  SELECT status INTO v_current_status
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order was not found.';
  END IF;

  IF lower(v_current_status) = lower(trim(p_new_status)) THEN
    RETURN p_order_id; -- idempotent retry; do not restock twice
  END IF;

  IF lower(v_current_status) = 'cancelled' THEN
    RAISE EXCEPTION 'Cancelled orders cannot be reopened through this routine.';
  END IF;

  IF NOT (
    (lower(v_current_status) = 'pending' AND lower(trim(p_new_status)) IN ('processing', 'cancelled')) OR
    (lower(v_current_status) = 'processing' AND lower(trim(p_new_status)) IN ('shipped', 'cancelled')) OR
    (lower(v_current_status) = 'shipped' AND lower(trim(p_new_status)) = 'completed')
  ) THEN
    RAISE EXCEPTION 'Invalid order status transition from % to %.', v_current_status, p_new_status;
  END IF;

  IF lower(trim(p_new_status)) = 'cancelled' THEN

    UPDATE public.orders SET status = 'cancelled' WHERE id = p_order_id;

    FOR v_item IN
      SELECT product_id, SUM(quantity)::integer AS quantity
      FROM public.order_items
      WHERE order_id = p_order_id
      GROUP BY product_id
      ORDER BY product_id
    LOOP
      UPDATE public.products
      SET stock_quantity = stock_quantity + v_item.quantity
      WHERE id = v_item.product_id;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Could not restore stock for product %. Cancellation rolled back.', v_item.product_id;
      END IF;
    END LOOP;

    RETURN p_order_id;
  END IF;

  UPDATE public.orders SET status = lower(trim(p_new_status)) WHERE id = p_order_id;
  RETURN p_order_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.update_order_status_atomic(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_order_status_atomic(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.update_order_status_atomic(uuid, text) TO authenticated;

COMMIT;
