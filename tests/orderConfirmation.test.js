import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const migration = readFileSync(new URL('../supabase/review-only/order-confirmation-messaging-email.sql', import.meta.url), 'utf8')
const notification = readFileSync(new URL('../supabase/functions/notify-new-order/index.ts', import.meta.url), 'utf8')

test('order migration extends legacy orders and items without dropping their original columns', () => {
  assert.match(migration, /ADD COLUMN IF NOT EXISTS total_amount numeric/)
  assert.match(migration, /ADD COLUMN IF NOT EXISTS stock_reserved boolean/)
  assert.match(migration, /ADD COLUMN IF NOT EXISTS product_id uuid/)
  assert.match(migration, /ADD COLUMN IF NOT EXISTS unit_price numeric/)
  assert.match(migration, /SET total_amount = total/)
  assert.match(migration, /SET unit_price = price_at_purchase/)
  assert.doesNotMatch(migration, /DROP COLUMN|DROP TABLE/i)
})

test('order conversations are row secured and messages can only be written through the verified RPC', () => {
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.order_messages/)
  assert.match(migration, /ALTER TABLE public\.order_messages ENABLE ROW LEVEL SECURITY/)
  assert.match(migration, /CREATE POLICY "Order participants can read their conversation"/)
  assert.match(migration, /sender_id = \(SELECT auth\.uid\(\)\)/)
  assert.match(migration, /OR public\.is_admin\(\)/)
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.send_order_message/)
  assert.match(migration, /v_order_user_id = v_user_id/)
  assert.match(migration, /GRANT SELECT ON public\.order_messages TO authenticated/)
  assert.match(migration, /REVOKE ALL ON public\.order_messages FROM PUBLIC, anon, authenticated/)
})

test('order checkout and cancellation remain atomic and preserve the stock reservation', () => {
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.create_order_atomic/)
  assert.match(migration, /FOR UPDATE/)
  assert.match(migration, /stock_reserved/)
  assert.match(migration, /stock_quantity = stock_quantity - v_item\.quantity/)
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.update_order_status_atomic/)
  assert.match(migration, /stock_quantity = stock_quantity \+ v_item\.quantity/)
  assert.match(migration, /REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public\.orders FROM PUBLIC, anon, authenticated/)
  assert.match(migration, /REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public\.order_items FROM PUBLIC, anon, authenticated/)
})

test('order notification requires a verified customer or admin and sends only to admin profile emails', () => {
  assert.match(notification, /\/auth\/v1\/user/)
  assert.match(notification, /profiles\?role=eq\.admin/)
  assert.match(notification, /\/auth\/v1\/admin\/users\//)
  assert.match(notification, /RESEND_API_KEY/)
  assert.match(notification, /ORDER_EMAIL_FROM/)
  assert.match(notification, /https:\/\/api\.resend\.com\/emails/)
  assert.match(notification, /Idempotency-Key/)
  assert.match(notification, /body\.retry && !isAdmin/)
  assert.match(notification, /admin_email_status/)
})
