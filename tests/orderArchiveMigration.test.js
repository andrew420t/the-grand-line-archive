import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const migration = readFileSync(new URL('../supabase/review-only/order-archive.sql', import.meta.url), 'utf8')

test('order archive migration is additive and preserves original order records', () => {
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.order_archives/)
  assert.match(migration, /REFERENCES public\.orders\(id\) ON DELETE CASCADE/)
  assert.match(migration, /ALTER TABLE public\.order_archives ENABLE ROW LEVEL SECURITY/)
  assert.doesNotMatch(migration, /DROP TABLE|DROP COLUMN|TRUNCATE TABLE|DELETE FROM public\.orders/i)
})

test('order archive migration limits customer and admin archive scopes', () => {
  assert.match(migration, /archive_scope IN \('customer', 'admin'\)/)
  assert.match(migration, /public\.is_admin\(\)/)
  assert.match(migration, /auth\.uid\(\)/)
})
