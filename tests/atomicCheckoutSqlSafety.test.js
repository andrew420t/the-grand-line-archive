import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const proposal = readFileSync(new URL('../supabase/review-only/atomic-checkout-rpc.sql', import.meta.url), 'utf8')

test('atomic checkout proposal revokes direct table-level writes for orders and order items', () => {
  for (const table of ['orders', 'order_items']) {
    assert.ok(
      proposal.includes(`REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.${table} FROM PUBLIC, anon, authenticated;`),
      `direct INSERT/UPDATE/DELETE/TRUNCATE must be revoked on ${table}`,
    )
  }
})

test('atomic checkout proposal also removes existing column-level insert and update grants', () => {
  assert.match(proposal, /REVOKE INSERT \(%I\) ON TABLE public\.%I FROM PUBLIC, anon, authenticated/)
  assert.match(proposal, /REVOKE UPDATE \(%I\) ON TABLE public\.%I FROM PUBLIC, anon, authenticated/)
  assert.match(proposal, /c\.relname IN \('orders', 'order_items'\)/)
})
